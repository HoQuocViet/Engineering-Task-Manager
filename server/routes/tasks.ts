import express, { Request, Response } from 'express';
import { query, queryOne, run, withTransaction } from '../db.js';
import crypto from 'crypto';
import { normalizeTaskState } from '../../src/lib/taskStateMachine.js';
import { deletePhysicalFile } from './attachments.js';

const router = express.Router();

// Helper to get today's date formatted as YYYY-MM-DD
function getTodayYmd(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper to calculate date offsets
function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Get all tasks with rich filtering
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      search,
      status,
      priority,
      projectId,
      packageId,
      categoryId,
      type,
      deadlineFilter,
      forecastFilter,
      progress,
      tagId,
      assigneeId,
      sort = 'created_desc',
      limit = '100',
      offset = '0',
    } = req.query;

    const today = getTodayYmd();
    const tomorrow = getDateOffset(1);
    const endOfWeek = getDateOffset(7);

    let whereClauses: string[] = ['1=1'];
    let params: any[] = [];

    // Search filter (title, description) - supports Unicode case-folding & Vietnamese diacritics
    if (search && typeof search === 'string' && search.trim().length > 0) {
      whereClauses.push('(VI_MATCH(t.title, ?) = 1 OR VI_MATCH(t.description, ?) = 1)');
      const term = search.trim();
      params.push(term, term);
    }

    // Status filter
    if (status && typeof status === 'string' && status !== 'ALL') {
      if (status === 'OPEN') {
        whereClauses.push("t.status IN ('TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD')");
      } else {
        whereClauses.push('t.status = ?');
        params.push(status);
      }
    }

    // Priority filter
    if (priority && typeof priority === 'string' && priority !== 'ALL') {
      whereClauses.push('t.priority = ?');
      params.push(priority);
    }

    // Project filter
    if (projectId && typeof projectId === 'string' && projectId !== 'ALL' && projectId.trim() !== '') {
      whereClauses.push('(t.project_id = ? OR p.project_id = ?)');
      params.push(projectId.trim(), projectId.trim());
    }

    // Package filter
    if (packageId && typeof packageId === 'string' && packageId !== 'ALL') {
      if (packageId === 'GENERAL' || packageId === 'NONE') {
        whereClauses.push('t.package_id IS NULL');
      } else {
        whereClauses.push('t.package_id = ?');
        params.push(packageId);
      }
    }

    // Category filter
    if (categoryId && typeof categoryId === 'string' && categoryId !== 'ALL') {
      whereClauses.push('t.category_id = ?');
      params.push(categoryId);
    }

    // Task Type filter
    if (type && typeof type === 'string' && type !== 'ALL') {
      whereClauses.push('t.type = ?');
      params.push(type);
    }

    // Assignee / PIC filter
    if (assigneeId && typeof assigneeId === 'string' && assigneeId !== 'ALL') {
      whereClauses.push('t.assignee_id = ?');
      params.push(assigneeId);
    }

    const rawPic = (req.query.pic as string) || '';
    if (rawPic && rawPic !== 'ALL') {
      if (rawPic === 'UNASSIGNED') {
        whereClauses.push("(t.pics IS NULL OR t.pics = '' OR t.pics = '[]' OR t.pics = 'null' OR TRIM(t.pics) = '' OR TRIM(t.pics) = '[\"\"]') AND (t.assignee_id IS NULL OR t.assignee_id = '')");
      } else {
        const cleanPic = rawPic.replace(/\s*\(Tôi\)\s*$/, '').trim();
        const isSelf = rawPic.includes('Tôi') || cleanPic.toLowerCase() === 'ho quoc viet';
        if (isSelf) {
          whereClauses.push(`(
            (json_valid(t.pics) = 1 AND EXISTS (
              SELECT 1 FROM json_each(t.pics) j 
              WHERE j.value = ? OR j.value = ? OR VI_MATCH(j.value, ?) = 1 OR VI_MATCH(j.value, ?) = 1
            ))
            OR VI_MATCH(t.pics, ?) = 1
            OR VI_MATCH(t.pics, ?) = 1
            OR t.pics LIKE ?
            OR t.pics LIKE ?
            OR ((t.pics IS NULL OR t.pics = '' OR t.pics = '[]' OR t.pics = 'null') AND t.assignee_id = 'usr-1')
          )`);
          params.push(
            rawPic,
            cleanPic,
            rawPic,
            cleanPic,
            rawPic,
            cleanPic,
            `%"${cleanPic}"%`,
            `%${cleanPic}%`
          );
        } else {
          whereClauses.push(`(
            (json_valid(t.pics) = 1 AND EXISTS (
              SELECT 1 FROM json_each(t.pics) j 
              WHERE j.value = ? OR j.value = ? OR VI_MATCH(j.value, ?) = 1 OR VI_MATCH(j.value, ?) = 1
            ))
            OR VI_MATCH(t.pics, ?) = 1
            OR VI_MATCH(t.pics, ?) = 1
            OR t.pics LIKE ?
            OR t.pics LIKE ?
          )`);
          params.push(
            rawPic,
            cleanPic,
            rawPic,
            cleanPic,
            rawPic,
            cleanPic,
            `%"${cleanPic}"%`,
            `%${cleanPic}%`
          );
        }
      }
    }

    // Tag filter
    if (tagId && typeof tagId === 'string' && tagId !== 'ALL') {
      whereClauses.push('EXISTS (SELECT 1 FROM task_tags tt WHERE tt.task_id = t.id AND tt.tag_id = ?)');
      params.push(tagId);
    }

    // Deadline filter
    if (deadlineFilter && typeof deadlineFilter === 'string' && deadlineFilter !== 'all') {
      if (deadlineFilter === 'overdue') {
        whereClauses.push("t.deadline IS NOT NULL AND t.deadline < ? AND t.status != 'DONE' AND t.status != 'CANCELLED'");
        params.push(today);
      } else if (deadlineFilter === 'today') {
        whereClauses.push("t.deadline = ? AND t.status != 'DONE' AND t.status != 'CANCELLED'");
        params.push(today);
      } else if (deadlineFilter === 'tomorrow') {
        whereClauses.push("t.deadline = ? AND t.status != 'DONE' AND t.status != 'CANCELLED'");
        params.push(tomorrow);
      } else if (deadlineFilter === 'this_week') {
        whereClauses.push("t.deadline >= ? AND t.deadline <= ? AND t.status != 'DONE' AND t.status != 'CANCELLED'");
        params.push(today, endOfWeek);
      } else if (deadlineFilter === 'upcoming') {
        whereClauses.push("t.deadline > ? AND t.status != 'DONE' AND t.status != 'CANCELLED'");
        params.push(today);
      } else if (deadlineFilter === 'done') {
        whereClauses.push("t.status = 'DONE'");
      }
    }

    // Forecast filter
    if (forecastFilter && typeof forecastFilter === 'string' && forecastFilter !== 'all') {
      if (forecastFilter === 'overdue' || forecastFilter === 'late') {
        whereClauses.push("(t.forecast_finish IS NOT NULL AND ((t.deadline IS NOT NULL AND t.forecast_finish > t.deadline) OR (t.forecast_finish < ?))) AND t.status != 'DONE' AND t.status != 'CANCELLED'");
        params.push(today);
      } else if (forecastFilter === 'today') {
        whereClauses.push("t.forecast_finish = ? AND t.status != 'DONE' AND t.status != 'CANCELLED'");
        params.push(today);
      } else if (forecastFilter === 'tomorrow') {
        whereClauses.push("t.forecast_finish = ? AND t.status != 'DONE' AND t.status != 'CANCELLED'");
        params.push(tomorrow);
      } else if (forecastFilter === 'this_week') {
        whereClauses.push("t.forecast_finish >= ? AND t.forecast_finish <= ? AND t.status != 'DONE' AND t.status != 'CANCELLED'");
        params.push(today, endOfWeek);
      } else if (forecastFilter === 'upcoming') {
        whereClauses.push("t.forecast_finish > ? AND t.status != 'DONE' AND t.status != 'CANCELLED'");
        params.push(today);
      } else if (forecastFilter === 'revised' || forecastFilter === 'multiple_revisions') {
        whereClauses.push("t.forecast_revision_count > 0 AND t.status != 'DONE' AND t.status != 'CANCELLED'");
      } else if (forecastFilter === 'done') {
        whereClauses.push("t.status = 'DONE'");
      }
    }

    // Progress filter
    if (progress && typeof progress === 'string' && progress !== 'ALL') {
      if (progress === '0') {
        whereClauses.push('t.progress = 0');
      } else if (progress === 'ACTIVE') {
        whereClauses.push('t.progress > 0 AND t.progress < 100');
      } else if (progress === '100') {
        whereClauses.push('t.progress = 100');
      }
    }

    // EPC Smart Default / Priority Sort order
    const smartPrioritySort = `
      CASE 
        WHEN t.status IN ('DONE', 'CANCELLED') THEN 99
        WHEN t.priority = 'CRITICAL' THEN 1 
        WHEN t.priority = 'HIGH' THEN 2 
        WHEN t.priority = 'MEDIUM' THEN 3 
        WHEN t.priority = 'LOW' THEN 4 
        ELSE 5 
      END ASC,
      CASE 
        WHEN t.status IN ('DONE', 'CANCELLED') THEN 
          COALESCE(t.completed_date, t.forecast_finish, t.deadline, t.created_at, '1970-01-01')
        ELSE 
          COALESCE(t.forecast_finish, t.deadline, t.start_date, '9999-12-31')
      END ASC,
      t.created_at DESC,
      t.id DESC
    `;

    // Default sort order: Created Date descending (newest tasks first, no auto-reordering on edit)
    let orderBy = 't.created_at DESC, t.id DESC';
    if (sort === 'created_asc') {
      orderBy = 't.created_at ASC, t.id ASC';
    } else if (sort === 'created_desc') {
      orderBy = 't.created_at DESC, t.id DESC';
    } else if (sort === 'deadline_asc' || sort === 'deadline') {
      orderBy = 't.deadline ASC NULLS LAST, t.created_at DESC';
    } else if (sort === 'deadline_desc') {
      orderBy = 't.deadline DESC NULLS LAST, t.created_at DESC';
    } else if (sort === 'priority_asc') {
      orderBy = smartPrioritySort;
    } else if (sort === 'priority_desc') {
      orderBy = `
        CASE 
          WHEN t.status IN ('DONE', 'CANCELLED') THEN 99
          WHEN t.priority = 'LOW' THEN 1 
          WHEN t.priority = 'MEDIUM' THEN 2 
          WHEN t.priority = 'HIGH' THEN 3 
          WHEN t.priority = 'CRITICAL' THEN 4 
          ELSE 5 
        END ASC,
        t.created_at DESC
      `;
    } else if (sort === 'priority' || sort === 'priority_smart' || sort === 'smart_priority') {
      orderBy = smartPrioritySort;
    } else if (sort === 'status' || sort === 'status_asc') {
      orderBy = `CASE t.status
        WHEN 'IN PROGRESS' THEN 1
        WHEN 'WAITING' THEN 2
        WHEN 'TODO' THEN 3
        WHEN 'ON HOLD' THEN 4
        WHEN 'DONE' THEN 5
        ELSE 6 END ASC, t.created_at DESC`;
    } else if (sort === 'status_desc') {
      orderBy = `CASE t.status
        WHEN 'DONE' THEN 1
        WHEN 'ON HOLD' THEN 2
        WHEN 'WAITING' THEN 3
        WHEN 'IN PROGRESS' THEN 4
        WHEN 'TODO' THEN 5
        ELSE 6 END ASC, t.created_at DESC`;
    } else if (sort === 'updated_desc') {
      orderBy = 't.updated_at DESC';
    } else if (sort === 'updated_asc') {
      orderBy = 't.updated_at ASC';
    } else if (sort === 'title' || sort === 'title_asc') {
      orderBy = 't.title ASC';
    } else if (sort === 'title_desc') {
      orderBy = 't.title DESC';
    } else if (sort === 'package' || sort === 'package_asc') {
      orderBy = 'p.name ASC NULLS LAST, t.created_at DESC';
    } else if (sort === 'package_desc') {
      orderBy = 'p.name DESC NULLS LAST, t.created_at DESC';
    } else if (sort === 'progress' || sort === 'progress_asc') {
      orderBy = 't.progress ASC';
    } else if (sort === 'progress_desc') {
      orderBy = 't.progress DESC';
    } else if (sort === 'forecast' || sort === 'forecast_asc') {
      orderBy = 't.forecast_finish ASC NULLS LAST, t.created_at DESC';
    } else if (sort === 'forecast_desc') {
      orderBy = 't.forecast_finish DESC NULLS LAST, t.created_at DESC';
    } else if (sort === 'pic' || sort === 'pic_asc') {
      orderBy = "CASE WHEN t.pics IS NULL OR t.pics = '' OR t.pics = '[]' THEN 1 ELSE 0 END ASC, t.pics ASC, t.created_at DESC";
    } else if (sort === 'pic_desc') {
      orderBy = "CASE WHEN t.pics IS NULL OR t.pics = '' OR t.pics = '[]' THEN 1 ELSE 0 END ASC, t.pics DESC, t.created_at DESC";
    }

    const whereSql = whereClauses.join(' AND ');

    // Count total matching
    const countSql = `
      SELECT COUNT(*) as total 
      FROM tasks t 
      LEFT JOIN packages p ON t.package_id = p.id
      WHERE ${whereSql}
    `;
    const totalCountRes = query<{ total: number }>(countSql, params);
    const total = totalCountRes[0]?.total || 0;

    // Fetch tasks
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 100);
    const offsetNum = Math.max(0, parseInt(offset as string, 10) || 0);

    const tasksSql = `
      SELECT 
        t.*,
        COALESCE(t.project_id, p.project_id) as effective_project_id,
        pr.name as project_name,
        pr.code as project_code,
        p.name as package_name,
        p.code as package_code,
        c.name as category_name,
        c.color as category_color,
        u.name as assignee_name,
        u.avatar as assignee_avatar,
        (SELECT COUNT(*) FROM task_comments cm WHERE cm.task_id = t.id) as comment_count,
        (SELECT COUNT(*) FROM task_attachments att WHERE att.task_id = t.id) as attachment_count
      FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      LEFT JOIN projects pr ON (t.project_id = pr.id OR (t.project_id IS NULL AND p.project_id = pr.id))
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const tasks = query(tasksSql, [...params, limitNum, offsetNum]);

    // Fetch tags for these tasks
    if (tasks.length > 0) {
      const placeholders = tasks.map(() => '?').join(',');
      const tagsSql = `
        SELECT tt.task_id, tg.id, tg.name, tg.color 
        FROM task_tags tt
        JOIN tags tg ON tt.tag_id = tg.id
        WHERE tt.task_id IN (${placeholders})
      `;
      const allTags = query(tagsSql, tasks.map((t: any) => t.id));
      const tagsByTaskId = new Map<string, any[]>();
      for (const tg of allTags) {
        if (!tagsByTaskId.has(tg.task_id)) tagsByTaskId.set(tg.task_id, []);
        tagsByTaskId.get(tg.task_id)!.push({ id: tg.id, name: tg.name, color: tg.color });
      }

      for (const t of tasks) {
        t.tags = tagsByTaskId.get(t.id) || [];
      }
    }

    // Ensure pics is always an array
    for (const t of tasks) {
      if (typeof t.pics === 'string') {
        try {
          t.pics = JSON.parse(t.pics);
        } catch {
          t.pics = t.pics.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(t.pics)) {
        t.pics = [];
      }
    }

    res.json({
      tasks,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (err: any) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single task details
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const taskSql = `
      SELECT 
        t.*,
        COALESCE(t.project_id, p.project_id) as effective_project_id,
        pr.name as project_name,
        pr.code as project_code,
        p.name as package_name,
        p.code as package_code,
        c.name as category_name,
        c.color as category_color,
        u.name as assignee_name,
        u.role as assignee_role,
        u.avatar as assignee_avatar
      FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      LEFT JOIN projects pr ON (t.project_id = pr.id OR (t.project_id IS NULL AND p.project_id = pr.id))
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `;
    const task = queryOne(taskSql, [id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get tags
    const tags = query(`
      SELECT tg.id, tg.name, tg.color 
      FROM task_tags tt
      JOIN tags tg ON tt.tag_id = tg.id
      WHERE tt.task_id = ?
    `, [id]);
    task.tags = tags;

    // Get comments
    const comments = query(`
      SELECT cm.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role
      FROM task_comments cm
      LEFT JOIN users u ON cm.user_id = u.id
      WHERE cm.task_id = ?
      ORDER BY cm.created_at DESC
    `, [id]);
    task.comments = comments;

    // Get attachments
    const attachments = query(`
      SELECT att.*, u.name as uploaded_by_name
      FROM task_attachments att
      LEFT JOIN users u ON att.uploaded_by = u.id
      WHERE att.task_id = ?
      ORDER BY att.created_at DESC
    `, [id]);
    task.attachments = attachments;

    // Get activity history
    const activities = query(`
      SELECT act.*, u.name as user_name, u.avatar as user_avatar
      FROM task_activities act
      LEFT JOIN users u ON act.user_id = u.id
      WHERE act.task_id = ?
      ORDER BY act.created_at DESC
      LIMIT 50
    `, [id]);
    task.activities = activities;

    // Get linked tasks in the same group (if any)
    if (task.group_id) {
      const linkedTasks = query(`
        SELECT 
          t.id, t.project_id, t.package_id, t.title, t.status, t.progress, t.priority, t.deadline,
          pr.name as project_name, pr.code as project_code,
          p.name as package_name, p.code as package_code
        FROM tasks t
        LEFT JOIN packages p ON t.package_id = p.id
        LEFT JOIN projects pr ON (t.project_id = pr.id OR (t.project_id IS NULL AND p.project_id = pr.id))
        WHERE t.group_id = ? AND t.id != ?
        ORDER BY pr.code ASC, p.code ASC
      `, [task.group_id, id]);
      task.linked_tasks = linkedTasks;
      task.linked_tasks_count = linkedTasks.length;
    } else {
      task.linked_tasks = [];
      task.linked_tasks_count = 0;
    }

    if (typeof task.pics === 'string') {
      try {
        task.pics = JSON.parse(task.pics);
      } catch {
        task.pics = task.pics.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(task.pics)) {
      task.pics = [];
    }

    res.json(task);
  } catch (err: any) {
    console.error('Error getting task details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create task
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      type = 'TASK',
      projectId,
      project_id,
      categoryId,
      category_id,
      packageId,
      package_id,
      priority = 'MEDIUM',
      status = 'TODO',
      progress = 0,
      startDate,
      start_date,
      deadline,
      forecastFinish,
      forecast_finish,
      assigneeId,
      assignee_id,
      tags = [],
      userId,
      group_id,
      applicablePackages,
      applicableProjects,
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Authoritative Task State Normalization
    const normalized = normalizeTaskState({
      status,
      progress,
      today,
    });
    const finalStatus = normalized.status;
    const finalProgress = normalized.progress;
    const completedDate = normalized.completed_date;

    const rawStartDate = start_date !== undefined ? start_date : startDate;
    const rawForecastFinish = forecast_finish !== undefined ? forecast_finish : forecastFinish;
    const rawCategoryId = category_id !== undefined ? category_id : categoryId;
    const rawAssigneeId = assignee_id !== undefined ? assignee_id : assigneeId;

    // Check if multi-package or multi-project targets are provided
    const targetItems: Array<{ packageId: string | null; projectId: string | null }> = [];

    if (Array.isArray(applicablePackages) && applicablePackages.length > 0) {
      for (const pId of applicablePackages) {
        if (pId) {
          const pkg = queryOne<{ project_id: string }>('SELECT project_id FROM packages WHERE id = ?', [pId]);
          targetItems.push({ packageId: pId, projectId: pkg?.project_id || null });
        }
      }
    }

    if (Array.isArray(applicableProjects) && applicableProjects.length > 0) {
      for (const prId of applicableProjects) {
        if (prId && !targetItems.some((item) => item.projectId === prId && item.packageId === null)) {
          targetItems.push({ packageId: null, projectId: prId });
        }
      }
    }

    const rawPics = req.body.pics;
    const finalPics = Array.isArray(rawPics)
      ? JSON.stringify(rawPics)
      : JSON.stringify([]);

    // Multi-target batch creation inside transaction
    if (targetItems.length > 0) {
      const generatedGroupId = group_id || `grp-${crypto.randomUUID().slice(0, 10)}`;
      const createdTaskIds: string[] = [];

      withTransaction(() => {
        for (const item of targetItems) {
          const taskId = `tsk-${crypto.randomUUID().slice(0, 8)}`;
          run(`
            INSERT INTO tasks (
              id, project_id, title, description, type, category_id, package_id, priority, status,
              progress, start_date, deadline, forecast_finish, completed_date, assignee_id, pics, group_id,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            taskId,
            item.projectId,
            title.trim(),
            description ? description.trim() : '',
            type,
            rawCategoryId || null,
            item.packageId,
            priority,
            finalStatus,
            finalProgress,
            rawStartDate || null,
            deadline || null,
            rawForecastFinish || null,
            completedDate,
            rawAssigneeId || null,
            finalPics,
            generatedGroupId,
            now,
            now,
          ]);

          if (Array.isArray(tags)) {
            for (const tagId of tags) {
              if (tagId) {
                run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tagId]);
              }
            }
          }

          const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
          run(`
            INSERT INTO task_activities (id, task_id, user_id, activity_type, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [actId, taskId, userId || assigneeId || null, 'TASK_CREATED', `Task created as part of linked group ${generatedGroupId}`, now]);

          createdTaskIds.push(taskId);
        }
      });

      return res.status(201).json({
        id: createdTaskIds[0],
        taskIds: createdTaskIds,
        group_id: generatedGroupId,
        count: createdTaskIds.length,
        message: `Created ${createdTaskIds.length} linked tasks successfully`,
      });
    }

    // Single task creation with database integrity verification
    const taskId = `tsk-${crypto.randomUUID().slice(0, 8)}`;
    const rawPackageId = package_id !== undefined ? package_id : packageId;
    let targetProjectId = projectId || project_id || null;

    if (rawPackageId) {
      const pkg = queryOne<{ id: string; name: string; code: string; project_id: string | null }>(
        'SELECT id, name, code, project_id FROM packages WHERE id = ?',
        [rawPackageId]
      );
      if (!pkg) {
        return res.status(400).json({
          error: `Integrity Error: Package ID "${rawPackageId}" does not exist.`
        });
      }
      if (pkg.project_id) {
        if (targetProjectId && targetProjectId !== pkg.project_id) {
          return res.status(400).json({
            error: `Integrity Error: Package "${pkg.name}" (${pkg.code}) belongs to Project ID "${pkg.project_id}", but task project was set to "${targetProjectId}". The task's project must match the package's project.`
          });
        }
        targetProjectId = pkg.project_id;
      }
    }

    withTransaction(() => {
      run(`
        INSERT INTO tasks (
          id, project_id, title, description, type, category_id, package_id, priority, status,
          progress, start_date, deadline, forecast_finish, completed_date, assignee_id, pics, group_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        taskId,
        targetProjectId,
        title.trim(),
        description ? description.trim() : '',
        type,
        rawCategoryId || null,
        rawPackageId || null,
        priority,
        finalStatus,
        finalProgress,
        rawStartDate || null,
        deadline || null,
        rawForecastFinish || null,
        completedDate,
        rawAssigneeId || null,
        finalPics,
        group_id || null,
        now,
        now,
      ]);

      // Insert tags
      if (Array.isArray(tags)) {
        for (const tagId of tags) {
          if (tagId) {
            run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tagId]);
          }
        }
      }

      // Log creation activity
      const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
      run(`
        INSERT INTO task_activities (id, task_id, user_id, activity_type, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [actId, taskId, userId || assigneeId || null, 'TASK_CREATED', 'Task created in system', now]);
    });

    res.status(201).json({ id: taskId, group_id: group_id || null, message: 'Task created successfully' });
  } catch (err: any) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update task
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne<any>('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const {
      title,
      description,
      type,
      projectId,
      project_id,
      categoryId,
      category_id,
      packageId,
      package_id,
      priority,
      status,
      progress,
      startDate,
      start_date,
      deadline,
      forecastFinish,
      forecast_finish,
      completedDate,
      completed_date,
      assigneeId,
      assignee_id,
      tags,
      userId,
      syncGroup,
      syncGroupPackages,
      syncGroupProjects,
      removeMode = 'unlink',
      group_id: explicitGroupId,
    } = req.body;

    const now = new Date().toISOString();
    const todayYmd = getTodayYmd();

    const rawStartDate = start_date !== undefined ? start_date : startDate;
    const rawForecastFinish = forecast_finish !== undefined ? (forecast_finish ? String(forecast_finish).trim() : null) : (forecastFinish !== undefined ? (forecastFinish ? String(forecastFinish).trim() : null) : undefined);
    const rawCompletedDate = completed_date !== undefined ? completed_date : completedDate;
    const rawCategoryId = category_id !== undefined ? category_id : categoryId;
    const rawPackageId = package_id !== undefined ? package_id : packageId;
    const rawAssigneeId = assignee_id !== undefined ? assignee_id : assigneeId;
    const rawProjectId = project_id !== undefined ? project_id : projectId;

    // Authoritative State Machine Transition
    const normalized = normalizeTaskState({
      status,
      progress,
      completedDate: rawCompletedDate,
      existingStatus: existing.status,
      existingProgress: existing.progress,
      existingCompletedDate: existing.completed_date,
      today: todayYmd,
    });
    const effectiveStatus = normalized.status;
    const effectiveProgress = normalized.progress;
    const effectiveCompletedDate = normalized.completed_date;

    let targetProjectId = rawProjectId !== undefined ? rawProjectId : existing.project_id;
    if (rawPackageId) {
      const pkg = queryOne<{ id: string; name: string; code: string; project_id: string | null }>(
        'SELECT id, name, code, project_id FROM packages WHERE id = ?',
        [rawPackageId]
      );
      if (!pkg) {
        return res.status(400).json({
          error: `Integrity Error: Package ID "${rawPackageId}" does not exist.`
        });
      }
      if (pkg.project_id) {
        if (targetProjectId && targetProjectId !== pkg.project_id) {
          return res.status(400).json({
            error: `Integrity Error: Package "${pkg.name}" (${pkg.code}) belongs to Project ID "${pkg.project_id}", but task project was set to "${targetProjectId}". The task's project must match the package's project.`
          });
        }
        targetProjectId = pkg.project_id;
      }
    }

    // Activity tracking
    const activitiesToLog: Array<{ type: string; field: string; oldVal: any; newVal: any; note: string }> = [];

    if (effectiveStatus !== existing.status) {
      activitiesToLog.push({
        type: effectiveStatus === 'DONE' ? 'TASK_COMPLETED' : 'STATUS_CHANGED',
        field: 'status',
        oldVal: existing.status,
        newVal: effectiveStatus,
        note: `Status changed from ${existing.status} to ${effectiveStatus}`,
      });
    }

    if (effectiveProgress !== existing.progress) {
      activitiesToLog.push({
        type: 'PROGRESS_CHANGED',
        field: 'progress',
        oldVal: `${existing.progress}%`,
        newVal: `${effectiveProgress}%`,
        note: `Progress updated to ${effectiveProgress}%`,
      });
    }

    if (priority !== undefined && priority !== existing.priority) {
      activitiesToLog.push({
        type: 'PRIORITY_CHANGED',
        field: 'priority',
        oldVal: existing.priority,
        newVal: priority,
        note: `Priority changed from ${existing.priority} to ${priority}`,
      });
    }

    if (deadline !== undefined && deadline !== existing.deadline) {
      activitiesToLog.push({
        type: 'DEADLINE_CHANGED',
        field: 'deadline',
        oldVal: existing.deadline || 'None',
        newVal: deadline || 'None',
        note: `Deadline changed to ${deadline || 'None'}`,
      });
    }

    // Authoritative Forecast Revision Logic (Section 11)
    let effectiveForecastRevisionCount = Number(existing.forecast_revision_count) || 0;
    const finalForecastValue = rawForecastFinish !== undefined ? rawForecastFinish : existing.forecast_finish;

    if (rawForecastFinish !== undefined && rawForecastFinish !== existing.forecast_finish) {
      const hadExistingForecast = Boolean(existing.forecast_finish && existing.forecast_finish.trim() !== '');
      const hasNewForecast = Boolean(rawForecastFinish && rawForecastFinish.trim() !== '');

      if (!hadExistingForecast && hasNewForecast) {
        // Initial forecast: revision count remains 0
        activitiesToLog.push({
          type: 'FORECAST_CHANGED',
          field: 'forecast_finish',
          oldVal: existing.forecast_finish || 'None',
          newVal: rawForecastFinish,
          note: `Initial forecast finish date set to ${rawForecastFinish}`,
        });
      } else if (hadExistingForecast && hasNewForecast) {
        // Revision #1, #2, etc.
        effectiveForecastRevisionCount += 1;
        activitiesToLog.push({
          type: 'FORECAST_CHANGED',
          field: 'forecast_finish',
          oldVal: existing.forecast_finish || 'None',
          newVal: rawForecastFinish,
          note: `Forecast finish date revised to ${rawForecastFinish} (Revision #${effectiveForecastRevisionCount})`,
        });
      } else if (hadExistingForecast && !hasNewForecast) {
        // Cleared forecast: no revision count increment
        activitiesToLog.push({
          type: 'FORECAST_CHANGED',
          field: 'forecast_finish',
          oldVal: existing.forecast_finish,
          newVal: 'None',
          note: 'Forecast finish date cleared',
        });
      }
    }

    if (rawStartDate !== undefined && rawStartDate !== existing.start_date) {
      activitiesToLog.push({
        type: 'START_DATE_CHANGED',
        field: 'start_date',
        oldVal: existing.start_date || 'None',
        newVal: rawStartDate || 'None',
        note: `Start date changed to ${rawStartDate || 'None'}`,
      });
    }

    let activeGroupId = existing.group_id;
    if (!activeGroupId && Array.isArray(syncGroupPackages) && syncGroupPackages.length > 1) {
      activeGroupId = `grp-${crypto.randomUUID().slice(0, 10)}`;
    }

    withTransaction(() => {
      // Update target task
      run(`
        UPDATE tasks SET
          project_id = ?,
          title = ?,
          description = ?,
          type = ?,
          category_id = ?,
          package_id = ?,
          priority = ?,
          status = ?,
          progress = ?,
          start_date = ?,
          deadline = ?,
          forecast_finish = ?,
          forecast_revision_count = ?,
          completed_date = ?,
          assignee_id = ?,
          pics = ?,
          group_id = ?,
          updated_at = ?
        WHERE id = ?
      `, [
        targetProjectId || null,
        title !== undefined ? title.trim() : existing.title,
        description !== undefined ? description : existing.description,
        type !== undefined ? type : existing.type,
        rawCategoryId !== undefined ? (rawCategoryId || null) : existing.category_id,
        rawPackageId !== undefined ? (rawPackageId || null) : existing.package_id,
        priority !== undefined ? priority : existing.priority,
        effectiveStatus,
        effectiveProgress,
        rawStartDate !== undefined ? (rawStartDate || null) : existing.start_date,
        deadline !== undefined ? (deadline || null) : existing.deadline,
        finalForecastValue || null,
        effectiveForecastRevisionCount,
        effectiveCompletedDate,
        rawAssigneeId !== undefined ? (rawAssigneeId || null) : existing.assignee_id,
        req.body.pics !== undefined
          ? (Array.isArray(req.body.pics) ? JSON.stringify(req.body.pics) : String(req.body.pics))
          : existing.pics,
        activeGroupId || null,
        now,
        id,
      ]);

      // Update tags if provided
      if (Array.isArray(tags)) {
        run('DELETE FROM task_tags WHERE task_id = ?', [id]);
        for (const tagId of tags) {
          if (tagId) {
            run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [id, tagId]);
          }
        }
      }

      // Log activities
      for (const act of activitiesToLog) {
        const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
        run(`
          INSERT INTO task_activities (id, task_id, user_id, activity_type, field_name, old_value, new_value, note, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [actId, id, userId || existing.assignee_id || null, act.type, act.field, String(act.oldVal), String(act.newVal), act.note, now]);
      }

      // --- Linked Group Synchronization Logic ---
      if (activeGroupId && (syncGroup || Array.isArray(syncGroupPackages))) {
        const sharedTitle = title !== undefined ? title.trim() : existing.title;
        const sharedDesc = description !== undefined ? description : existing.description;
        const sharedType = type !== undefined ? type : existing.type;
        const sharedCategoryId = rawCategoryId !== undefined ? (rawCategoryId || null) : existing.category_id;
        const sharedPriority = priority !== undefined ? priority : existing.priority;
        const sharedPics = req.body.pics !== undefined
          ? (Array.isArray(req.body.pics) ? JSON.stringify(req.body.pics) : String(req.body.pics))
          : existing.pics;

        // 1. Sync shared fields to all sibling tasks in this group
        if (syncGroup) {
          run(`
            UPDATE tasks SET
              title = ?,
              description = ?,
              type = ?,
              category_id = ?,
              priority = ?,
              pics = COALESCE(?, pics),
              updated_at = ?
            WHERE group_id = ? AND id != ?
          `, [
            sharedTitle,
            sharedDesc,
            sharedType,
            sharedCategoryId,
            sharedPriority,
            sharedPics,
            now,
            activeGroupId,
            id,
          ]);

          // Sync tags to sibling tasks
          if (Array.isArray(tags)) {
            const siblingTasks = query<{ id: string }>('SELECT id FROM tasks WHERE group_id = ? AND id != ?', [activeGroupId, id]);
            for (const sib of siblingTasks) {
              run('DELETE FROM task_tags WHERE task_id = ?', [sib.id]);
              for (const tagId of tags) {
                if (tagId) {
                  run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [sib.id, tagId]);
                }
              }
            }
          }
        }

        // 2. Sync group packages (Add newly selected packages, remove/unlink deselected packages)
        if (Array.isArray(syncGroupPackages)) {
          const groupTasks = query<{ id: string; package_id: string | null }>(
            'SELECT id, package_id FROM tasks WHERE group_id = ?',
            [activeGroupId]
          );
          const currentPackageIds = groupTasks.filter((t) => t.package_id).map((t) => t.package_id as string);

          // A. Add tasks for newly selected packages:
          // Strictly inherit PIC, assignee, tags, priority, category, title, description (Section 7)
          const packagesToAdd = syncGroupPackages.filter((pId) => !currentPackageIds.includes(pId));
          const effectiveAssignee = rawAssigneeId !== undefined ? rawAssigneeId : existing.assignee_id;
          const currentTags = Array.isArray(tags) ? tags : query<{ tag_id: string }>('SELECT tag_id FROM task_tags WHERE task_id = ?', [id]).map((t) => t.tag_id);

          for (const newPkgId of packagesToAdd) {
            const pkg = queryOne<{ project_id: string }>('SELECT project_id FROM packages WHERE id = ?', [newPkgId]);
            const newTaskId = `tsk-${crypto.randomUUID().slice(0, 8)}`;
            run(`
              INSERT INTO tasks (
                id, project_id, title, description, type, category_id, package_id, priority, status,
                progress, start_date, deadline, forecast_finish, completed_date, assignee_id, pics, group_id,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              newTaskId,
              pkg?.project_id || null,
              sharedTitle,
              sharedDesc,
              sharedType,
              sharedCategoryId,
              newPkgId,
              sharedPriority,
              'TODO',
              0,
              rawStartDate || null,
              deadline || null,
              finalForecastValue || null,
              null,
              effectiveAssignee || null,
              sharedPics,
              activeGroupId,
              now,
              now,
            ]);

            for (const tagId of currentTags) {
              if (tagId) {
                run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [newTaskId, tagId]);
              }
            }

            const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
            run(`
              INSERT INTO task_activities (id, task_id, user_id, activity_type, note, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [actId, newTaskId, userId || null, 'TASK_CREATED', `Task added to linked group ${activeGroupId}`, now]);
          }

          // B. Remove tasks for deselected packages:
          const packagesToRemove = currentPackageIds.filter((pId) => !syncGroupPackages.includes(pId));
          for (const remPkgId of packagesToRemove) {
            if (existing.package_id === remPkgId) continue;
            if (removeMode === 'delete') {
              run('DELETE FROM tasks WHERE group_id = ? AND package_id = ?', [activeGroupId, remPkgId]);
            } else {
              run('UPDATE tasks SET group_id = NULL WHERE group_id = ? AND package_id = ?', [activeGroupId, remPkgId]);
            }
          }
        }
      }
    });

    res.json({ message: 'Task updated successfully', group_id: activeGroupId });
  } catch (err: any) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: err.message });
  }
});

// Unlink task from its linked group
router.post('/:id/unlink-group', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    run('UPDATE tasks SET group_id = NULL WHERE id = ?', [id]);
    res.json({ message: 'Task unlinked from group successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = queryOne('SELECT id FROM tasks WHERE id = ?', [id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // 1. Query physical attachment files for this task before deleting DB records
    const attachments = query<{ file_path: string; file_name: string }>(
      'SELECT file_path, file_name FROM task_attachments WHERE task_id = ?',
      [id]
    );

    // 2. Perform DB delete in atomic transaction (cascades to attachments, tags, comments, activities)
    withTransaction(() => {
      run('DELETE FROM tasks WHERE id = ?', [id]);
    });

    // 3. Delete physical files from disk only after DB transaction has committed
    for (const att of attachments) {
      deletePhysicalFile(att.file_path, att.file_name);
    }

    res.json({ message: 'Task and associated attachments deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add comment to task
router.post('/:id/comments', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, userId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const commentId = `cmt-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    withTransaction(() => {
      run(`
        INSERT INTO task_comments (id, task_id, user_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [commentId, id, userId || null, content.trim(), now]);

      // Log activity
      const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
      run(`
        INSERT INTO task_activities (id, task_id, user_id, activity_type, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [actId, id, userId || null, 'COMMENT_ADDED', `Added note/comment: ${content.trim().slice(0, 60)}...`, now]);

      // Touch task updated_at
      run('UPDATE tasks SET updated_at = ? WHERE id = ?', [now, id]);
    });

    res.status(201).json({ id: commentId, message: 'Comment added' });
  } catch (err: any) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update comment
router.put('/:id/comments/:commentId', (req: Request, res: Response) => {
  try {
    const { id, commentId } = req.params;
    const { content, userId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const existing = query('SELECT * FROM task_comments WHERE id = ? AND task_id = ?', [commentId, id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const now = new Date().toISOString();
    withTransaction(() => {
      run('UPDATE task_comments SET content = ? WHERE id = ? AND task_id = ?', [content.trim(), commentId, id]);

      // Log activity
      const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
      run(`
        INSERT INTO task_activities (id, task_id, user_id, activity_type, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [actId, id, userId || null, 'COMMENT_UPDATED', `Updated note/comment: ${content.trim().slice(0, 60)}...`, now]);

      run('UPDATE tasks SET updated_at = ? WHERE id = ?', [now, id]);
    });

    res.json({ message: 'Comment updated successfully' });
  } catch (err: any) {
    console.error('Error updating comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete comment
router.delete('/:id/comments/:commentId', (req: Request, res: Response) => {
  try {
    const { id, commentId } = req.params;

    const existing = query('SELECT * FROM task_comments WHERE id = ? AND task_id = ?', [commentId, id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const now = new Date().toISOString();
    withTransaction(() => {
      run('DELETE FROM task_comments WHERE id = ? AND task_id = ?', [commentId, id]);

      // Log activity
      const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
      run(`
        INSERT INTO task_activities (id, task_id, user_id, activity_type, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [actId, id, null, 'COMMENT_DELETED', 'Deleted a technical note/comment', now]);

      run('UPDATE tasks SET updated_at = ? WHERE id = ?', [now, id]);
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk update action (e.g. mark multiple tasks done, update priority, etc.)
router.post('/bulk', (req: Request, res: Response) => {
  try {
    const { taskIds, action, value, userId } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'taskIds array is required and cannot be empty' });
    }

    const validActions = ['MARK_DONE', 'SET_STATUS', 'SET_PRIORITY', 'DELETE'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `Invalid action "${action}". Allowed: ${validActions.join(', ')}` });
    }

    if (action === 'SET_STATUS') {
      const validStatuses = ['TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD', 'DONE', 'CANCELLED'];
      if (!validStatuses.includes(value)) {
        return res.status(400).json({ error: `Invalid status "${value}". Allowed: ${validStatuses.join(', ')}` });
      }
    }

    if (action === 'SET_PRIORITY') {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      if (!validPriorities.includes(value)) {
        return res.status(400).json({ error: `Invalid priority "${value}". Allowed: ${validPriorities.join(', ')}` });
      }
    }

    const now = new Date().toISOString();
    const today = getTodayYmd();
    const filesToDelete: Array<{ file_path: string; file_name: string }> = [];

    withTransaction(() => {
      for (const id of taskIds) {
        const existing = queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!existing) continue;

        if (action === 'MARK_DONE') {
          const normalized = normalizeTaskState({
            status: 'DONE',
            existingStatus: existing.status,
            existingProgress: existing.progress,
            today,
          });
          run(
            'UPDATE tasks SET status = ?, progress = ?, completed_date = ?, updated_at = ? WHERE id = ?',
            [normalized.status, normalized.progress, normalized.completed_date, now, id]
          );

          const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
          run(`
            INSERT INTO task_activities (id, task_id, user_id, activity_type, field_name, new_value, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [actId, id, userId || null, 'TASK_COMPLETED', 'status', 'DONE', 'Bulk marked as complete', now]);
        } else if (action === 'SET_STATUS') {
          const normalized = normalizeTaskState({
            status: value,
            existingStatus: existing.status,
            existingProgress: existing.progress,
            today,
          });
          run(
            'UPDATE tasks SET status = ?, progress = ?, completed_date = ?, updated_at = ? WHERE id = ?',
            [normalized.status, normalized.progress, normalized.completed_date, now, id]
          );

          const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
          run(`
            INSERT INTO task_activities (id, task_id, user_id, activity_type, field_name, old_value, new_value, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [actId, id, userId || null, normalized.status === 'DONE' ? 'TASK_COMPLETED' : 'STATUS_CHANGED', 'status', existing.status, normalized.status, `Bulk status change to ${normalized.status}`, now]);
        } else if (action === 'SET_PRIORITY') {
          run('UPDATE tasks SET priority = ?, updated_at = ? WHERE id = ?', [value, now, id]);

          const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
          run(`
            INSERT INTO task_activities (id, task_id, user_id, activity_type, field_name, old_value, new_value, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [actId, id, userId || null, 'PRIORITY_CHANGED', 'priority', existing.priority, value, `Bulk priority change to ${value}`, now]);
        } else if (action === 'DELETE') {
          const atts = query<{ file_path: string; file_name: string }>(
            'SELECT file_path, file_name FROM task_attachments WHERE task_id = ?',
            [id]
          );
          filesToDelete.push(...atts);
          run('DELETE FROM tasks WHERE id = ?', [id]);
        }
      }
    });

    if (action === 'DELETE' && filesToDelete.length > 0) {
      for (const att of filesToDelete) {
        deletePhysicalFile(att.file_path, att.file_name);
      }
    }

    res.json({ message: `Bulk action "${action}" completed successfully on ${taskIds.length} tasks` });
  } catch (err: any) {
    console.error('Error performing bulk action:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
