import express, { Request, Response } from 'express';
import { query, queryOne, run } from '../db.js';
import crypto from 'crypto';

const router = express.Router();

// Helper to consolidate data into a single user workspace
function ensureSingleUser(): any {
  let users = query('SELECT * FROM users ORDER BY created_at ASC');
  
  if (users.length === 0) {
    const now = new Date().toISOString();
    run(
      'INSERT INTO users (id, name, role, avatar, email, is_admin, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, 1, ?)',
      ['usr-1', 'Alex Morgan', 'Lead Project & Discipline Engineer', 'AM', 'ptscmc.ai11@gmail.com', now]
    );
    users = query('SELECT * FROM users WHERE id = ?', ['usr-1']);
  } else if (users.length > 1) {
    // Keep first user (preferably usr-1 if exists)
    const primaryUser = users.find((u: any) => u.id === 'usr-1') || users[0];
    const primaryId = primaryUser.id;

    // Consolidate all orphaned tasks and items to primary user
    run('UPDATE tasks SET assignee_id = ? WHERE assignee_id IS NOT NULL AND assignee_id != ?', [primaryId, primaryId]);
    run('UPDATE task_comments SET user_id = ? WHERE user_id IS NOT NULL AND user_id != ?', [primaryId, primaryId]);
    run('UPDATE task_activities SET user_id = ? WHERE user_id IS NOT NULL AND user_id != ?', [primaryId, primaryId]);
    run('UPDATE task_attachments SET uploaded_by = ? WHERE uploaded_by IS NOT NULL AND uploaded_by != ?', [primaryId, primaryId]);
    
    // Remove other users
    run('DELETE FROM users WHERE id != ?', [primaryId]);
    users = [primaryUser];
  }

  return users[0];
}

// GET all users (Returns the single active user profile)
router.get('/', (req: Request, res: Response) => {
  try {
    ensureSingleUser();

    const users = query(`
      SELECT 
        u.*,
        COUNT(t.id) as assigned_task_count,
        SUM(CASE WHEN t.status IN ('TODO', 'IN PROGRESS', 'WAITING') THEN 1 ELSE 0 END) as open_task_count
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assignee_id
      GROUP BY u.id
      LIMIT 1
    `);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET current profile
router.get('/profile', (req: Request, res: Response) => {
  try {
    const user = ensureSingleUser();
    const stats = queryOne(`
      SELECT 
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'DONE' THEN 1 ELSE 0 END) as done_tasks,
        SUM(CASE WHEN t.status IN ('TODO', 'IN PROGRESS', 'WAITING') THEN 1 ELSE 0 END) as open_tasks
      FROM tasks t
      WHERE t.assignee_id = ?
    `, [user.id]);

    res.json({
      ...user,
      stats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile (either via /profile or /:id)
router.put('/profile', (req: Request, res: Response) => {
  try {
    const user = ensureSingleUser();
    const { name, role, avatar, email, phone, bio, discipline } = req.body;

    const newName = name !== undefined ? name.trim() : user.name;
    const newRole = role !== undefined ? role.trim() : user.role;
    const newAvatar = avatar !== undefined ? avatar.trim() : user.avatar;
    const newEmail = email !== undefined ? email.trim() : (user.email || '');
    const newPhone = phone !== undefined ? phone.trim() : (user.phone || '');
    const newBio = bio !== undefined ? bio.trim() : (user.bio || '');
    const newDiscipline = discipline !== undefined ? discipline.trim() : (user.discipline || '');

    run(`
      UPDATE users SET
        name = ?,
        role = ?,
        avatar = ?,
        email = ?,
        phone = ?,
        bio = ?,
        discipline = ?
      WHERE id = ?
    `, [
      newName,
      newRole,
      newAvatar,
      newEmail,
      newPhone,
      newBio,
      newDiscipline,
      user.id,
    ]);

    const updated = queryOne('SELECT * FROM users WHERE id = ?', [user.id]);
    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, avatar, email, phone, bio, discipline, is_admin } = req.body;
    const existing = queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const newName = name !== undefined ? name.trim() : existing.name;
    const newRole = role !== undefined ? role.trim() : existing.role;
    const newAvatar = avatar !== undefined ? avatar.trim() : existing.avatar;
    const newEmail = email !== undefined ? email.trim() : (existing.email || '');
    const newPhone = phone !== undefined ? phone.trim() : (existing.phone || '');
    const newBio = bio !== undefined ? bio.trim() : (existing.bio || '');
    const newDiscipline = discipline !== undefined ? discipline.trim() : (existing.discipline || '');
    const newIsAdmin = is_admin !== undefined ? (is_admin ? 1 : 0) : (existing.is_admin ? 1 : 0);

    run(`
      UPDATE users SET
        name = ?,
        role = ?,
        avatar = ?,
        email = ?,
        phone = ?,
        bio = ?,
        discipline = ?,
        is_admin = ?
      WHERE id = ?
    `, [
      newName,
      newRole,
      newAvatar,
      newEmail,
      newPhone,
      newBio,
      newDiscipline,
      newIsAdmin,
      id,
    ]);

    const updated = queryOne('SELECT * FROM users WHERE id = ?', [id]);
    res.json({ message: 'User updated successfully', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

