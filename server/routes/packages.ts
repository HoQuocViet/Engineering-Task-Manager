import express, { Request, Response } from 'express';
import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';

const router = express.Router();

function getTodayYmd(): string {
  return new Date().toISOString().split('T')[0];
}

// Get all packages with aggregated statistics
router.get('/', (req: Request, res: Response) => {
  try {
    const today = getTodayYmd();
    const { projectId } = req.query;

    let whereClause = '1=1';
    const params: any[] = [today];

    if (projectId && typeof projectId === 'string' && projectId !== 'ALL') {
      whereClause = 'p.project_id = ?';
      params.push(projectId);
    }

    const sql = `
      SELECT 
        p.*,
        pr.name as project_name,
        pr.code as project_code,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as done_tasks,
        SUM(CASE WHEN t.status IN ('TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD') THEN 1 ELSE 0 END) as open_tasks,
        SUM(CASE WHEN t.status = 'IN PROGRESS' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN t.status = 'WAITING' THEN 1 ELSE 0 END) as waiting_tasks,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline IS NOT NULL AND t.deadline < ? THEN 1 ELSE 0 END) as overdue_tasks,
        AVG(CASE 
          WHEN t.id IS NULL THEN 0.0
          WHEN t.status = 'DONE' THEN 100.0
          WHEN t.status = 'TODO' THEN 0.0
          WHEN t.status = 'CANCELLED' THEN NULL
          ELSE COALESCE(t.progress, 0.0)
        END) as avg_progress
      FROM packages p
      LEFT JOIN projects pr ON p.project_id = pr.id
      LEFT JOIN tasks t ON p.id = t.package_id
      WHERE ${whereClause}
      GROUP BY p.id
      ORDER BY p.code ASC
    `;

    const packages = query(sql, params);

    // Also calculate general unassigned tasks
    const generalSql = `
      SELECT 
        'GENERAL' as id,
        'General Engineering (Unassigned)' as name,
        'GEN' as code,
        'Tasks not assigned to any specific procurement package' as description,
        'ACTIVE' as status,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as done_tasks,
        SUM(CASE WHEN t.status IN ('TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD') THEN 1 ELSE 0 END) as open_tasks,
        SUM(CASE WHEN t.status = 'IN PROGRESS' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN t.status = 'WAITING' THEN 1 ELSE 0 END) as waiting_tasks,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline IS NOT NULL AND t.deadline < ? THEN 1 ELSE 0 END) as overdue_tasks,
        AVG(CASE 
          WHEN t.id IS NULL THEN 0.0
          WHEN t.status = 'DONE' THEN 100.0
          WHEN t.status = 'TODO' THEN 0.0
          WHEN t.status = 'CANCELLED' THEN NULL
          ELSE COALESCE(t.progress, 0.0)
        END) as avg_progress
      FROM tasks t
      WHERE t.package_id IS NULL
    `;
    const general = queryOne(generalSql, [today]);

    res.json({
      packages,
      general,
    });
  } catch (err: any) {
    console.error('Error fetching packages:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get package by ID with drilldown metrics & recent tasks
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const today = getTodayYmd();

    let packageData = null;
    if (id === 'GENERAL') {
      packageData = {
        id: 'GENERAL',
        name: 'General Engineering',
        code: 'GEN',
        description: 'General discipline and unassigned package tasks',
        status: 'ACTIVE',
      };
    } else {
      packageData = queryOne(`
        SELECT p.*, pr.name as project_name, pr.code as project_code
        FROM packages p
        LEFT JOIN projects pr ON p.project_id = pr.id
        WHERE p.id = ?
      `, [id]);
      if (!packageData) return res.status(404).json({ error: 'Package not found' });
    }

    const wherePackage = id === 'GENERAL' ? 't.package_id IS NULL' : 't.package_id = ?';
    const params = id === 'GENERAL' ? [today] : [id, today];

    const stats = queryOne(id === 'GENERAL' ? `
      SELECT 
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as done_tasks,
        SUM(CASE WHEN t.status IN ('TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD') THEN 1 ELSE 0 END) as open_tasks,
        SUM(CASE WHEN t.status = 'IN PROGRESS' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN t.status = 'WAITING' THEN 1 ELSE 0 END) as waiting_tasks,
        SUM(CASE WHEN t.priority = 'CRITICAL' AND t.status != 'DONE' THEN 1 ELSE 0 END) as critical_tasks,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline IS NOT NULL AND t.deadline < ? THEN 1 ELSE 0 END) as overdue_tasks,
        AVG(t.progress) as avg_progress
      FROM tasks t
      WHERE t.package_id IS NULL
    ` : `
      SELECT 
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as done_tasks,
        SUM(CASE WHEN t.status IN ('TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD') THEN 1 ELSE 0 END) as open_tasks,
        SUM(CASE WHEN t.status = 'IN PROGRESS' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN t.status = 'WAITING' THEN 1 ELSE 0 END) as waiting_tasks,
        SUM(CASE WHEN t.priority = 'CRITICAL' AND t.status != 'DONE' THEN 1 ELSE 0 END) as critical_tasks,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline IS NOT NULL AND t.deadline < ? THEN 1 ELSE 0 END) as overdue_tasks,
        AVG(t.progress) as avg_progress
      FROM tasks t
      WHERE t.package_id = ?
    `, id === 'GENERAL' ? [today] : [today, id]);

    // Fetch tasks under this package
    const tasksSql = `
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        u.name as assignee_name
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE ${wherePackage}
      ORDER BY 
        CASE WHEN t.status != 'DONE' THEN 0 ELSE 1 END,
        t.deadline ASC NULLS LAST
    `;
    const tasks = query(tasksSql, id === 'GENERAL' ? [] : [id]);

    res.json({
      package: packageData,
      stats: stats || {},
      tasks,
    });
  } catch (err: any) {
    console.error('Error getting package details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create package
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, code, description, status = 'ACTIVE', projectId, project_id, discipline, vendor } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Package name is required' });
    if (!code || !code.trim()) return res.status(400).json({ error: 'Package code is required' });

    const id = `pkg-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const targetProjectId = projectId || project_id || null;

    run(
      'INSERT INTO packages (id, project_id, name, code, description, discipline, vendor, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        targetProjectId,
        name.trim(),
        code.trim().toUpperCase(),
        description ? description.trim() : '',
        discipline ? discipline.trim() : '',
        vendor ? vendor.trim() : '',
        status,
        now,
        now
      ]
    );

    res.status(201).json({ id, message: 'Package created successfully' });
  } catch (err: any) {
    console.error('Error creating package:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update package
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description, status, projectId, project_id, discipline, vendor } = req.body;

    const now = new Date().toISOString();

    const existing = queryOne('SELECT * FROM packages WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Package not found' });

    const targetProjectId = projectId !== undefined ? projectId : (project_id !== undefined ? project_id : existing.project_id);

    run(`
      UPDATE packages SET
        project_id = ?,
        name = ?,
        code = ?,
        description = ?,
        discipline = ?,
        vendor = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      targetProjectId || null,
      name !== undefined ? name.trim() : existing.name,
      code !== undefined ? code.trim().toUpperCase() : existing.code,
      description !== undefined ? description : existing.description,
      discipline !== undefined ? (discipline ? discipline.trim() : '') : (existing.discipline || ''),
      vendor !== undefined ? (vendor ? vendor.trim() : '') : (existing.vendor || ''),
      status !== undefined ? status : existing.status,
      now,
      id,
    ]);

    res.json({ message: 'Package updated successfully' });
  } catch (err: any) {
    console.error('Error updating package:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete / Archive package
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Disassociate tasks rather than deleting them
    run('UPDATE tasks SET package_id = NULL WHERE package_id = ?', [id]);
    run('DELETE FROM packages WHERE id = ?', [id]);
    res.json({ message: 'Package deleted. Tasks have been moved to General.' });
  } catch (err: any) {
    console.error('Error deleting package:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
