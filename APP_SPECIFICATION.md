# System & Engineering App Specification: Engineering Task & Work Manager

> **Document Type**: Comprehensive Architectural & Functional Specification (Vibe-Coding Ready)  
> **Target LLMs / Code Engines**: Claude 3.7 Sonnet / Cursor / GitHub Copilot / Gemini  
> **Version**: 1.1.0  
> **Target Platform**: Responsive Web Single-Page Application (SPA) / Local Hybrid Execution  
> **Default Port**: 3000  
> **Database Engine**: Local Persistent SQLite via WebAssembly (`sql.js`)  
> **UI Display Language**: 100% Strict English (Professional Oil & Gas / EPC Technical Domain)  
> **Primary Purpose**: Enables any modern AI coding engine to reproduce this exact application architecture, UI/UX aesthetics, behavior, and database mechanics with zero ambiguity.

---

## 1. Executive Summary & Design Philosophy

**Engineering Task & Work Manager** is a high-density, production-grade project deliverable and task tracking system engineered specifically for offshore engineering, EPC (Engineering, Procurement, Construction, Installation) projects, and multidisciplinary design teams (Process, Piping, Mechanical, Electrical, Instrumentation, Structural, Naval/Hull, and Commissioning).

### 1.1 Core Principles
1. **100% Local Data Ownership & Zero Cloud DB Setup**: Operates instantly out-of-the-box using local SQLite (`sql.js`) persisted to a single binary file on disk (`data/app.db`). Includes one-click database export (`.sqlite`) and import/restore without requiring Docker, PostgreSQL, or remote cloud connections.
2. **Vietnamese Diacritics & Unicode-Aware Search (`VI_MATCH`)**: Employs custom SQLite user-defined functions (`LOWER`, `VI_MATCH`) in WebAssembly to seamlessly match Vietnamese text both with and without diacritic accents (e.g., typing `an choi` accurately matches `Ăn chơi`), while preserving a 100% English UI.
3. **Zero-Flick, Dense Engineering UI**: Professional desktop-density layout featuring instantaneous row selection without text shifting or layout jumping, inline progress adjustment sliders, keyboard navigation ($\uparrow$ / $\downarrow$ / `Enter`), sticky filter toolbars, and synchronized dark/light theme tokens.
4. **Bidirectional Microsoft Outlook 365 Sync**: Integrates with Microsoft Graph REST API to synchronize task deadlines, review meetings, and milestones directly with user Outlook calendars.
5. **Multi-Model Engineering AI Copilot & Resilient Tier Isolation**: Context-aware assistant powered by `@google/genai` (Gemini 3.8 Flash, Gemini 3.1 Flash Lite) and Anthropic Claude (Claude 3.7 Sonnet, 3.5 Sonnet/Haiku). Features strict isolation between free-tier text models and paid Pro models (`gemini-3.1-pro-preview`) to prevent 429 quota traps, backed by automatic exponential backoff (1200ms) and dynamic failover during temporary Google Cloud high demand spikes (HTTP 503).

---

## 2. Technology Stack & Runtime Dependencies

### 2.1 Frontend Architecture
- **Core Library**: React 19 (`react`, `react-dom`)
- **Language**: TypeScript 5.8 (Strict type checking enabled)
- **Bundler & Dev Server**: Vite 6.2 with `@vitejs/plugin-react`
- **Styling Engine**: Tailwind CSS v4 (`@tailwindcss/vite`) via `@import "tailwindcss";`
  - Custom dark mode variant: `@custom-variant dark (&:where(.dark, .dark *));`
  - Invisible-at-rest interactive scrollbars revealing on hover
  - Standardized unified page header banner (`h-[62px]` with signature gradient)
- **Iconography**: Lucide React (`lucide-react`)
- **Data Visualization & Analytics**: Recharts (`recharts`) for responsive SVG bar, pie, and area charts
- **Excel & Document Processing**:
  - `xlsx` (SheetJS) for bidirectional `.xlsx` export/import
  - `pdfjs-dist` for PDF technical document parsing
  - `mammoth` for Word (`.docx`) file text extraction
- **Date Engine**: `date-fns` v4 for timezone-safe parsing, relative timestamps, and ISO serialization

### 2.2 Backend Architecture
- **Runtime Environment**: Node.js $\ge$ 18 with `tsx` (Dev) and `esbuild` bundled CJS (Production)
- **Web Server**: Express 4.21 with Express JSON/URL-encoded middleware
- **Vite Integration**: In development, `vite.middlewares` is mounted directly onto the Express server inside `server.ts` on port 3000. In production, static assets from `dist/` are served.
- **Database Engine**: `sql.js` (WebAssembly SQLite compiled for Node.js)
  - Persisted binary file: `data/app.db`
  - Custom C/WASM registered functions: `VI_MATCH(content, keyword)`, `LOWER(str)`
