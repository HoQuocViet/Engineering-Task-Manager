import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: Database | null = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure data and uploads directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function normalizeVietnamese(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

export function registerCustomFunctions(database: Database): void {
  try {
    database.create_function('LOWER', (str: any) => {
      return typeof str === 'string' ? str.toLowerCase() : str;
    });
  } catch (err) {
    console.error('Failed to register LOWER SQLite function:', err);
  }

  try {
    database.create_function('VI_MATCH', (content: any, keyword: any) => {
      if (!content || !keyword) return 0;
      const strContent = String(content);
      const strKeyword = String(keyword).trim();
      if (!strKeyword) return 1;

      // 1. Unicode case-insensitive match (e.g. 'ăn chơi Phu Kệt Nào' matches 'Ăn chơi Phu Kệt Nào')
      if (strContent.toLowerCase().includes(strKeyword.toLowerCase())) {
        return 1;
      }

      // 2. Diacritic-insensitive match (e.g. 'an choi' matches 'Ăn chơi')
      if (normalizeVietnamese(strContent).includes(normalizeVietnamese(strKeyword))) {
        return 1;
      }

      return 0;
    });
  } catch (err) {
    console.error('Failed to register VI_MATCH SQLite function:', err);
  }
}

export function ensureCustomFunctions(database: Database): void {
  if (!database) return;
  const sa = (database as any).Sa;
  if (!sa || !sa['VI_MATCH']) {
    registerCustomFunctions(database);
  }
}

export async function getDb(): Promise<Database> {
  if (db) {
    ensureCustomFunctions(db);
    return db;
  }

  const SQL = await initSqlJs({
    // Locate wasm file if needed or use default node resolution
  });

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Error loading existing db from disk, creating new:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Register custom SQLite functions (Unicode case-folding & Vietnamese diacritics support)
  registerCustomFunctions(db);

  // Initialize schema
  initSchema(db);
  saveDb();

  return db;
}

export function saveDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    // sql.js export() resets internal function map; re-register functions immediately
    registerCustomFunctions(db);
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database to disk:', err);
  }
}

export async function replaceDbWithBuffer(fileBuffer: Buffer): Promise<void> {
  const SQL = await initSqlJs({});
  const newDb = new SQL.Database(fileBuffer);
  registerCustomFunctions(newDb);
  initSchema(newDb);
  db = newDb;
  saveDb();
}

