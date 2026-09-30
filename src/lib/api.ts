import { Task, Package, Category, Tag, User, Project, DashboardStats, TaskFilterOptions, OutlookEvent, OutlookConfigStatus, PicMember } from '../types';

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
  }): Promise<{ reply: string; modelUsed: string; provider?: string; timestamp: string }> => {
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
};
