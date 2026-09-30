import express, { Request, Response } from 'express';
import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';

const router = express.Router();

function getTodayYmd(): string {
  return new Date().toISOString().split('T')[0];
}

// GET all projects with aggregated metrics
router.get('/', (req: Request, res: Response) => {
  try {
    const today = getTodayYmd();
    const sql = `
      SELECT 
        pr.*,
        (SELECT COUNT(*) FROM packages WHERE project_id = pr.id) as total_packages,
        (SELECT COUNT(*) FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE t.project_id = pr.id OR p.project_id = pr.id) as total_tasks,
        (SELECT COUNT(*) FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE (t.project_id = pr.id OR p.project_id = pr.id) AND t.status = 'DONE') as done_tasks,
        (SELECT COUNT(*) FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE (t.project_id = pr.id OR p.project_id = pr.id) AND t.status IN ('TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD')) as open_tasks,
        (SELECT COUNT(*) FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE (t.project_id = pr.id OR p.project_id = pr.id) AND t.status = 'IN PROGRESS') as in_progress_tasks,
        (SELECT COUNT(*) FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE (t.project_id = pr.id OR p.project_id = pr.id) AND t.status = 'WAITING') as waiting_tasks,
        (SELECT COUNT(*) FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE (t.project_id = pr.id OR p.project_id = pr.id) AND t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline IS NOT NULL AND t.deadline < ?) as overdue_tasks,
        (SELECT COALESCE(AVG(CASE 
          WHEN t.status = 'DONE' THEN 100.0 
          WHEN t.status = 'TODO' THEN 0.0 
          WHEN t.status = 'CANCELLED' THEN NULL 
          ELSE COALESCE(t.progress, 0.0) 
        END), 0) FROM tasks t LEFT JOIN packages p ON t.package_id = p.id WHERE t.project_id = pr.id OR p.project_id = pr.id) as avg_progress
      FROM projects pr
      ORDER BY pr.code ASC
    `;

    const projects = query(sql, [today]);
    res.json(projects);
  } catch (err: any) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET single project details with packages and tasks
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const today = getTodayYmd();

    const project = queryOne('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Associated packages
    const packagesSql = `
      SELECT 
        p.*,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as done_tasks,
        SUM(CASE WHEN t.status IN ('TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD') THEN 1 ELSE 0 END) as open_tasks,
        SUM(CASE WHEN t.status != 'DONE' AND t.status != 'CANCELLED' AND t.deadline IS NOT NULL AND t.deadline < ? THEN 1 ELSE 0 END) as overdue_tasks,
        AVG(CASE 
          WHEN t.id IS NULL THEN 0.0
          WHEN t.status = 'DONE' THEN 100.0
          WHEN t.status = 'TODO' THEN 0.0
          WHEN t.status = 'CANCELLED' THEN NULL
          ELSE COALESCE(t.progress, 0.0)
        END) as avg_progress
      FROM packages p
      LEFT JOIN tasks t ON p.id = t.package_id
      WHERE p.project_id = ?
      GROUP BY p.id
      ORDER BY p.code ASC
    `;
    const packages = query(packagesSql, [today, id]);

    // Tasks under this project (either directly assigned to project or via its packages)
    const tasksSql = `
      SELECT 
        t.*,
        p.name as package_name,
        p.code as package_code,
        pr.name as project_name,
        pr.code as project_code,
        c.name as category_name,
        c.color as category_color,
        u.name as assignee_name,
        u.avatar as assignee_avatar
      FROM tasks t
      LEFT JOIN packages p ON t.package_id = p.id
      LEFT JOIN projects pr ON t.project_id = pr.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.project_id = ? OR (t.project_id IS NULL AND t.package_id IN (SELECT id FROM packages WHERE project_id = ?))
      ORDER BY 
        CASE WHEN t.status != 'DONE' THEN 0 ELSE 1 END,
        t.deadline ASC NULLS LAST
    `;
    const tasks = query(tasksSql, [id, id]);

    // Stats
    const statsSql = `
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
      WHERE t.project_id = ? OR (t.project_id IS NULL AND t.package_id IN (SELECT id FROM packages WHERE project_id = ?))
    `;
    const stats = queryOne(statsSql, [today, id, id]);

    res.json({
      project,
      packages,
      tasks,
      stats: stats || {},
    });
  } catch (err: any) {
    console.error('Error fetching project details:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE project
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, code, client, logo, description, status = 'ACTIVE', start_date, end_date, userId, packageIds } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });
    if (!code || !code.trim()) return res.status(400).json({ error: 'Project code is required' });

    // Check duplicate code
    const existing = queryOne('SELECT id FROM projects WHERE code = ?', [code.trim().toUpperCase()]);
    if (existing) {
      return res.status(400).json({ error: `Project code "${code.trim().toUpperCase()}" already exists. Please choose a unique code.` });
    }

    const id = `prj-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    run(
      `INSERT INTO projects (id, name, code, client, logo, description, status, start_date, end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name.trim(),
        code.trim().toUpperCase(),
        client ? client.trim() : null,
        logo ? logo.trim() : null,
        description ? description.trim() : null,
        status,
        start_date || null,
        end_date || null,
        now,
        now,
      ]
    );

    // Optionally assign initial packages
    if (Array.isArray(packageIds) && packageIds.length > 0) {
      for (const pId of packageIds) {
        if (pId) {
          run('UPDATE packages SET project_id = ?, updated_at = ? WHERE id = ?', [id, now, pId]);
        }
      }
    }

    res.status(201).json({ id, message: 'Project created successfully' });
  } catch (err: any) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: err.message });
  }
});