- **File Uploads**: `multer` with disk storage in `data/uploads/`
- **AI SDK**: `@google/genai` for official Google Gemini integration

---

## 3. Directory & File Structure

```
├── AGENTS.md                   # Strict persistent guidelines for AI coding agents
├── APP_SPECIFICATION.md        # This comprehensive system specification
├── package.json                # Project manifest, dependencies, and build scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite plugins and path alias configuration
├── server.ts                   # Express server entry point mounting Vite middlewares
├── metadata.json               # Applet metadata, capabilities and permissions
│
├── data/                       # Local disk storage directory (Auto-created)
│   ├── app.db                  # Persisted SQLite binary database file
│   └── uploads/                # Physical uploaded attachments (Drawings, PDFs, Specs)
│
├── server/                     # Backend API & Database Logic
│   ├── db.ts                   # SQLite wasm wrapper, schema definitions, custom functions, persistence
│   ├── seed.ts                 # Engineering demo seed dataset (Projects, Packages, Tasks, Users)
│   └── routes/                 # REST API controllers
│       ├── tasks.ts            # Task CRUD, batch actions, activities, comments, subtasks
│       ├── projects.ts         # Project creation, status, and metadata
│       ├── packages.ts         # Procurement package and deliverable management
│       ├── categories.ts       # Discipline & task category endpoints
│       ├── tags.ts             # Tagging endpoints and color management
│       ├── users.ts            # Team member management and discipline assignment
│       ├── dashboard.ts        # Aggregated KPI metrics, overdue statistics, workload data
│       ├── attachments.ts      # Multi-part file upload, metadata storage, download stream
│       ├── system.ts           # SQLite export/download, import/restore, and reset logic
│       ├── ai.ts               # Gemini & Claude prompt routing, streaming, and technical chat
│       └── outlook.ts          # Microsoft Graph OAuth tokens, event sync, and calendar webhooks
│
├── src/                        # Frontend React Application
│   ├── main.tsx                # React DOM entry point
│   ├── App.tsx                 # Root layout, primary view router, and global modal hosts
│   ├── index.css               # Tailwind CSS v4, custom variants, print styles, scrollbar tokens
│   │
│   ├── context/
│   │   └── AppContext.tsx      # Central state container (active view, user, filters, theme, branding)
│   │
│   ├── types/
│   │   └── index.ts            # Canonical TypeScript interfaces, enums, and API contracts
│   │
│   ├── lib/                    # Reusable Business & UI Utilities
│   │   ├── api.ts              # Centralized HTTP client wrapper with error handling
│   │   ├── dateUtils.ts        # Due date calculations, overdue checks, formatting
│   │   ├── excelExport.ts      # Multi-sheet Excel workbook generator (`.xlsx`)
│   │   ├── printUtils.ts       # Clean printable report generator with custom print CSS
│   │   └── sortUtils.ts        # Multi-column sorting and filtering engine
│   │
│   ├── components/             # Modular UI Components
│   │   ├── layout/
│   │   │   ├── Navbar.tsx      # Top global navigation bar (Search, New Task, User selector, Theme)
│   │   │   ├── Sidebar.tsx     # Collapsible navigation drawer with view counters
│   │   │   └── PageHeader.tsx  # Unified 62px header banner component
│   │   ├── tasks/
│   │   │   ├── TaskListTable.tsx    # Dense master task table with zero-flick inline editing
│   │   │   ├── TaskDetailModal.tsx  # Full task modal: details, comments, attachments, activity log
│   │   │   ├── QuickTaskModal.tsx   # Fast pop-up dialog to register deliverables in seconds
│   │   │   ├── BatchActionBar.tsx   # Floating bulk operations toolbar (Status, Priority, Delete)
│   │   │   └── PrintPreviewModal.tsx# Printable document preview modal with pagination
│   │   ├── calendar/
│   │   │   ├── OutlookSyncModal.tsx # Azure OAuth & synchronization setup modal
│   │   │   └── OutlookEventModal.tsx# Outlook calendar event inspection modal
│   │   ├── common/
│   │   │   ├── DatePicker.tsx       # Compact calendar date selector component
│   │   │   ├── Badge.tsx            # Standardized status, priority, and discipline badges
│   │   │   └── ConfirmModal.tsx     # Action confirmation dialog
│   │   └── ai/
│   │       ├── AIChatBubble.tsx     # Floating assistant widget with markdown streaming
│   │       └── Robot3DIcon.tsx      # 3D engineering robot avatar with animated pulses
│   │
│   └── views/                  # Primary Screens
│       ├── DashboardView.tsx   # Executive overview, KPI cards, Recharts graphs, urgent items
│       ├── TaskListView.tsx    # Master tasks grid with multi-parameter filter toolbar
│       ├── MyWorkView.tsx      # Personal prioritized task list for active logged-in engineer
│       ├── ProjectsView.tsx    # Engineering projects list, metadata, progress cards
│       ├── PackagesView.tsx    # Procurement package deliverable tracker with vendor status
│       ├── CalendarView.tsx    # Month/week interactive calendar with Outlook event overlay
│       ├── TagsView.tsx        # Tag management and task reference counters
│       ├── SettingsView.tsx    # Multi-tab workspace settings
│       └── settings/
│           ├── DatabaseSettingsTab.tsx # Database statistics, download, restore, reset
│           ├── AISettingsTab.tsx       # AI provider configuration (Gemini / Claude), API keys
│           ├── UsersSettingsTab.tsx    # Team members and engineer discipline roster
│           └── BrandingSettingsTab.tsx # Workspace acronym, title, and theme customization
```

