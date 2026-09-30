import React from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Search, FolderGit2, UserCog, X, Sparkles, Sun, Moon } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';
import { Robot3DIcon } from '../ai/Robot3DIcon';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    openNewTaskModal,
    globalSearch,
    setGlobalSearch,
    filterProjectId,
    setFilterProjectId,
    projects,
    setActiveView,
    setIsAiChatOpen,
    themeMode,
    toggleTheme,
    resolvedTheme,
  } = useApp();

  const activeProject = projects.find((p) => p.id === filterProjectId);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 select-none shrink-0 transition-colors duration-150">
      {/* Left: Search input & Active Project indicator */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <div className="w-full relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks, notes, packages, tags... (e.g. 'metering', 'valve', 'TBE')"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-md text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {filterProjectId && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 rounded-md text-xs whitespace-nowrap shrink-0">
            <FolderGit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold">{activeProject?.code || 'Project'}</span>
            <button
              onClick={() => setFilterProjectId(null)}
              className="ml-1 text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 cursor-pointer p-0.5"
              title="Clear project filter"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Quick Action & Personal User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Fast Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 transition-colors cursor-pointer"
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Fast AI Assistant Trigger */}
        <button
          onClick={() => setIsAiChatOpen(true)}
          className="bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 text-sm font-medium px-3 py-1.5 rounded flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          title="Open AI Assistant"
        >
          <Robot3DIcon className="w-5 h-5" glow={false} />
          <span className="hidden md:inline">AI Assistant</span>
        </button>

        {/* Fast New Task Button */}
        <button
          onClick={() => openNewTaskModal()}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Task</span>
        </button>

        {/* Personal User Profile Card / Settings Trigger */}
        <button
          onClick={() => setActiveView('settings')}
          className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/90 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer group"
          title="Customize personal profile & application settings"
        >
          <UserAvatar
            name={currentUser?.name || 'Engineer'}
            avatar={currentUser?.avatar}
            size="sm"
            showBadge={true}
          />
          <div className="text-left hidden sm:block">
            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-none flex items-center gap-1.5">
              <span>{currentUser?.name || 'PTSC Lead Engineer'}</span>
              <UserCog className="w-3 h-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-1 max-w-[140px] truncate">
              {currentUser?.role || 'Lead Discipline Engineer'}
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};

