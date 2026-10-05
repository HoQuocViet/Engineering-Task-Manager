import express, { Request, Response } from 'express';
import { query, queryOne, run, withTransaction } from '../db.js';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { URL } from 'url';

const router = express.Router();

export type BulletinResourceType =
  | 'WEB_URL'
  | 'GOOGLE_SHEET'
  | 'GOOGLE_DOCS'
  | 'SHAREPOINT'
  | 'TEAMS'
  | 'VENDOR_PORTAL'
  | 'NETWORK_FOLDER'
  | 'LOCAL_FOLDER'
  | 'NETWORK_FILE'
  | 'LOCAL_FILE'
  | 'OTHER';

export const VALID_RESOURCE_TYPES: BulletinResourceType[] = [
  'WEB_URL',
  'GOOGLE_SHEET',
  'GOOGLE_DOCS',
  'SHAREPOINT',
  'TEAMS',
  'VENDOR_PORTAL',
  'NETWORK_FOLDER',
  'LOCAL_FOLDER',
  'NETWORK_FILE',
  'LOCAL_FILE',
  'OTHER',
];

// Helper to auto-classify location string
export function detectResourceType(location: string): BulletinResourceType {
  if (!location) return 'WEB_URL';
  const loc = location.trim();

  // Google Spreadsheets / Docs
  if (loc.includes('docs.google.com/spreadsheets')) return 'GOOGLE_SHEET';
  if (loc.includes('docs.google.com/document') || loc.includes('docs.google.com/presentation')) return 'GOOGLE_DOCS';

  // SharePoint & Teams
  if (loc.includes('sharepoint.com')) return 'SHAREPOINT';
  if (loc.includes('teams.microsoft.com') || loc.includes('teams.live.com')) return 'TEAMS';

  // Windows UNC Network Path (\\SERVER\share\...)
  if (loc.startsWith('\\\\') || loc.startsWith('//')) {
    const lastPart = loc.split(/[\\/]/).pop() || '';
    if (/\.[a-zA-Z0-9]{2,5}$/.test(lastPart)) {
      return 'NETWORK_FILE';
    }
    return 'NETWORK_FOLDER';
  }

  // Windows Drive or Unix Local Path (D:\... or /path/...)
  if (/^[a-zA-Z]:[\\/]/.test(loc) || (loc.startsWith('/') && !loc.startsWith('//'))) {
    const lastPart = loc.split(/[\\/]/).pop() || '';
    if (/\.[a-zA-Z0-9]{2,5}$/.test(lastPart)) {
      return 'LOCAL_FILE';
    }
    return 'LOCAL_FOLDER';
  }

  // Web URLs
  if (/^https?:\/\//i.test(loc)) {
    const lower = loc.toLowerCase();
    if (lower.includes('vendor') || lower.includes('supplier') || lower.includes('portal') || lower.includes('edms')) {
      return 'VENDOR_PORTAL';
    }
    return 'WEB_URL';
  }

  return 'OTHER';
}

// Security: Check if a URL target is private/internal IP (SSRF protection)
function isPrivateUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '169.254.169.254' ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return true;
    }

    // Check private IPv4 ranges (10.x.x.x, 192.168.x.x, 172.16.x.x-172.31.x.x)
    const ipv4Match = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4Match) {
      const b1 = parseInt(ipv4Match[1], 10);
      const b2 = parseInt(ipv4Match[2], 10);
      if (b1 === 10) return true;
      if (b1 === 192 && b2 === 168) return true;
      if (b1 === 172 && b2 >= 16 && b2 <= 31) return true;
      if (b1 === 127 || b1 === 0) return true;
    }

    return false;
  } catch {
    return true;
  }
}

