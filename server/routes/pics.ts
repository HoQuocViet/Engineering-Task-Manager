import express, { Request, Response } from 'express';
import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';

const router = express.Router();

// GET all PICs (Persons In Charge)
router.get('/', (req: Request, res: Response) => {
  try {
    const pics = query(`
      SELECT * FROM pics 
      ORDER BY 
        CASE 
          WHEN name LIKE '%Tôi%' OR name LIKE '%Ho Quoc Viet%' THEN 0 
          ELSE 1 
        END ASC,
        created_at ASC
    `);
    res.json(pics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create or register a new PIC
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, role = '', avatar = '' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required for PIC' });
    }

    const trimmedName = name.trim();
    // Check if PIC with this name already exists
    const existing = queryOne('SELECT * FROM pics WHERE LOWER(name) = LOWER(?)', [trimmedName]);
    if (existing) {
      // If provided role or avatar, update it
      if (role || avatar) {
        run('UPDATE pics SET role = COALESCE(NULLIF(?, ""), role), avatar = COALESCE(NULLIF(?, ""), avatar) WHERE id = ?', [
          role ? role.trim() : '',
          avatar ? avatar.trim() : '',
          existing.id,
        ]);
      }
      return res.status(200).json({ id: existing.id, ...existing, message: 'PIC already exists' });
    }

    const id = `pic-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    run(
      'INSERT INTO pics (id, name, role, avatar, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, trimmedName, role ? role.trim() : '', avatar ? avatar.trim() : '', now]
    );

    res.status(201).json({
      id,
      name: trimmedName,
      role: role ? role.trim() : '',
      avatar: avatar ? avatar.trim() : '',
      created_at: now,
      message: 'PIC created successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update a PIC
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, avatar } = req.body;

    const existing = queryOne('SELECT * FROM pics WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'PIC not found' });
    }

    const newName = name !== undefined ? name.trim() : existing.name;
    const newRole = role !== undefined ? role.trim() : existing.role;
    const newAvatar = avatar !== undefined ? avatar.trim() : existing.avatar;

    run(
      'UPDATE pics SET name = ?, role = ?, avatar = ? WHERE id = ?',
      [newName, newRole, newAvatar, id]
    );

    // If name changed, synchronize task pics array
    if (existing.name !== newName && newName) {
      try {
        const tasks = query('SELECT id, pics FROM tasks WHERE pics LIKE ?', [`%${existing.name}%`]);
        for (const t of tasks) {
          try {
            let pList = JSON.parse(t.pics || '[]');
            if (Array.isArray(pList) && pList.includes(existing.name)) {
              pList = pList.map((p: string) => (p === existing.name ? newName : p));
              run('UPDATE tasks SET pics = ? WHERE id = ?', [JSON.stringify(pList), t.id]);
            }
          } catch (e) {}
        }
      } catch (err) {
        console.error('Failed to sync updated PIC name to tasks:', err);
      }
    }

    res.json({ id, name: newName, role: newRole, avatar: newAvatar, message: 'PIC updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a PIC
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM pics WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'PIC not found' });
    }

    run('DELETE FROM pics WHERE id = ?', [id]);
    res.json({ message: 'PIC deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
