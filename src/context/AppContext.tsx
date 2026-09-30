import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Project, Package, Category, Tag, Task, WorkspaceBranding, AISettings, DEFAULT_QUICK_PROMPTS, ThemeMode, PicMember } from '../types';
import { api } from '../lib/api';

export type ActiveView = 
  | 'my_work' 
  | 'dashboard' 
  | 'projects' 
  | 'packages' 
  | 'tasks' 
  | 'calendar' 
  | 'tags' 
  | 'settings' 
  | 'future_modules';

export const DEFAULT_BRANDING: WorkspaceBranding = {
  title: 'ENGINEERING EXECUTIVE',
  subtitle: 'LOCAL PERSISTENT DB',
  iconType: 'acronym',
  acronym: 'ENG',
  presetIcon: 'hard-hat',
  bgColor: 'from-[#0b3b70] to-[#1d4ed8]',
  themeMode: 'light',
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'gemini',
  apiKey: '',
  geminiApiKey: '',
  claudeApiKey: '',
  geminiModel: 'gemini-3.8-flash',
  claudeModel: 'claude-3-7-sonnet-latest',
  model: 'gemini-3.8-flash',
  customInstructions: 'Focus on EPC deliverables, technical bids, schedule forecasts, and overdue engineering task highlights.',
  temperature: 0.3,
  connectionStatus: 'untested',
  geminiConnectionStatus: 'untested',
  claudeConnectionStatus: 'untested',
  quickPrompts: DEFAULT_QUICK_PROMPTS,
};

interface AppContextType {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  isAdmin: boolean;
  users: User[];
  projects: Project[];
  packages: Package[];
  generalPackage: Package | null;
  categories: Category[];
  tags: Tag[];
  pics: PicMember[];
  createPicInline: (name: string, role?: string, avatar?: string) => Promise<PicMember>;
  totalTasksCount: number;
  dataVersion: number;
  refreshData: () => Promise<void>;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  lastActiveTaskId: string | null;
  setLastActiveTaskId: (id: string | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedPackageId: string | null;
  setSelectedPackageId: (id: string | null) => void;
  isQuickTaskModalOpen: boolean;
  setIsQuickTaskModalOpen: (open: boolean) => void;
  quickTaskDefaultPackageId?: string;
  quickTaskDefaultProjectId?: string;
  openNewTaskModal: (defaultPackageId?: string, defaultProjectId?: string) => void;
  globalSearch: string;
  setGlobalSearch: (s: string) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  filterProjectId: string | null;
  setFilterProjectId: (id: string | null) => void;
  filterPackageId: string | null;
  setFilterPackageId: (id: string | null) => void;
  filterTagId: string | null;
  setFilterTagId: (id: string | null) => void;
  // Theme Mode
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
  // Workspace Branding & Icon Customization
  workspaceBranding: WorkspaceBranding;
  setWorkspaceBranding: (branding: WorkspaceBranding) => void;
  // AI Settings & Chat
  aiSettings: AISettings;
  setAiSettings: (settings: AISettings) => void;
  isAiChatOpen: boolean;
  setIsAiChatOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [generalPackage, setGeneralPackage] = useState<Package | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pics, setPics] = useState<PicMember[]>([]);
  const [totalTasksCount, setTotalTasksCount] = useState<number>(0);
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [selectedTaskId, setSelectedTaskIdState] = useState<string | null>(null);
  const [lastActiveTaskId, setLastActiveTaskId] = useState<string | null>(null);