// 1. GET /api/bulletins - List resources with fast server-side filtering & search
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      search,
      type,
      projectId,
      packageId,
      discipline,
      pinned,
      status = 'ACTIVE',
      sort = 'pinned',
      page = '1',
      limit = '100',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 100));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses: string[] = ['1=1'];
    const params: any[] = [];

    // Status filter: default to ACTIVE unless specified
    if (status && status !== 'ALL') {
      whereClauses.push('b.status = ?');
      params.push(status);
    }

    // Type / Category quick filter
    if (type && type !== 'ALL') {
      const typeStr = String(type).toUpperCase();
      if (typeStr === 'SHEETS') {
        whereClauses.push("b.resource_type = 'GOOGLE_SHEET'");
      } else if (typeStr === 'DOCS') {
        whereClauses.push("b.resource_type = 'GOOGLE_DOCS'");
      } else if (typeStr === 'SHAREPOINT') {
        whereClauses.push("b.resource_type = 'SHAREPOINT'");
      } else if (typeStr === 'TEAMS') {
        whereClauses.push("b.resource_type = 'TEAMS'");
      } else if (typeStr === 'WEB') {
        whereClauses.push("b.resource_type IN ('WEB_URL', 'VENDOR_PORTAL')");
      } else if (typeStr === 'FOLDERS') {
        whereClauses.push("b.resource_type IN ('NETWORK_FOLDER', 'LOCAL_FOLDER')");
      } else if (typeStr === 'FILES') {
        whereClauses.push("b.resource_type IN ('NETWORK_FILE', 'LOCAL_FILE')");
      } else if (VALID_RESOURCE_TYPES.includes(typeStr as BulletinResourceType)) {
        whereClauses.push('b.resource_type = ?');
        params.push(typeStr);
      }
    }

    // Pinned filter
    if (pinned !== undefined && pinned !== '' && pinned !== 'ALL') {
      const isPinned = String(pinned) === 'true' || String(pinned) === '1';
      whereClauses.push('b.pinned = ?');
      params.push(isPinned ? 1 : 0);
    }

    // Project filter
    if (projectId && projectId !== 'ALL' && String(projectId).trim()) {
      whereClauses.push('b.project_id = ?');
      params.push(String(projectId).trim());
    }

    // Package filter
    if (packageId && packageId !== 'ALL' && String(packageId).trim()) {
      whereClauses.push('b.package_id = ?');
      params.push(String(packageId).trim());
    }

    // Discipline filter
    if (discipline && discipline !== 'ALL' && String(discipline).trim()) {
      whereClauses.push('(b.discipline = ? OR VI_MATCH(b.discipline, ?) = 1)');
      params.push(String(discipline).trim(), String(discipline).trim());
    }

    // Full-text search with Vietnamese normalization and partial matching
    if (search && String(search).trim()) {
      const term = String(search).trim();
      whereClauses.push(`(
        VI_MATCH(b.display_name, ?) = 1
        OR VI_MATCH(COALESCE(b.document_title, ''), ?) = 1
        OR VI_MATCH(COALESCE(b.description, ''), ?) = 1
        OR VI_MATCH(b.location, ?) = 1
        OR VI_MATCH(COALESCE(b.owner, ''), ?) = 1
        OR VI_MATCH(COALESCE(b.tags, ''), ?) = 1
        OR VI_MATCH(COALESCE(b.notes, ''), ?) = 1
        OR VI_MATCH(b.discipline, ?) = 1
        OR VI_MATCH(b.resource_type, ?) = 1
        OR VI_MATCH(COALESCE(pr.name, ''), ?) = 1
        OR VI_MATCH(COALESCE(pr.code, ''), ?) = 1
        OR VI_MATCH(COALESCE(pk.name, ''), ?) = 1
        OR VI_MATCH(COALESCE(pk.code, ''), ?) = 1
        OR b.location LIKE ?
      )`);
      const likeTerm = `%${term}%`;
      params.push(
        term, term, term, term, term, term, term, term, term,
        term, term, term, term, likeTerm
      );
    }

    const whereSql = whereClauses.join(' AND ');

    // Sorting
    let orderBySql = 'b.pinned DESC, b.open_count DESC, b.display_name ASC';
    if (sort === 'recent') {
      orderBySql = 'CASE WHEN b.last_opened IS NULL THEN 1 ELSE 0 END, b.last_opened DESC, b.open_count DESC';
    } else if (sort === 'pinned') {
      orderBySql = 'b.pinned DESC, b.open_count DESC, b.display_name ASC';
    } else if (sort === 'name_asc') {
      orderBySql = 'b.display_name ASC';
    } else if (sort === 'name_desc') {
      orderBySql = 'b.display_name DESC';
    } else if (sort === 'created_desc') {
      orderBySql = 'b.created_at DESC';
    }

    // Count total
    const countSql = `
      SELECT COUNT(*) as count 
      FROM bulletin_resources b
      LEFT JOIN projects pr ON b.project_id = pr.id
      LEFT JOIN packages pk ON b.package_id = pk.id
      WHERE ${whereSql}
    `;
    const totalCountRow = queryOne<{ count: number }>(countSql, params);
    const total = totalCountRow?.count || 0;

    // Fetch page rows
    const dataSql = `
      SELECT 
        b.*,
        pr.name as project_name,
        pr.code as project_code,
        pk.name as package_name,
        pk.code as package_code,
        rep.display_name as replacement_resource_name,
        (SELECT COUNT(*) FROM task_bulletins tb WHERE tb.bulletin_id = b.id) as related_tasks_count
      FROM bulletin_resources b
      LEFT JOIN projects pr ON b.project_id = pr.id
      LEFT JOIN packages pk ON b.package_id = pk.id
      LEFT JOIN bulletin_resources rep ON b.replacement_resource_id = rep.id
      WHERE ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT ? OFFSET ?
    `;
    const rows = query(dataSql, [...params, limitNum, offset]);

    // Parse tags safely for each row
    const resources = rows.map((r: any) => {
      let parsedTags: string[] = [];
      if (r.tags) {
        try {
          parsedTags = JSON.parse(r.tags);
        } catch {
          parsedTags = String(r.tags).split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
      return {
        ...r,
        pinned: Boolean(r.pinned),
        tags: parsedTags,
      };
    });

    // Also get metadata counts for quick tabs (pinned count, review required count, recent count)
    const today = new Date().toISOString().split('T')[0];
    const pinnedCount = queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM bulletin_resources WHERE status = 'ACTIVE' AND pinned = 1"
    )?.cnt || 0;
    const reviewRequiredCount = queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM bulletin_resources WHERE status = 'ACTIVE' AND next_review IS NOT NULL AND next_review <= ?",
      [today]
    )?.cnt || 0;
    const recentCount = queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM bulletin_resources WHERE status = 'ACTIVE' AND last_opened IS NOT NULL"
    )?.cnt || 0;

    // Quick filter tab counts (ALL, PINNED, SHEETS, DOCS, SHAREPOINT, TEAMS, WEB, FOLDERS, FILES)
    const baseStatus = status && status !== 'ALL' ? status : 'ACTIVE';
    const projFilter = projectId && projectId !== 'ALL' ? String(projectId) : null;
    const pkgFilter = packageId && packageId !== 'ALL' ? String(packageId) : null;

    let baseFilterSql = 'status = ?';
    const baseParams: any[] = [baseStatus];
    if (projFilter) {
      baseFilterSql += ' AND project_id = ?';
      baseParams.push(projFilter);
    }
    if (pkgFilter) {
      baseFilterSql += ' AND package_id = ?';
      baseParams.push(pkgFilter);
    }
    const discFilter = discipline && discipline !== 'ALL' && String(discipline).trim() ? String(discipline).trim() : null;
    if (discFilter) {
      baseFilterSql += ' AND (discipline = ? OR VI_MATCH(discipline, ?) = 1)';
      baseParams.push(discFilter, discFilter);
    }

    const tabCounts: Record<string, number> = {
      ALL: queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM bulletin_resources WHERE ${baseFilterSql}`, baseParams)?.cnt || 0,
      PINNED: queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM bulletin_resources WHERE ${baseFilterSql} AND pinned = 1`, baseParams)?.cnt || 0,
      SHEETS: queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM bulletin_resources WHERE ${baseFilterSql} AND resource_type = 'GOOGLE_SHEET'`, baseParams)?.cnt || 0,
      DOCS: queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM bulletin_resources WHERE ${baseFilterSql} AND resource_type = 'GOOGLE_DOCS'`, baseParams)?.cnt || 0,
      SHAREPOINT: queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM bulletin_resources WHERE ${baseFilterSql} AND resource_type = 'SHAREPOINT'`, baseParams)?.cnt || 0,
      TEAMS: queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM bulletin_resources WHERE ${baseFilterSql} AND resource_type = 'TEAMS'`, baseParams)?.cnt || 0,
      WEB: queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM bulletin_resources WHERE ${baseFilterSql} AND resource_type IN ('WEB_URL', 'VENDOR_PORTAL')`, baseParams)?.cnt || 0,
      FOLDERS: queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM bulletin_resources WHERE ${baseFilterSql} AND resource_type IN ('NETWORK_FOLDER', 'LOCAL_FOLDER')`, baseParams)?.cnt || 0,
      FILES: queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM bulletin_resources WHERE ${baseFilterSql} AND resource_type IN ('NETWORK_FILE', 'LOCAL_FILE')`, baseParams)?.cnt || 0,
    };

    res.json({
      resources,
      total,
      page: pageNum,
      limit: limitNum,
      pinnedCount,
      reviewRequiredCount,
      recentCount,
      tabCounts,
    });
  } catch (err: any) {
    console.error('Error listing bulletins:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/bulletins/announcements - Get lightweight bulletin announcements
router.get('/announcements', (req: Request, res: Response) => {
  try {
    const sql = `
      SELECT a.*, u.name as author_name 
      FROM bulletin_announcements a
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.is_pinned DESC, a.created_at DESC
      LIMIT 10
    `;
    const announcements = query(sql);
    res.json(announcements.map((a: any) => ({ ...a, is_pinned: Boolean(a.is_pinned) })));
  } catch (err: any) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bulletins/announcements - Create lightweight announcement
router.post('/announcements', (req: Request, res: Response) => {
  try {
    const { title, content, author_id, is_pinned = 0 } = req.body;
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const id = `ann-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    run(
      'INSERT INTO bulletin_announcements (id, title, content, author_id, is_pinned, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title.trim(), content.trim(), author_id || null, is_pinned ? 1 : 0, now]
    );

    res.status(201).json({ id, message: 'Announcement created successfully' });
  } catch (err: any) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bulletins/announcements/:id - Delete announcement