---

## 4. Complete Database Schema (SQLite via `sql.js`)

All tables are initialized in `server/db.ts` with `PRAGMA foreign_keys = ON;`. The system includes backward-compatible migrations (`ALTER TABLE ADD COLUMN`) executed at server boot.

### 4.1 Schema Definitions & Tables

```sql
-- 1. Users / Engineers
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

-- 2. Engineering Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  client TEXT,
  logo TEXT,
  description TEXT,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED'
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Task Categories / Disciplines
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 4. Procurement Packages & Deliverables
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  description TEXT,
  discipline TEXT,
  vendor TEXT,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE' | 'ARCHIVED' | 'HOLD'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- 5. Tags & Association
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#64748b',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 6. Engineering Deliverables & Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'TASK',       -- 'TASK' | 'NOTE' | 'FOLLOW-UP' | 'MILESTONE'
  category_id TEXT,
  package_id TEXT,
  priority TEXT DEFAULT 'MEDIUM', -- 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  status TEXT DEFAULT 'TODO',     -- 'TODO' | 'IN PROGRESS' | 'WAITING' | 'DONE' | 'CANCELLED' | 'ON HOLD'
  progress INTEGER DEFAULT 0,     -- 0 to 100
  start_date TEXT,
  deadline TEXT,
  forecast_finish TEXT,
  completed_date TEXT,
  assignee_id TEXT,
  pics TEXT,                      -- JSON array string of PIC names e.g. '["Ho Quoc Viet", "Nguyen Van An"]'
  group_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Subtasks
CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  is_done INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 8. File Attachments
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

-- 9. Task Comments / Discussion Thread
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. Audit Activity Log
CREATE TABLE IF NOT EXISTS task_activities (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT,
  activity_type TEXT NOT NULL, -- 'STATUS_CHANGE' | 'PROGRESS_UPDATE' | 'ASSIGNEE_CHANGE' | 'CREATED' | etc.
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Microsoft Outlook 365 Sync & Events
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

-- 12. Persons In Charge (PIC / Project Team Members)
CREATE TABLE IF NOT EXISTS pics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  avatar TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 4.2 SQLite Custom Registered Functions
Registered via `database.create_function(...)` in `server/db.ts`:
- **`LOWER(str)`**: Lowercases UTF-8 strings.
- **`VI_MATCH(content, keyword)`**:
  - Compares string with both Unicode lowercasing and NFD diacritics stripping (`normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')`).
  - Ensures Vietnamese technical notes or descriptions match seamlessly when users search without accents.

---

## 5. User Interface & Screen Architecture

### 5.1 Standardized Header Box (`PageHeader.tsx`)
All major views must feature a consistent 62px-height top banner adhering to these exact design specifications:
- **Dimensions**: Fixed `h-[62px]` height, flexible width, rounded corners (`rounded-xl`), subtle border (`border border-blue-900/40 dark:border-blue-800/40`).
- **Color Styling**: Gradient background `bg-gradient-to-r from-[#0b3b70] via-[#0f4c8a] to-[#1e3a8a] text-white shadow-md`.
- **Layout Structure**:
  - Left: View-specific Lucide icon in a translucent container (`p-2 rounded-lg bg-white/10 backdrop-blur-xs border border-white/20`), Title in uppercase bold (`text-sm font-black tracking-wide`), Subtitle in subtle blue (`text-[10px] text-blue-200 font-medium tracking-wider uppercase`).
  - Right: Action bar containing view-specific filter badges, counter pills, export buttons, or status indicators.
