import express, { Request, Response } from 'express';
import multer from 'multer';
import { query, queryOne, run, saveDb, replaceDbWithBuffer, withTransaction, DB_PATH, DATA_DIR } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { seedInitialDataIfNeeded } from '../seed.js';
import fs from 'fs';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for database file
});

// Get database status info
router.get('/db-info', (req: Request, res: Response) => {
  try {
    let sizeBytes = 0;
    let exists = false;
    let lastModified = null;

    if (fs.existsSync(DB_PATH)) {
      const stats = fs.statSync(DB_PATH);
      sizeBytes = stats.size;
      exists = true;
      lastModified = stats.mtime.toISOString();
    }

    const counts = {
      projects: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM projects')?.cnt || 0,
      packages: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM packages')?.cnt || 0,
      tasks: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM tasks')?.cnt || 0,
      users: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users')?.cnt || 0,
      categories: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM categories')?.cnt || 0,
      tags: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM tags')?.cnt || 0,
    };

    res.json({
      dbPath: DB_PATH,
      exists,
      sizeBytes,
      sizeFormatted: `${(sizeBytes / 1024).toFixed(1)} KB`,
      lastModified,
      counts,
      isPersistent: true,
      storageType: 'Local SQLite File (/data/app.db)',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download binary SQLite .db file directly
router.get('/download-db', (req: Request, res: Response) => {
  try {
    saveDb(); // Ensure latest state flushed to disk
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ error: 'Database file not found' });
    }
    const today = new Date().toISOString().split('T')[0];
    res.download(DB_PATH, `engineering_task_manager_${today}.db`);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset and reseed database
router.post('/reset-demo', requireAdmin, (req: Request, res: Response) => {
  try {
    seedInitialDataIfNeeded(true);
    res.json({ message: 'Database reset to initial engineering demo dataset successfully.' });
  } catch (err: any) {
    console.error('Error resetting demo data:', err);
    res.status(500).json({ error: err.message });
  }
});

// Clear all tasks & activities to start with a fresh slate for live production
router.post('/clear-all', requireAdmin, (req: Request, res: Response) => {
  try {
    const { scope = 'tasks' } = req.body; // 'tasks' (only tasks/activities/comments) or 'all' (tasks, packages, projects)
    
    withTransaction(() => {
      run('DELETE FROM task_activities');
      run('DELETE FROM task_attachments');
      run('DELETE FROM task_comments');
      run('DELETE FROM task_tags');
      run('DELETE FROM tasks');

      if (scope === 'all') {
        run('DELETE FROM packages');
        run('DELETE FROM projects');
      }

      run("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('seed_initialized', 'true', ?)", [new Date().toISOString()]);
    });

    res.json({
      message: scope === 'all' 
        ? 'All demo tasks, packages, and projects cleared successfully. Clean slate ready for real project data.' 
        : 'All demo tasks and activity logs cleared successfully.'
    });
  } catch (err: any) {
    console.error('Error clearing data:', err);
    res.status(500).json({ error: err.message });
  }
});

// Export full database JSON backup
router.get('/export-json', (req: Request, res: Response) => {
  try {
    saveDb(); // Ensure flushed to disk
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      projects: query('SELECT * FROM projects'),
      users: query('SELECT * FROM users'),
      categories: query('SELECT * FROM categories'),
      packages: query('SELECT * FROM packages'),
      tags: query('SELECT * FROM tags'),
      tasks: query('SELECT * FROM tasks'),
      taskTags: query('SELECT * FROM task_tags'),
      taskComments: query('SELECT * FROM task_comments'),
      taskAttachments: query('SELECT * FROM task_attachments'),
      taskActivities: query('SELECT * FROM task_activities'),
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="engineering-tasks-backup-${new Date().toISOString().split('T')[0]}.json"`);
    res.status(200).send(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Error exporting database JSON:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import JSON backup
router.post('/import-json', requireAdmin, (req: Request, res: Response) => {
  try {
    let backup = req.body;
    if (!backup) {
      return res.status(400).json({ error: 'No JSON payload provided' });
    }

    // If wrapped in data property, unwrap
    if (backup.data && typeof backup.data === 'object') {
      backup = backup.data;
    }

    // If backup is directly an array of tasks
    if (Array.isArray(backup)) {
      backup = { tasks: backup };
    }

    if (!backup || (!Array.isArray(backup.tasks) && !Array.isArray(backup.projects))) {
      return res.status(400).json({ error: 'Invalid backup format: expected JSON object containing tasks or projects arrays.' });
    }

    withTransaction(() => {
      run('PRAGMA foreign_keys = OFF;');
      try {
        run('DELETE FROM task_activities');
        run('DELETE FROM task_attachments');
        run('DELETE FROM task_comments');
        run('DELETE FROM task_tags');
        run('DELETE FROM tasks');
        run('DELETE FROM tags');
        run('DELETE FROM packages');
        run('DELETE FROM projects');
        run('DELETE FROM categories');
        run('DELETE FROM users');

        if (Array.isArray(backup.users)) {
          for (const u of backup.users) {
            run('INSERT INTO users (id, name, role, avatar, is_admin, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [u.id, u.name, u.role || 'Engineer', u.avatar || 'AM', u.is_admin ? 1 : 0, u.is_active ?? 1, u.created_at || new Date().toISOString()]);
          }
        }

        if (Array.isArray(backup.projects)) {
          for (const pr of backup.projects) {
            run('INSERT INTO projects (id, name, code, client, description, status, start_date, end_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [pr.id, pr.name, pr.code, pr.client || null, pr.description || null, pr.status || 'ACTIVE', pr.start_date || null, pr.end_date || null, pr.created_at || new Date().toISOString(), pr.updated_at || new Date().toISOString()]);
          }
        }

        if (Array.isArray(backup.categories)) {
          for (const c of backup.categories) {
            run('INSERT INTO categories (id, name, description, color, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              [c.id, c.name, c.description || '', c.color || 'blue', c.is_default ? 1 : 0, c.created_at || new Date().toISOString()]);
          }
        }

        if (Array.isArray(backup.packages)) {
          for (const p of backup.packages) {
            run('INSERT INTO packages (id, project_id, name, code, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [p.id, p.project_id || null, p.name, p.code, p.description || '', p.status || 'ACTIVE', p.created_at || new Date().toISOString(), p.updated_at || new Date().toISOString()]);
          }
        }

        if (Array.isArray(backup.tags)) {
          for (const t of backup.tags) {
            run('INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
              [t.id, t.name, t.color || 'blue', t.created_at || new Date().toISOString()]);
          }
        }

        if (Array.isArray(backup.tasks)) {
          for (const t of backup.tasks) {
            run(`INSERT INTO tasks (
              id, project_id, title, description, type, category_id, package_id, priority, status,
              progress, start_date, deadline, forecast_finish, completed_date, assignee_id,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              t.id,
              t.project_id || null,
              t.title || 'Untitled Task',
              t.description || null,
              t.type || 'TASK',
              t.category_id || null,
              t.package_id || null,
              t.priority || 'MEDIUM',
              t.status || 'TODO',
              t.progress ?? 0,
              t.start_date || null,
              t.deadline || null,
              t.forecast_finish || null,
              t.completed_date || null,
              t.assignee_id || null,
              t.created_at || new Date().toISOString(),
              t.updated_at || new Date().toISOString()
            ]);
          }
        }

        if (Array.isArray(backup.taskTags)) {
          for (const tt of backup.taskTags) {
            run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [tt.task_id, tt.tag_id]);
          }
        }

        if (Array.isArray(backup.taskComments)) {
          for (const c of backup.taskComments) {
            run('INSERT INTO task_comments (id, task_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
              [c.id, c.task_id, c.user_id, c.content, c.created_at || new Date().toISOString()]);
          }
        }

        if (Array.isArray(backup.taskAttachments)) {
          for (const a of backup.taskAttachments) {
            run('INSERT INTO task_attachments (id, task_id, file_name, original_name, file_size, mime_type, file_path, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [a.id, a.task_id, a.file_name, a.original_name, a.file_size, a.mime_type, a.file_path, a.uploaded_by, a.created_at || new Date().toISOString()]);
          }
        }

        if (Array.isArray(backup.taskActivities)) {
          for (const ac of backup.taskActivities) {
            run('INSERT INTO task_activities (id, task_id, user_id, activity_type, field_name, old_value, new_value, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [ac.id, ac.task_id, ac.user_id, ac.activity_type, ac.field_name, ac.old_value, ac.new_value, ac.note, ac.created_at || new Date().toISOString()]);
          }
        }

        run("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('seed_initialized', 'true', ?)", [new Date().toISOString()]);
      } finally {
        run('PRAGMA foreign_keys = ON;');
      }
    });
    
    const counts = {
      projects: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM projects')?.cnt || 0,
      packages: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM packages')?.cnt || 0,
      tasks: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM tasks')?.cnt || 0,
      categories: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM categories')?.cnt || 0,
    };

    res.json({
      message: 'JSON Database Backup restored successfully',
      counts,
    });
  } catch (err: any) {
    console.error('Error importing backup:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload and replace SQLite .db binary file directly
router.post('/upload-db', requireAdmin, upload.single('dbFile'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file || !file.buffer || file.buffer.length === 0) {
      return res.status(400).json({ error: 'No database file provided' });
    }

    // Basic SQLite header validation: SQLite files start with "SQLite format 3\0"
    const headerStr = file.buffer.slice(0, 16).toString('utf-8');
    if (!headerStr.startsWith('SQLite format 3')) {
      return res.status(400).json({
        error: 'Invalid database file format. The file is not a valid SQLite database (missing SQLite format 3 header).',
      });
    }

    // Replace database with uploaded buffer
    await replaceDbWithBuffer(file.buffer);

    try {
      run("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('seed_initialized', 'true', ?)", [new Date().toISOString()]);
    } catch (e) {}

    const counts = {
      projects: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM projects')?.cnt || 0,
      packages: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM packages')?.cnt || 0,
      tasks: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM tasks')?.cnt || 0,
      users: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM users')?.cnt || 0,
      categories: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM categories')?.cnt || 0,
      tags: queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM tags')?.cnt || 0,
    };

    res.json({
      message: 'SQLite database restored and loaded successfully.',
      fileSize: file.size,
      counts,
    });
  } catch (err: any) {
    console.error('Error uploading and replacing SQLite database:', err);
    res.status(500).json({ error: `Failed to restore database file: ${err.message}` });
  }
});

export default router;
