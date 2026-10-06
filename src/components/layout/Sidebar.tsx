import React from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
import { UserAvatar } from '../UserAvatar';
import { getHeaderBoxClasses, getHeaderBoxStyle } from '../../lib/headerTheme';
import {
  CheckSquare,
  LayoutDashboard,
  FolderGit2,
  Box,
  ListTodo,
  Calendar,
  Tags,
  Settings,
  ShieldAlert,
  ChevronRight,
  Database,
  Building2,
  HardHat,
  Compass,
  Wrench,
  Cpu,
  Flame,
  Factory,
  Layers,
  Shield,
  Activity,
  Atom,
  CircuitBoard,
  Sparkles,
  Bot,
  Plus,
  Sun,
  Moon,
  Bookmark,
  Inbox,
  Clock,
  Pin,
  PinOff,
  X,
  BookOpen,
} from 'lucide-react';

export const renderBrandingIcon = (
  iconType: string,
  presetIcon: string,
  acronym: string,
  customImageUrl?: string,
  bgColor: string = 'from-[#0b3b70] to-[#1d4ed8]'
) => {
  if (iconType === 'custom_image' && customImageUrl) {
    return (
      <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/20 bg-white/10 shrink-0 flex items-center justify-center shadow-xs p-0.5">
        <img src={customImageUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" referrerPolicy="no-referrer" />
      </div>
    );
  }

  if (iconType === 'preset') {
    const iconClass = "w-6 h-6 text-white";
    let iconElement = <HardHat className={iconClass} />;
    switch (presetIcon) {
      case 'compass':
        iconElement = <Compass className={iconClass} />;
        break;
      case 'wrench':
        iconElement = <Wrench className={iconClass} />;
        break;
      case 'cpu':
        iconElement = <Cpu className={iconClass} />;
        break;
      case 'flame':
        iconElement = <Flame className={iconClass} />;
        break;
      case 'factory':
        iconElement = <Factory className={iconClass} />;
        break;
      case 'layers':
        iconElement = <Layers className={iconClass} />;
        break;
      case 'shield':
        iconElement = <Shield className={iconClass} />;
        break;
      case 'atom':
        iconElement = <Atom className={iconClass} />;
        break;
      case 'circuit':
        iconElement = <CircuitBoard className={iconClass} />;
        break;
      case 'activity':
        iconElement = <Activity className={iconClass} />;
        break;
      case 'sparkles':
        iconElement = <Sparkles className={iconClass} />;
        break;
      case 'bot':
        iconElement = <Bot className={iconClass} />;
        break;
      case 'box':
        iconElement = <Box className={iconClass} />;
        break;
      case 'hard-hat':
      default:
        iconElement = <HardHat className={iconClass} />;
        break;
    }

    return (
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${bgColor || 'from-[#0b3b70] to-[#1d4ed8]'} border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm`}>
        {iconElement}
      </div>
    );
  }

  // Default: Acronym
  return (
    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${bgColor || 'from-[#0b3b70] to-[#1d4ed8]'} border border-white/20 flex items-center justify-center text-white font-bold text-sm tracking-wider shrink-0 shadow-sm select-none font-mono`}>
      {(acronym || 'ENG').slice(0, 4).toUpperCase()}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    projects,
    packages,
    tags,
    totalTasksCount,
    filterProjectId,
    setFilterProjectId,
    filterPackageId,
    setFilterPackageId,
    filterTagId,
    setFilterTagId,
    currentUser,
    isAdmin,
    workspaceBranding,
    setIsAiChatOpen,
    openNewTaskModal,
    toggleTheme,
    resolvedTheme,
    isSidebarPinned,
    toggleSidebarPinned,
    isSidebarOpen,
    setIsSidebarOpen,
    showToast,
  } = useApp();

  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isOverlay = !isSidebarPinned || isMobile;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOverlay && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOverlay, isSidebarOpen, setIsSidebarOpen]);

  const hideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSidebarMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleSidebarMouseLeave = () => {
    if (isOverlay && isSidebarOpen) {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setIsSidebarOpen(false);
      }, 350);
    }
  };

  const handleNavClick = (callback: () => void) => {
    callback();
    if (isOverlay) {
      setIsSidebarOpen(false);
    }
  };

  const navItems: Array<{ id: ActiveView; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'tasks',
      label: 'Task List',
      icon: <ListTodo className="w-4 h-4" />,
      badge: String(totalTasksCount),
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: <FolderGit2 className="w-4 h-4" />,
      badge: String(projects.length),
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    },
    {
      id: 'packages',
      label: 'Procurement Packages',
      icon: <Box className="w-4 h-4" />,
      badge: String(packages.length),
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    },
    {
      id: 'bulletins',
      label: 'Bulletins',
      icon: <Bookmark className="w-4 h-4" />,
    },
    {
      id: 'calendar',
      label: 'Deadlines & Calendar',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'tags',
      label: 'Tags',
      icon: <Tags className="w-4 h-4" />,
      badge: String(tags.length),
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    },
  ];

  const futureModules = [
    { label: 'Change Management', code: 'MOC' },
    { label: 'Hold Management', code: 'HLD' },
    { label: 'Risk Management', code: 'RSK' },
  ];

  return (
    <aside
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={handleSidebarMouseLeave}
      className={`bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-200 dark:border-slate-800 select-none overflow-hidden h-full transition-all duration-200 ${
        isOverlay
          ? `fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] shadow-2xl ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
            }`
          : `relative z-20 w-64 ${isSidebarOpen ? 'block' : 'hidden'}`
      }`}
    >
      {/* Brand Header & Navigation */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Top Control Bar: Pin/Unpin & Close */}
        <div className="px-3 pt-2 pb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0 border-b border-slate-100 dark:border-slate-800/80 mb-1 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isSidebarPinned
                  ? 'bg-sky-500 shadow-sky-500/50 shadow-xs'
                  : 'bg-amber-500'
              }`}
            />
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-700 dark:text-slate-200">
              {isSidebarPinned ? 'PINNED' : 'AUTO-HIDE'}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
              ({isSidebarPinned ? 'Fixed' : 'Overlay'})
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Pin / Unpin Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleSidebarPinned();
                showToast(
                  isSidebarPinned
                    ? 'Sidebar unpinned (auto-hides on mobile/compact view)'
                    : 'Sidebar pinned (always visible)'
                );
              }}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                isSidebarPinned
                  ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-200 dark:hover:bg-sky-900'
                  : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700'
              }`}
              title={
                isSidebarPinned
                  ? 'Sidebar is pinned. Click to unpin (will auto-hide to free up screen space on mobile & desktop).'
                  : 'Sidebar is unpinned. Click to pin and keep always visible.'
              }
              aria-label={isSidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              {isSidebarPinned ? (
                <>
                  <Pin className="w-3.5 h-3.5 fill-current text-sky-600 dark:text-sky-400 rotate-45" />
                  <span>Unpin</span>
                </>
              ) : (
                <>
                  <PinOff className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Pin</span>
                </>
              )}
            </button>

            {/* Close / Hide Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSidebarOpen(false);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close sidebar to maximize screen space"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-1 px-2.5 pb-1 shrink-0">
          <div 
            onClick={() => {
              handleNavClick(() => {
                setActiveView('settings');
                setFilterProjectId(null);
                setFilterPackageId(null);
                setFilterTagId(null);
              });
            }}
            className={`h-[62px] min-h-[62px] p-2.5 rounded-xl ${getHeaderBoxClasses(workspaceBranding)} text-white shadow-md hover:shadow-lg hover:border-sky-400/50 flex items-center gap-3 cursor-pointer transition-all group`}
            style={getHeaderBoxStyle(workspaceBranding)}
            title="Click to customize workspace branding and engineer profile"
          >
            {renderBrandingIcon(
              workspaceBranding?.iconType || 'acronym',
              workspaceBranding?.presetIcon || 'hard-hat',
              workspaceBranding?.acronym || 'ENG',
              workspaceBranding?.customImageUrl,
              workspaceBranding?.bgColor || 'from-[#0b3b70] to-[#1d4ed8]'
            )}
            <div className="overflow-hidden flex-1">
              <div className="font-bold text-white tracking-tight text-sm uppercase truncate group-hover:text-sky-200 transition-colors">
                <span>{workspaceBranding?.title || 'ENGINEERING EXECUTIVE'}</span>
              </div>
              <div className="text-xs text-sky-100/90 font-mono flex items-center gap-1.5 truncate mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0 shadow-2xs"></span>
                <span className="truncate">{workspaceBranding?.subtitle || 'LOCAL PERSISTENT DB'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action: New Task Button */}
        <div className="px-2.5 pt-1.5 pb-1 shrink-0">
          <button
            onClick={() => {
              handleNavClick(() => {
                openNewTaskModal();
              });
            }}
            className="w-full bg-[#0b3b70] hover:bg-[#0f4c81] active:bg-[#072346] text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Task</span>
          </button>
        </div>

        {/* Scrollable Nav Area */}
        <div className="p-2.5 space-y-4 overflow-y-auto flex-1 min-h-0 sidebar-scrollbar">
          {/* Main Navigation */}
          <div>
            <div className="px-2 pb-1.5 text-[11px] font-bold text-blue-900 dark:text-sky-300 uppercase tracking-wider">
              Workspace
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleNavClick(() => {
                        setActiveView(item.id);
                        setFilterProjectId(null);
                        setFilterPackageId(null);
                        setFilterTagId(null);
                      });
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-[#0b3b70] dark:text-sky-300 font-semibold shadow-2xs border border-blue-200 dark:border-blue-800 hover:bg-blue-100/70 dark:hover:bg-blue-900/40'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-[#0b3b70] dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                          isActive
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-[#0b3b70] dark:text-sky-300'
                            : item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Projects Quick Filter */}
          <div>
            <div className="px-2 pb-1.5 text-[11px] font-bold text-blue-900 dark:text-sky-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <span>Projects</span>
                <span className="text-[10px] font-mono text-blue-700 dark:text-sky-400 font-medium">({projects.length})</span>
              </span>
              <button
                onClick={() => {
                  handleNavClick(() => {
                    setActiveView('projects');
                    setFilterProjectId(null);
                    setFilterPackageId(null);
                    setFilterTagId(null);
                  });
                }}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium normal-case"
              >
                View all
              </button>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5 select-none sidebar-scrollbar">
              {projects.length === 0 ? (
                <div className="px-2 py-1 text-[11px] text-slate-400 dark:text-slate-500 italic">No projects yet</div>
              ) : (
                projects.map((proj) => {
                  const isSelected = activeView === 'tasks' && filterProjectId === proj.id;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => {
                        handleNavClick(() => {
                          if (isSelected) {
                            setFilterProjectId(null);
                          } else {
                            setFilterProjectId(proj.id);
                          }
                          setFilterPackageId(null);
                          setActiveView('tasks');
                        });
                      }}
                      className={`w-full flex items-center justify-between p-1.5 px-2 rounded-md transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-600/30 text-blue-800 dark:text-blue-200 font-semibold border border-blue-200/80 dark:border-blue-500/30 hover:bg-blue-200/70 dark:hover:bg-blue-600/40'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                      }`}
                      title={`${proj.code} - ${proj.name} (${proj.total_tasks || 0} tasks)`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1.5 flex-1">
                        {proj.logo ? (
                          <img
                            src={proj.logo}
                            alt=""
                            className="w-4 h-4 object-contain rounded-xs shrink-0 bg-slate-100 dark:bg-white/20 p-0.5"
                            referrerPolicy="no-referrer"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className={`font-mono text-[11px] font-semibold leading-tight ${
                            isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {proj.code}
                          </div>
                          <div className={`text-[11px] truncate leading-tight mt-0.5 ${
                            isSelected ? 'text-blue-700/80 dark:text-blue-300/80 font-medium' : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {proj.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {(proj.overdue_tasks || 0) > 0 && (
                          <span
                            className="text-[9px] px-1 py-0.5 rounded bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-mono font-bold"
                            title={`${proj.overdue_tasks} overdue tasks`}
                          >
                            !{proj.overdue_tasks}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 font-mono">
                          {proj.total_tasks || 0}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Tags Quick Filter */}
          <div>
            <div className="px-2 pb-1.5 text-[11px] font-bold text-blue-900 dark:text-sky-300 uppercase tracking-wider flex items-center justify-between">
              <span>Tags</span>
              <button
                onClick={() => {
                  handleNavClick(() => {
                    setActiveView('tags');
                  });
                }}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium normal-case"
              >
                View all
              </button>
            </div>
            <div className="space-y-0.5 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
              {tags.map((tg) => {
                const isSelected = activeView === 'tasks' && filterTagId === tg.id;
                return (
                  <button
                    key={tg.id}
                    onClick={() => {
                      handleNavClick(() => {
                        if (isSelected) {
                          setFilterTagId(null);
                        } else {
                          setFilterTagId(tg.id);
                        }
                        setActiveView('tasks');
                      });
                    }}
                    className={`w-full flex items-center justify-between p-1.5 px-2 rounded-md text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-blue-100 dark:bg-blue-600/30 text-blue-800 dark:text-blue-200 font-semibold border border-blue-200/80 dark:border-blue-500/30 hover:bg-blue-200/70 dark:hover:bg-blue-600/40'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                    }`}
                    title={`#${tg.name} (${tg.task_count || 0} tasks)`}
                  >
                    <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 inline-block"
                        style={{ backgroundColor: tg.color || '#3b82f6' }}
                      />
                      <span className="truncate">#{tg.name}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 font-mono shrink-0">
                      {tg.task_count || 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* System & Settings */}
          <div>
            <div className="px-2 pb-1.5 text-[11px] font-bold text-blue-900 dark:text-sky-300 uppercase tracking-wider">
              System / Settings
            </div>
            <button
              onClick={() => {
                handleNavClick(() => {
                  setActiveView('settings');
                  setFilterProjectId(null);
                  setFilterPackageId(null);
                  setFilterTagId(null);
                });
              }}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors cursor-pointer ${
                activeView === 'settings'
                  ? 'bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs border border-blue-200/80 dark:border-blue-500/30 hover:bg-blue-200/70 dark:hover:bg-blue-600/40'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Settings className={`w-4 h-4 ${activeView === 'settings' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <div className="flex items-center justify-between flex-1">
                <span className="uppercase text-xs font-semibold tracking-wide">SETTINGS</span>
                {isAdmin && (
                  <span className="text-[9px] bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                    ADMIN
                  </span>
                )}
              </div>
            </button>
            <a
              href="/user-guide.html"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 p-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer group"
              title="Open Interactive HTML User Guide in new tab"
            >
              <BookOpen className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-sky-400" />
              <div className="flex items-center justify-between flex-1">
                <span className="uppercase text-xs font-semibold tracking-wide">USER GUIDE</span>
                <span className="text-[9px] bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-blue-700/50 px-1.5 py-0.2 rounded font-bold">
                  HTML
                </span>
              </div>
            </a>
          </div>

          {/* Future Modules (V2) */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <div className="px-2 pb-1.5 text-[11px] font-bold text-blue-900 dark:text-sky-300 uppercase tracking-wider flex items-center justify-between">
              <span>Extensions</span>
              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1 py-0.2 rounded font-mono">V2</span>
            </div>
            <div className="space-y-0.5">
              {futureModules.map((m) => (
                <button
                  key={m.code}
                  onClick={() => {
                    handleNavClick(() => {
                      setActiveView('future_modules');
                    });
                  }}
                  className="w-full flex items-center justify-between p-1.5 px-2 text-xs rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">{m.code}</span>
                    <span>{m.label}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-600 italic">Soon</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
        <div
          onClick={() => {
            handleNavClick(() => {
              setActiveView('settings');
              setFilterProjectId(null);
              setFilterPackageId(null);
              setFilterTagId(null);
            });
          }}
          className="relative flex items-center gap-3 px-2.5 py-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-xs transition-all cursor-pointer group"
          title="Click to customize engineer profile and settings"
        >
          {/* Avatar on the LEFT with Status Badge */}
          <div className="shrink-0 flex items-center justify-center">
            <UserAvatar
              name={currentUser?.name || 'Engineer'}
              avatar={currentUser?.avatar}
              size="lg"
              showBadge={true}
            />
          </div>

          {/* User Details on the RIGHT */}
          <div className="overflow-hidden flex-1 min-w-0 pr-6 text-left">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {currentUser?.name || 'Local Engineer'}
            </div>
            <div
              className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5"
              title={currentUser?.role || 'Lead Discipline Eng'}
            >
              {currentUser?.role || 'Lead Discipline Eng'}
            </div>
          </div>

          {/* Theme Toggle Button positioned at top-right */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleTheme();
            }}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