- **Strict Prohibition**: No numbered step prefixes (e.g., Never use `01.`, `02.`, `03.`); use dedicated icons and descriptive badges instead.

### 5.2 View Breakdown

#### View 1: Executive Dashboard (`DashboardView.tsx`)
- **Header**: Icon `<LayoutDashboard>`, Title: `ENGINEERING EXECUTIVE OVERVIEW`, Subtitle: `PORTFOLIO HEALTH & CRITICAL DELIVERABLES`.
- **Top Metric Cards (6 KPI Cards)**:
  1. *Total Tasks / Scope*: Total deliverables count.
  2. *In Progress*: Tasks actively worked on.
  3. *Overdue / Alert*: Count of uncompleted tasks past deadline (with red flame pulse).
  4. *Critical Priority*: High-risk deliverables requiring immediate attention.
  5. *Awaiting Review / Waiting*: Bottlenecks awaiting vendor/client comments.
  6. *Completed*: Finished deliverables count & % of total.
- **Discipline & Status Distribution Charts (Recharts)**:
  - *Discipline Breakdown*: Stacked/Bar chart illustrating tasks distributed across Mechanical, Piping, Electrical, Structural, and Process.
  - *Status Donut Chart*: Visual progress share.
- **Urgent Items Queue**: Direct list of Critical and Overdue tasks with one-click detail viewing.
- **Embedded Task List Table**: Filtered data grid allowing managers to update progress directly on the dashboard.

#### View 2: Master Task List (`TaskListView.tsx`)
- **Header**: Icon `<CheckSquare>`, Title: `ENGINEERING MASTER TASK LIST`, Subtitle: `ALL DELIVERABLES, MILESTONES & DISCIPLINE WORK`.
- **Filter Toolbar**:
  - Global text search input.
  - Status filter pill buttons (`ALL`, `TODO`, `IN PROGRESS`, `WAITING`, `DONE`, `CRITICAL`).
  - Dropdown filters: Project, Package, Category/Discipline, Assignee, Priority, PIC (Person In Charge).
  - Action buttons: Quick Add Task (`+`), Export to Excel (`.xlsx`), Print Preview modal.
- **Dense Data Grid (`TaskListTable.tsx`)**:
  - **PIC (Person In Charge) Column Architecture (`w-[84px]`)**:
    - Replaces legacy progress column with a compact, left-aligned `w-[84px]` column.
    - Stacked circular avatars: Displays up to 3 circular avatar photos with `-space-x-1.5` overlapping styling, plus a `+N` badge if > 3 PICs are assigned.
    - Left-aligned across header, sticky filter box, and table cells (`text-left`, `justify-start`).
    - Unassigned State: Explicitly shows a small dashed circular `+` button. Strictly prevents fallback to default user ("Ho Quoc Viet") or task creator.
    - Interactive Inline Popover: Click on any PIC cell to open multi-select assignment popup with instant search, existing roster checkboxes, and on-the-fly inline team member creation.
    - Accurate PIC Filtering: Backend queries strictly match inside the `t.pics` JSON array (`t.pics LIKE ?`), with dedicated `UNASSIGNED` filter to isolate unassigned deliverables.
  - **Zero-Jitter Rounded Blue Selection Box**:
    - When a deliverable row is active or selected (`isRowActive || isSelected`), a full rounded blue box (`#2563eb`) wraps around the deliverable without altering cell box-model dimensions.
    - Implemented via `box-shadow: inset` (`shadow-[inset_2px_2px_0_#2563eb,...]` with `rounded-l-lg` on the first checkbox cell and `rounded-r-lg` on the last action cell) + subtle light-blue background `bg-blue-50/70 dark:bg-blue-950/45`.
    - 100% fixed-height box model: Completely eliminates row height resizing, layout shifting, and visual flicker when switching selected tasks.
  - **Action Column Ergonomics (`w-[44px]`)**:
    - Vertically stacked Action buttons: `CheckCircle2` (Mark as Done / Toggle status) on top, `Trash2` (Delete) on bottom.
    - Redundant preview eye icon removed since double-clicking any row or pressing `Enter` opens the task details modal.
  - **Keyboard Navigation**: Pressing $\uparrow$ / $\downarrow$ selects the adjacent deliverable; pressing `Enter` opens `TaskDetailModal`.
  - **Batch Operations**: Selecting multiple checkboxes summons the floating `BatchActionBar` at the bottom of the screen.

