import express, { Request, Response } from 'express';
import { query, queryOne, run, withTransaction } from '../db.js';
import crypto from 'crypto';

const router = express.Router();

function getTodayYmd(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Calculate days waiting since last follow-up or creation
function calculateDaysWaiting(item: { last_follow_up?: string | null; created_at?: string }): number {
  const baseDate = item.last_follow_up ? new Date(item.last_follow_up) : new Date(item.created_at || Date.now());
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - baseDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Determine urgency level
function determineUrgency(item: { next_follow_up?: string | null; due_date?: string | null; status: string }): 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'NORMAL' {
  if (item.status === 'CLOSED' || item.status === 'CANCELLED' || item.status === 'RECEIVED') {
    return 'NORMAL';
  }
  const today = getTodayYmd();
  const targetDate = item.next_follow_up || item.due_date;
  if (!targetDate) return 'NORMAL';
  if (targetDate < today) return 'OVERDUE';
  if (targetDate === today) return 'TODAY';
  if (targetDate <= getDateOffset(7)) return 'UPCOMING';
  return 'NORMAL';
}

// 1. GET /api/interfaces - List interfaces with filtering
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      taskId,
      status,
      discipline,
      filter,
      search,
      priority,
      sort = 'urgency',
      limit = '200',
      offset = '0',
    } = req.query;

    const today = getTodayYmd();
    let whereClauses: string[] = ['1=1'];
    let params: any[] = [];

    if (taskId && typeof taskId === 'string') {
      whereClauses.push('i.task_id = ?');
      params.push(taskId);
    }

    if (discipline && typeof discipline === 'string' && discipline !== 'ALL') {
      whereClauses.push('i.discipline = ?');
      params.push(discipline);
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      if (status === 'ACTIVE') {
        whereClauses.push("i.status IN ('OPEN', 'WAITING')");
      } else {
        whereClauses.push('i.status = ?');
        params.push(status);
      }
    }

    if (priority && typeof priority === 'string' && priority !== 'ALL') {
      whereClauses.push('i.priority = ?');
      params.push(priority);
    }

    // Specific time/queue filter
    if (filter && typeof filter === 'string') {
      if (filter === 'today') {
        whereClauses.push("(i.next_follow_up = ? OR (i.next_follow_up IS NULL AND i.due_date = ?)) AND i.status IN ('OPEN', 'WAITING')");
        params.push(today, today);
      } else if (filter === 'overdue') {
        whereClauses.push("((i.next_follow_up IS NOT NULL AND i.next_follow_up < ?) OR (i.due_date IS NOT NULL AND i.due_date < ?)) AND i.status IN ('OPEN', 'WAITING')");
        params.push(today, today);
      } else if (filter === 'next7') {
        const next7 = getDateOffset(7);
        whereClauses.push("((i.next_follow_up BETWEEN ? AND ?) OR (i.due_date BETWEEN ? AND ?)) AND i.status IN ('OPEN', 'WAITING')");
        params.push(today, next7, today, next7);
      } else if (filter === 'next14') {
        const next14 = getDateOffset(14);
        whereClauses.push("((i.next_follow_up BETWEEN ? AND ?) OR (i.due_date BETWEEN ? AND ?)) AND i.status IN ('OPEN', 'WAITING')");
        params.push(today, next14, today, next14);
      } else if (filter === 'waiting') {
        whereClauses.push("i.status = 'WAITING'");
      } else if (filter === 'open') {
        whereClauses.push("i.status = 'OPEN'");
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      whereClauses.push('(LOWER(i.action) LIKE ? OR LOWER(i.external_pic) LIKE ? OR LOWER(i.note) LIKE ? OR LOWER(t.title) LIKE ?)');
      params.push(term, term, term, term);
    }

    let orderBy = 'i.created_at DESC';
    if (sort === 'due_date_asc') {
      orderBy = 'i.due_date IS NULL, i.due_date ASC';
    } else if (sort === 'next_follow_up_asc') {
      orderBy = 'i.next_follow_up IS NULL, i.next_follow_up ASC';
    } else if (sort === 'discipline') {
      orderBy = 'i.discipline ASC';
    }

    const sql = `
      SELECT 
        i.*,
        t.title as task_title,
        t.status as task_status,
        t.priority as task_priority,
        t.project_id,
        pr.code as project_code,
        pr.name as project_name,
        t.package_id,
        pk.code as package_code,
        pk.name as package_name,
        t.assignee_id,
        u.name as assignee_name,
        u.avatar as assignee_avatar
      FROM task_interfaces i
      JOIN tasks t ON i.task_id = t.id
      LEFT JOIN packages pk ON t.package_id = pk.id
      LEFT JOIN projects pr ON (t.project_id = pr.id OR (t.project_id IS NULL AND pk.project_id = pr.id))
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    params.push(Number(limit), Number(offset));
    const rawInterfaces = query(sql, params);

    const interfaces = rawInterfaces.map((item: any) => ({
      ...item,
      days_waiting: calculateDaysWaiting(item),
      urgency: determineUrgency(item),
    }));

    res.json({
      interfaces,
      total: interfaces.length,
    });
  } catch (err: any) {
    console.error('Error fetching interfaces:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/interfaces/follow-ups - Follow-up Queue with aggregated bucket counts
router.get('/follow-ups', (req: Request, res: Response) => {
  try {
    const today = getTodayYmd();
    const next7 = getDateOffset(7);
    const next14 = getDateOffset(14);

    // Summary counts for fast queue header badges
    const summarySql = `
      SELECT 
        COUNT(CASE WHEN status IN ('OPEN', 'WAITING') AND (next_follow_up = ? OR (next_follow_up IS NULL AND due_date = ?)) THEN 1 END) as today_count,
        COUNT(CASE WHEN status IN ('OPEN', 'WAITING') AND ((next_follow_up IS NOT NULL AND next_follow_up < ?) OR (next_follow_up IS NULL AND due_date < ?)) THEN 1 END) as overdue_count,
        COUNT(CASE WHEN status IN ('OPEN', 'WAITING') AND ((next_follow_up BETWEEN ? AND ?) OR (next_follow_up IS NULL AND due_date BETWEEN ? AND ?)) THEN 1 END) as next7_count,
        COUNT(CASE WHEN status IN ('OPEN', 'WAITING') AND ((next_follow_up BETWEEN ? AND ?) OR (next_follow_up IS NULL AND due_date BETWEEN ? AND ?)) THEN 1 END) as next14_count,
        COUNT(CASE WHEN status = 'WAITING' THEN 1 END) as waiting_count,
        COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_count,
        COUNT(CASE WHEN status IN ('OPEN', 'WAITING') THEN 1 END) as active_total
      FROM task_interfaces
    `;
    const summaryRow = queryOne(summarySql, [
      today, today,
      today, today,
      today, next7, today, next7,
      today, next14, today, next14,
    ]) || {};

    const counts = {
      today: Number(summaryRow.today_count || 0),
      overdue: Number(summaryRow.overdue_count || 0),
      next7Days: Number(summaryRow.next7_count || 0),
      next14Days: Number(summaryRow.next14_count || 0),
      waiting: Number(summaryRow.waiting_count || 0),
      open: Number(summaryRow.open_count || 0),
      totalActive: Number(summaryRow.active_total || 0),
    };

    // Query active items for queue
    const { filter = 'today', discipline, search } = req.query;
    let whereClauses: string[] = ["i.status IN ('OPEN', 'WAITING')"];
    let params: any[] = [];

    if (filter === 'today') {
      whereClauses.push("(i.next_follow_up = ? OR (i.next_follow_up IS NULL AND i.due_date = ?))");
      params.push(today, today);
    } else if (filter === 'overdue') {
      whereClauses.push("((i.next_follow_up IS NOT NULL AND i.next_follow_up < ?) OR (i.next_follow_up IS NULL AND i.due_date < ?))");
      params.push(today, today);
    } else if (filter === 'next7') {
      whereClauses.push("((i.next_follow_up BETWEEN ? AND ?) OR (i.due_date BETWEEN ? AND ?))");
      params.push(today, next7, today, next7);
    } else if (filter === 'next14') {
      whereClauses.push("((i.next_follow_up BETWEEN ? AND ?) OR (i.due_date BETWEEN ? AND ?))");
      params.push(today, next14, today, next14);
    } else if (filter === 'waiting') {
      whereClauses.push("i.status = 'WAITING'");
    } else if (filter === 'open') {
      whereClauses.push("i.status = 'OPEN'");
    }

    if (discipline && typeof discipline === 'string' && discipline !== 'ALL') {
      whereClauses.push('i.discipline = ?');
      params.push(discipline);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      whereClauses.push('(LOWER(i.action) LIKE ? OR LOWER(i.external_pic) LIKE ? OR LOWER(i.note) LIKE ? OR LOWER(t.title) LIKE ?)');
      params.push(term, term, term, term);
    }

    const itemsSql = `
      SELECT 
        i.*,
        t.title as task_title,
        t.status as task_status,
        t.priority as task_priority,
        t.project_id,
        pr.code as project_code,
        pr.name as project_name,
        t.package_id,
        pk.code as package_code,
        pk.name as package_name,
        t.assignee_id,
        u.name as assignee_name
      FROM task_interfaces i
      JOIN tasks t ON i.task_id = t.id
      LEFT JOIN packages pk ON t.package_id = pk.id
      LEFT JOIN projects pr ON (t.project_id = pr.id OR (t.project_id IS NULL AND pk.project_id = pr.id))
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY 
        CASE 
          WHEN i.next_follow_up IS NOT NULL AND i.next_follow_up < ? THEN 1
          WHEN i.next_follow_up = ? THEN 2
          WHEN i.due_date IS NOT NULL AND i.due_date < ? THEN 3
          WHEN i.due_date = ? THEN 4
          ELSE 5
        END,
        i.next_follow_up ASC,
        i.due_date ASC
      LIMIT 150
    `;

    const allParams = [today, today, today, today, ...params];
    const rawItems = query(itemsSql, allParams);

    const items = rawItems.map((item: any) => ({
      ...item,
      days_waiting: calculateDaysWaiting(item),
      urgency: determineUrgency(item),
    }));

    res.json({ counts, items });
  } catch (err: any) {
    console.error('Error fetching follow-ups:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/interfaces/summary - Discipline breakdown matrix
router.get('/summary', (_req: Request, res: Response) => {
  try {
    const disciplines = [
      'Process',
      'Piping',
      'Electrical',
      'Mechanical',
      'Structural',
      'Pipeline',
      'Safety',
      'EMT',
      'PMT',
      'Instrument',
      'Other',
    ];

    const rawRows = query(`
      SELECT 
        discipline,
        COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_count,
        COUNT(CASE WHEN status = 'WAITING' THEN 1 END) as waiting_count,
        COUNT(CASE WHEN status = 'RECEIVED' THEN 1 END) as received_count,
        COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_count,
        COUNT(*) as total_count
      FROM task_interfaces
      GROUP BY discipline
    `);

    const summaryMap = new Map<string, any>();
    for (const r of rawRows) {
      summaryMap.set(r.discipline, r);
    }

    const summary = disciplines.map((disc) => {
      const match = summaryMap.get(disc);
      return {
        discipline: disc,
        open: match ? Number(match.open_count) : 0,
        waiting: match ? Number(match.waiting_count) : 0,
        received: match ? Number(match.received_count) : 0,
        closed: match ? Number(match.closed_count) : 0,
        total: match ? Number(match.total_count) : 0,
      };
    });

    res.json({ summary });
  } catch (err: any) {
    console.error('Error getting interfaces summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. GET /api/interfaces/:id - Get single interface
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = queryOne(`
      SELECT 
        i.*,
        t.title as task_title,
        t.status as task_status,
        t.priority as task_priority,
        pr.code as project_code,
        pr.name as project_name,
        pk.code as package_code,
        pk.name as package_name,
        u.name as assignee_name
      FROM task_interfaces i
      JOIN tasks t ON i.task_id = t.id
      LEFT JOIN packages pk ON t.package_id = pk.id
      LEFT JOIN projects pr ON (t.project_id = pr.id OR (t.project_id IS NULL AND pk.project_id = pr.id))
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE i.id = ?
    `, [id]);

    if (!item) {
      return res.status(404).json({ error: 'Interface not found' });
    }

    res.json({
      ...item,
      days_waiting: calculateDaysWaiting(item),
      urgency: determineUrgency(item),
    });
  } catch (err: any) {
    console.error('Error fetching interface:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. POST /api/interfaces - Create new interface
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      task_id,
      taskId,
      discipline,
      action,
      external_pic,
      external_email,
      due_date,
      last_follow_up,
      next_follow_up,
      status = 'OPEN',
      priority = 'MEDIUM',
      note,
      userId,
    } = req.body;

    const targetTaskId = task_id || taskId;
    if (!targetTaskId) {
      return res.status(400).json({ error: 'task_id is required' });
    }

    if (!discipline || !discipline.trim()) {
      return res.status(400).json({ error: 'discipline is required' });
    }

    if (!action || !action.trim()) {
      return res.status(400).json({ error: 'action description is required' });
    }

    const task = queryOne('SELECT id, title FROM tasks WHERE id = ?', [targetTaskId]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const id = `itf-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    withTransaction(() => {
      run(`
        INSERT INTO task_interfaces (
          id, task_id, discipline, external_pic, external_email, action,
          due_date, last_follow_up, next_follow_up, status, priority,
          note, resolution_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        targetTaskId,
        discipline.trim(),
        external_pic?.trim() || null,
        external_email?.trim() || null,
        action.trim(),
        due_date || null,
        last_follow_up || null,
        next_follow_up || null,
        status,
        priority,
        note?.trim() || null,
        status === 'CLOSED' || status === 'RECEIVED' ? getTodayYmd() : null,
        now,
        now,
      ]);

      // Activity log
      const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
      run(`
        INSERT INTO task_activities (id, task_id, user_id, activity_type, field_name, new_value, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        actId,
        targetTaskId,
        userId || null,
        'INTERFACE_ADDED',
        'interface',
        discipline,
        `Added ${discipline} interface: "${action.trim().slice(0, 80)}"`,
        now,
      ]);

      run('UPDATE tasks SET updated_at = ? WHERE id = ?', [now, targetTaskId]);
    });

    const created = queryOne('SELECT * FROM task_interfaces WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error creating interface:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. PUT /api/interfaces/:id - Update interface
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM task_interfaces WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Interface not found' });
    }

    const {
      discipline = existing.discipline,
      action = existing.action,
      external_pic = existing.external_pic,
      external_email = existing.external_email,
      due_date = existing.due_date,
      last_follow_up = existing.last_follow_up,
      next_follow_up = existing.next_follow_up,
      status = existing.status,
      priority = existing.priority,
      note = existing.note,
      resolution_date,
      userId,
    } = req.body;

    const now = new Date().toISOString();
    let resDate = resolution_date !== undefined ? resolution_date : existing.resolution_date;
    if ((status === 'CLOSED' || status === 'RECEIVED') && !resDate) {
      resDate = getTodayYmd();
    } else if (status === 'OPEN' || status === 'WAITING') {
      resDate = null;
    }

    withTransaction(() => {
      run(`
        UPDATE task_interfaces SET
          discipline = ?,
          external_pic = ?,
          external_email = ?,
          action = ?,
          due_date = ?,
          last_follow_up = ?,
          next_follow_up = ?,
          status = ?,
          priority = ?,
          note = ?,
          resolution_date = ?,
          updated_at = ?
        WHERE id = ?
      `, [
        discipline,
        external_pic !== undefined ? (external_pic?.trim() || null) : existing.external_pic,
        external_email !== undefined ? (external_email?.trim() || null) : existing.external_email,
        action.trim(),
        due_date || null,
        last_follow_up || null,
        next_follow_up || null,
        status,
        priority,
        note !== undefined ? (note?.trim() || null) : existing.note,
        resDate || null,
        now,
        id,
      ]);

      if (existing.status !== status) {
        const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
        run(`
          INSERT INTO task_activities (id, task_id, user_id, activity_type, field_name, old_value, new_value, note, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          actId,
          existing.task_id,
          userId || null,
          'INTERFACE_STATUS_CHANGED',
          'interface_status',
          existing.status,
          status,
          `${discipline} interface status changed to ${status}`,
          now,
        ]);
      }

      run('UPDATE tasks SET updated_at = ? WHERE id = ?', [now, existing.task_id]);
    });

    const updated = queryOne('SELECT * FROM task_interfaces WHERE id = ?', [id]);
    res.json(updated);
  } catch (err: any) {
    console.error('Error updating interface:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. PATCH /api/interfaces/:id/status - Quick status update
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, userId } = req.body;

    const validStatuses = ['OPEN', 'WAITING', 'RECEIVED', 'CLOSED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
    }

    const existing = queryOne('SELECT * FROM task_interfaces WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Interface not found' });
    }

    const now = new Date().toISOString();
    let resDate = existing.resolution_date;
    if (status === 'RECEIVED' || status === 'CLOSED') {
      resDate = getTodayYmd();
    } else if (status === 'OPEN' || status === 'WAITING') {
      resDate = null;
    }

    withTransaction(() => {
      run(`
        UPDATE task_interfaces SET
          status = ?,
          resolution_date = ?,
          updated_at = ?
        WHERE id = ?
      `, [status, resDate, now, id]);

      const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
      run(`
        INSERT INTO task_activities (id, task_id, user_id, activity_type, field_name, old_value, new_value, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        actId,
        existing.task_id,
        userId || null,
        'INTERFACE_STATUS_CHANGED',
        'interface_status',
        existing.status,
        status,
        `Quick updated ${existing.discipline} interface status to ${status}`,
        now,
      ]);

      run('UPDATE tasks SET updated_at = ? WHERE id = ?', [now, existing.task_id]);
    });

    res.json({ message: 'Status updated successfully', status, resolution_date: resDate });
  } catch (err: any) {
    console.error('Error updating interface status:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. PATCH /api/interfaces/:id/follow-up - Record follow-up event
router.patch('/:id/follow-up', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { next_follow_up, note, userId } = req.body;

    const existing = queryOne('SELECT * FROM task_interfaces WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Interface not found' });
    }

    const today = getTodayYmd();
    const now = new Date().toISOString();

    const mergedNote = note?.trim()
      ? existing.note
        ? `${existing.note}\n[${today} Follow-up]: ${note.trim()}`
        : `[${today} Follow-up]: ${note.trim()}`
      : existing.note;

    withTransaction(() => {
      run(`
        UPDATE task_interfaces SET
          last_follow_up = ?,
          next_follow_up = ?,
          note = ?,
          updated_at = ?
        WHERE id = ?
      `, [today, next_follow_up || null, mergedNote, now, id]);

      const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
      run(`
        INSERT INTO task_activities (id, task_id, user_id, activity_type, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        actId,
        existing.task_id,
        userId || null,
        'INTERFACE_FOLLOW_UP',
        `Followed up with ${existing.discipline} (${existing.external_pic || 'external team'})${note ? `: "${note.slice(0, 80)}"` : ''}`,
        now,
      ]);

      run('UPDATE tasks SET updated_at = ? WHERE id = ?', [now, existing.task_id]);
    });

    res.json({ message: 'Follow-up recorded successfully', last_follow_up: today, next_follow_up });
  } catch (err: any) {
    console.error('Error recording follow up:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. DELETE /api/interfaces/:id - Delete interface
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM task_interfaces WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Interface not found' });
    }

    const now = new Date().toISOString();
    withTransaction(() => {
      run('DELETE FROM task_interfaces WHERE id = ?', [id]);

      const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
      run(`
        INSERT INTO task_activities (id, task_id, user_id, activity_type, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        actId,
        existing.task_id,
        null,
        'INTERFACE_DELETED',
        `Removed ${existing.discipline} interface: "${existing.action.slice(0, 80)}"`,
        now,
      ]);

      run('UPDATE tasks SET updated_at = ? WHERE id = ?', [now, existing.task_id]);
    });

    res.json({ message: 'Interface deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting interface:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