router.delete('/announcements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    run('DELETE FROM bulletin_announcements WHERE id = ?', [id]);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting announcement:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/bulletins/detect-title - Safe URL document title / subject detection
router.get('/detect-title', async (req: Request, res: Response) => {
  const targetUrl = String(req.query.url || '').trim();
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).json({ error: 'Valid HTTP/HTTPS URL required' });
  }

  if (isPrivateUrl(targetUrl)) {
    return res.status(400).json({ error: 'Private or local addresses are forbidden' });
  }

  const detectedType = detectResourceType(targetUrl);

  try {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const fetchPromise = new Promise<{ title: string | null }>((resolve) => {
      const request = client.get(
        targetUrl,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EngineeringTaskHub/1.0',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 4000,
        },
        (response) => {
          // Follow one redirect if needed
          if (
            response.statusCode &&
            [301, 302, 307, 308].includes(response.statusCode) &&
            response.headers.location
          ) {
            const redirectUrl = response.headers.location;
            if (/^https?:\/\//i.test(redirectUrl) && !isPrivateUrl(redirectUrl)) {
              // Redirect once
              const redClient = redirectUrl.startsWith('https:') ? https : http;
              redClient.get(
                redirectUrl,
                { headers: { 'User-Agent': 'EngineeringTaskHub/1.0' }, timeout: 3000 },
                (redRes) => {
                  let chunkData = '';
                  redRes.setEncoding('utf8');
                  redRes.on('data', (c) => {
                    chunkData += c;
                    if (chunkData.length > 50000) redRes.destroy();
                  });
                  redRes.on('end', () => {
                    const match = chunkData.match(/<title[^>]*>([^<]+)<\/title>/i);
                    resolve({ title: match ? match[1].trim() : null });
                  });
                  redRes.on('error', () => resolve({ title: null }));
                }
              ).on('error', () => resolve({ title: null }));
              return;
            }
          }

          let data = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => {
            data += chunk;
            if (data.length > 50000) response.destroy();
          });
          response.on('end', () => {
            const match = data.match(/<title[^>]*>([^<]+)<\/title>/i);
            resolve({ title: match ? match[1].trim() : null });
          });
          response.on('error', () => resolve({ title: null }));
        }
      );

      request.on('error', () => resolve({ title: null }));
      request.on('timeout', () => {
        request.destroy();
        resolve({ title: null });
      });
    });

    const result = await Promise.race([
      fetchPromise,
      new Promise<{ title: string | null }>((res) => setTimeout(() => res({ title: null }), 4500)),
    ]);

    res.json({
      title: result.title,
      detectedType,
    });
  } catch (err: any) {
    res.json({
      title: null,
      detectedType,
    });
  }
});

