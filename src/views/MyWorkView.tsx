import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Task, TaskPriority, TaskStatus } from '../types';
import { api } from '../lib/api';
import { TaskCard } from '../components/tasks/TaskCard';
import { isOverdue, isDueToday, isDueThisWeek, getTodayYmd } from '../lib/dateUtils';
import { getHeaderBoxClasses, getHeaderBoxStyle } from '../lib/headerTheme';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Inbox,
  Flame,
  ListTodo,
} from 'lucide-react';

export const MyWorkView: React.FC = () => {
  const {
    openNewTaskModal,
    globalSearch,
    currentUser,
    filterProjectId,
    filterPackageId,
    dataVersion,
    showToast,
    refreshData,
    workspaceBranding,
  } = useApp();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'this_week' | 'overdue' | 'done'>('all');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('HIGH');
  const [submittingQuick, setSubmittingQuick] = useState(false);

  const fetchMyWorkTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTasks({
        search: globalSearch,
        projectId: filterProjectId || undefined,
        packageId: filterPackageId || undefined,
        deadlineFilter: activeFilter === 'all' ? undefined : activeFilter,
        limit: 150,
        sort: 'deadline_asc',
      });
      setTasks(res.tasks);
    } catch (err: any) {
      showToast(`Error loading tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [globalSearch, filterProjectId, filterPackageId, activeFilter, dataVersion, showToast]);

  useEffect(() => {
    fetchMyWorkTasks();
  }, [fetchMyWorkTasks]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    setSubmittingQuick(true);
    try {
      await api.createTask({
        title: quickTitle.trim(),
        priority: quickPriority,
        status: 'TODO',
        progress: 0,
        deadline: getTodayYmd(),
        assignee_id: currentUser?.id || null,
        userId: currentUser?.id,
      });
      setQuickTitle('');
      showToast('Task added to Today');
      fetchMyWorkTasks();
      refreshData();
    } catch (err: any) {
      showToast(`Failed to add: ${err.message}`);
    } finally {
      setSubmittingQuick(false);
    }
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.updateTask(taskId, {
        status: newStatus,
        userId: currentUser?.id,
      });
      showToast(newStatus === 'DONE' ? 'Task marked as Done (100%)' : `Status updated to ${newStatus}`);
      fetchMyWorkTasks();
      refreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleQuickProgressChange = async (taskId: string, newProgress: number) => {
    try {
      await api.updateTask(taskId, {
        progress: newProgress,
        status: newProgress === 100 ? 'DONE' : undefined,
        userId: currentUser?.id,
      });
      fetchMyWorkTasks();
      refreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Classify tasks into clear visual buckets
  const overdueTasks = tasks.filter((t) => isOverdue(t.deadline, t.status));
  const dueTodayTasks = tasks.filter((t) => isDueToday(t.deadline, t.status));
  const dueThisWeekTasks = tasks.filter((t) => !isOverdue(t.deadline, t.status) && !isDueToday(t.deadline, t.status) && isDueThisWeek(t.deadline, t.status));
  const upcomingTasks = tasks.filter((t) => !isOverdue(t.deadline, t.status) && !isDueThisWeek(t.deadline, t.status) && t.status !== 'DONE' && t.status !== 'CANCELLED');
  const doneTasks = tasks.filter((t) => t.status === 'DONE');

  const filterTabs = [
    { id: 'all', label: 'All Open Tasks', count: tasks.filter((t) => t.status !== 'DONE').length },
    { id: 'today', label: 'Due Today', count: dueTodayTasks.length, highlight: dueTodayTasks.length > 0 },
    { id: 'this_week', label: 'This Week', count: dueThisWeekTasks.length },
    { id: 'overdue', label: 'Overdue', count: overdueTasks.length, alert: overdueTasks.length > 0 },
    { id: 'done', label: 'Done', count: doneTasks.length },
  ];

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-1 overflow-y-auto space-y-2 transition-colors">
      {/* Top Banner: Quick Action & Headline */}
      <div
        className={`shrink-0 min-h-[62px] sm:h-[62px] ${getHeaderBoxClasses(workspaceBranding)} rounded-xl px-3.5 py-2 sm:px-4 sm:py-2 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all`}
        style={getHeaderBoxStyle(workspaceBranding)}
      >
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 shrink-0">
              <Inbox className="w-4 h-4 text-sky-200" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">MY WORK</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 backdrop-blur-xs text-sky-200 font-semibold border border-white/20">
              Today: {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
          </div>
          <p className="text-xs text-sky-100/90 hidden sm:block">
            Engineering workspace for active tasks, package reviews, technical queries, and deadlines.
          </p>
        </div>

        <button
          onClick={() => openNewTaskModal()}
          className="bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Task</span>
        </button>
      </div>

      {/* Fast Inline Task Creator (< 5 seconds) */}
      <form
        onSubmit={handleQuickAdd}
        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 flex items-center space-x-2 shadow-xs focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all"
      >
        <div className="pl-2">
          <Plus className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </div>
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Quick Add: Type an engineering task title and press Enter (e.g. 'Review valve actuator TBE')..."
          className="flex-1 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none bg-transparent"
        />
        <select
          value={quickPriority}
          onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
          className="text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <option value="CRITICAL">🔴 Critical</option>
          <option value="HIGH">🟠 High</option>
          <option value="MEDIUM">🟡 Medium</option>
          <option value="LOW">⚪ Low</option>
        </select>
        <button
          type="submit"
          disabled={submittingQuick || !quickTitle.trim()}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors cursor-pointer shadow-xs"
        >
          Add Task
        </button>
      </form>

      {/* Quick Filter Buttons */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors shrink-0 cursor-pointer ${
              activeFilter === tab.id
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                activeFilter === tab.id
                  ? 'bg-blue-700 text-white'
                  : tab.alert
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold'
                  : tab.highlight
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center text-xs text-slate-500 dark:text-slate-400">
          Loading your engineering work list...
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center space-y-2">
          <Inbox className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">No tasks found</div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {globalSearch ? 'No items match your search query.' : 'You have no open tasks in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. CRITICAL & OVERDUE ALERT SECTION (if any exist) */}
          {overdueTasks.length > 0 && (activeFilter === 'all' || activeFilter === 'overdue') && (
            <div className="border border-rose-300 dark:border-rose-800/80 bg-rose-50/40 dark:bg-rose-950/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                  <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse" />
                  <span>OVERDUE & CRITICAL ACTION REQUIRED ({overdueTasks.length})</span>
                </div>
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-mono font-medium">Immediate follow-up required</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overdueTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onQuickStatusChange={handleQuickStatusChange}
                    onQuickProgressChange={handleQuickProgressChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. DUE TODAY SECTION */}
          {dueTodayTasks.length > 0 && (activeFilter === 'all' || activeFilter === 'today') && (
            <div className="space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>DUE TODAY ({dueTodayTasks.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dueTodayTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onQuickStatusChange={handleQuickStatusChange}
                    onQuickProgressChange={handleQuickProgressChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. DUE THIS WEEK SECTION */}
          {dueThisWeekTasks.length > 0 && (activeFilter === 'all' || activeFilter === 'this_week') && (
            <div className="space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>DUE THIS WEEK ({dueThisWeekTasks.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dueThisWeekTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onQuickStatusChange={handleQuickStatusChange}
                    onQuickProgressChange={handleQuickProgressChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 4. UPCOMING / LATER SECTION */}
          {upcomingTasks.length > 0 && activeFilter === 'all' && (
            <div className="space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <ListTodo className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>UPCOMING TASKS & NOTEBOOK ({upcomingTasks.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcomingTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onQuickStatusChange={handleQuickStatusChange}
                    onQuickProgressChange={handleQuickProgressChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 5. COMPLETED SECTION */}
          {doneTasks.length > 0 && (activeFilter === 'all' || activeFilter === 'done') && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>COMPLETED ({doneTasks.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {doneTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onQuickStatusChange={handleQuickStatusChange}
                    onQuickProgressChange={handleQuickProgressChange}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
