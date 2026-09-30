import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { DashboardStats, Task, TaskPriority, TaskStatus } from '../types';
import { TaskListTable } from '../components/tasks/TaskListTable';
import { getHeaderBoxClasses, getHeaderBoxStyle } from '../lib/headerTheme';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  ListTodo,
  TrendingUp,
  Box,
  Layers,
  History,
  ArrowUpRight,
  Filter,
  FolderGit2,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Search,
  Building2,
  Calendar,
  RefreshCw,
  Zap,
  ArrowUp,
  ArrowRight,
  Activity,
  Trash2,
  Loader2,
} from 'lucide-react';
import { formatDateDisplay, formatShortDate, formatDateDdMmYyyy, getDeadlineBadge, getScheduleVariance } from '../lib/dateUtils';

const STATUS_COLORS: Record<string, string> = {
  TODO: '#64748b',
  'IN PROGRESS': '#0284c7',
  WAITING: '#f59e0b',
  'ON HOLD': '#8b5cf6',
  DONE: '#10b981',
  CANCELLED: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#94a3b8',
};

const formatActivityTimestamp = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${mins} ${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const DashboardView: React.FC = () => {
  const {
    projects,
    currentUser,
    filterProjectId,
    setFilterProjectId,
    selectedTaskId,
    setSelectedTaskId,
    setActiveView,
    filterPackageId,
    setFilterPackageId,
    filterTagId,
    setFilterTagId,
    dataVersion,
    refreshData,
    showToast,
    workspaceBranding,
  } = useApp();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectChartTab, setSelectedProjectChartTab] = useState<string>('ALL');

  // Task list table state in Dashboard
  const [dashboardSelectedTaskIds, setDashboardSelectedTaskIds] = useState<string[]>([]);
  const [dashboardSort, setDashboardSort] = useState('created_desc');
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [dashboardPriorityFilter, setDashboardPriorityFilter] = useState('ALL');
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState('ALL');
  const [dashboardCategoryFilter, setDashboardCategoryFilter] = useState('ALL');
  const [dashboardDeadlineFilter, setDashboardDeadlineFilter] = useState<string>('all');
  const [dashboardForecastFilter, setDashboardForecastFilter] = useState<string>('all');
  const [dashboardProgressFilter, setDashboardProgressFilter] = useState('ALL');

  // Task delete confirmation modal state
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const handleToggleSelect = (id: string) => {
    setDashboardSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll && stats?.urgentTasks) {
      setDashboardSelectedTaskIds(stats.urgentTasks.map((t) => t.id));
    } else {
      setDashboardSelectedTaskIds([]);
    }
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const newProgress = newStatus === 'DONE' ? 100 : undefined;
    setStats((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        urgentTasks: prev.urgentTasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                progress: newProgress !== undefined ? newProgress : t.progress,
                completed_date: newStatus === 'DONE' ? new Date().toISOString().split('T')[0] : (t.status === 'DONE' ? null : t.completed_date),
              }
            : t
        ),
      };
    });

    try {
      await api.updateTask(taskId, {
        status: newStatus,
        progress: newProgress,
        userId: currentUser?.id,
      });
      showToast(newStatus === 'DONE' ? 'Task marked as DONE (100%)' : `Status updated to ${newStatus}`);
      fetchStats();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
      fetchStats();
    }
  };

  const handleQuickPriorityChange = async (taskId: string, newPriority: TaskPriority) => {
    setStats((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        urgentTasks: prev.urgentTasks.map((t) =>
          t.id === taskId ? { ...t, priority: newPriority } : t
        ),
      };
    });

    try {
      await api.updateTask(taskId, {
        priority: newPriority,
        userId: currentUser?.id,
      });
      showToast(`Priority updated to ${newPriority}`);
      fetchStats();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
      fetchStats();
    }
  };

  const handleQuickProgressChange = async (taskId: string, newProgress: number) => {
    const autoStatus = newProgress === 100 ? 'DONE' : undefined;
    setStats((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        urgentTasks: prev.urgentTasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                progress: newProgress,
                status: (autoStatus as TaskStatus) || t.status,
              }
            : t
        ),
      };
    });

    try {
      await api.updateTask(taskId, {
        progress: newProgress,
        status: autoStatus as TaskStatus | undefined,
        userId: currentUser?.id,
      });
      fetchStats();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
      fetchStats();
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const target = stats?.urgentTasks?.find((t) => t.id === taskId);
    if (target) {
      setTaskToDelete(target);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      setIsDeletingTask(true);
      await api.deleteTask(taskToDelete.id);
      showToast(`Task permanently deleted from task list: "${taskToDelete.title}"`);
      setDashboardSelectedTaskIds((prev) => prev.filter((id) => id !== taskToDelete.id));
      setTaskToDelete(null);
      await fetchStats();
      await refreshData();
    } catch (err: any) {
      showToast(`Failed to delete task: ${err.message}`);
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleSortToggle = (field: string) => {
    setDashboardSort((prev) => {
      if (prev?.startsWith(field)) {
        return 'created_desc';
      }
      return `${field}_asc`;
    });
  };

  const handleResetFilters = () => {
    setDashboardSearchQuery('');
    setDashboardPriorityFilter('ALL');
    setDashboardStatusFilter('ALL');
    setDashboardCategoryFilter('ALL');
    setDashboardDeadlineFilter('all');
    setDashboardForecastFilter('all');
    setDashboardProgressFilter('ALL');
    setDashboardSort('created_desc');
    setFilterProjectId(null);
    setFilterPackageId(null);
    setFilterTagId(null);
  };

  const displayUrgentTasks = useMemo(() => {
    if (!stats?.urgentTasks) return [];
    let list = [...stats.urgentTasks];

    // Search query
    if (dashboardSearchQuery.trim()) {
      const q = dashboardSearchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.project_name && t.project_name.toLowerCase().includes(q)) ||
          (t.project_code && t.project_code.toLowerCase().includes(q)) ||
          (t.package_name && t.package_name.toLowerCase().includes(q)) ||
          (t.package_code && t.package_code.toLowerCase().includes(q))
      );
    }

    // Priority filter
    if (dashboardPriorityFilter !== 'ALL') {
      list = list.filter((t) => t.priority === dashboardPriorityFilter);
    }

    // Status filter
    if (dashboardStatusFilter !== 'ALL') {
      if (dashboardStatusFilter === 'OPEN') {
        list = list.filter((t) => ['TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD'].includes(t.status));
      } else {
        list = list.filter((t) => t.status === dashboardStatusFilter);
      }
    }

    // Category filter
    if (dashboardCategoryFilter !== 'ALL') {
      list = list.filter((t) => t.category_id === dashboardCategoryFilter);
    }

    // Project filter
    if (filterProjectId) {
      list = list.filter((t) => t.project_id === filterProjectId || t.effective_project_id === filterProjectId);
    }

    // Package filter
    if (filterPackageId) {
      if (filterPackageId === 'GENERAL' || filterPackageId === 'NONE') {
        list = list.filter((t) => !t.package_id);
      } else {
        list = list.filter((t) => t.package_id === filterPackageId);
      }
    }

    // Tag filter
    if (filterTagId) {
      list = list.filter((t) => t.tags && t.tags.some((tg) => tg.id === filterTagId));
    }

    // Progress filter
    if (dashboardProgressFilter !== 'ALL') {
      if (dashboardProgressFilter === '0') list = list.filter((t) => (t.progress || 0) === 0);
      else if (dashboardProgressFilter === 'ACTIVE') list = list.filter((t) => (t.progress || 0) > 0 && (t.progress || 0) < 100);
      else if (dashboardProgressFilter === '100') list = list.filter((t) => (t.progress || 0) === 100);
    }

    // Deadline filter
    if (dashboardDeadlineFilter && dashboardDeadlineFilter !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = tomorrowDate.toISOString().split('T')[0];
      const in7DaysDate = new Date();
      in7DaysDate.setDate(in7DaysDate.getDate() + 7);
      const in7Days = in7DaysDate.toISOString().split('T')[0];

      if (dashboardDeadlineFilter === 'overdue') {
        list = list.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.deadline && t.deadline < today);
      } else if (dashboardDeadlineFilter === 'today') {
        list = list.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.deadline === today);
      } else if (dashboardDeadlineFilter === 'tomorrow') {
        list = list.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.deadline === tomorrow);
      } else if (dashboardDeadlineFilter === 'this_week') {
        list = list.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.deadline && t.deadline >= today && t.deadline <= in7Days);
      } else if (dashboardDeadlineFilter === 'upcoming') {
        list = list.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.deadline && t.deadline > today);
      } else if (dashboardDeadlineFilter === 'done') {
        list = list.filter((t) => t.status === 'DONE');
      }
    }

    // Forecast filter
    if (dashboardForecastFilter && dashboardForecastFilter !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = tomorrowDate.toISOString().split('T')[0];
      const in7DaysDate = new Date();
      in7DaysDate.setDate(in7DaysDate.getDate() + 7);
      const in7Days = in7DaysDate.toISOString().split('T')[0];

      if (dashboardForecastFilter === 'overdue' || dashboardForecastFilter === 'late') {
        list = list.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && (
          (t.deadline && t.forecast_finish && t.forecast_finish > t.deadline) ||
          (t.forecast_finish && t.forecast_finish < today)
        ));
      } else if (dashboardForecastFilter === 'today') {
        list = list.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.forecast_finish === today);
      } else if (dashboardForecastFilter === 'tomorrow') {
        list = list.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.forecast_finish === tomorrow);
      } else if (dashboardForecastFilter === 'this_week') {
        list = list.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.forecast_finish && t.forecast_finish >= today && t.forecast_finish <= in7Days);
      } else if (dashboardForecastFilter === 'upcoming') {
        list = list.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.forecast_finish && t.forecast_finish > today);
      } else if (dashboardForecastFilter === 'done') {
        list = list.filter((t) => t.status === 'DONE');
      }
    }

    // Sort order (default: created_desc)
    list.sort((a, b) => {
      if (dashboardSort === 'created_desc') return (b.created_at || '').localeCompare(a.created_at || '');
      if (dashboardSort === 'created_asc') return (a.created_at || '').localeCompare(b.created_at || '');
      if (dashboardSort === 'priority' || dashboardSort === 'priority_asc') {
        const pOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      if (dashboardSort === 'priority_desc') {
        const pOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (pOrder[a.priority] || 0) - (pOrder[b.priority] || 0);
      }
      if (dashboardSort === 'status' || dashboardSort === 'status_asc') return a.status.localeCompare(b.status);
      if (dashboardSort === 'status_desc') return b.status.localeCompare(a.status);
      if (dashboardSort === 'title' || dashboardSort === 'title_asc') return a.title.localeCompare(b.title);
      if (dashboardSort === 'title_desc') return b.title.localeCompare(a.title);
      if (dashboardSort === 'progress' || dashboardSort === 'progress_asc') return (a.progress || 0) - (b.progress || 0);
      if (dashboardSort === 'progress_desc') return (b.progress || 0) - (a.progress || 0);
      if (dashboardSort === 'deadline' || dashboardSort === 'deadline_asc') return (a.deadline || '').localeCompare(b.deadline || '');
      if (dashboardSort === 'deadline_desc') return (b.deadline || '').localeCompare(a.deadline || '');
      if (dashboardSort === 'forecast' || dashboardSort === 'forecast_asc') return (a.forecast_finish || '').localeCompare(b.forecast_finish || '');
      if (dashboardSort === 'forecast_desc') return (b.forecast_finish || '').localeCompare(a.forecast_finish || '');
      if (dashboardSort === 'package' || dashboardSort === 'package_asc') return (a.package_code || '').localeCompare(b.package_code || '');
      if (dashboardSort === 'package_desc') return (b.package_code || '').localeCompare(a.package_code || '');
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    return list;
  }, [
    stats?.urgentTasks,
    dashboardSearchQuery,
    dashboardPriorityFilter,
    dashboardStatusFilter,
    dashboardCategoryFilter,
    dashboardDeadlineFilter,
    dashboardForecastFilter,
    dashboardProgressFilter,
    filterProjectId,
    filterPackageId,
    filterTagId,
    dashboardSort,
  ]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats({
        projectId: filterProjectId || undefined,
      });
      setStats(data);
    } catch (err: any) {
      showToast(`Error loading dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [filterProjectId, dataVersion]);

  if (loading && !stats) {
    return (
      <div className="flex-1 bg-slate-50 p-6 flex items-center justify-center text-xs text-slate-500">
        Loading engineering dashboard metrics...
      </div>
    );
  }

  const kpis = stats?.kpis || {
    total: 0,
    done: 0,
    in_progress: 0,
    waiting: 0,
    overdue: 0,
    critical: 0,
    avg_progress: 0,
  };
  const completionRate = kpis.total > 0 ? Math.round((kpis.done / kpis.total) * 100) : 0;

  // Project breakdown list with guaranteed packages array
  const displayProjects = (stats?.projectBreakdown || []).map((proj) => {
    const pkgs =
      proj.packages && proj.packages.length > 0
        ? proj.packages
        : (stats?.packageBreakdown || []).filter((p) =>
            proj.id === 'UNASSIGNED'
              ? !p.project_id || p.project_id === 'UNASSIGNED'
              : p.project_id === proj.id
          );
    return {
      ...proj,
      packages: pkgs,
    };
  });

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-1 overflow-y-auto space-y-2 transition-colors">
      {/* 1. Executive Master Header Ribbon (Inspired by Executive Dashboards) */}
      <div
        className={`shrink-0 min-h-[62px] sm:h-[62px] ${getHeaderBoxClasses(workspaceBranding)} rounded-xl px-3.5 py-2 sm:px-4 sm:py-2 text-white flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition-all`}
        style={getHeaderBoxStyle(workspaceBranding)}
      >
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 shrink-0">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-tight text-white uppercase">
                  ENGINEERING EXECUTIVE OVERVIEW
                </h1>
              </div>
              <p className="text-xs text-sky-100/90">
                Real-time multi-project monitoring of EPC deliverables, procurement packages, and milestones.
              </p>
            </div>
          </div>
        </div>

        {/* Global Filter Toolbar & Quick Refresh */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          {/* Project Selector */}
          <div className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-xs border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white transition-colors">
            <FolderGit2 className="w-3.5 h-3.5 text-sky-200" />
            <label className="text-[10px] font-bold text-sky-200 uppercase">PROJECT:</label>
            <select
              value={filterProjectId || ''}
              onChange={(e) => setFilterProjectId(e.target.value || null)}
              className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer max-w-[170px] truncate"
            >
              <option value="" className="text-slate-900 bg-white">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="text-slate-900 bg-white">
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {filterProjectId && (
            <button
              onClick={() => setFilterProjectId(null)}
              className="text-[11px] text-white/90 hover:text-white px-2 py-1 bg-white/15 hover:bg-white/25 rounded-lg font-medium transition-colors cursor-pointer border border-white/20"
            >
              Reset
            </button>
          )}

          <button
            onClick={() => fetchStats()}
            disabled={loading}
            title="Refresh dashboard metrics"
            className="p-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 rounded-lg text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Vibrant Visual KPI Metric Cards Grid (Color-Coded for Immediate Visual Focus) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* TOTAL TASKS (Soft Sky Blue) */}
        <div className="bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                TOTAL TASKS
              </span>
              <ListTodo className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-sky-900 dark:text-sky-100 mt-1">
              {kpis.total}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-sky-100 dark:border-sky-900/60">
            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/50 px-1.5 py-0.5 rounded">
              <span>All Scopes</span>
            </span>
          </div>
        </div>

        {/* IN PROGRESS (Corporate Royal Blue - Matching Excel Dashboard) */}
        <div className="bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                IN PROGRESS
              </span>
              <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-blue-950 dark:text-blue-100 mt-1">
              {kpis.in_progress}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-100 dark:border-blue-900/60">
            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Active Work</span>
            </span>
          </div>
        </div>

        {/* WAITING / ON HOLD (Warm Amber / Pending - Matching Excel Dashboard) */}
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                WAITING / HOLD
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-100 mt-1">
              {kpis.waiting}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-amber-100 dark:border-amber-900/60">
            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
              <span>Client / Review</span>
            </span>
          </div>
        </div>

        {/* OVERDUE & HIGH RISK (Vibrant Crimson Red - Eye-Catching Visual Focus) */}
        <div
          className={`rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
            kpis.overdue > 0
              ? 'bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-700 ring-2 ring-rose-300/30'
              : 'bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                OVERDUE
              </span>
              <Flame className={`w-3.5 h-3.5 text-rose-600 ${kpis.overdue > 0 ? 'animate-pulse' : ''}`} />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {kpis.overdue}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-rose-100 dark:border-rose-900/60">
            {kpis.overdue > 0 ? (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-white bg-rose-600 px-1.5 py-0.5 rounded shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                <span>Requires Action</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">
                <span>✓ On Schedule</span>
              </span>
            )}
          </div>
        </div>

        {/* COMPLETED (Soft Emerald Green) */}
        <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                COMPLETED
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
              {kpis.done}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/60">
            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">
              <TrendingUp className="w-2.5 h-2.5" />
              <span>{completionRate}% Rate</span>
            </span>
          </div>
        </div>

        {/* AVG PROGRESS (Corporate Slate & Deep Navy) */}
        <div className="bg-slate-50/90 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                AVG PROGRESS
              </span>
              <Zap className="w-3.5 h-3.5 text-[#0b3b70] dark:text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {Math.round(kpis.avg_progress || 0)}%
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0b3b70] dark:bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round(kpis.avg_progress || 0))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-0.5">
              <span>{kpis.done}/{kpis.total} Done</span>
              <span>{kpis.in_progress} Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: PROCUREMENT PACKAGES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md bg-[#0b3b70] dark:bg-blue-900 text-white font-mono text-xs font-bold shadow-2xs">01</span>
              <Box className="w-4 h-4 text-[#0b3b70] dark:text-sky-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Procurement Packages
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#0b3b70] dark:text-sky-300 font-semibold border border-blue-200 dark:border-blue-800">
                1 Chart Per Project
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dedicated package breakdown charts showing open tasks, overdue items, and completion progress for each EPC project.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Project Chart Filter Tabs */}
            <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center text-xs">
              <button
                type="button"
                onClick={() => setSelectedProjectChartTab('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  selectedProjectChartTab === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All Projects ({displayProjects.length})
              </button>
              {displayProjects.map((proj) => (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => setSelectedProjectChartTab(proj.id)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    selectedProjectChartTab === proj.id
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {proj.code}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveView('packages')}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-0.5 font-medium ml-1"
            >
              <span>Manage Packages</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* PROJECT CHARTS RENDERING */}
        {displayProjects.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No projects available for the current filter.
          </div>
        ) : selectedProjectChartTab === 'ALL' ? (
          /* Grid of Charts: 1 Dedicated Chart per Project */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {displayProjects.map((proj) => {
              const projPkgs = proj.packages || [];
              const projProgress = Math.round(proj.progress || 0);

              return (
                <div
                  key={proj.id}
                  className="bg-slate-50/50 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:bg-white dark:hover:bg-slate-850 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs transition-all"
                >
                  {/* Card Header: Project info & Progress */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded shrink-0">
                          {proj.code}
                        </span>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate" title={proj.name}>
                          {proj.name}
                        </h3>
                      </div>
                      {proj.client && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {proj.client}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar & Summary Stats */}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">{projPkgs.length} Procurement Packages</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{projProgress}% Complete</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all"
                          style={{ width: `${projProgress}%` }}
                        />
                      </div>

                      {/* Quick metrics pills */}
                      <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px] pt-1">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded py-0.5">
                          <span className="text-slate-400 block text-[9px]">TOTAL</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{proj.total}</span>
                        </div>
                        <div className="bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 rounded py-0.5">
                          <span className="text-sky-600 dark:text-sky-400 block text-[9px]">OPEN</span>
                          <span className="font-bold">{proj.open}</span>
                        </div>
                        <div
                          className={`rounded py-0.5 border ${
                            (proj.overdue || 0) > 0
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          <span className="block text-[9px]">OVERDUE</span>
                          <span>{proj.overdue || 0}</span>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded py-0.5">
                          <span className="text-emerald-600 dark:text-emerald-400 block text-[9px]">DONE</span>
                          <span className="font-bold">{proj.done}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Package Bar Chart */}
                    <div className="h-56 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-2">
                      {projPkgs.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={projPkgs}
                            margin={{ top: 15, right: 10, left: -20, bottom: 25 }}
                          >
                            <XAxis
                              dataKey="code"
                              tick={{ fontSize: 9, fill: '#64748b' }}
                              angle={-25}
                              textAnchor="end"
                              interval={0}
                            />
                            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} allowDecimals={false} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-lg border border-slate-700 text-xs space-y-1 max-w-[200px]">
                                      <div className="font-mono font-bold text-blue-300">
                                        {data.code}
                                      </div>
                                      <div className="font-semibold text-slate-100 truncate">
                                        {data.name}
                                      </div>
                                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 border-t border-slate-800 text-[10px]">
                                        <div>Total: <b className="text-white">{data.total}</b></div>
                                        <div>Done: <b className="text-emerald-400">{data.done}</b></div>
                                        <div>Open: <b className="text-blue-400">{data.open}</b></div>
                                        <div>Overdue: <b className="text-rose-400">{data.overdue || 0}</b></div>
                                      </div>
                                      <div className="text-[10px] text-amber-300 font-bold pt-0.5">
                                        Progress: {Math.round(data.progress || 0)}%
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="open" name="Open" fill="#2563eb" radius={[2, 2, 0, 0]}>
                              <LabelList
                                dataKey="open"
                                position="top"
                                fill="#2563eb"
                                fontSize={9}
                                fontWeight="bold"
                                formatter={(val: number) => (val > 0 ? String(val) : '')}
                              />
                            </Bar>
                            <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[2, 2, 0, 0]}>
                              <LabelList
                                dataKey="overdue"
                                position="top"
                                fill="#ef4444"
                                fontSize={9}
                                fontWeight="bold"
                                formatter={(val: number) => (val > 0 ? String(val) : '')}
                              />
                            </Bar>
                            <Bar dataKey="done" name="Done" fill="#10b981" radius={[2, 2, 0, 0]}>
                              <LabelList
                                dataKey="done"
                                position="top"
                                fill="#10b981"
                                fontSize={9}
                                fontWeight="bold"
                                formatter={(val: number) => (val > 0 ? String(val) : '')}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400">
                          No packages under this project.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Quick filter jump */}
                  <div className="pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Scope: {proj.code}
                    </span>
                    <button
                      onClick={() => {
                        if (proj.id !== 'UNASSIGNED') {
                          setFilterProjectId(proj.id);
                        } else {
                          setFilterProjectId(null);
                        }
                        setFilterPackageId(null);
                        setActiveView('tasks');
                      }}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <span>View {proj.code} Tasks</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Focused Single Project View */
          (() => {
            const focusedProj = displayProjects.find((p) => p.id === selectedProjectChartTab);
            if (!focusedProj) return null;
            const projPkgs = focusedProj.packages || [];
            const projProgress = Math.round(focusedProj.progress || 0);

            return (
              <div className="space-y-4">
                {/* Single Project Header Card */}
                <div className="bg-slate-50/70 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-300 px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded">
                        {focusedProj.code}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{focusedProj.name}</h3>
                      {focusedProj.client && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{focusedProj.client}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 mt-2">
                      <div className="w-48 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                          style={{ width: `${projProgress}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{projProgress}% Complete</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">• {projPkgs.length} Procurement Packages</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (focusedProj.id !== 'UNASSIGNED') {
                          setFilterProjectId(focusedProj.id);
                        }
                        setFilterPackageId(null);
                        setActiveView('tasks');
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <span>Open {focusedProj.code} Task Board</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Single Project Bar Chart */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="h-72">
                    {projPkgs.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={projPkgs}
                          margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
                        >
                          <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#64748b' }} angle={-15} textAnchor="end" />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg border border-slate-700 text-xs space-y-1.5 max-w-xs">
                                    <div className="font-mono font-bold text-blue-300">{data.code}</div>
                                    <div className="font-bold text-slate-100">{data.name}</div>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1.5 border-t border-slate-800 text-[11px]">
                                      <div>Total Deliverables: <b className="text-white">{data.total}</b></div>
                                      <div>Completed: <b className="text-emerald-400">{data.done}</b></div>
                                      <div>Open / In Prog: <b className="text-blue-400">{data.open}</b></div>
                                      <div>Overdue: <b className="text-rose-400">{data.overdue || 0}</b></div>
                                    </div>
                                    <div className="text-[11px] text-amber-300 font-bold pt-1">
                                      Completion: {Math.round(data.progress || 0)}%
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                          <Bar dataKey="open" name="Open Tasks" fill="#2563eb" radius={[2, 2, 0, 0]}>
                            <LabelList
                              dataKey="open"
                              position="top"
                              fill="#2563eb"
                              fontSize={10}
                              fontWeight="bold"
                              formatter={(val: number) => (val > 0 ? String(val) : '')}
                            />
                          </Bar>
                          <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[2, 2, 0, 0]}>
                            <LabelList
                              dataKey="overdue"
                              position="top"
                              fill="#ef4444"
                              fontSize={10}
                              fontWeight="bold"
                              formatter={(val: number) => (val > 0 ? String(val) : '')}
                            />
                          </Bar>
                          <Bar dataKey="done" name="Completed" fill="#10b981" radius={[2, 2, 0, 0]}>
                            <LabelList
                              dataKey="done"
                              position="top"
                              fill="#10b981"
                              fontSize={10}
                              fontWeight="bold"
                              formatter={(val: number) => (val > 0 ? String(val) : '')}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No packages configured under this project.
                      </div>
                    )}
                  </div>
                </div>

                {/* Package Cards List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {projPkgs.map((pkg) => {
                    const pkgProg = Math.round(pkg.progress || 0);
                    return (
                      <div
                        key={pkg.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-mono text-[10px] font-bold text-blue-700 dark:text-blue-300 px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded">
                              {pkg.code}
                            </span>
                            <button
                              onClick={() => {
                                if (focusedProj.id !== 'UNASSIGNED') {
                                  setFilterProjectId(focusedProj.id);
                                }
                                if (pkg.id !== 'GENERAL') {
                                  setFilterPackageId(pkg.id);
                                }
                                setActiveView('tasks');
                              }}
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-0.5 font-medium cursor-pointer"
                            >
                              <span>Tasks</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate" title={pkg.name}>
                            {pkg.name}
                          </h4>
                          <div className="flex items-center space-x-2 mt-2">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                                style={{ width: `${pkgProg}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">{pkgProg}%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px] pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="bg-slate-50 dark:bg-slate-800 py-0.5 rounded">
                            <div className="text-slate-400 text-[9px]">TOTAL</div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{pkg.total}</div>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-950/60 py-0.5 rounded text-blue-800 dark:text-blue-300">
                            <div className="text-blue-600 dark:text-blue-400 text-[9px]">OPEN</div>
                            <div className="font-bold">{pkg.open}</div>
                          </div>
                          <div
                            className={`py-0.5 rounded ${
                              (pkg.overdue || 0) > 0
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="text-[9px]">O/DUE</div>
                            <div>{pkg.overdue || 0}</div>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-950/60 py-0.5 rounded text-emerald-800 dark:text-emerald-300">
                            <div className="text-emerald-600 dark:text-emerald-400 text-[9px]">DONE</div>
                            <div className="font-bold">{pkg.done}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Secondary Analytics Row: Deadline Distribution + Priority & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Chart: Deadline Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md bg-[#0b3b70] dark:bg-blue-900 text-white font-mono text-xs font-bold shadow-2xs">02</span>
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Deadline Distribution</span>
            </h3>
          </div>

          <div className="h-64">
            {stats?.deadlineBuckets && stats.deadlineBuckets.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.deadlineBuckets}
                  layout="vertical"
                  margin={{ top: 5, right: 35, left: 25, bottom: 5 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis dataKey="bucket" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={75} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', fontSize: '11px', borderRadius: '8px', border: '1px solid #334155' }} />
                  <Bar dataKey="count" name="Tasks" radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="count"
                      position="right"
                      fill="#64748b"
                      fontSize={10}
                      fontWeight="bold"
                      formatter={(val: number) => (val > 0 ? String(val) : '')}
                    />
                    {stats.deadlineBuckets.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No deadline records.
              </div>
            )}
          </div>
        </div>

        {/* Priority & Status Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4 transition-colors">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center space-x-1.5">
            <TrendingUp className="w-4 h-4 text-[#0b3b70] dark:text-sky-400" />
            <span>Priority & Status Breakdown</span>
          </h3>

          {/* Priority breakdown bar */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tasks by Priority</div>
            <div className="space-y-1.5">
              {stats?.priorityBreakdown?.map((p) => {
                const pct = kpis.total > 0 ? Math.round((p.count / kpis.total) * 100) : 0;
                return (
                  <div key={p.name} className="text-xs">
                    <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 mb-0.5">
                      <span className="font-semibold flex items-center space-x-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: PRIORITY_COLORS[p.name] || '#94a3b8' }}
                        />
                        <span>{p.name}</span>
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {p.count} tasks ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PRIORITY_COLORS[p.name] || '#94a3b8',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Breakdown Chips */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tasks by Status</div>
            <div className="grid grid-cols-2 gap-2">
              {stats?.statusBreakdown?.map((s) => (
                <div
                  key={s.name}
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50"
                >
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{s.name}</span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row: Critical Focus Items */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-[#0b3b70] dark:bg-blue-900 text-white font-mono text-xs font-bold shadow-2xs">03</span>
            <Flame className="w-4 h-4 text-rose-600 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Critical Focus Items ({stats?.urgentTasks?.length || 0})
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              (Single-click to select, double-click to open)
            </span>
          </div>
          <button
            onClick={() => setActiveView('tasks')}
            className="text-[11px] text-[#0b3b70] dark:text-sky-400 hover:underline flex items-center space-x-0.5 font-semibold cursor-pointer"
          >
            <span>View All Tasks</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Task List Table (Same unified component as Task List view) */}
        <div className="min-h-[260px] max-h-[480px] flex flex-col">
          <TaskListTable
            tasks={displayUrgentTasks}
            selectedTaskIds={dashboardSelectedTaskIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onQuickStatusChange={handleQuickStatusChange}
            onQuickPriorityChange={handleQuickPriorityChange}
            onQuickProgressChange={handleQuickProgressChange}
            onDeleteTask={handleDeleteTask}
            onSortChange={handleSortToggle}
            currentSort={dashboardSort}
            searchQuery={dashboardSearchQuery}
            onSearchQueryChange={setDashboardSearchQuery}
            priorityFilter={dashboardPriorityFilter}
            onPriorityFilterChange={setDashboardPriorityFilter}
            statusFilter={dashboardStatusFilter}
            onStatusFilterChange={setDashboardStatusFilter}
            categoryFilter={dashboardCategoryFilter}
            onCategoryFilterChange={setDashboardCategoryFilter}
            deadlineFilter={dashboardDeadlineFilter}
            onDeadlineFilterChange={setDashboardDeadlineFilter}
            forecastFilter={dashboardForecastFilter}
            onForecastFilterChange={setDashboardForecastFilter}
            progressFilter={dashboardProgressFilter}
            onProgressFilterChange={setDashboardProgressFilter}
            onResetColumnFilters={handleResetFilters}
            emptyMessage="No critical focus items pending. Great work!"
          />
        </div>
      </div>

      {/* Recent Engineering Activity Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-md bg-[#0b3b70] dark:bg-blue-900 text-white font-mono text-xs font-bold shadow-2xs">04</span>
            <History className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Recent Work Activity History</span>
          </h3>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            Double-click any item to open details
          </span>
        </div>

        {(() => {
          const sortedActivities = [...(stats?.recentActivities || [])].sort((a, b) =>
            (b.created_at || '').localeCompare(a.created_at || '')
          );

          if (sortedActivities.length === 0) {
            return (
              <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                No recent activity recorded yet.
              </div>
            );
          }

          return (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/40 dark:bg-slate-950/20 max-h-[380px] overflow-y-auto">
              {sortedActivities.map((act) => (
                <div
                  key={act.id}
                  onDoubleClick={() => setSelectedTaskId(act.task_id)}
                  title="Double-click to open task details"
                  className="px-3.5 py-2.5 hover:bg-blue-50/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 select-none"
                >
                  <div className="min-w-0 flex-1 flex items-start space-x-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0 group-hover:scale-125 transition-transform" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-[#0b3b70] dark:text-[#93c5fd] group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors line-clamp-1">
                        {act.task_title}
                      </div>
                      <div className="text-[11.5px] text-slate-600 dark:text-slate-400 mt-0.5 break-words">
                        {act.note || act.activity_type}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-center">
                    <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded shadow-2xs">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatActivityTimestamp(act.created_at)}</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTaskId(act.task_id);
                      }}
                      className="text-[11px] px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium transition-colors cursor-pointer opacity-90 group-hover:opacity-100"
                      title="Open task details"
                    >
                      Open details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Delete Task Confirmation Modal */}
      {taskToDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isDeletingTask) setTaskToDelete(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Delete Task
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200 break-words">
                    "{taskToDelete.title}"
                  </span>
                  ? This will permanently delete the task from the task list and system database. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeletingTask}
                onClick={() => setTaskToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingTask}
                onClick={handleConfirmDeleteTask}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-650 dark:hover:bg-rose-600 flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isDeletingTask ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Task</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
