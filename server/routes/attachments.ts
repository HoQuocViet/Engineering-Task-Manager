import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { queryOne, run, UPLOADS_DIR } from '../db.js';

const router = express.Router();

function getMimeType(filename: string, fallbackMime?: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.csv': 'text/csv; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.json': 'application/json',
    '.md': 'text/markdown; charset=utf-8',
    '.log': 'text/plain; charset=utf-8',
    '.xml': 'application/xml',
    '.html': 'text/html; charset=utf-8',
  };
  return mimeMap[ext] || fallbackMime || 'application/octet-stream';
}

function resolveDiskFilePath(filePath: string, fileName?: string): string | null {
  const possiblePaths = [
    filePath,
    path.resolve(filePath),
    fileName ? path.join(UPLOADS_DIR, fileName) : null,
    fileName ? path.resolve(UPLOADS_DIR, fileName) : null,
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 15) || '';
    const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, safeName);
  },
});

// Max file size: 50MB
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Upload attachment for a task
router.post('/tasks/:taskId', upload.single('file'), (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file received in upload payload' });
    }

    const task = queryOne('SELECT id, title FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      // Clean up orphaned uploaded file
      try { fs.unlinkSync(file.path); } catch (e) {}
      return res.status(404).json({ error: 'Task not found' });
    }

    const attId = `att-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    let originalName = file.originalname;
    try {
      // Handle possible latin1/utf8 header encoding issue in multer
      const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
      if (decoded && !/[\uFFFD]/.test(decoded) && decoded !== file.originalname) {
        originalName = decoded;
      }
    } catch (e) {}

    const detectedMime = getMimeType(originalName, file.mimetype);

    run(`
      INSERT INTO task_attachments (id, task_id, file_name, original_name, file_size, mime_type, file_path, uploaded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      attId,
      taskId,
      file.filename,
      originalName,
      file.size,
      detectedMime,
      file.path,
      userId || null,
      now,
    ]);

    // Log activity
    const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
    run(`
      INSERT INTO task_activities (id, task_id, user_id, activity_type, field_name, new_value, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [actId, taskId, userId || null, 'ATTACHMENT_ADDED', 'attachment', originalName, `Attached file: ${originalName} (${(file.size / 1024).toFixed(1)} KB)`, now]);

    // Touch task updated_at
    run('UPDATE tasks SET updated_at = ? WHERE id = ?', [now, taskId]);

    res.status(201).json({
      id: attId,
      fileName: file.filename,
      originalName,
      fileSize: file.size,
      mimeType: detectedMime,
      createdAt: now,
      message: 'Attachment uploaded successfully',
    });
  } catch (err: any) {
    console.error('Error uploading attachment:', err);
    res.status(500).json({ error: err.message || 'File upload failed on server' });
  }
});

// Download attachment
router.get('/:id/download', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const att = queryOne<any>('SELECT * FROM task_attachments WHERE id = ?', [id]);
    if (!att) return res.status(404).json({ error: 'Attachment record not found' });

    const resolvedPath = resolveDiskFilePath(att.file_path, att.file_name);
    if (!resolvedPath) {
      return res.status(404).json({ error: 'File on disk not found' });
    }

    const stat = fs.statSync(resolvedPath);
    const mimeType = getMimeType(att.original_name, att.mime_type);
    const originalName = att.original_name || 'attachment';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    const asciiFallback = originalName.replace(/[^\x20-\x7E]/g, '_');
    const utf8Encoded = encodeURIComponent(originalName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`
    );
    res.setHeader('Cache-Control', 'no-cache');

    const readStream = fs.createReadStream(resolvedPath);
    readStream.pipe(res);
  } catch (err: any) {
    console.error('Error downloading attachment:', err);
    res.status(500).json({ error: err.message });
  }
});

// View / Preview attachment inline (for images, PDFs, Excel, Word, etc.)
router.get('/:id/view', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const att = queryOne<any>('SELECT * FROM task_attachments WHERE id = ?', [id]);
    if (!att) return res.status(404).json({ error: 'Attachment record not found' });

    const resolvedPath = resolveDiskFilePath(att.file_path, att.file_name);
    if (!resolvedPath) {
      return res.status(404).json({ error: 'File on disk not found' });
    }

    const stat = fs.statSync(resolvedPath);
    const mimeType = getMimeType(att.original_name, att.mime_type);
    const originalName = att.original_name || 'attachment';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Accept-Ranges', 'bytes');
    
    const asciiFallback = originalName.replace(/[^\x20-\x7E]/g, '_');
    const utf8Encoded = encodeURIComponent(originalName);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`
    );
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const readStream = fs.createReadStream(resolvedPath);
    readStream.pipe(res);
  } catch (err: any) {
    console.error('Error viewing attachment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete attachment
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.body?.userId || req.query?.userId || req.headers['x-user-id'];
    const att = queryOne<any>('SELECT * FROM task_attachments WHERE id = ?', [id]);
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    // Delete file from disk safely
    try {
      const resolvedPath = resolveDiskFilePath(att.file_path, att.file_name);
      if (resolvedPath && fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
      }
    } catch (e) {
      console.warn('Could not delete physical file:', e);
    }

    run('DELETE FROM task_attachments WHERE id = ?', [id]);

    const now = new Date().toISOString();
    // Touch task updated_at
    run('UPDATE tasks SET updated_at = ? WHERE id = ?', [now, att.task_id]);

    // Log activity
    const actId = `act-${crypto.randomUUID().slice(0, 8)}`;
    run(`
      INSERT INTO task_activities (id, task_id, user_id, activity_type, field_name, old_value, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [actId, att.task_id, userId ? String(userId) : null, 'ATTACHMENT_REMOVED', 'attachment', att.original_name, `Removed attachment: ${att.original_name}`, now]);

    res.json({ message: 'Attachment deleted' });
  } catch (err: any) {
    console.error('Error deleting attachment:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
