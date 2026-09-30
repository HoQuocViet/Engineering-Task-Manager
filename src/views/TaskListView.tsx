import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Task, TaskPriority, TaskStatus } from '../types';
import { api } from '../lib/api';
import { TaskListTable } from '../components/tasks/TaskListTable';
import { BatchActionBar } from '../components/tasks/BatchActionBar';
import { exportTasksToExcel } from '../lib/excelExport';
import { PrintPreviewModal } from '../components/tasks/PrintPreviewModal';
import { getHeaderBoxClasses, getHeaderBoxStyle } from '../lib/headerTheme';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Download,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Box,
  Layers,
  FolderGit2,
  Tag,
  Check,
  Calendar,
  Clock,
  Flame,
  Activity,
  Hourglass,
  Trash2,
  Loader2,
  ListTodo,
} from 'lucide-react';

export const TaskListView: React.FC = () => {
  const {
    openNewTaskModal,
    projects,
    packages,
    categories,
    tags,
    users,
    filterProjectId,
    setFilterProjectId,
    filterPackageId,
    setFilterPackageId,
    filterTagId,
    setFilterTagId,
    globalSearch,
    currentUser,
    workspaceBranding,
    showToast,
    dataVersion,
    refreshData,
  } = useApp();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryIdFilter] = useState('ALL');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('all');
  const [forecastFilter, setForecastFilter] = useState<string>('all');
  const [progressFilter, setProgressFilter] = useState('ALL');
  const [sortField, setSortField] = useState('created_desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Batch selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Task deletion confirmation state
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTasks({
        search: searchQuery || globalSearch,
        status: statusFilter,
        priority: priorityFilter,
        projectId: filterProjectId || undefined,
        packageId: filterPackageId || undefined,
        categoryId: categoryFilter,
        tagId: filterTagId || undefined,
        deadlineFilter: deadlineFilter as any,
        forecastFilter: forecastFilter !== 'all' ? forecastFilter : undefined,
        progress: progressFilter !== 'ALL' ? progressFilter : undefined,
        sort: sortField,
        limit: 200,
      });
      setTasks(res.tasks);
      setTotal(res.total);
    } catch (err: any) {
      showToast(`Error fetching task table: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    globalSearch,
    statusFilter,
    priorityFilter,
    filterProjectId,
    filterPackageId,
    categoryFilter,
    filterTagId,
    deadlineFilter,
    forecastFilter,
    progressFilter,
    sortField,
    dataVersion,
    showToast,
  ]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleSelect = (id: string) => {
    if (selectedTaskIds.includes(id)) {
      setSelectedTaskIds(selectedTaskIds.filter((tId) => tId !== id));
    } else {
      setSelectedTaskIds([...selectedTaskIds, id]);
    }
  };

  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedTaskIds(tasks.map((t) => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const newProgress = newStatus === 'DONE' ? 100 : undefined;
    
    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              progress: newProgress !== undefined ? newProgress : t.progress,
              completed_date: newStatus === 'DONE' ? new Date().toISOString().split('T')[0] : (t.status === 'DONE' ? null : t.completed_date),
            }
          : t
      )
    );

    try {
      await api.updateTask(taskId, {
        status: newStatus,
        progress: newProgress,
        userId: currentUser?.id,
      });
      showToast(newStatus === 'DONE' ? 'Task marked as DONE (100%)' : `Status updated to ${newStatus}`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
      fetchTasks();
    }
  };

  const handleQuickPriorityChange = async (taskId: string, newPriority: TaskPriority) => {
    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              priority: newPriority,
            }
          : t
      )
    );

    try {
      await api.updateTask(taskId, {
        priority: newPriority,
        userId: currentUser?.id,
      });
      showToast(`Priority updated to ${newPriority}`);
      refreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
      fetchTasks();
    }
  };

  const handleQuickProgressChange = async (taskId: string, newProgress: number) => {
    const currentTask = tasks.find((t) => t.id === taskId);
    let calculatedStatus: TaskStatus | undefined;
    if (newProgress === 100) {
      calculatedStatus = 'DONE';
    } else if (currentTask?.status === 'DONE' && newProgress < 100) {
      calculatedStatus = newProgress === 0 ? 'TODO' : 'IN PROGRESS';
    }

    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              progress: newProgress,
              status: calculatedStatus || t.status,
              completed_date: newProgress === 100 ? new Date().toISOString().split('T')[0] : (t.status === 'DONE' ? null : t.completed_date),
            }
          : t
      )
    );

    try {
      await api.updateTask(taskId, {
        progress: newProgress,
        status: calculatedStatus,
        userId: currentUser?.id,
      });
    } catch (err: any) {
      showToast(`Failed to update progress: ${err.message}`);
      fetchTasks();
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (target) {
      setTaskToDelete(target);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      setIsDeletingTask(true);
      await api.deleteTask(taskToDelete.id);
      showToast(`Task deleted: "${taskToDelete.title}"`);
      setTaskToDelete(null);
      fetchTasks();
      refreshData();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleSortToggle = (field: string) => {
    setSortField((prev) => {
      if (prev?.startsWith(field)) {
        return 'created_desc';
      }
      return `${field}_asc`;
    });
  };

  const resetAllFilters = () => {
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setFilterProjectId(null);
    setFilterPackageId(null);
    setCategoryIdFilter('ALL');
    setFilterTagId(null);
    setDeadlineFilter('all');
    setForecastFilter('all');
    setProgressFilter('ALL');
    setSortField('created_desc');
    setSearchQuery('');
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    filterProjectId !== null ||
    filterPackageId !== null ||
    categoryFilter !== 'ALL' ||
    filterTagId !== null ||
    deadlineFilter !== 'all' ||
    forecastFilter !== 'all' ||
    progressFilter !== 'ALL' ||
    searchQuery !== '';

  // Export to Excel handler
  const handleExportExcel = () => {
    if (tasks.length === 0) {
      showToast('No tasks to export with the current filters');
      return;
    }

    setIsExporting(true);
    try {
      const activeProj = projects.find((p) => p.id === filterProjectId);
      const activePkg = packages.find((p) => p.id === filterPackageId);
      
      exportTasksToExcel(tasks, {
        projectName: activeProj?.code || activeProj?.name,
        packageName: activePkg?.code || activePkg?.name,
      });

      showToast(`✅ Successfully exported ${tasks.length} tasks to Excel`);
    } catch (err: any) {
      showToast(`❌ Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Computed quick stats for the filter pills
  const totalFiltered = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN PROGRESS').length;
  const waitingCount = tasks.filter((t) => t.status === 'WAITING' || t.status === 'ON HOLD').length;
  const overdueCount = tasks.filter((t) => {
    if (t.status === 'DONE' || t.status === 'CANCELLED') return false;
    const d = t.forecast_finish || t.deadline;
    if (!d) return false;
    const dateObj = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dateObj < today;
  }).length;
  const doneCount = tasks.filter((t) => t.status === 'DONE').length;

  // Print handler
  const handlePrint = () => {
    if (tasks.length === 0) {
      showToast('No tasks to print');
      return;
    }
    setIsPrintModalOpen(true);
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-1 flex flex-col min-h-0 overflow-hidden space-y-1.5 transition-colors print:p-0 print:bg-white print:space-y-2">
      {/* Screen Header */}
      <div
        className={`no-print shrink-0 min-h-[62px] sm:h-[62px] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${getHeaderBoxClasses(workspaceBranding)} rounded-xl px-3.5 py-2 sm:px-4 sm:py-2 text-white transition-colors`}
        style={getHeaderBoxStyle(workspaceBranding)}
      >
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 shrink-0">
              <ListTodo className="w-4 h-4 text-sky-200" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
              ENGINEERING TASK LIST
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 backdrop-blur-xs text-sky-200 font-semibold border border-white/20">
              {total} Tasks
            </span>
          </div>
          <p className="text-xs text-sky-100/90 hidden sm:block">
            Full data table with sortable columns, procurement package filters, and batch status actions.
          </p>
        </div>

        {/* Action Controls: Export Excel, Print, New Task */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting || tasks.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Export currently filtered tasks to formatted Excel (.xlsx) file"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            disabled={tasks.length === 0}
            className="bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/25 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Print or save filtered task list to PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print List</span>
          </button>

          {/* New Task Button */}
          <button
            onClick={() => openNewTaskModal(filterPackageId || undefined)}
            className="bg-white hover:bg-sky-50 active:bg-sky-100 text-[#0b3b70] text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Executive Quick-KPI Metric Filter Strip (Color-aligned with Dashboard Palette) */}
      <div className="no-print shrink-0 grid grid-cols-2 sm:grid-cols-5 gap-2 select-none">
        {/* 1. Total Filter Card */}
        <button
          onClick={() => {
            setStatusFilter('ALL');
            setDeadlineFilter('all');
          }}
          className={`p-2 sm:p-2 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
            statusFilter === 'ALL' && deadlineFilter === 'all'
              ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0b3b70] dark:text-sky-400 flex items-center gap-1">
              <Box className="w-3 h-3" />
              <span>Total Tasks</span>
            </span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white block mt-0.5">
              {totalFiltered}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 font-semibold">ALL</span>
        </button>

        {/* 2. In Progress (Corporate Royal Blue) */}
        <button
          onClick={() => {
            setStatusFilter('IN PROGRESS');
            setDeadlineFilter('all');
          }}
          className={`p-2 sm:p-2 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
            statusFilter === 'IN PROGRESS'
              ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>In Progress</span>
            </span>
            <span className="text-sm font-bold font-mono text-blue-800 dark:text-blue-200 block mt-0.5">
              {inProgressCount}
            </span>
          </div>
          <span className="text-[10px] font-mono text-blue-600/70 font-semibold">ACTIVE</span>
        </button>

        {/* 3. Waiting / Review (Warm Amber) */}
        <button
          onClick={() => {
            setStatusFilter('WAITING');
            setDeadlineFilter('all');
          }}
          className={`p-2 sm:p-2 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
            statusFilter === 'WAITING'
              ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Hourglass className="w-3 h-3 text-amber-500" />
              <span>Waiting / Review</span>
            </span>
            <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-300 block mt-0.5">
              {waitingCount}
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-600/70 font-semibold">HOLD</span>
        </button>

        {/* 4. Overdue Critical Focus */}
        <button
          onClick={() => {
            setDeadlineFilter('overdue');
            setStatusFilter('ALL');
          }}
          className={`p-2 sm:p-2 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
            deadlineFilter === 'overdue'
              ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
              <Flame className={`w-3 h-3 text-rose-600 ${overdueCount > 0 ? 'animate-pulse' : ''}`} />
              <span>Overdue Items</span>
            </span>
            <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 block mt-0.5">
              {overdueCount}
            </span>
          </div>
          {overdueCount > 0 ? (
            <span className="text-[9px] font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded-full animate-bounce">
              ALERT
            </span>
          ) : (
            <span className="text-[10px] font-mono text-emerald-600 font-semibold">CLEAN</span>
          )}
        </button>

        {/* 5. Done Completed */}
        <button
          onClick={() => {
            setStatusFilter('DONE');
            setDeadlineFilter('all');
          }}
          className={`p-2 sm:p-2 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer col-span-2 sm:col-span-1 ${
            statusFilter === 'DONE'
              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Completed</span>
            </span>
            <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300 block mt-0.5">
              {doneCount}
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 font-semibold">DONE</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="no-print shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-xs transition-colors">
        {/* Search and Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scope, title, description..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:border-blue-600"
            />
          </div>

          {/* Quick Filter Buttons (Royal Blue Dominant) */}
          <div className="flex items-center space-x-1 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setDeadlineFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                deadlineFilter === 'all'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDeadlineFilter('today')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                deadlineFilter === 'today'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              Due Today
            </button>
            <button
              onClick={() => setDeadlineFilter('overdue')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                deadlineFilter === 'overdue'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              Overdue
            </button>
            <button
              onClick={() => setDeadlineFilter('this_week')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                deadlineFilter === 'this_week'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-100'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDeadlineFilter('done')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                deadlineFilter === 'done'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Component */}
      <div className="flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center text-xs text-slate-500 dark:text-slate-400 h-full flex items-center justify-center">
            Loading engineering tasks...
          </div>
        ) : (
          <TaskListTable
            tasks={tasks}
            selectedTaskIds={selectedTaskIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onQuickStatusChange={handleQuickStatusChange}
            onQuickPriorityChange={handleQuickPriorityChange}
            onQuickProgressChange={handleQuickProgressChange}
            onDeleteTask={handleDeleteTask}
            onSortChange={handleSortToggle}
            currentSort={sortField}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryIdFilter}
            deadlineFilter={deadlineFilter}
            onDeadlineFilterChange={setDeadlineFilter}
            forecastFilter={forecastFilter}
            onForecastFilterChange={setForecastFilter}
            progressFilter={progressFilter}
            onProgressFilterChange={setProgressFilter}
            onResetColumnFilters={resetAllFilters}
          />
        )}
      </div>

      {/* Floating Batch Operations Bar */}
      <BatchActionBar
        selectedTaskIds={selectedTaskIds}
        tasks={tasks}
        onClearSelection={() => setSelectedTaskIds([])}
        onUpdated={() => {
          fetchTasks();
          refreshData();
        }}
      />

      {/* Print Preview & Direct Print Modal */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        tasks={tasks}
        filterInfo={{
          projectName: projects.find((p) => p.id === filterProjectId)?.name,
          packageName: packages.find((p) => p.id === filterPackageId)?.name,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
          category: categories.find((c) => c.id === categoryFilter)?.name,
          searchQuery: searchQuery || undefined,
        }}
        workspaceBranding={workspaceBranding}
        projects={projects}
        packages={packages}
      />

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
                  ? This will permanently delete the task and its attachments. This action cannot be undone.
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