#### View 3: My Work Queue (`MyWorkView.tsx`)
- **Header**: Icon `<Briefcase>`, Title: `MY PERSONAL WORKSPACE`, Subtitle: `FILTERED DELIVERABLES FOR LOGGED-IN ENGINEER`.
- Isolates tasks where `assignee_id === currentUser.id`.
- Categorized sections: *Overdue Actions*, *Due Today*, *Due This Week*, *In Progress*, and *Completed Recently*.

#### View 4: Projects Directory (`ProjectsView.tsx`)
- **Header**: Icon `<Layers>`, Title: `ENGINEERING PROJECTS`, Subtitle: `ACTIVE EPC CONTRACTS & OFFSHORE ASSETS`.
- Card grid & table views of all projects (Name, Code, Client, Status, Date ranges).
- Progress completion bar derived dynamically from associated tasks.
- Project Detail Drawer: Displays assigned packages, deliverables list, and client contact info.

#### View 5: Procurement Packages (`PackagesView.tsx`)
- **Header**: Icon `<Package>`, Title: `PROCUREMENT PACKAGES & DELIVERABLES`, Subtitle: `VENDOR CONTRACTS, BID PACKAGES & REQUISITIONS`.
- Manages equipment and procurement scopes (e.g., Gas Turbine Generators, WHP Structural Steel, Subsea Valves).
- Direct link to tasks scoped under each specific package code.

#### View 6: Engineering Calendar & Outlook 365 (`CalendarView.tsx`)
- **Header**: Icon `<Calendar>`, Title: `DEADLINES & CALENDAR TIMELINES`, Subtitle: `MILESTONES, REVIEWS & OUTLOOK 365 SYNC`.
- Interactive Month / Week / Day views plotting task deadlines and Outlook events.
- Modal to trigger manual or automatic sync with Microsoft Graph API.

#### View 7: AI Technical Assistant (`AIChatBubble.tsx`)
- 3D animated floating assistant avatar located at the bottom-right corner.
- Markdown streaming support for technical explanations.
- Prompt shortcuts: *"Break down task into subtasks"*, *"Summarize overdue deliverables"*, *"Draft technical transmittal note"*.

#### View 8: Workspace Settings (`SettingsView.tsx`)
- **Header**: Icon `<Settings>`, Title: `SYSTEM & WORKSPACE SETTINGS`, Subtitle: `LOCAL DATABASE, AI ENGINES & TEAM ROSTER`.
- **Engineer Profile Tab (`ProfileSettingsTab.tsx`)**: Configure current logged-in engineer name, role, department, and contact information.
- **Persons In Charge (PIC) Tab (`PicsSettingsTab.tsx`)**:
  - Dedicated top-level tab placed directly alongside Engineer Profile.
  - Team member management: Full Name (Tên người), Project Position / Role (Vị trí trong dự án), and Photo Avatar.
  - **Click-to-Upload Avatar (No Separate Button)**: Users click directly on the avatar circle (with hover camera overlay and tooltip) to pick/upload photos (PNG, JPG, WEBP $\le$ 2MB).
  - Direct list avatar click: Click directly on any team member's avatar in the right-hand roster to replace photo in-place and save to database immediately.
  - Automatic bidirectional sync: PICs registered here appear immediately in the Task List dropdown, and inline additions in the Task List auto-persist to this table.
- **Theme & Appearance Tab (`AppearanceSettingsTab.tsx`)**: Custom branding title, subtitle, acronym, header background color, and dark/light mode toggle.
- **AI Settings Tab (`AISettingsTab.tsx`)**:
  - Select active provider: Google Gemini (`@google/genai`) or Anthropic Claude (`api.anthropic.com`).
  - Model selection with tier badges:
    - *Gemini 3.8 Flash*: Default recommended high-speed engineering model.
    - *Gemini 3.1 Flash Lite*: Ultra-fast, low-latency resilient fallback.
    - *Gemini Flash Latest*: Auto-updating latest Google release alias.
    - *Gemini 3.1 Pro*: Deep reasoning & synthesis (Explicitly marked *"Requires Paid API Key with Billing"* to safeguard free tier users).
    - *Claude 3.7 Sonnet*, *Claude 3.5 Sonnet*, *Claude 3.5 Haiku*, *Claude 3 Opus*.
  - Independent API key storage and connection testing for both providers.
  - Custom system prompt & domain instructions (EPC deliverables, technical bid queries, WBS breakdowns).
  - Customizable Quick Prompts palette with icon picker and color chips.
