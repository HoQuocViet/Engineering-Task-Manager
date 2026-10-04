import express, { Request, Response } from 'express';
import { query, queryOne } from '../db.js';

const router = express.Router();

function getTodayYmd(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

router.get('/stats', (req: Request, res: Response) => {
  try {
    const today = getTodayYmd();
    const tomorrow = getDateOffset(1);
    const in7Days = getDateOffset(7);
    const in14Days = getDateOffset(14);

    const { projectId, userId } = req.query;

    // Filter clauses for tasks
    const whereConditions: string[] = ['1=1'];
    const filterParams: any[] = [];

    if (projectId && typeof projectId === 'string' && projectId !== 'ALL') {
      whereConditions.push('(t.project_id = ? OR (t.project_id IS NULL AND p.project_id = ?))');
      filterParams.push(projectId, projectId);
    }

    if (userId && typeof userId === 'string' && userId !== 'ALL') {
      whereConditions.push('t.assignee_id = ?');
      filterParams.push(userId);
    }

    const whereTaskSql = whereConditions.join(' AND ');

    // 1. Core KPIs
    const kpiSql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN t.status = 'TODO' THEN 1 ELSE 0 END) as todo,
        SUM(CASE WHEN t.status = 'IN PROGRESS' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN t.status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN t.status = 'ON HOLD' THEN 1 ELSE 0 END) as on_hold,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN t.status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline IS NOT NULL AND t.deadline < ? THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline = ? THEN 1 ELSE 0 END) as due_today,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline = ? THEN 1 ELSE 0 END) as due_tomorrow,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline >= ? AND t.deadline <= ? THEN 1 ELSE 0 END) as due_this_week,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.priority = 'CRITICAL' THEN 1 ELSE 0 END) as critical_open,
        AVG(CASE 
          WHEN t.status = 'DONE' THEN 100.0
          WHEN t.status = 'TODO' THEN 0.0
          WHEN t.status = 'CANCELLED' THEN NULL
          ELSE COALESCE(t.progress, 0.0)
        END) as avg_progress
      FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      WHERE ${whereTaskSql}
    `;
    const kpis = queryOne(kpiSql, [today, today, tomorrow, today, in7Days, ...filterParams]);

    // 2. Tasks by Status
    const statusSql = `
      SELECT 
        t.status as name,
        COUNT(*) as count
      FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      WHERE ${whereTaskSql}
      GROUP BY t.status
      ORDER BY 
        CASE t.status 
          WHEN 'TODO' THEN 1 
          WHEN 'IN PROGRESS' THEN 2 
          WHEN 'WAITING' THEN 3 
          WHEN 'ON HOLD' THEN 4 
          WHEN 'DONE' THEN 5 
          ELSE 6 END
    `;
    const statusBreakdown = query(statusSql, filterParams);

    // 3. Tasks by Priority
    const prioritySql = `
      SELECT 
        t.priority as name,
        COUNT(*) as count,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as done_count,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' THEN 1 ELSE 0 END) as open_count
      FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      WHERE ${whereTaskSql}
      GROUP BY t.priority
      ORDER BY 
        CASE t.priority 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          WHEN 'LOW' THEN 4 
          ELSE 5 END
    `;
    const priorityBreakdown = query(prioritySql, filterParams);

    // 4. Tasks by Package
    const packageSql = `
      SELECT 
        COALESCE(p.id, 'GENERAL') as id,
        COALESCE(p.name, 'General Engineering') as name,
        COALESCE(p.code, 'GEN') as code,
        p.project_id as project_id,
        pr.name as project_name,
        pr.code as project_code,
        COUNT(t.id) as total,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN t.status IN ('TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD') THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN t.status = 'IN PROGRESS' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN t.status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN t.status = 'TODO' THEN 1 ELSE 0 END) as todo,
        SUM(CASE WHEN t.status = 'ON HOLD' THEN 1 ELSE 0 END) as on_hold,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline IS NOT NULL AND t.deadline < ? THEN 1 ELSE 0 END) as overdue,
        AVG(CASE 
          WHEN t.id IS NULL THEN 0.0
          WHEN t.status = 'DONE' THEN 100.0
          WHEN t.status = 'TODO' THEN 0.0
          WHEN t.status = 'CANCELLED' THEN NULL
          ELSE COALESCE(t.progress, 0.0)
        END) as progress
      FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      LEFT JOIN projects pr ON (p.project_id = pr.id OR t.project_id = pr.id)
      WHERE ${whereTaskSql}
      GROUP BY p.id, p.name, p.code, p.project_id, pr.name, pr.code
      ORDER BY open DESC, total DESC
    `;
    const packageBreakdown = query(packageSql, [today, ...filterParams]);

    // 5. Tasks by Project (Project Breakdown)
    const projectBreakdownSql = `
      SELECT 
        COALESCE(pr.id, 'UNASSIGNED') as id,
        COALESCE(pr.name, 'Independent / General') as name,
        COALESCE(pr.code, 'GEN') as code,
        pr.client as client,
        pr.status as project_status,
        COUNT(t.id) as total,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN t.status IN ('TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD') THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN t.status = 'IN PROGRESS' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN t.status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN t.status = 'TODO' THEN 1 ELSE 0 END) as todo,
        SUM(CASE WHEN t.status = 'ON HOLD' THEN 1 ELSE 0 END) as on_hold,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline IS NOT NULL AND t.deadline < ? THEN 1 ELSE 0 END) as overdue,
        AVG(CASE 
          WHEN t.id IS NULL THEN 0.0
          WHEN t.status = 'DONE' THEN 100.0
          WHEN t.status = 'TODO' THEN 0.0
          WHEN t.status = 'CANCELLED' THEN NULL
          ELSE COALESCE(t.progress, 0.0)
        END) as progress
      FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      LEFT JOIN projects pr ON (t.project_id = pr.id OR (t.project_id IS NULL AND p.project_id = pr.id))
      GROUP BY pr.id, pr.name, pr.code, pr.client, pr.status
      ORDER BY open DESC, total DESC
    `;
    const projectBreakdownRaw = query(projectBreakdownSql, [today]);
    const projectBreakdown = projectBreakdownRaw.map((proj: any) => {
      const projPkgs = packageBreakdown.filter((pkg: any) =>
        (proj.id === 'UNASSIGNED' && (!pkg.project_id || pkg.project_id === 'UNASSIGNED')) ||
        pkg.project_id === proj.id
      );
      return {
        ...proj,
        packages: projPkgs,
      };
    });

    // 6. User / Engineer Performance Matrix (All Users including Admin)
    const userBreakdownSql = `
      SELECT 
        u.id,
        u.name,
        u.role,
        u.avatar,
        u.is_admin,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as done_tasks,
        SUM(CASE WHEN t.status IN ('TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD') THEN 1 ELSE 0 END) as open_tasks,
        SUM(CASE WHEN t.status = 'IN PROGRESS' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN t.status = 'WAITING' THEN 1 ELSE 0 END) as waiting_tasks,
        SUM(CASE WHEN t.priority = 'CRITICAL' AND t.status != 'DONE' THEN 1 ELSE 0 END) as critical_tasks,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline IS NOT NULL AND t.deadline < ? THEN 1 ELSE 0 END) as overdue_tasks,
        AVG(CASE 
          WHEN t.id IS NULL THEN 0.0
          WHEN t.status = 'DONE' THEN 100.0
          WHEN t.status = 'TODO' THEN 0.0
          WHEN t.status = 'CANCELLED' THEN NULL
          ELSE COALESCE(t.progress, 0.0)
        END) as avg_progress
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assignee_id
      GROUP BY u.id
      ORDER BY open_tasks DESC, total_tasks DESC, u.name ASC
    `;
    const userBreakdown = query(userBreakdownSql, [today]);

    // 7. Deadline Distribution Buckets
    const deadlineBuckets = [
      {
        bucket: 'Overdue',
        count: queryOne<{ cnt: number }>(
          `SELECT COUNT(*) as cnt FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE t.deadline IS NOT NULL AND t.deadline < ? AND t.status != 'DONE' AND t.status != 'CANCELLED' AND ${whereTaskSql}`,
          [today, ...filterParams]
        )?.cnt || 0,
        color: '#ef4444',
      },
      {
        bucket: 'Due Today',
        count: queryOne<{ cnt: number }>(
          `SELECT COUNT(*) as cnt FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE t.deadline = ? AND t.status != 'DONE' AND t.status != 'CANCELLED' AND ${whereTaskSql}`,
          [today, ...filterParams]
        )?.cnt || 0,
        color: '#f97316',
      },
      {
        bucket: 'Due Tomorrow',
        count: queryOne<{ cnt: number }>(
          `SELECT COUNT(*) as cnt FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE t.deadline = ? AND t.status != 'DONE' AND t.status != 'CANCELLED' AND ${whereTaskSql}`,
          [tomorrow, ...filterParams]
        )?.cnt || 0,
        color: '#eab308',
      },
      {
        bucket: 'This Week',
        count: queryOne<{ cnt: number }>(
          `SELECT COUNT(*) as cnt FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE t.deadline > ? AND t.deadline <= ? AND t.status != 'DONE' AND t.status != 'CANCELLED' AND ${whereTaskSql}`,
          [tomorrow, in7Days, ...filterParams]
        )?.cnt || 0,
        color: '#3b82f6',
      },
      {
        bucket: 'Next Week',
        count: queryOne<{ cnt: number }>(
          `SELECT COUNT(*) as cnt FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE t.deadline > ? AND t.deadline <= ? AND t.status != 'DONE' AND t.status != 'CANCELLED' AND ${whereTaskSql}`,
          [in7Days, in14Days, ...filterParams]
        )?.cnt || 0,
        color: '#8b5cf6',
      },
      {
        bucket: 'Later / None',
        count: queryOne<{ cnt: number }>(
          `SELECT COUNT(*) as cnt FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE (t.deadline > ? OR t.deadline IS NULL) AND t.status != 'DONE' AND t.status != 'CANCELLED' AND ${whereTaskSql}`,
          [in14Days, ...filterParams]
        )?.cnt || 0,
        color: '#64748b',
      },
    ];

    // 8. Critical Priority Focus Tasks
    const urgentTasksSql = `
      SELECT 
        t.*,
        COALESCE(t.project_id, p.project_id) as effective_project_id,
        p.name as package_name,
        p.code as package_code,
        pr.name as project_name,
        pr.code as project_code,
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
      WHERE t.status != 'DONE' AND t.status != 'CANCELLED' 
        AND t.priority = 'CRITICAL'
        AND ${whereTaskSql}
      ORDER BY 
        CASE WHEN t.deadline IS NULL THEN 1 ELSE 0 END,
        t.deadline ASC,
        t.created_at DESC
      LIMIT 50
    `;
    const urgentTasks = query(urgentTasksSql, filterParams);

    // Fetch tags for urgent tasks
    if (urgentTasks.length > 0) {
      const placeholders = urgentTasks.map(() => '?').join(',');
      const tagsSql = `
        SELECT tt.task_id, tg.id, tg.name, tg.color 
        FROM task_tags tt
        JOIN tags tg ON tt.tag_id = tg.id
        WHERE tt.task_id IN (${placeholders})
      `;
      const allTags = query(tagsSql, urgentTasks.map((t: any) => t.id));
      const tagsByTaskId = new Map<string, any[]>();
      for (const tg of allTags) {
        if (!tagsByTaskId.has(tg.task_id)) tagsByTaskId.set(tg.task_id, []);
        tagsByTaskId.get(tg.task_id)!.push({ id: tg.id, name: tg.name, color: tg.color });
      }

      for (const t of urgentTasks) {
        t.tags = tagsByTaskId.get(t.id) || [];
      }
    }

    // 9. Recent System Activity
    const recentActivitiesSql = `
      SELECT 
        act.*,
        t.title as task_title,
        u.name as user_name,
        u.avatar as user_avatar
      FROM task_activities act
      JOIN tasks t ON act.task_id = t.id
      LEFT JOIN users u ON act.user_id = u.id
      ORDER BY act.created_at DESC
      LIMIT 40
    `;
    const recentActivities = query(recentActivitiesSql);

    // 10. Bulletins & Engineering Resources summary for Dashboard widget
    const bulletinsPinned = query(`
      SELECT b.*, pr.code as project_code, pk.code as package_code
      FROM bulletin_resources b
      LEFT JOIN projects pr ON b.project_id = pr.id
      LEFT JOIN packages pk ON b.package_id = pk.id
      WHERE b.status = 'ACTIVE' AND b.pinned = 1
      ORDER BY b.open_count DESC, b.display_name ASC
      LIMIT 6
    `);

    const bulletinsRecent = query(`
      SELECT b.*, pr.code as project_code, pk.code as package_code
      FROM bulletin_resources b
      LEFT JOIN projects pr ON b.project_id = pr.id
      LEFT JOIN packages pk ON b.package_id = pk.id
      WHERE b.status = 'ACTIVE' AND b.last_opened IS NOT NULL
      ORDER BY b.last_opened DESC
      LIMIT 6
    `);

    const bulletinsReviewRequired = query(`
      SELECT b.*, pr.code as project_code, pk.code as package_code
      FROM bulletin_resources b
      LEFT JOIN projects pr ON b.project_id = pr.id
      LEFT JOIN packages pk ON b.package_id = pk.id
      WHERE b.status = 'ACTIVE' AND b.next_review IS NOT NULL AND b.next_review <= ?
      ORDER BY b.next_review ASC
      LIMIT 6
    `, [today]);

    const bulletinAnnouncements = query(`
      SELECT a.*, u.name as author_name
      FROM bulletin_announcements a
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.is_pinned DESC, a.created_at DESC
      LIMIT 4
    `);

    const bulletinsWidget = {
      pinned: bulletinsPinned.map((b: any) => ({ ...b, pinned: Boolean(b.pinned) })),
      recent: bulletinsRecent.map((b: any) => ({ ...b, pinned: Boolean(b.pinned) })),
      reviewRequired: bulletinsReviewRequired.map((b: any) => ({ ...b, pinned: Boolean(b.pinned) })),
      announcements: bulletinAnnouncements.map((a: any) => ({ ...a, is_pinned: Boolean(a.is_pinned) })),
    };

    // 11. Instrument Team Leader KPI Summary (Requirement 15)
    const myUserId = (req.query.userId as string) || 'usr-1';
    const myOpenTasks = queryOne<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      WHERE t.status != 'DONE' AND t.status != 'CANCELLED'
        AND (t.assignee_id = ? OR t.pics LIKE ?)
        AND ${whereTaskSql}
    `, [myUserId, `%Ho Quoc Viet%`, ...filterParams])?.cnt || 0;

    const teamOpenTasks = queryOne<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      WHERE t.status != 'DONE' AND t.status != 'CANCELLED'
        AND ${whereTaskSql}
    `, filterParams)?.cnt || 0;

    const dueTodayCount = queryOne<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      WHERE t.status != 'DONE' AND t.status != 'CANCELLED'
        AND t.deadline = ?
        AND ${whereTaskSql}
    `, [today, ...filterParams])?.cnt || 0;

    const interfaceOpenCount = queryOne<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM task_interfaces i
      JOIN tasks t ON i.task_id = t.id
      LEFT JOIN packages p ON t.package_id = p.id
      WHERE i.status IN ('OPEN', 'WAITING')
        AND ${whereTaskSql}
    `, filterParams)?.cnt || 0;

    const followUpTodayCount = queryOne<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM task_interfaces i
      JOIN tasks t ON i.task_id = t.id
      LEFT JOIN packages p ON t.package_id = p.id
      WHERE i.status IN ('OPEN', 'WAITING')
        AND (i.next_follow_up = ? OR (i.next_follow_up IS NULL AND i.due_date = ?))
        AND ${whereTaskSql}
    `, [today, today, ...filterParams])?.cnt || 0;

    const forecastSlipCount = queryOne<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      WHERE t.status != 'DONE' AND t.status != 'CANCELLED'
        AND t.forecast_finish IS NOT NULL AND t.deadline IS NOT NULL
        AND t.forecast_finish > t.deadline
        AND ${whereTaskSql}
    `, filterParams)?.cnt || 0;

    const criticalOpenCount = queryOne<{ cnt: number }>(`
      SELECT COUNT(*) as cnt FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      WHERE t.status != 'DONE' AND t.status != 'CANCELLED'
        AND t.priority = 'CRITICAL'
        AND ${whereTaskSql}
    `, filterParams)?.cnt || 0;

    const instrumentKpis = {
      my_open_tasks: Number(myOpenTasks),
      team_open_tasks: Number(teamOpenTasks),
      overdue: Number(kpis.overdue),
      due_this_week: Number(deadlineBuckets[2]?.count || 0) + Number(dueTodayCount),
      waiting: Number(kpis.waiting),
      interface_open: Number(interfaceOpenCount),
      due_today: Number(dueTodayCount),
      follow_up_today: Number(followUpTodayCount),
      critical_open: Number(criticalOpenCount),
      forecast_slip: Number(forecastSlipCount),
    };

    // 12. Instrument Team Workload (Requirement 16)
    const instrumentUsers = query(`
      SELECT u.id, u.name, u.role, u.avatar
      FROM users u
      WHERE u.discipline = 'Instrument' OR u.role LIKE '%Instrument%' OR u.is_team_lead = 1
      ORDER BY u.is_team_lead DESC, u.name ASC
    `);

    const teamWorkload = instrumentUsers.map((u: any) => {
      const uStats = queryOne<any>(`
        SELECT 
          COUNT(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' THEN 1 END) as open_cnt,
          COUNT(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline <= ? AND t.deadline >= ? THEN 1 END) as due_this_week_cnt,
          COUNT(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline < ? THEN 1 END) as overdue_cnt,
          COUNT(CASE WHEN t.status = 'WAITING' THEN 1 END) as waiting_cnt,
          COUNT(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.priority = 'CRITICAL' THEN 1 END) as critical_cnt,
          AVG(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' THEN t.progress ELSE NULL END) as avg_prog
        FROM tasks t
        LEFT JOIN packages p ON t.package_id = p.id
        WHERE (t.assignee_id = ? OR t.pics LIKE ? OR t.pics LIKE ?)
          AND ${whereTaskSql}
      `, [in7Days, today, today, u.id, `%${u.name}%`, `%${u.id}%`, ...filterParams]) || {};

      return {
        id: u.id,
        name: u.name,
        role: u.role,
        avatar: u.avatar,
        open: Number(uStats.open_cnt || 0),
        due_this_week: Number(uStats.due_this_week_cnt || 0),
        overdue: Number(uStats.overdue_cnt || 0),
        waiting: Number(uStats.waiting_cnt || 0),
        critical: Number(uStats.critical_cnt || 0),
        avg_progress: Math.round(Number(uStats.avg_prog || 0)),
      };
    });

    // 13. Multidisciplinary Interface Summary for Dashboard (Requirement 17)
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
    ];

    const rawInterfaceStats = query(`
      SELECT 
        i.discipline,
        COUNT(CASE WHEN i.status = 'OPEN' THEN 1 END) as open_count,
        COUNT(CASE WHEN i.status = 'WAITING' THEN 1 END) as waiting_count,
        COUNT(CASE WHEN i.status = 'RECEIVED' THEN 1 END) as received_count,
        COUNT(CASE WHEN i.status = 'CLOSED' THEN 1 END) as closed_count,
        COUNT(*) as total_count
      FROM task_interfaces i
      JOIN tasks t ON i.task_id = t.id
      LEFT JOIN packages p ON t.package_id = p.id
      WHERE ${whereTaskSql}
      GROUP BY i.discipline
    `, filterParams);

    const itfMap = new Map<string, any>();
    for (const row of rawInterfaceStats) {
      itfMap.set(row.discipline, row);
    }

    const interfaceFollowUp = disciplines.map((disc) => {
      const match = itfMap.get(disc);
      return {
        discipline: disc,
        open: match ? Number(match.open_count) : 0,
        waiting: match ? Number(match.waiting_count) : 0,
        received: match ? Number(match.received_count) : 0,
        closed: match ? Number(match.closed_count) : 0,
        total: match ? Number(match.total_count) : 0,
      };
    });

    // 14. Urgent Interface Follow-Ups (Top items needing action today or overdue)
    const urgentFollowUps = query(`
      SELECT 
        i.*,
        t.title as task_title,
        t.status as task_status,
        t.priority as task_priority,
        pr.code as project_code,
        pk.code as package_code,
        u.name as assignee_name
      FROM task_interfaces i
      JOIN tasks t ON i.task_id = t.id
      LEFT JOIN packages pk ON t.package_id = pk.id
      LEFT JOIN projects pr ON (t.project_id = pr.id OR (t.project_id IS NULL AND pk.project_id = pr.id))
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE i.status IN ('OPEN', 'WAITING')
        AND ((i.next_follow_up IS NOT NULL AND i.next_follow_up <= ?) OR (i.due_date IS NOT NULL AND i.due_date <= ?))
        AND ${whereTaskSql}
      ORDER BY 
        CASE WHEN i.next_follow_up IS NOT NULL AND i.next_follow_up < ? THEN 1
             WHEN i.next_follow_up = ? THEN 2
             WHEN i.due_date IS NOT NULL AND i.due_date < ? THEN 3
             WHEN i.due_date = ? THEN 4
             ELSE 5 END,
        i.next_follow_up ASC,
        i.due_date ASC
      LIMIT 8
    `, [in7Days, in7Days, ...filterParams, today, today, today, today]);

    res.json({
      kpis,
      statusBreakdown,
      priorityBreakdown,
      packageBreakdown,
      projectBreakdown,
      userBreakdown,
      deadlineBuckets,
      urgentTasks,
      recentActivities,
      bulletinsWidget,
      instrumentKpis,
      teamWorkload,
      interfaceFollowUp,
      urgentFollowUps,
    });
  } catch (err: any) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
