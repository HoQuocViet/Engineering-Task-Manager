import express, { Request, Response } from 'express';
import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const sql = `
      SELECT 
        c.*,
        COUNT(t.id) as task_count
      FROM categories c
      LEFT JOIN tasks t ON c.id = t.category_id
      GROUP BY c.id
      ORDER BY c.is_default DESC, c.name ASC
    `;
    const categories = query(sql);
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, color = '#2563eb' } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });

    const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    run(
      'INSERT INTO categories (id, name, description, color, is_default, created_at) VALUES (?, ?, ?, ?, 0, ?)',
      [id, name.trim(), description ? description.trim() : '', color, now]
    );

    res.status(201).json({ id, message: 'Category created' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;
    const existing = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    run(
      'UPDATE categories SET name = ?, description = ?, color = ? WHERE id = ?',
      [
        name !== undefined ? name.trim() : existing.name,
        description !== undefined ? description : existing.description,
        color !== undefined ? color : existing.color,
        id,
      ]
    );

    res.json({ message: 'Category updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    run('UPDATE tasks SET category_id = NULL WHERE category_id = ?', [id]);
    run('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: 'Category deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