- **Work Categories Tab (`CategoriesSettingsTab.tsx`)**: Dedicated solely to discipline tags (Commissioning, Piping, HSE, Structural, Electrical) and deliverable categorization.
- **Database Management Tab (`DatabaseSettingsTab.tsx`)**:
  - Displays database storage location (`data/app.db`) and file size.
  - One-click **Download Database (`.sqlite`)** for safe offline backup.
  - **Import / Restore Database**: Accepts any valid SQLite file buffer and hot-reloads data without server restart.
  - **Reset to Demo Data**: Re-seeds default engineering projects, packages, and mock deliverables.

---

## 6. Complete REST API Specifications

All endpoints are hosted under the `/api` prefix.

### 6.1 Tasks & Work Deliverables
- `GET /api/tasks`: Query parameters: `search`, `status`, `priority`, `projectId`, `packageId`, `categoryId`, `assigneeId`, `pic`, `overdue`. Returns array of enriched tasks with tags, subtasks count, and assignee info, sorted strictly by `created_at DESC`.
- `POST /api/tasks`: Create task. Payload: `{ title, description, projectId, packageId, categoryId, assigneeId, priority, status, deadline, startDate }`. Automatically logs creation in `task_activities`.
- `GET /api/tasks/:id`: Returns complete task object including subtasks, file attachments, comment thread, and chronological audit history.
- `PATCH /api/tasks/:id`: Partial update of task attributes (`status`, `progress`, `priority`, `deadline`, etc.). Emits activity log for modified fields.
- `DELETE /api/tasks/:id`: Deletes task and cascades to subtasks, attachments, and comments.
- `POST /api/tasks/batch`: Payload: `{ taskIds: string[], action: 'status' | 'priority' | 'assignee' | 'delete', value?: any }`. Executes bulk mutation within a single SQLite transaction.

### 6.2 Subtasks, Comments & Activities
- `POST /api/tasks/:id/subtasks`: Add subtask item.
- `PATCH /api/tasks/:id/subtasks/:subtaskId`: Toggle completion (`is_done: 0 | 1`) or rename.
- `DELETE /api/tasks/:id/subtasks/:subtaskId`: Remove subtask.
- `POST /api/tasks/:id/comments`: Add comment. Payload: `{ userId, content }`.

### 6.3 Attachments
- `POST /api/attachments/upload`: `multipart/form-data` file upload with `taskId` and `userId`. Stores file in `data/uploads/` and inserts record into `task_attachments`.
- `GET /api/attachments/:id/download`: Streams physical attachment file with original filename in `Content-Disposition`.
- `DELETE /api/attachments/:id`: Deletes physical file from disk and removes database row.

### 6.4 Projects, Packages & Categories
- `GET /api/projects` / `POST /api/projects` / `PATCH /api/projects/:id` / `DELETE /api/projects/:id`
- `GET /api/packages` / `POST /api/packages` / `PATCH /api/packages/:id` / `DELETE /api/packages/:id`
- `GET /api/categories` / `POST /api/categories` / `PATCH /api/categories/:id` / `DELETE /api/categories/:id`
- `GET /api/tags` / `POST /api/tags` / `DELETE /api/tags/:id`

### 6.5 Persons In Charge (PIC / Team Roster)
- `GET /api/pics`: Returns list of all registered project team PICs (`id`, `name`, `role`, `avatar`, `created_at`).
- `POST /api/pics`: Create team PIC. Payload: `{ name: string, role?: string, avatar?: string }`. Validates non-empty name and returns created PIC object.
- `PATCH /api/pics/:id` & `PUT /api/pics/:id`: Update PIC details, role, or photo avatar.
- `DELETE /api/pics/:id`: Remove PIC member from roster.

### 6.6 System & Database Administration
- `GET /api/system/stats`: Returns database file size, total records per table, and server uptime.
- `GET /api/system/download-db`: Downloads raw `data/app.db` binary as an attachment named `engineering_tasks_backup_<timestamp>.sqlite`.
- `POST /api/system/import-db`: Accepts uploaded `.sqlite` or `.db` file, instantiates new `sql.js` Database, validates schema, replaces `data/app.db`, and re-registers custom functions.
- `POST /api/system/reset-db`: Drops/truncates tables and executes `server/seed.ts`.