function initSchema(database: Database): void {
  // 1. Create all base tables
  database.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT,
      email TEXT,
      phone TEXT,
      bio TEXT,
      discipline TEXT,
      is_admin INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      client TEXT,
      logo TEXT,
      description TEXT,
      status TEXT DEFAULT 'ACTIVE',
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#3b82f6',
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL,
      description TEXT,
      discipline TEXT,
      vendor TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#64748b',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'TASK',
      category_id TEXT,
      package_id TEXT,
      priority TEXT DEFAULT 'MEDIUM',
      status TEXT DEFAULT 'TODO',
      progress INTEGER DEFAULT 0,
      start_date TEXT,
      deadline TEXT,
      forecast_finish TEXT,
      completed_date TEXT,
      assignee_id TEXT,
      pics TEXT,
      group_id TEXT,
      forecast_revision_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      user_id TEXT,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS task_attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS task_activities (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      user_id TEXT,
      activity_type TEXT NOT NULL,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS outlook_config (
      id TEXT PRIMARY KEY,
      client_id TEXT,
      tenant_id TEXT,
      client_secret TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at INTEGER DEFAULT 0,
      user_email TEXT,
      user_display_name TEXT,
      last_synced_at TEXT,
      is_connected INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outlook_events (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      body_preview TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_all_day INTEGER DEFAULT 0,
      is_cancelled INTEGER DEFAULT 0,
      location TEXT,
      meeting_link TEXT,
      organizer_name TEXT,
      organizer_email TEXT,
      attendees_json TEXT,
      web_link TEXT,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      role TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);

  // 2. Safe schema migrations for existing pre-created database tables
  try { database.run('ALTER TABLE projects ADD COLUMN logo TEXT;'); } catch (e) {}
  try { database.run('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;'); } catch (e) {}
  try { database.run('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;'); } catch (e) {}
  try { database.run('ALTER TABLE users ADD COLUMN email TEXT;'); } catch (e) {}
  try { database.run('ALTER TABLE users ADD COLUMN phone TEXT;'); } catch (e) {}
  try { database.run('ALTER TABLE users ADD COLUMN bio TEXT;'); } catch (e) {}
  try { database.run('ALTER TABLE users ADD COLUMN discipline TEXT;'); } catch (e) {}
  try { database.run('ALTER TABLE packages ADD COLUMN project_id TEXT;'); } catch (e) {}
  try { database.run('ALTER TABLE packages ADD COLUMN discipline TEXT;'); } catch (e) {}
  try { database.run('ALTER TABLE packages ADD COLUMN vendor TEXT;'); } catch (e) {}
  try { database.run('ALTER TABLE tasks ADD COLUMN project_id TEXT;'); } catch (e) {}
  try { database.run('ALTER TABLE tasks ADD COLUMN type TEXT DEFAULT "TASK";'); } catch (e) {}
  try { database.run('ALTER TABLE tasks ADD COLUMN forecast_finish TEXT;'); } catch (e) {}
  try { database.run('ALTER TABLE tasks ADD COLUMN completed_date TEXT;'); } catch (e) {}
  try { database.run('ALTER TABLE tasks ADD COLUMN group_id TEXT;'); } catch (e) {}
  try { database.run('ALTER TABLE tasks ADD COLUMN forecast_revision_count INTEGER DEFAULT 0;'); } catch (e) {}
  try { database.run('ALTER TABLE tasks ADD COLUMN pics TEXT;'); } catch (e) {}
  try {
    database.run(`
      UPDATE tasks 
      SET forecast_revision_count = (
        SELECT COUNT(*) FROM task_activities 
        WHERE task_activities.task_id = tasks.id AND task_activities.activity_type = 'FORECAST_CHANGED'
      )
      WHERE (forecast_revision_count IS NULL OR forecast_revision_count = 0)
        AND EXISTS (
          SELECT 1 FROM task_activities 
          WHERE task_activities.task_id = tasks.id AND task_activities.activity_type = 'FORECAST_CHANGED'
        );
    `);
  } catch (e) {}

  // 3. Create indices AFTER all columns are guaranteed to exist
  try { database.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);'); } catch (e) {}
  try { database.run('CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);'); } catch (e) {}
  try { database.run('CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);'); } catch (e) {}
  try { database.run('CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);'); } catch (e) {}
  try { database.run('CREATE INDEX IF NOT EXISTS idx_tasks_package_id ON tasks(package_id);'); } catch (e) {}
  try { database.run('CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);'); } catch (e) {}
  try { database.run('CREATE INDEX IF NOT EXISTS idx_tasks_group_id ON tasks(group_id);'); } catch (e) {}
  try { database.run('CREATE INDEX IF NOT EXISTS idx_packages_project_id ON packages(project_id);'); } catch (e) {}
  try { database.run('CREATE INDEX IF NOT EXISTS idx_outlook_events_start_date ON outlook_events(start_date);'); } catch (e) {}

  // 4. Seed default Outlook config with credentials provided if not already exists
  try {
    const stmt = database.prepare('SELECT id FROM outlook_config WHERE id = ?');
    stmt.bind(['default']);
    const hasConfig = stmt.step();
    stmt.free();

    if (!hasConfig) {
      database.run(`
        INSERT INTO outlook_config (id, client_id, tenant_id, client_secret, is_connected, updated_at)
        VALUES (?, ?, ?, ?, 0, ?)
      `, [
        'default',
        process.env.AZURE_CLIENT_ID || 'c35e8947-da5e-4ee0-9438-b144bc773f20',
        process.env.AZURE_TENANT_ID || 'c5f8b837-074d-4184-92dc-984a1f2d33a8',
        process.env.AZURE_CLIENT_SECRET || 'aacbd7ca-42a9-4b07-a962-9053e664d6e1',
        new Date().toISOString()
      ]);
    }
  } catch (err) {
    console.error('Error ensuring outlook_config:', err);
  }

  // 5. Seed default PICs (Persons In Charge) if empty
  try {
    const checkStmt = database.prepare('SELECT COUNT(*) as count FROM pics');
    let picCount = 0;
    if (checkStmt.step()) {
      const obj = checkStmt.getAsObject() as any;
      picCount = Number(obj.count || 0);
    }
    checkStmt.free();

    if (picCount === 0) {
      const now = new Date().toISOString();
      const defaultPics = [
        { id: 'pic-1', name: 'Ho Quoc Viet (Tôi)', role: 'Project Manager / Lead Engineer' },
        { id: 'pic-2', name: 'Nguyen Van An', role: 'Senior Piping Engineer' },
        { id: 'pic-3', name: 'Tran Minh Duc', role: 'Structural Engineer' },
        { id: 'pic-4', name: 'Le Thi Mai', role: 'Lead Document Controller' },
        { id: 'pic-5', name: 'Pham Hoang Nam', role: 'Electrical & Instrumentation Lead' },
        { id: 'pic-6', name: 'Vu Quoc Bao', role: 'QA/QC & HSE Lead Inspector' },
        { id: 'pic-7', name: 'Doan Tan Phat', role: 'Lead Commissioning Engineer' },
        { id: 'pic-8', name: 'Bui Anh Tuan', role: 'Senior Procurement Specialist' },
      ];

      for (const p of defaultPics) {
        database.run(
          'INSERT OR IGNORE INTO pics (id, name, role, avatar, created_at) VALUES (?, ?, ?, ?, ?)',
          [p.id, p.name, p.role, '', now]
        );
      }
    }
  } catch (err) {
    console.error('Error ensuring default pics:', err);
  }
}

// Query helper to return typed objects array
export function query<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  ensureCustomFunctions(db);
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export const queryAll = query;

// Query single row
export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Run mutation and auto-persist to disk
export function run(sql: string, params: any[] = []): void {
  if (!db) throw new Error('Database not initialized');
  ensureCustomFunctions(db);
  db.run(sql, params);
  saveDb();
}

export { DATA_DIR, DB_PATH, UPLOADS_DIR };