// 4. GET /api/bulletins/:id - Get single resource details
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT 
        b.*,
        pr.name as project_name,
        pr.code as project_code,
        pk.name as package_name,
        pk.code as package_code,
        rep.display_name as replacement_resource_name
      FROM bulletin_resources b
      LEFT JOIN projects pr ON b.project_id = pr.id
      LEFT JOIN packages pk ON b.package_id = pk.id
      LEFT JOIN bulletin_resources rep ON b.replacement_resource_id = rep.id
      WHERE b.id = ?
    `;
    const resource = queryOne(sql, [id]);
    if (!resource) {
      return res.status(404).json({ error: 'Bulletin resource not found' });
    }

    if (resource.tags) {
      try {
        resource.tags = JSON.parse(resource.tags);
      } catch {
        resource.tags = String(resource.tags).split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else {
      resource.tags = [];
    }
    resource.pinned = Boolean(resource.pinned);

    // Fetch related tasks
    const tasksSql = `
      SELECT t.id, t.title, t.status, t.priority, t.progress, t.deadline,
             pr.code as project_code, pk.code as package_code
      FROM task_bulletins tb
      JOIN tasks t ON tb.task_id = t.id
      LEFT JOIN packages pk ON t.package_id = pk.id
      LEFT JOIN projects pr ON (t.project_id = pr.id OR pk.project_id = pr.id)
      WHERE tb.bulletin_id = ?
      ORDER BY t.created_at DESC
    `;
    resource.related_tasks = query(tasksSql, [id]);
    resource.related_tasks_count = resource.related_tasks.length;

    res.json(resource);
  } catch (err: any) {
    console.error('Error fetching bulletin details:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. POST /api/bulletins - Create a new resource
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      display_name,
      document_title,
      description,
      resource_type,
      location,
      project_id,
      package_id,
      discipline = 'Instrument',
      tags,
      owner,
      priority = 'NORMAL',
      pinned = 0,
      status = 'ACTIVE',
      next_review,
      notes,
      replacement_resource_id,
    } = req.body;

    // Validation
    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: 'Display Name is required' });
    }
    if (!location || !location.trim()) {
      return res.status(400).json({ error: 'Location (URL or Path) is required' });
    }

    const cleanLocation = location.trim();
    const cleanType: BulletinResourceType = resource_type && VALID_RESOURCE_TYPES.includes(resource_type)
      ? resource_type
      : detectResourceType(cleanLocation);

    // Check duplicate location for active resources
    const duplicateRow = queryOne(
      'SELECT id, display_name FROM bulletin_resources WHERE LOWER(location) = LOWER(?) AND status = "ACTIVE"',
      [cleanLocation]
    );

    // Validate foreign keys if provided
    if (project_id) {
      const proj = queryOne('SELECT id FROM projects WHERE id = ?', [project_id]);
      if (!proj) return res.status(400).json({ error: 'Selected project does not exist' });
    }
    if (package_id) {
      const pkg = queryOne('SELECT id, project_id FROM packages WHERE id = ?', [package_id]);
      if (!pkg) return res.status(400).json({ error: 'Selected package does not exist' });
      if (project_id && pkg.project_id && pkg.project_id !== project_id) {
        return res.status(400).json({ error: 'Selected package does not belong to the selected project' });
      }
    }

    const id = `blt-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    let tagsJson: string | null = null;
    if (tags) {
      if (Array.isArray(tags)) {
        tagsJson = JSON.stringify(tags);
      } else if (typeof tags === 'string') {
        tagsJson = JSON.stringify(tags.split(',').map((s) => s.trim()).filter(Boolean));
      }
    }

    const insertSql = `
      INSERT INTO bulletin_resources (
        id, display_name, document_title, description, resource_type, location,
        project_id, package_id, discipline, tags, owner, priority, pinned,
        status, last_reviewed, next_review, last_opened, open_count,
        replacement_resource_id, link_health, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    run(insertSql, [
      id,
      display_name.trim(),
      document_title ? document_title.trim() : null,
      description ? description.trim() : null,
      cleanType,
      cleanLocation,
      project_id || null,
      package_id || null,
      discipline ? discipline.trim() : 'Instrument',
      tagsJson,
      owner ? owner.trim() : null,
      priority || 'NORMAL',
      pinned ? 1 : 0,
      status || 'ACTIVE',
      null, // last_reviewed
      next_review || null,
      null, // last_opened
      0, // open_count
      replacement_resource_id || null,
      'NOT_CHECKED',
      notes ? notes.trim() : null,
      now,
      now,
    ]);

    res.status(201).json({
      id,
      message: 'Resource created successfully',
      isDuplicateWarning: Boolean(duplicateRow),
      duplicateExistingName: duplicateRow?.display_name,
    });
  } catch (err: any) {
    console.error('Error creating bulletin resource:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. PUT /api/bulletins/:id - Update resource metadata
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT * FROM bulletin_resources WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Bulletin resource not found' });
    }

    const {
      display_name,
      document_title,
      description,
      resource_type,
      location,
      project_id,
      package_id,
      discipline,
      tags,
      owner,
      priority,
      pinned,
      status,
      last_reviewed,
      next_review,
      notes,
      replacement_resource_id,
    } = req.body;

    if (display_name !== undefined && !display_name.trim()) {
      return res.status(400).json({ error: 'Display Name cannot be empty' });
    }
    if (location !== undefined && !location.trim()) {
      return res.status(400).json({ error: 'Location cannot be empty' });
    }

    const cleanLocation = location !== undefined ? location.trim() : existing.location;
    const cleanType = resource_type && VALID_RESOURCE_TYPES.includes(resource_type)
      ? resource_type
      : (resource_type !== undefined ? detectResourceType(cleanLocation) : existing.resource_type);

    if (project_id !== undefined && project_id !== null && project_id !== '') {
      const proj = queryOne('SELECT id FROM projects WHERE id = ?', [project_id]);
      if (!proj) return res.status(400).json({ error: 'Selected project does not exist' });
    }
    if (package_id !== undefined && package_id !== null && package_id !== '') {
      const pkg = queryOne('SELECT id, project_id FROM packages WHERE id = ?', [package_id]);
      if (!pkg) return res.status(400).json({ error: 'Selected package does not exist' });
      const targetProjId = project_id !== undefined ? project_id : existing.project_id;
      if (targetProjId && pkg.project_id && pkg.project_id !== targetProjId) {
        return res.status(400).json({ error: 'Selected package does not belong to the selected project' });
      }
    }

    let tagsJson = existing.tags;
    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        tagsJson = JSON.stringify(tags);
      } else if (typeof tags === 'string') {
        tagsJson = JSON.stringify(tags.split(',').map((s) => s.trim()).filter(Boolean));
      } else {
        tagsJson = null;
      }
    }

    const now = new Date().toISOString();

    const updateSql = `
      UPDATE bulletin_resources SET
        display_name = ?,
        document_title = ?,
        description = ?,
        resource_type = ?,
        location = ?,
        project_id = ?,
        package_id = ?,
        discipline = ?,
        tags = ?,
        owner = ?,
        priority = ?,
        pinned = ?,
        status = ?,
        last_reviewed = ?,
        next_review = ?,
        notes = ?,
        replacement_resource_id = ?,
        updated_at = ?
      WHERE id = ?
    `;

    run(updateSql, [
      display_name !== undefined ? display_name.trim() : existing.display_name,
      document_title !== undefined ? (document_title ? document_title.trim() : null) : existing.document_title,
      description !== undefined ? (description ? description.trim() : null) : existing.description,
      cleanType,
      cleanLocation,
      project_id !== undefined ? (project_id || null) : existing.project_id,
      package_id !== undefined ? (package_id || null) : existing.package_id,
      discipline !== undefined ? (discipline ? discipline.trim() : 'Instrument') : existing.discipline,
      tagsJson,
      owner !== undefined ? (owner ? owner.trim() : null) : existing.owner,
      priority !== undefined ? priority : existing.priority,
      pinned !== undefined ? (pinned ? 1 : 0) : existing.pinned,
      status !== undefined ? status : existing.status,
      last_reviewed !== undefined ? last_reviewed : existing.last_reviewed,
      next_review !== undefined ? next_review : existing.next_review,
      notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      replacement_resource_id !== undefined ? (replacement_resource_id || null) : existing.replacement_resource_id,
      now,
      id,
    ]);

    res.json({ message: 'Resource updated successfully' });
  } catch (err: any) {
    console.error('Error updating bulletin resource:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. DELETE /api/bulletins/:id - Delete resource permanently
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = queryOne('SELECT id FROM bulletin_resources WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Bulletin resource not found' });
    }

    withTransaction(() => {
      run('DELETE FROM task_bulletins WHERE bulletin_id = ?', [id]);
      run('UPDATE bulletin_resources SET replacement_resource_id = NULL WHERE replacement_resource_id = ?', [id]);
      run('DELETE FROM bulletin_resources WHERE id = ?', [id]);
    });

    res.json({ message: 'Resource deleted permanently' });
  } catch (err: any) {
    console.error('Error deleting bulletin resource:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. POST /api/bulletins/:id/pin - Toggle pin
router.post('/:id/pin', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resource = queryOne('SELECT id, pinned FROM bulletin_resources WHERE id = ?', [id]);
    if (!resource) {
      return res.status(404).json({ error: 'Bulletin resource not found' });
    }

    const explicitPin = req.body.pinned;
    const newPinned = explicitPin !== undefined ? (explicitPin ? 1 : 0) : (resource.pinned ? 0 : 1);
    const now = new Date().toISOString();

    run('UPDATE bulletin_resources SET pinned = ?, updated_at = ? WHERE id = ?', [newPinned, now, id]);

    res.json({ pinned: Boolean(newPinned), message: newPinned ? 'Pinned resource' : 'Unpinned resource' });
  } catch (err: any) {
    console.error('Error toggling pin:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. POST /api/bulletins/:id/open - Record open & attempt local open if supported
router.post('/:id/open', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resource = queryOne('SELECT * FROM bulletin_resources WHERE id = ?', [id]);
    if (!resource) {
      return res.status(404).json({ error: 'Bulletin resource not found' });
    }

    const now = new Date().toISOString();
    const newCount = (resource.open_count || 0) + 1;

    run('UPDATE bulletin_resources SET last_opened = ?, open_count = ?, updated_at = ? WHERE id = ?', [
      now,
      newCount,
      now,
      id,
    ]);

    const isWeb = [
      'WEB_URL',
      'GOOGLE_SHEET',
      'GOOGLE_DOCS',
      'SHAREPOINT',
      'TEAMS',
      'VENDOR_PORTAL',
    ].includes(resource.resource_type);

    if (isWeb) {
      return res.json({
        success: true,
        opened: true,
        open_count: newCount,
        last_opened: now,
        isWeb: true,
        location: resource.location,
      });
    }

    // Network / Local paths:
    // In this cloud sandbox environment, direct shell desktop commands (like Explorer or Finder) are not available.
    // We report truthfulness: opened = false, canOpenLocally = false, advise COPY PATH.
    return res.json({
      success: true,
      opened: false,
      canOpenLocally: false,
      open_count: newCount,
      last_opened: now,
      message: 'Local or network file paths cannot be directly launched in this cloud browser runtime. Please use COPY PATH to open in Windows File Explorer.',
      location: resource.location,
    });
  } catch (err: any) {
    console.error('Error opening resource:', err);
    res.status(500).json({ error: err.message });
  }
});

// 10. POST /api/bulletins/:id/copy - Record copy interaction as usage
router.post('/:id/copy', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resource = queryOne('SELECT id, open_count FROM bulletin_resources WHERE id = ?', [id]);
    if (!resource) {
      return res.status(404).json({ error: 'Bulletin resource not found' });
    }

    const now = new Date().toISOString();
    const newCount = (resource.open_count || 0) + 1;

    run('UPDATE bulletin_resources SET last_opened = ?, open_count = ?, updated_at = ? WHERE id = ?', [
      now,
      newCount,
      now,
      id,
    ]);

    res.json({ success: true, open_count: newCount, last_opened: now });
  } catch (err: any) {
    console.error('Error recording copy:', err);
    res.status(500).json({ error: err.message });
  }
});

// 11. POST /api/bulletins/:id/archive - Archive resource
router.post('/:id/archive', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();
    run("UPDATE bulletin_resources SET status = 'ARCHIVED', updated_at = ? WHERE id = ?", [now, id]);
    res.json({ message: 'Resource archived successfully' });
  } catch (err: any) {
    console.error('Error archiving resource:', err);
    res.status(500).json({ error: err.message });
  }
});

// 12. POST /api/bulletins/:id/restore - Restore resource to ACTIVE
router.post('/:id/restore', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();
    run("UPDATE bulletin_resources SET status = 'ACTIVE', updated_at = ? WHERE id = ?", [now, id]);
    res.json({ message: 'Resource restored to active state' });
  } catch (err: any) {
    console.error('Error restoring resource:', err);
    res.status(500).json({ error: err.message });
  }
});

// 13. POST /api/bulletins/:id/replace - Mark superseded & set replacement
router.post('/:id/replace', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { replacementResourceId, newStatus = 'SUPERSEDED' } = req.body;

    if (!replacementResourceId) {
      return res.status(400).json({ error: 'Replacement resource ID is required' });
    }
    const replacement = queryOne('SELECT id, display_name FROM bulletin_resources WHERE id = ?', [replacementResourceId]);
    if (!replacement) {
      return res.status(404).json({ error: 'Replacement resource does not exist' });
    }

    const now = new Date().toISOString();
    run(
      'UPDATE bulletin_resources SET status = ?, replacement_resource_id = ?, updated_at = ? WHERE id = ?',
      [newStatus, replacementResourceId, now, id]
    );

    res.json({
      message: `Resource marked as ${newStatus} and linked to replacement: ${replacement.display_name}`,
      replacementName: replacement.display_name,
    });
  } catch (err: any) {
    console.error('Error replacing resource:', err);
    res.status(500).json({ error: err.message });
  }
});

// 14. POST /api/bulletins/:id/check - Optional link health check for public web resources
router.post('/:id/check', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resource = queryOne('SELECT * FROM bulletin_resources WHERE id = ?', [id]);
    if (!resource) {
      return res.status(404).json({ error: 'Bulletin resource not found' });
    }

    const loc = resource.location;
    if (!/^https?:\/\//i.test(loc) || isPrivateUrl(loc)) {
      return res.json({
        link_health: 'NOT_CHECKED',
        health_checked_at: new Date().toISOString(),
        message: 'Internal / local paths or private URLs cannot be pinged over the internet.',
      });
    }

    // Perform lightweight HEAD or GET check
    const checkPromise = new Promise<{ health: string }>((resolve) => {
      try {
        const parsed = new URL(loc);
        const client = parsed.protocol === 'https:' ? https : http;
        const req = client.request(
          loc,
          { method: 'HEAD', timeout: 4000, headers: { 'User-Agent': 'EngineeringTaskHub/1.0' } },
          (resp) => {
            if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 400) {
              resolve({ health: 'ACTIVE' });
            } else if (resp.statusCode === 401 || resp.statusCode === 403) {
              resolve({ health: 'ACCESS_REQUIRED' });
            } else if (resp.statusCode && resp.statusCode >= 400) {
              resolve({ health: 'BROKEN' });
            } else {
              resolve({ health: 'CHECK_FAILED' });
            }
          }
        );
        req.on('error', () => resolve({ health: 'BROKEN' }));
        req.on('timeout', () => {
          req.destroy();
          resolve({ health: 'CHECK_FAILED' });
        });
        req.end();
      } catch {
        resolve({ health: 'CHECK_FAILED' });
      }
    });

    const result = await Promise.race([
      checkPromise,
      new Promise<{ health: string }>((r) => setTimeout(() => r({ health: 'CHECK_FAILED' }), 5000)),
    ]);

    const now = new Date().toISOString();
    run('UPDATE bulletin_resources SET link_health = ?, health_checked_at = ?, updated_at = ? WHERE id = ?', [
      result.health,
      now,
      now,
      id,
    ]);

    res.json({ link_health: result.health, health_checked_at: now });
  } catch (err: any) {
    console.error('Error checking resource health:', err);
    res.status(500).json({ error: err.message });
  }
});

// 15. Task ↔ Bulletin relationship endpoints
router.get('/:id/tasks', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tasksSql = `
      SELECT t.id, t.title, t.status, t.priority, t.progress, t.deadline,
             pr.name as project_name, pr.code as project_code,
             pk.name as package_name, pk.code as package_code
      FROM task_bulletins tb
      JOIN tasks t ON tb.task_id = t.id
      LEFT JOIN packages pk ON t.package_id = pk.id
      LEFT JOIN projects pr ON (t.project_id = pr.id OR pk.project_id = pr.id)
      WHERE tb.bulletin_id = ?
      ORDER BY t.created_at DESC
    `;
    const tasks = query(tasksSql, [id]);
    res.json(tasks);
  } catch (err: any) {
    console.error('Error fetching linked tasks for bulletin:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