### 6.7 AI & Calendar Integrations
- `GET /api/ai/models`: Query parameter: `provider=gemini|claude`. Returns catalog of available models, descriptions, and recommended flags.
- `POST /api/ai/test-connection`: Validates API key and model connectivity.
  - *Payload*: `{ customApiKey?, provider: 'gemini' | 'claude', model?: string }`.
  - *Gemini Resilience Logic (`getCandidateGeminiModels`)*: Automatically filters out paid Pro models for free-tier users to prevent `429 Quota Exceeded (limit: 0)` errors. Executes exponential backoff (1200ms) on temporary Google Cloud demand spikes (`HTTP 503 UNAVAILABLE`) and seamlessly tests fallback models (`gemini-3.1-flash-lite`, `gemini-flash-latest`).
  - *Response*: `{ success: boolean, provider, verifiedModel, availableModels, message }`.
- `POST /api/ai/chat`: Streaming & multi-turn technical query assistant.
  - *Payload*: `{ message: string, history: Array<{role, content}>, customApiKey?, provider?, model?, customInstructions? }`.
  - Injects live workspace context (projects, packages, categorized deliverables, overdue alerts).
  - Employs automated free-tier failover if the primary model encounters temporary `503` demand spikes.
- `GET /api/outlook/status`: Returns current Microsoft Graph connection status and user email.
- `POST /api/outlook/sync`: Initiates calendar event fetch and syncs due dates with Outlook 365.

---

## 7. AI Assistant Governance & Specification Sync Protocol

### 7.1 Language Enforcement Rules
- **Application UI**: All user-facing UI elements, labels, buttons, tooltips, modals, notifications, table headers, and badges must remain **100% strictly in English**.
- **User Discussions**: The AI Assistant communicates, clarifies, and explains solutions to the user in **Vietnamese**. All technical keywords, code paths, and UI terms remain in original English.

### 7.2 Strict Scope Discipline (Chỉ sửa đúng phạm vi yêu cầu)
- AI agents must only modify the specific lines of code and components related to the prompt or defect. Never refactor or alter working components outside the explicit scope.

### 7.3 Clarify Before Coding (Hỏi lại khi chưa rõ ràng)
- If a requirement has multiple interpretations or structural implications, the agent must ask clarifying questions before committing changes.

### 7.4 Specification Sync Protocol (Quy trình cập nhật file đặc tả)
Whenever code modifications or feature enhancements occur:
1. **Never update `APP_SPECIFICATION.md` proactively** during feature development.
2. Complete all code changes, verify with `compile_applet` / `lint_applet`, and test functionality first.
3. Once the code is operational, **explicitly ask the user in Vietnamese** if they want to update `APP_SPECIFICATION.md` to reflect the newly implemented changes.
4. If the implementation has issues or the user decides to revert to a previous version, no changes are committed to `APP_SPECIFICATION.md`.
5. Only upon explicit user confirmation will the AI agent update `APP_SPECIFICATION.md` with the new feature details.

---

## 8. Verification & Execution Instructions

```bash
# 1. Install all dependencies
npm install

# 2. Run local full-stack development environment (Port 3000)
npm run dev

# 3. Compile client and bundle for production
npm run build

# 4. Run static type checking and linting
npm run lint

# 5. Run automated regression test suite
npm test

# 6. Start production server
npm start
```

---

## 9. Feature Development Status & Roadmap (Trạng thái tính năng & Kế hoạch tiếp theo)

### 9.1 Completed Features (Đã hoàn thành)
1. **Zero-Jitter Rounded Blue Selection Box for Table Rows**:
   - Khôi phục khung viền hình chữ nhật bo góc màu blue (`#2563eb`) bao quanh toàn bộ item khi active bằng click hoặc phím mũi tên / tick chọn.
   - Ứng dụng kỹ thuật `shadow-inset` (kết hợp `rounded-l-lg` cho ô đầu tiên, `rounded-r-lg` cho ô cuối cùng, viền trên và dưới liền mạch), cố định box model 100%, triệt tiêu hoàn toàn hiện tượng layout shift và nhấp nháy/giật chiều cao hàng.
2. **Action Column Ergonomics**:
   - Gỡ bỏ icon con mắt xem chi tiết (người dùng mở modal bằng phím Enter hoặc đúp chuột).
   - Sắp xếp nút *Mark as Done* (`CheckCircle2`) ở trên và *Delete* (`Trash2`) ở dưới theo chiều dọc (`flex-col`), căn giữa gọn gàng trong cột hẹp `w-[44px]`.
