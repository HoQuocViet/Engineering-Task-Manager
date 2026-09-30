import express, { Request, Response } from 'express';
import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const sql = `
      SELECT 
        tg.*,
        COUNT(tt.task_id) as task_count
      FROM tags tg
      LEFT JOIN task_tags tt ON tg.id = tt.tag_id
      GROUP BY tg.id
      ORDER BY task_count DESC, tg.name ASC
    `;
    const tags = query(sql);
    res.json(tags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, color = '#3b82f6' } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Tag name is required' });

    // Format clean tag name (remove # prefix if entered)
    const cleanName = name.trim().replace(/^#+/, '');
    const existing = queryOne('SELECT id FROM tags WHERE LOWER(name) = LOWER(?)', [cleanName]);
    if (existing) {
      return res.status(409).json({ error: 'Tag with this name already exists', tagId: existing.id });
    }

    const id = `tag-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    run('INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)', [id, cleanName, color, now]);

    res.status(201).json({ id, name: cleanName, color, message: 'Tag created' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const existing = queryOne('SELECT * FROM tags WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Tag not found' });

    const cleanName = name !== undefined ? name.trim().replace(/^#+/, '') : existing.name;

    run('UPDATE tags SET name = ?, color = ? WHERE id = ?', [
      cleanName,
      color !== undefined ? color : existing.color,
      id,
    ]);

    res.json({ message: 'Tag updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    run('DELETE FROM task_tags WHERE tag_id = ?', [id]);
    run('DELETE FROM tags WHERE id = ?', [id]);
    res.json({ message: 'Tag deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
