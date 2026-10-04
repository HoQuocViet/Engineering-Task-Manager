export type TaskType = 'TASK' | 'NOTE' | 'FOLLOW-UP' | 'MILESTONE';

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TaskStatus = 'TODO' | 'IN PROGRESS' | 'WAITING' | 'DONE' | 'CANCELLED' | 'ON HOLD';

export type InterfaceDiscipline = 
  | 'Instrument'
  | 'Process'
  | 'Piping'
  | 'Mechanical'
  | 'Electrical'
  | 'Structural'
  | 'Pipeline'
  | 'Safety'
  | 'EMT'
  | 'PMT'
  | 'Other';

export const INTERFACE_DISCIPLINES: InterfaceDiscipline[] = [
  'Instrument',
  'Process',
  'Piping',
  'Mechanical',
  'Electrical',
  'Structural',
  'Pipeline',
  'Safety',
  'EMT',
  'PMT',
  'Other',
];

export const DISCIPLINE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Instrument: { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  Process: { bg: 'bg-cyan-50 dark:bg-cyan-950/60', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  Piping: { bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  Electrical: { bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  Mechanical: { bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  Structural: { bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  Pipeline: { bg: 'bg-teal-50 dark:bg-teal-950/60', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
  Safety: { bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  EMT: { bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  PMT: { bg: 'bg-sky-50 dark:bg-sky-950/60', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  Other: { bg: 'bg-slate-50 dark:bg-slate-900', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-800' },
};

export type InterfaceStatus = 'OPEN' | 'WAITING' | 'RECEIVED' | 'CLOSED' | 'CANCELLED';

export interface TaskInterface {
  id: string;
  task_id: string;
  discipline: InterfaceDiscipline;
  external_pic?: string;
  external_email?: string;
  action: string;
  due_date?: string | null;
  last_follow_up?: string | null;
  next_follow_up?: string | null;
  status: InterfaceStatus;
  priority?: TaskPriority;
  note?: string;
  resolution_date?: string | null;
  created_at: string;
  updated_at: string;
  // Joined context fields
  task_title?: string;
  project_id?: string | null;
  project_code?: string;
  project_name?: string;
  package_id?: string | null;
  package_code?: string;
  package_name?: string;
  assignee_id?: string | null;
  assignee_name?: string;
  days_waiting?: number;
}

export interface TaskBulletinResource {
  task_id: string;
  bulletin_id: string;
  created_at: string;
}

export interface FollowUpItem {
  id: string;
  task_id: string;
  task_title: string;
  project_id?: string | null;
  project_code?: string;
  project_name?: string;
  package_id?: string | null;
  package_code?: string;
  package_name?: string;
  assignee_id?: string | null;
  assignee_name?: string;
  discipline: InterfaceDiscipline;
  action: string;
  external_pic?: string;
  external_email?: string;
  due_date?: string | null;
  last_follow_up?: string | null;
  next_follow_up?: string | null;
  status: InterfaceStatus;
  priority: TaskPriority;
  note?: string;
  days_waiting: number;
  urgency: 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'NORMAL';
  created_at: string;
  updated_at: string;
}

export type BulletinResourceType =
  | 'WEB_URL'
  | 'GOOGLE_SHEET'
  | 'GOOGLE_DOCS'
  | 'SHAREPOINT'
  | 'TEAMS'
  | 'NETWORK_FOLDER'
  | 'LOCAL_FOLDER'
  | 'NETWORK_FILE'
  | 'LOCAL_FILE'
  | 'VENDOR_PORTAL'
  | 'OTHER';

export type BulletinStatus = 'ACTIVE' | 'ARCHIVED' | 'SUPERSEDED';

export type BulletinHealth = 'ACTIVE' | 'BROKEN' | 'CHECK_FAILED' | 'NOT_CHECKED' | 'ACCESS_REQUIRED';

export interface BulletinResource {
  id: string;
  display_name: string;
  document_title?: string;
  description?: string;
  resource_type: BulletinResourceType;
  location: string;
  project_id?: string | null;
  project_name?: string;
  project_code?: string;
  package_id?: string | null;
  package_name?: string;
  package_code?: string;
  discipline: string;
  tags?: string[];
  owner?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  pinned: boolean | number;
  status: BulletinStatus;
  last_reviewed?: string | null;
  next_review?: string | null;
  last_opened?: string | null;
  open_count: number;
  replacement_resource_id?: string | null;
  replacement_resource_name?: string;
  link_health: BulletinHealth;
  health_checked_at?: string | null;
  notes?: string;
  related_tasks_count?: number;
  related_tasks?: Array<{ id: string; title: string; status: TaskStatus; priority: TaskPriority }>;
  created_at: string;
  updated_at: string;
}

export interface BulletinAnnouncement {
  id: string;
  title: string;
  content: string;
  author_id?: string;
  author_name?: string;
  is_pinned: number | boolean;
  created_at: string;
}

export interface BulletinFilterOptions {
  search?: string;
  type?: string;
  projectId?: string;
  packageId?: string;
  discipline?: string;
  pinned?: boolean | number | string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface User {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  bio?: string;
  discipline?: string;
  avatar: string;
  is_admin?: number | boolean;
  is_team_lead?: number | boolean;
  is_active: number;
  created_at: string;
  assigned_task_count?: number;
  open_task_count?: number;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  client?: string;
  logo?: string;
  description?: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  package_count?: number;
  total_tasks?: number;
  done_tasks?: number;
  open_tasks?: number;
  overdue_tasks?: number;
  avg_progress?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_default: number;
  created_at: string;
  task_count?: number;
}

export interface Package {
  id: string;
  project_id?: string | null;
  project_name?: string;
  project_code?: string;
  name: string;
  code: string;
  description?: string;
  vendor?: string;
  discipline?: string;
  is_general?: boolean;
  status: 'ACTIVE' | 'ARCHIVED' | 'HOLD';
  created_at: string;
  updated_at: string;
  total_tasks?: number;
  task_count?: number;
  done_tasks?: number;
  completed_tasks?: number;
  open_tasks?: number;
  in_progress_tasks?: number;
  waiting_tasks?: number;
  overdue_tasks?: number;
  avg_progress?: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  task_count?: number;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id?: string;
  user_name?: string;
  user_avatar?: string;
  user_role?: string;
  content: string;
  created_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  task_title?: string;
  user_id?: string;
  user_name?: string;
  user_avatar?: string;
  activity_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  note?: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id?: string | null;
  effective_project_id?: string | null;
  project_name?: string;
  project_code?: string;
  title: string;
  description?: string;
  type: TaskType;
  category_id?: string | null;
  category_name?: string;
  category_color?: string;
  package_id?: string | null;
  package_name?: string;
  package_code?: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  start_date?: string | null;
  deadline?: string | null;
  forecast_finish?: string | null;
  completed_date?: string | null;
  assignee_id?: string | null;
  assignee_name?: string;
  assignee_role?: string;
  assignee_avatar?: string;
  pics?: string[];
  tags?: Tag[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  activities?: TaskActivity[];
  comment_count?: number;
  attachment_count?: number;
  group_id?: string | null;
  forecast_revision_count?: number;
  linked_tasks_count?: number;
  interfaces?: TaskInterface[];
  related_bulletins?: BulletinResource[];
  linked_tasks?: Array<{
    id: string;
    project_id?: string | null;
    project_name?: string;
    project_code?: string;
    package_id?: string | null;
    package_name?: string;
    package_code?: string;
    status: TaskStatus;
    progress: number;
    title: string;
    priority?: TaskPriority;
    deadline?: string | null;
  }>;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  kpis: {
    total: number;
    todo: number;
    in_progress: number;
    waiting: number;
    on_hold: number;
    done: number;
    cancelled: number;
    overdue: number;
    due_today: number;
    due_tomorrow: number;
    due_this_week: number;
    critical_open: number;
    avg_progress: number;
  };
  statusBreakdown: Array<{ name: string; count: number }>;
  priorityBreakdown: Array<{ name: string; count: number; done_count: number; open_count: number }>;
  packageBreakdown: Array<{
    id: string;
    name: string;
    code: string;
    project_id?: string;
    project_name?: string;
    project_code?: string;
    total: number;
    done: number;
    open: number;
    in_progress?: number;
    waiting?: number;
    todo?: number;
    on_hold?: number;
    overdue: number;
    progress: number;
  }>;
  projectBreakdown?: Array<{
    id: string;
    name: string;
    code: string;
    client?: string;
    project_status?: string;
    total: number;
    done: number;
    open: number;
    in_progress?: number;
    waiting?: number;
    todo?: number;
    on_hold?: number;
    overdue: number;
    progress: number;
    packages?: Array<{
      id: string;
      name: string;
      code: string;
      total: number;
      done: number;
      open: number;
      in_progress?: number;
      waiting?: number;
      todo?: number;
      overdue: number;
      progress: number;
    }>;
  }>;
  userBreakdown?: Array<{
    id: string;
    name: string;
    role: string;
    avatar: string;
    is_admin?: number | boolean;
    total_tasks: number;
    done_tasks: number;
    open_tasks: number;
    in_progress_tasks: number;
    waiting_tasks: number;
    critical_tasks: number;
    overdue_tasks: number;
    avg_progress: number;
  }>;
  deadlineBuckets: Array<{ bucket: string; count: number; color: string }>;
  urgentTasks: Task[];
  recentActivities: TaskActivity[];
  // Instrument Team Leader Control Center extensions
  instrumentKpis?: {
    my_open_tasks: number;
    team_open_tasks: number;
    overdue: number;
    due_this_week: number;
    waiting: number;
    interface_open: number;
    forecast_slip: number;
    critical_open: number;
    follow_up_today: number;
  };
  teamWorkload?: Array<{
    id: string;
    name: string;
    role: string;
    avatar: string;
    open: number;
    due_this_week: number;
    overdue: number;
    waiting: number;
    avg_progress: number;
  }>;
  interfaceFollowUp?: Array<{
    discipline: InterfaceDiscipline;
    open: number;
    waiting: number;
    received: number;
    closed: number;
    total: number;
  }>;
  urgentFollowUps?: TaskInterface[];
  bulletinsWidget?: {
    pinned: BulletinResource[];
    recent: BulletinResource[];
    reviewRequired: BulletinResource[];
    announcements: BulletinAnnouncement[];
  };
}

export interface TaskFilterOptions {
  search?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  packageId?: string;
  categoryId?: string;
  type?: string;
  deadlineFilter?: 'all' | 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'upcoming' | 'done';
  forecastFilter?: string;
  progress?: string;
  tagId?: string;
  assigneeId?: string;
  pic?: string;
  interface?: string;
  interfaceDiscipline?: string;
  interfaceStatus?: string;
  followUpDue?: string;
  externalPic?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface PicMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  created_at: string;
}

export const DEFAULT_PRESET_PICS: string[] = [
  'Ho Quoc Viet (Me)',
  'Nguyen Van An',
  'Tran Minh Duc',
  'Le Thi Mai',
  'Pham Hoang Nam',
  'Vu Quoc Bao',
  'Doan Tan Phat',
  'Bui Anh Tuan',
  'Dao Ba Lam',
];

export type ThemeMode = 'light' | 'dark' | 'system';

export interface WorkspaceBranding {
  title: string;
  subtitle?: string;
  iconType: 'acronym' | 'preset' | 'custom_image';
  acronym: string;
  presetIcon: string;
  bgColor: string;
  customImageUrl?: string;
  themeMode?: ThemeMode;
  headerTheme?: string;
  headerCustomStart?: string;
  headerCustomVia?: string;
  headerCustomEnd?: string;
}

export type AIProvider = 'gemini' | 'claude';

export interface AIModelOption {
  id: string;
  name: string;
  provider: AIProvider;
  description?: string;
  recommended?: boolean;
}

export interface AIQuickPrompt {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
  color?: string;
  isDefault?: boolean;
}

export const DEFAULT_QUICK_PROMPTS: AIQuickPrompt[] = [
  {
    id: 'qp-overdue',
    label: 'Overdue & Delayed Tasks',
    prompt: 'Please analyze all overdue tasks or tasks where Forecast Finish Date exceeds the Deadline. Highlight their priority, discipline, and associated Package.',
    icon: 'alert-triangle',
    color: 'rose',
    isDefault: true,
  },
  {
    id: 'qp-packages',
    label: 'Procurement Package Progress',
    prompt: 'Generate a detailed progress summary for all Procurement Packages in the system (total tasks, completion rates, and critical bottlenecks).',
    icon: 'layers',
    color: 'blue',
    isDefault: true,
  },
  {
    id: 'qp-priority',
    label: 'This Week Priority Focus',
    prompt: 'List all high-priority tasks (CRITICAL / HIGH) that require urgent engineering action or have upcoming milestones this week.',
    icon: 'zap',
    color: 'amber',
    isDefault: true,
  },
  {
    id: 'qp-summary',
    label: 'Workspace Executive Summary',
    prompt: 'Provide an executive summary of the entire engineering project scope, remaining deliverables, schedule risks, and engineering recommendations.',
    icon: 'file-text',
    color: 'emerald',
    isDefault: true,
  },
];

export interface AISettings {
  provider: AIProvider;
  apiKey?: string; // Legacy fallback
  geminiApiKey: string; // Dedicated Google Gemini API Key
  claudeApiKey: string; // Dedicated Anthropic Claude API Key
  geminiModel: string; // Selected Gemini Model
  claudeModel: string; // Selected Claude Model
  model: string; // Active model
  customInstructions?: string;
  temperature?: number;
  connectionStatus?: 'connected' | 'error' | 'untested';
  lastTestedAt?: string;
  verifiedModel?: string;
  statusMessage?: string;
  geminiConnectionStatus?: 'connected' | 'error' | 'untested';
  geminiLastTestedAt?: string;
  geminiVerifiedModel?: string;
  geminiStatusMessage?: string;
  claudeConnectionStatus?: 'connected' | 'error' | 'untested';
  claudeLastTestedAt?: string;
  claudeVerifiedModel?: string;
  claudeStatusMessage?: string;
  availableModels?: AIModelOption[];
  quickPrompts?: AIQuickPrompt[];
}

export interface OutlookEvent {
  id: string;
  subject: string;
  body_preview?: string;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date?: string;
  is_all_day: boolean | number;
  is_cancelled: boolean | number;
  location?: string;
  meeting_link?: string;
  organizer_name?: string;
  organizer_email?: string;
  attendees_json?: string;
  web_link?: string;
  synced_at: string;
}

export interface OutlookConfigStatus {
  is_connected: boolean;
  client_id?: string;
  tenant_id?: string;
  has_secret?: boolean;
  user_email?: string;
  user_display_name?: string;
  last_synced_at?: string;
  redirect_uri?: string;
  event_count?: number;
}