  // Theme Mode State
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('eng_theme_mode') as ThemeMode;
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch (e) {}
    return 'light';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem('eng_theme_mode', mode);
    } catch (e) {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('eng_theme_mode', next);
      } catch (e) {}
      return next;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let isDark = false;
      if (themeMode === 'dark') {
        isDark = true;
      } else if (themeMode === 'light') {
        isDark = false;
      } else {
        isDark = mediaQuery.matches;
      }

      setResolvedTheme(isDark ? 'dark' : 'light');
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    const listener = () => {
      if (themeMode === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [themeMode]);

  // Workspace Branding State
  const [workspaceBranding, setWorkspaceBrandingState] = useState<WorkspaceBranding>(() => {
    try {
      const saved = localStorage.getItem('eng_workspace_branding');
      if (saved) return { ...DEFAULT_BRANDING, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_BRANDING;
  });

  const setWorkspaceBranding = useCallback((branding: WorkspaceBranding) => {
    setWorkspaceBrandingState(branding);
    try {
      localStorage.setItem('eng_workspace_branding', JSON.stringify(branding));
    } catch (e) {}
  }, []);

  // AI Settings State with clean separation of Gemini & Claude API keys
  const [aiSettings, setAiSettingsState] = useState<AISettings>(() => {
    try {
      const saved = localStorage.getItem('eng_ai_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const provider = parsed.provider || (parsed.apiKey?.startsWith('sk-ant-') ? 'claude' : 'gemini');
        
        // Recover keys cleanly without cross-contaminating
        let geminiKey = parsed.geminiApiKey || '';
        let claudeKey = parsed.claudeApiKey || '';

        // If user previously had only single apiKey, migrate it safely
        if (!geminiKey && !claudeKey && parsed.apiKey) {
          if (parsed.apiKey.startsWith('sk-ant-')) {
            claudeKey = parsed.apiKey;
          } else {
            geminiKey = parsed.apiKey;
          }
        }

        let geminiModel = parsed.geminiModel || (provider === 'gemini' && parsed.model ? parsed.model : 'gemini-3.8-flash');
        if (geminiModel.includes('3.6') || geminiModel.includes('3.7') || geminiModel.includes('2.5') || geminiModel.includes('2.0') || geminiModel.includes('1.5')) {
          geminiModel = 'gemini-3.8-flash';
        }
        const claudeModel = parsed.claudeModel || (provider === 'claude' && parsed.model ? parsed.model : 'claude-3-7-sonnet-latest');
        const model = provider === 'claude' ? claudeModel : geminiModel;

        const quickPrompts = Array.isArray(parsed.quickPrompts) && parsed.quickPrompts.length > 0
          ? parsed.quickPrompts
          : DEFAULT_QUICK_PROMPTS;

        return {
          ...DEFAULT_AI_SETTINGS,
          ...parsed,
          provider,
          geminiApiKey: geminiKey,
          claudeApiKey: claudeKey,
          geminiModel,
          claudeModel,
          model,
          quickPrompts,
        };
      }
    } catch (e) {}
    return DEFAULT_AI_SETTINGS;
  });

  const setAiSettings = useCallback((settings: AISettings) => {
    setAiSettingsState(settings);
    try {
      localStorage.setItem('eng_ai_settings', JSON.stringify(settings));
    } catch (e) {}
  }, []);

  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  const setSelectedTaskId = useCallback((id: string | null) => {
    setSelectedTaskIdState(id);
    if (id) {
      setLastActiveTaskId(id);
    }
  }, []);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false);
  const [quickTaskDefaultPackageId, setQuickTaskDefaultPackageId] = useState<string | undefined>();
  const [quickTaskDefaultProjectId, setQuickTaskDefaultProjectId] = useState<string | undefined>();
  const [globalSearch, setGlobalSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [filterPackageId, setFilterPackageId] = useState<string | null>(null);
  const [filterTagId, setFilterTagId] = useState<string | null>(null);

  const isAdmin = Boolean(currentUser?.is_admin);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  }, []);

  const setCurrentUser = useCallback((user: User) => {
    setCurrentUserState(user);
    try {
      localStorage.setItem('eng_current_user_id', user.id);
    } catch (e) {}
    showToast(`Switched user to: ${user.name}${user.is_admin ? ' (Admin)' : ''}`);
  }, [showToast]);

  const refreshData = useCallback(async () => {
    try {
      const [usersData, projectsData, packagesData, categoriesData, tagsData, tasksData, picsData] = await Promise.all([
        api.getUsers(),
        api.getProjects(),
        api.getPackages(),
        api.getCategories(),
        api.getTags(),
        api.getTasks({ limit: 1 }),
        api.getPics(),
      ]);

      setUsers(usersData);
      setProjects(projectsData);
      setPackages(packagesData.packages);
      setGeneralPackage(packagesData.general);
      setCategories(categoriesData);
      setTags(tagsData);
      setPics(picsData);
      setTotalTasksCount(tasksData?.total ?? 0);
      setDataVersion((v) => v + 1);

      if (usersData.length > 0) {
        setCurrentUserState(usersData[0]);
      }
    } catch (err) {
      console.error('Failed to load initial application metadata:', err);
    }
  }, []);

  const createPicInline = useCallback(async (name: string, role = '', avatar = ''): Promise<PicMember> => {
    const newPic = await api.createPic({ name, role, avatar });
    setPics((prev) => {
      const exists = prev.some((p) => p.name.toLowerCase() === newPic.name.toLowerCase());
      if (exists) {
        return prev.map((p) => (p.name.toLowerCase() === newPic.name.toLowerCase() ? { ...p, ...newPic } : p));
      }
      return [...prev, newPic];
    });
    return newPic;
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const openNewTaskModal = useCallback((defaultPackageId?: string, defaultProjectId?: string) => {
    setQuickTaskDefaultPackageId(defaultPackageId);
    setQuickTaskDefaultProjectId(defaultProjectId);
    setIsQuickTaskModalOpen(true);
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        currentUser,
        setCurrentUser,
        isAdmin,
        users,
        projects,
        packages,
        generalPackage,
        categories,
        tags,
        pics,
        createPicInline,
        totalTasksCount,
        dataVersion,
        refreshData,
        selectedTaskId,
        setSelectedTaskId,
        lastActiveTaskId,
        setLastActiveTaskId,
        selectedProjectId,
        setSelectedProjectId,
        selectedPackageId,
        setSelectedPackageId,
        isQuickTaskModalOpen,
        setIsQuickTaskModalOpen,
        quickTaskDefaultPackageId,
        quickTaskDefaultProjectId,
        openNewTaskModal,
        globalSearch,
        setGlobalSearch,
        toastMessage,
        showToast,
        filterProjectId,
        setFilterProjectId,
        filterPackageId,
        setFilterPackageId,
        filterTagId,
        setFilterTagId,
        themeMode,
        setThemeMode,
        resolvedTheme,
        toggleTheme,
        workspaceBranding,
        setWorkspaceBranding,
        aiSettings,
        setAiSettings,
        isAiChatOpen,
        setIsAiChatOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
