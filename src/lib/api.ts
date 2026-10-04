import { Task, Package, Category, Tag, User, Project, DashboardStats, TaskFilterOptions, OutlookEvent, OutlookConfigStatus, PicMember, BulletinResource, BulletinAnnouncement, BulletinFilterOptions, TaskInterface, FollowUpItem, InterfaceStatus } from '../types';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const data = await res.json();
      errorMsg = data.message || data.error || errorMsg;
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export type TaskPayload = Omit<Partial<Task>, 'tags'> & {
  tags?: string[] | Tag[];
  userId?: string;
  startDate?: string | null;
  forecastFinish?: string | null;
  completedDate?: string | null;
  projectId?: string | null;
  packageId?: string | null;
  categoryId?: string | null;
  assigneeId?: string | null;
  group_id?: string | null;
  applicablePackages?: string[];
  applicableProjects?: string[];
  syncGroup?: boolean;
  syncGroupPackages?: string[];
  syncGroupProjects?: string[];
  discipline?: string;
  removeMode?: 'delete' | 'unlink';
};

export const api = {
  // Tasks
  getTasks: async (filters: TaskFilterOptions = {}): Promise<{ tasks: Task[]; total: number; limit: number; offset: number }> => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.projectId) params.set('projectId', filters.projectId);
    if (filters.packageId) params.set('packageId', filters.packageId);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.type) params.set('type', filters.type);
    if (filters.deadlineFilter) params.set('deadlineFilter', filters.deadlineFilter);
    if (filters.forecastFilter) params.set('forecastFilter', filters.forecastFilter);
    if (filters.progress) params.set('progress', filters.progress);
    if (filters.tagId) params.set('tagId', filters.tagId);
    if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
    if (filters.pic) params.set('pic', filters.pic);
    if (filters.interface) params.set('interface', filters.interface);
    if (filters.interfaceDiscipline) params.set('interface', filters.interfaceDiscipline);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.limit) params.set('limit', String(filters.limit));

    const res = await fetch(`/api/tasks?${params.toString()}`);
    return handleResponse(res);
  },

  getTask: async (id: string): Promise<Task> => {
    const res = await fetch(`/api/tasks/${id}`);
    return handleResponse(res);
  },

  createTask: async (taskData: TaskPayload): Promise<{ id: string; message: string; group_id?: string; count?: number; ids?: string[] }> => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    return handleResponse(res);
  },

  updateTask: async (id: string, taskData: TaskPayload): Promise<{ message: string }> => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    return handleResponse(res);
  },

  deleteTask: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  unlinkTaskGroup: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/tasks/${id}/unlink-group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  addComment: async (taskId: string, content: string, userId?: string): Promise<{ id: string; message: string }> => {
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, userId }),
    });
    return handleResponse(res);
  },

  updateComment: async (taskId: string, commentId: string, content: string, userId?: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, userId }),
    });
    return handleResponse(res);
  },

  deleteComment: async (taskId: string, commentId: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  bulkAction: async (taskIds: string[], action: 'MARK_DONE' | 'SET_PRIORITY' | 'SET_STATUS' | 'DELETE', value?: string, userId?: string): Promise<{ message: string }> => {
    const res = await fetch('/api/tasks/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds, action, value, userId }),
    });
    return handleResponse(res);
  },

  // Projects
  getProjects: async (): Promise<Project[]> => {
    const res = await fetch('/api/projects');
    return handleResponse(res);
  },

  getProject: async (id: string): Promise<{ project: Project; packages: Package[]; stats: any; tasks: Task[] }> => {
    const res = await fetch(`/api/projects/${id}`);
    return handleResponse(res);
  },

  createProject: async (data: Partial<Project>, userId?: string): Promise<{ id: string; message: string }> => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}) },
      body: JSON.stringify({ ...data, userId }),
    });
    return handleResponse(res);
  },

  updateProject: async (id: string, data: Partial<Project>, userId?: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}) },
      body: JSON.stringify({ ...data, userId }),
    });
    return handleResponse(res);
  },

  updateProjectLogo: async (id: string, logo: string | null): Promise<{ message: string; logo: string | null }> => {
    const res = await fetch(`/api/projects/${id}/logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo }),
    });
    return handleResponse(res);
  },

  deleteProject: async (id: string, userId?: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/projects/${id}${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, {
      method: 'DELETE',
      headers: { ...(userId ? { 'x-user-id': userId } : {}) },
    });
    return handleResponse(res);
  },

  assignPackageToProject: async (projectId: string, packageId: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/projects/${projectId}/assign-package`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId }),
    });
    return handleResponse(res);
  },

  removePackageFromProject: async (projectId: string, packageId: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/projects/${projectId}/remove-package`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId }),
    });
    return handleResponse(res);
  },

  // Packages
  getPackages: async (projectId?: string): Promise<{ packages: Package[]; general: Package }> => {
    const queryStr = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    const res = await fetch(`/api/packages${queryStr}`);
    return handleResponse(res);
  },

  getPackage: async (id: string): Promise<{ package: Package; stats: any; tasks: Task[] }> => {
    const res = await fetch(`/api/packages/${id}`);
    return handleResponse(res);
  },

  createPackage: async (data: Partial<Package>, userId?: string): Promise<{ id: string; message: string }> => {
    const res = await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}) },
      body: JSON.stringify({ ...data, userId }),
    });
    return handleResponse(res);
  },

  updatePackage: async (id: string, data: Partial<Package>, userId?: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/packages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(userId ? { 'x-user-id': userId } : {}) },
      body: JSON.stringify({ ...data, userId }),
    });
    return handleResponse(res);
  },

  deletePackage: async (id: string, userId?: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/packages/${id}${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, {
      method: 'DELETE',
      headers: { ...(userId ? { 'x-user-id': userId } : {}) },
    });
    return handleResponse(res);
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    const res = await fetch('/api/categories');
    return handleResponse(res);
  },

  createCategory: async (data: Partial<Category>): Promise<{ id: string; message: string }> => {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateCategory: async (id: string, data: Partial<Category>): Promise<{ message: string }> => {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteCategory: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Tags
  getTags: async (): Promise<Tag[]> => {
    const res = await fetch('/api/tags');
    return handleResponse(res);
  },

  createTag: async (name: string, color?: string): Promise<Tag> => {
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    return handleResponse(res);
  },

  deleteTag: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/tags/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // PICs (Persons In Charge)
  getPics: async (): Promise<PicMember[]> => {
    const res = await fetch('/api/pics');
    return handleResponse(res);
  },

  createPic: async (data: Partial<PicMember>): Promise<PicMember> => {
    const res = await fetch('/api/pics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updatePic: async (id: string, data: Partial<PicMember>): Promise<PicMember> => {
    const res = await fetch(`/api/pics/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deletePic: async (id: string): Promise<{ message: string; id: string }> => {
    const res = await fetch(`/api/pics/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Users / Profile
  getUsers: async (): Promise<User[]> => {
    const res = await fetch('/api/users');
    return handleResponse(res);
  },

  getProfile: async (): Promise<User & { stats?: { total_tasks: number; done_tasks: number; open_tasks: number } }> => {
    const res = await fetch('/api/users/profile');
    return handleResponse(res);
  },

  updateProfile: async (data: Partial<User>): Promise<{ message: string; user: User }> => {
    const res = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  createUser: async (data: Partial<User>): Promise<{ id: string; message: string }> => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateUser: async (id: string, data: Partial<User>): Promise<{ message: string; user?: User }> => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteUser: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Dashboard
  getDashboardStats: async (
    projectIdOrOpts?: string | { projectId?: string; userId?: string },
    userId?: string
  ): Promise<DashboardStats> => {
    let pId: string | undefined;
    let uId: string | undefined;

    if (typeof projectIdOrOpts === 'object' && projectIdOrOpts !== null) {
      pId = projectIdOrOpts.projectId;
      uId = projectIdOrOpts.userId;
    } else if (typeof projectIdOrOpts === 'string') {
      pId = projectIdOrOpts;
      uId = userId;
    } else {
      uId = userId;
    }

    const params = new URLSearchParams();
    if (pId && pId !== 'ALL') params.set('projectId', pId);
    if (uId && uId !== 'ALL') params.set('userId', uId);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/dashboard/stats${queryStr}`);
    return handleResponse(res);
  },

  // Attachments
  uploadAttachment: async (taskId: string, file: File, userId?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    if (userId) formData.append('userId', userId);

    const res = await fetch(`/api/attachments/tasks/${taskId}`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  deleteAttachment: async (attachmentId: string, userId?: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return handleResponse(res);
  },

  // System
  getDbInfo: async (): Promise<any> => {
    const res = await fetch('/api/system/db-info');
    return handleResponse(res);
  },

  resetDemoData: async (): Promise<{ message: string }> => {
    const res = await fetch('/api/system/reset-demo', {
      method: 'POST',
    });
    return handleResponse(res);
  },

  clearAllData: async (scope: 'tasks' | 'all' = 'tasks'): Promise<{ message: string }> => {
    const res = await fetch('/api/system/clear-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope }),
    });
    return handleResponse(res);
  },

  importBackupJson: async (backupData: any): Promise<{ message: string; counts?: any }> => {
    const res = await fetch('/api/system/import-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData),
    });
    return handleResponse(res);
  },

  uploadDatabaseFile: async (file: File): Promise<{ message: string; fileSize?: number; counts?: any }> => {
    const formData = new FormData();
    formData.append('dbFile', file);

    const res = await fetch('/api/system/upload-db', {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  // AI Assistant
  getAiModels: async (provider: 'gemini' | 'claude' = 'gemini'): Promise<{ provider: string; models: any[] }> => {
    const res = await fetch(`/api/ai/models?provider=${provider}`);
    return handleResponse(res);
  },

  chatWithAi: async (params: {
    message: string;
    history?: any[];
    customApiKey?: string;
    provider?: 'gemini' | 'claude';
    model?: string;
    customInstructions?: string;
  }): Promise<{ reply: string; modelUsed: string; provider?: string; timestamp: string; isFallback?: boolean; originalModel?: string; fallbackModel?: string }> => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse(res);
  },

  testAiConnection: async (params: {
    customApiKey?: string;
    provider?: 'gemini' | 'claude';
    model?: string;
  }): Promise<{
    success: boolean;
    provider?: 'gemini' | 'claude';
    verifiedModel?: string;
    availableModels?: any[];
    message: string;
  }> => {
    const res = await fetch('/api/ai/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse(res);
  },

  rewordDescription: async (params: {
    draftDescription: string;
    taskTitle?: string;
    discipline?: string;
    packageCode?: string;
    customApiKey?: string;
    provider?: 'gemini' | 'claude';
    model?: string;
  }): Promise<{ rewordedDescription: string; modelUsed: string; provider?: string }> => {
    const res = await fetch('/api/ai/reword-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse(res);
  },

  // Microsoft Outlook Calendar Integration
  getOutlookConfig: async (): Promise<OutlookConfigStatus> => {
    const res = await fetch('/api/outlook/config');
    return handleResponse(res);
  },

  saveOutlookConfig: async (data: { client_id: string; tenant_id: string; client_secret?: string }): Promise<{ success: boolean; message: string }> => {
    const res = await fetch('/api/outlook/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getOutlookLoginUrl: async (origin?: string): Promise<{ authUrl: string; redirectUri: string }> => {
    const params = new URLSearchParams({ json: 'true' });
    if (origin) params.set('origin', origin);
    const res = await fetch(`/api/auth/outlook/login?${params.toString()}`);
    return handleResponse(res);
  },

  exchangeOutlookCode: async (codeOrUrl: string): Promise<{ success: boolean; count: number; user_email?: string; user_display_name?: string; message: string }> => {
    const res = await fetch('/api/auth/outlook/exchange-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeOrUrl }),
    });
    return handleResponse(res);
  },

  getOutlookEvents: async (startDate?: string, endDate?: string): Promise<{ events: OutlookEvent[] }> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const res = await fetch(`/api/outlook/events?${params.toString()}`);
    return handleResponse(res);
  },

  syncOutlookCalendar: async (): Promise<{ success: boolean; count: number; last_synced_at: string }> => {
    const res = await fetch('/api/outlook/sync', { method: 'POST' });
    return handleResponse(res);
  },

  disconnectOutlook: async (): Promise<{ success: boolean; message: string }> => {
    const res = await fetch('/api/outlook/disconnect', { method: 'POST' });
    return handleResponse(res);
  },

  sampleSyncOutlook: async (): Promise<{ success: boolean; count: number; last_synced_at: string }> => {
    const res = await fetch('/api/outlook/sample-sync', { method: 'POST' });
    return handleResponse(res);
  },

  // Bulletins / Engineering Resources
  getBulletins: async (
    filters: BulletinFilterOptions = {}
  ): Promise<{
    resources: BulletinResource[];
    total: number;
    page: number;
    limit: number;
    pinnedCount: number;
    recentCount: number;
    reviewRequiredCount: number;
  }> => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.type) params.set('type', filters.type);
    if (filters.projectId) params.set('projectId', filters.projectId);
    if (filters.packageId) params.set('packageId', filters.packageId);
    if (filters.discipline) params.set('discipline', filters.discipline);
    if (filters.pinned !== undefined && filters.pinned !== '') params.set('pinned', String(filters.pinned));
    if (filters.status) params.set('status', filters.status);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));

    const res = await fetch(`/api/bulletins?${params.toString()}`);
    return handleResponse(res);
  },

  getBulletin: async (id: string): Promise<BulletinResource> => {
    const res = await fetch(`/api/bulletins/${id}`);
    return handleResponse(res);
  },

  createBulletin: async (
    data: Partial<BulletinResource>
  ): Promise<{ id: string; message: string; isDuplicateWarning?: boolean; duplicateExistingName?: string }> => {
    const res = await fetch('/api/bulletins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateBulletin: async (id: string, data: Partial<BulletinResource>): Promise<{ message: string }> => {
    const res = await fetch(`/api/bulletins/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteBulletin: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/bulletins/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  pinBulletin: async (id: string, pinned?: boolean): Promise<{ pinned: boolean; message: string }> => {
    const res = await fetch(`/api/bulletins/${id}/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    });
    return handleResponse(res);
  },

  openBulletin: async (
    id: string
  ): Promise<{
    success: boolean;
    opened: boolean;
    canOpenLocally?: boolean;
    open_count: number;
    last_opened: string;
    message?: string;
    location: string;
    isWeb?: boolean;
  }> => {
    const res = await fetch(`/api/bulletins/${id}/open`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  copyBulletin: async (id: string): Promise<{ success: boolean; open_count: number; last_opened: string }> => {
    const res = await fetch(`/api/bulletins/${id}/copy`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  archiveBulletin: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/bulletins/${id}/archive`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  restoreBulletin: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/bulletins/${id}/restore`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  replaceBulletin: async (
    id: string,
    replacementResourceId: string,
    newStatus = 'SUPERSEDED'
  ): Promise<{ message: string; replacementName?: string }> => {
    const res = await fetch(`/api/bulletins/${id}/replace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replacementResourceId, newStatus }),
    });
    return handleResponse(res);
  },

  checkBulletinHealth: async (id: string): Promise<{ link_health: string; health_checked_at: string }> => {
    const res = await fetch(`/api/bulletins/${id}/check`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  detectBulletinTitle: async (url: string): Promise<{ title: string | null; detectedType: string }> => {
    const res = await fetch(`/api/bulletins/detect-title?url=${encodeURIComponent(url)}`);
    return handleResponse(res);
  },

  getBulletinAnnouncements: async (): Promise<BulletinAnnouncement[]> => {
    const res = await fetch('/api/bulletins/announcements');
    return handleResponse(res);
  },

  createBulletinAnnouncement: async (data: {
    title: string;
    content: string;
    author_id?: string;
    is_pinned?: boolean | number;
  }): Promise<{ id: string; message: string }> => {
    const res = await fetch('/api/bulletins/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteBulletinAnnouncement: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/bulletins/announcements/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  linkTaskBulletin: async (taskId: string, bulletinId: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/tasks/${taskId}/bulletins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulletinId }),
    });
    return handleResponse(res);
  },

  unlinkTaskBulletin: async (taskId: string, bulletinId: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/tasks/${taskId}/bulletins/${bulletinId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Task Multidisciplinary Interfaces & Follow-Up Queue API
  getInterfaces: async (params?: {
    taskId?: string;
    status?: string;
    discipline?: string;
    filter?: string;
    search?: string;
    sort?: string;
  }): Promise<{ interfaces: TaskInterface[]; total: number }> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
    }
    const res = await fetch(`/api/interfaces?${query.toString()}`);
    return handleResponse(res);
  },

  getFollowUps: async (params?: {
    filter?: string;
    discipline?: string;
    search?: string;
  }): Promise<{
    counts: {
      today: number;
      overdue: number;
      next7Days: number;
      next14Days: number;
      waiting: number;
      open: number;
      totalActive: number;
    };
    items: FollowUpItem[];
  }> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
    }
    const res = await fetch(`/api/interfaces/follow-ups?${query.toString()}`);
    return handleResponse(res);
  },

  getInterfacesSummary: async (): Promise<{
    summary: Array<{
      discipline: string;
      open: number;
      waiting: number;
      received: number;
      closed: number;
      total: number;
    }>;
  }> => {
    const res = await fetch('/api/interfaces/summary');
    return handleResponse(res);
  },

  getInterface: async (id: string): Promise<TaskInterface> => {
    const res = await fetch(`/api/interfaces/${id}`);
    return handleResponse(res);
  },

  createInterface: async (data: Partial<TaskInterface> & { userId?: string }): Promise<TaskInterface> => {
    const res = await fetch('/api/interfaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateInterface: async (id: string, data: Partial<TaskInterface> & { userId?: string }): Promise<TaskInterface> => {
    const res = await fetch(`/api/interfaces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateInterfaceStatus: async (
    id: string,
    status: InterfaceStatus,
    userId?: string
  ): Promise<{ message: string; status: InterfaceStatus; resolution_date?: string | null }> => {
    const res = await fetch(`/api/interfaces/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, userId }),
    });
    return handleResponse(res);
  },

  recordInterfaceFollowUp: async (
    id: string,
    data: { next_follow_up?: string | null; note?: string; userId?: string }
  ): Promise<{ message: string; last_follow_up: string; next_follow_up?: string | null }> => {
    const res = await fetch(`/api/interfaces/${id}/follow-up`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteInterface: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`/api/interfaces/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};