3. **Persons In Charge (PIC) Column Architecture & Roster Synchronization**:
   - Tăng kích thước cột PIC lên `w-[84px]`, chuyển toàn bộ sang căn lề trái (`text-left`, `justify-start`) ở Header, Hộp lọc và Dữ liệu từng hàng.
   - Hiển thị tối đa 3 hình tròn avatar xếp chồng đè nhau (`-space-x-1.5`), có badge `+N` khi nhiều hơn 3 người.
   - Khắc phục lỗi item chưa gán PIC bị tự ý gán avatar của user: khi chưa có ai, hiển thị nút hình tròn dấu cộng nét đứt nhỏ nhắn `+`, danh sách `pics` trả về `[]`.
   - **Đồng bộ chuẩn xác số lượng PIC**: Khắc phục lệch số đếm giữa `SYSTEM & WORKSPACE SETTINGS` (9 thành viên) và danh sách hiển thị trên tasklist.
   - **Chuẩn hóa ứng viên (PIC Deduplication & Normalization)**: Xử lý triệt để hiện tượng phân mảnh/nhân bản tên giữa `Ho Quoc Viet` và `Ho Quoc Viet (Tôi)`, đảm bảo bộ lọc và dropdown hiển thị đúng tên quy chuẩn duy nhất.
4. **Accurate PIC Filtering & Diacritics Matching**:
   - Sửa truy vấn backend: loại bỏ `OR u.name LIKE ?` để tránh lọc nhầm các task chỉ do user tạo nhưng chưa được phân công PIC.
   - Sử dụng hàm SQLite `VI_MATCH` chuẩn hóa Unicode/NFD không dấu, cho phép lọc chính xác 100% công việc theo từng PIC.
   - Hỗ trợ lọc chuyên biệt cho tùy chọn `Unassigned` để lọc chính xác tất cả các task chưa gán người phụ trách.
5. **Strict Task Ordering (Business Rule 2.1) & Automated Regression Tests**:
   - Chuẩn hóa thứ tự mặc định toàn hệ thống theo **`created_at DESC`** (công việc mới tạo luôn nằm trên cùng).
   - Chỉnh sửa công việc (Priority, Status, Deadline, Forecast, PIC, Category, Tag) tuyệt đối không làm nhảy vị trí của công việc.
   - Đã xây dựng bộ kiểm thử hồi quy tự động (`tests/regression_tests.ts`) chạy qua lệnh `npm test` xác thực:
     - Logic thứ tự tạo trước/sau `[B, A] -> Edit A -> [B, A] -> Tạo C -> [C, B, A]`.
     - Chuẩn hóa khử trùng lặp PIC.
     - Lọc dữ liệu qua API backend trực tiếp.
6. **Dedicated Persons In Charge (PIC) Settings Tab**:
   - Tách thành tab riêng **Persons In Charge (PIC)** (`PicsSettingsTab.tsx`) trong Settings, đặt ngang hàng với **Engineer Profile**.
   - Hỗ trợ **click trực tiếp lên hình tròn avatar** để mở hộp thoại tải ảnh/thay đổi ảnh đại diện (bỏ nút nhấn riêng).
   - Cho phép click trực tiếp lên avatar của từng thành viên ngay trong danh sách bên phải để cập nhật ảnh tức thì.
   - Trả tab **Work Categories** về trạng thái nguyên bản tập trung chuyên sâu cho danh mục công việc kỹ thuật.

### 9.2 In Progress & Verification (Đang hoàn thiện & Theo dõi)
1. **Modal Form PIC Consistency**:
   - Kiểm tra và đảm bảo tính đồng nhất khi tạo/sửa task trong `QuickTaskModal`, `TaskDetailModal` và popover `InlinePicSelector` luôn sử dụng chung dữ liệu `pics` từ SQLite.
2. **Print / Export Styling for PICs**:
   - Kiểm tra hiển thị văn bản danh sách PIC khi in ấn hoặc xuất PDF bảng công việc (khổ A4 ngang Landscape).

### 9.3 Upcoming Planned Enhancements (Kế hoạch phiên tiếp theo)
1. **Batch Assign PICs (Gán PIC hàng loạt)**:
   - Cho phép chọn nhiều task qua checkbox và sử dụng Floating Action Bar để gán cùng lúc một hoặc nhiều PIC cho tất cả task đã chọn.
2. **PIC Workload Distribution Widget (Thống kê tải công việc theo PIC)**:
   - Bổ sung biểu đồ phân bổ số lượng task (Đang thực hiện, Quá hạn, Đã hoàn thành) của từng kỹ sư trên Dashboard View.
3. **Client-Side Image Optimization for Avatars**:
   - Tự động nén và resize ảnh chụp avatar về kích thước chuẩn (128x128px) trước khi chuyển thành base64 để tối ưu hóa bộ nhớ SQLite.
4. **Multi-Select PIC Filter (Bộ lọc đa chọn PIC)**:
   - Nâng cấp bộ lọc tại header cho phép chọn nhiều PIC cùng lúc (lọc theo nhóm kỹ sư phụ trách).


