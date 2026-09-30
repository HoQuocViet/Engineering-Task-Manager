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
      const taskIds = urgentTasks.map((t: any) => `'${t.id}'`).join(',');
      const tagsSql = `
        SELECT tt.task_id, tg.id, tg.name, tg.color 
        FROM task_tags tt
        JOIN tags tg ON tt.tag_id = tg.id
        WHERE tt.task_id IN (${taskIds})
      `;
      const allTags = query(tagsSql);
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
    });
  } catch (err: any) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
