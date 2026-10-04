import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { MyWorkView } from './views/MyWorkView';
import { DashboardView } from './views/DashboardView';
import { TaskListView } from './views/TaskListView';
import { CalendarView } from './views/CalendarView';
import { PackagesView } from './views/PackagesView';
import { ProjectsView } from './views/ProjectsView';
import { TagsView } from './views/TagsView';
import { SettingsView } from './views/SettingsView';
import { FutureModulesView } from './views/FutureModulesView';
import { BulletinsView } from './views/BulletinsView';
import { FollowUpView } from './views/FollowUpView';
import { QuickTaskModal } from './components/tasks/QuickTaskModal';
import { TaskDetailModal } from './components/tasks/TaskDetailModal';
import { AIChatBubble } from './components/ai/AIChatBubble';
import { CheckCircle, Info, Menu } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    activeView,
    selectedTaskId,
    setSelectedTaskId,
    isQuickTaskModalOpen,
    setIsQuickTaskModalOpen,
    quickTaskDefaultPackageId,
    refreshData,
    toastMessage,
    isSidebarPinned,
    isSidebarOpen,
    setIsSidebarOpen,
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

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'tasks':
        return <TaskListView />;
      case 'projects':
        return <ProjectsView />;
      case 'packages':
        return <PackagesView />;
      case 'bulletins':
        return <BulletinsView />;
      case 'calendar':
        return <CalendarView />;
      case 'tags':
        return <TagsView />;
      case 'settings':
        return <SettingsView />;
      case 'future_modules':
        return <FutureModulesView />;
      case 'follow_up':
        return <FollowUpView />;
      case 'my_work':
        return <MyWorkView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-150 relative">
      {/* Backdrop overlay when sidebar is open as an overlay (unpinned or mobile) */}
      {isSidebarOpen && (!isSidebarPinned || isMobile) && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-2xs z-40 transition-opacity animate-in fade-in duration-150"
          onClick={() => setIsSidebarOpen(false)}
          title="Click to hide sidebar"
          aria-label="Close sidebar overlay"
        />
      )}

      {/* Left-edge mouse hover trigger zone to auto-reveal sidebar when in Auto-Hide mode */}
      {!isSidebarPinned && !isSidebarOpen && (
        <div
          onMouseEnter={() => {
            setIsSidebarOpen(true);
          }}
          className="fixed inset-y-0 left-0 w-5 z-30 pointer-events-auto cursor-pointer"
          title="Move mouse here to reveal Sidebar"
          aria-label="Reveal Sidebar on Hover"
        />
      )}

      {/* Floating Toggle Sidebar Menu Button when Sidebar is closed */}
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsSidebarOpen(true);
          }}
          className="fixed top-3 left-3 z-35 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-md hover:shadow-lg hover:bg-white dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-sky-400 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 group"
          title="Open Navigation Sidebar (Menu)"
          aria-label="Open Sidebar Menu"
        >
          <Menu className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-sky-400" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide pr-0.5">
            Menu
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
            Auto-Hide
          </span>
        </button>
      )}

      {/* Main Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace (Active View) */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {renderActiveView()}
      </main>

      {/* Quick Task Creation Modal */}
      <QuickTaskModal
        isOpen={isQuickTaskModalOpen}
        onClose={() => setIsQuickTaskModalOpen(false)}
        onCreated={() => refreshData()}
        defaultPackageId={quickTaskDefaultPackageId}
      />

      {/* Task Details & Inspection Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={() => refreshData()}
        />
      )}

      {/* Floating AI Engineering Assistant (Chatbot Bubble) */}
      <AIChatBubble />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
