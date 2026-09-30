export type TaskType = 'TASK' | 'NOTE' | 'FOLLOW-UP' | 'MILESTONE';

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TaskStatus = 'TODO' | 'IN PROGRESS' | 'WAITING' | 'DONE' | 'CANCELLED' | 'ON HOLD';

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
  'Ho Quoc Viet (Tôi)',
  'Nguyen Van An',
  'Tran Minh Duc',
  'Le Thi Mai',
  'Pham Hoang Nam',
  'Vu Quoc Bao',
  'Doan Tan Phat',
  'Bui Anh Tuan',
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