// Assign / move a package to this project
router.post('/:id/assign-package', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { packageId } = req.body;
    if (!packageId) return res.status(400).json({ error: 'packageId is required' });

    const now = new Date().toISOString();
    run('UPDATE packages SET project_id = ?, updated_at = ? WHERE id = ?', [id, now, packageId]);
    res.json({ message: 'Package assigned to project successfully' });
  } catch (err: any) {
    console.error('Error assigning package to project:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remove / unlink a package from this project
router.post('/:id/remove-package', (req: Request, res: Response) => {
  try {
    const { packageId } = req.body;
    if (!packageId) return res.status(400).json({ error: 'packageId is required' });

    const now = new Date().toISOString();
    run('UPDATE packages SET project_id = NULL, updated_at = ? WHERE id = ?', [now, packageId]);
    res.json({ message: 'Package unlinked from project successfully' });
  } catch (err: any) {
    console.error('Error removing package from project:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE project
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, client, logo, description, status, start_date, end_date } = req.body;

    const now = new Date().toISOString();

    const existing = queryOne('SELECT * FROM projects WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    run(
      `UPDATE projects SET
        name = ?,
        code = ?,
        client = ?,
        logo = ?,
        description = ?,
        status = ?,
        start_date = ?,
        end_date = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        name !== undefined ? name.trim() : existing.name,
        code !== undefined ? code.trim().toUpperCase() : existing.code,
        client !== undefined ? client : existing.client,
        logo !== undefined ? logo : existing.logo,
        description !== undefined ? description : existing.description,
        status !== undefined ? status : existing.status,
        start_date !== undefined ? start_date : existing.start_date,
        end_date !== undefined ? end_date : existing.end_date,
        now,
        id,
      ]
    );

    res.json({ message: 'Project updated successfully' });
  } catch (err: any) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update project logo directly
router.post('/:id/logo', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { logo } = req.body;

    const existing = queryOne('SELECT id FROM projects WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    const now = new Date().toISOString();
    run('UPDATE projects SET logo = ?, updated_at = ? WHERE id = ?', [logo || null, now, id]);

    res.json({ message: 'Project logo updated successfully', logo: logo || null });
  } catch (err: any) {
    console.error('Error updating project logo:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE project
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Unlink packages & tasks
    run('UPDATE packages SET project_id = NULL WHERE project_id = ?', [id]);
    run('UPDATE tasks SET project_id = NULL WHERE project_id = ?', [id]);
    run('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ message: 'Project deleted. Packages and tasks have been unlinked.' });
  } catch (err: any) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
