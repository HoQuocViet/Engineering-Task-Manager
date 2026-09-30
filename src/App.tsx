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
import { QuickTaskModal } from './components/tasks/QuickTaskModal';
import { TaskDetailModal } from './components/tasks/TaskDetailModal';
import { AIChatBubble } from './components/ai/AIChatBubble';
import { CheckCircle, Info } from 'lucide-react';

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
  } = useApp();

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
      case 'calendar':
        return <CalendarView />;
      case 'tags':
        return <TagsView />;
      case 'settings':
        return <SettingsView />;
      case 'future_modules':
        return <FutureModulesView />;
      case 'my_work':
        return <TaskListView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-150">
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
