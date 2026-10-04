import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskPriority, TaskStatus, INTERFACE_DISCIPLINES, DISCIPLINE_COLORS } from '../../types';
import { useApp } from '../../context/AppContext';
import { getDeadlineBadge, getScheduleVariance, formatDateDisplay, formatDateDdMmYyyy } from '../../lib/dateUtils';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  AlertCircle,
  ArrowUpDown,
  MoreVertical,
  Paperclip,
  MessageSquare,
  ChevronRight,
  Edit2,
  Trash2,
  Calendar,
  ExternalLink,
  Eye,
  RotateCcw,
  Filter,
  Link2,
  Search,
  Users,
  UserCheck,
  Plus,
  X,
} from 'lucide-react';

interface TaskListTableProps {
  tasks: Task[];
  selectedTaskIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (selectAll: boolean) => void;
  onQuickStatusChange: (id: string, status: TaskStatus) => void;
  onQuickPriorityChange?: (id: string, priority: TaskPriority) => void;
  onQuickProgressChange?: (id: string, progress: number) => void;
  onQuickPicsChange?: (id: string, pics: string[]) => void;
  onQuickDisciplineChange?: (id: string, discipline: string) => void;
  onDeleteTask?: (id: string) => void;
  onSortChange?: (field: string) => void;
  currentSort?: string;
  // Column header filters
  searchQuery?: string;
  onSearchQueryChange?: (val: string) => void;
  priorityFilter?: string;
  onPriorityFilterChange?: (val: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (val: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (val: string) => void;
  deadlineFilter?: string;
  onDeadlineFilterChange?: (val: string) => void;
  forecastFilter?: string;
  onForecastFilterChange?: (val: string) => void;
  progressFilter?: string;
  onProgressFilterChange?: (val: string) => void;
  picFilter?: string;
  onPicFilterChange?: (val: string) => void;
  interfaceFilter?: string;
  onInterfaceFilterChange?: (val: string) => void;
  onResetColumnFilters?: () => void;
  hideFilterRow?: boolean;
  emptyMessage?: string;
}

const InlinePicSelector: React.FC<{
  taskId: string;
  pics: string[];
  presetPics?: string[];
  onCommit: (taskId: string, pics: string[]) => void;
}> = ({ taskId, pics = [], onCommit }) => {
  const { pics: registeredPics, createPicInline } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(pics);
  const [customName, setCustomName] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelected(pics);
  }, [pics]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const togglePic = (name: string) => {
    const cleanName = name.replace(/\s*\((?:Tôi|Me)\)\s*$/i, '').trim().toLowerCase();
    const isCurrentlySelected = selected.some((s) => {
      if (s === name) return true;
      return s.replace(/\s*\((?:Tôi|Me)\)\s*$/i, '').trim().toLowerCase() === cleanName;
    });

    let next: string[];
    if (isCurrentlySelected) {
      next = selected.filter((s) => {
        if (s === name) return false;
        return s.replace(/\s*\((?:Tôi|Me)\)\s*$/i, '').trim().toLowerCase() !== cleanName;
      });
    } else {
      next = [...selected.filter((s) => s.replace(/\s*\((?:Tôi|Me)\)\s*$/i, '').trim().toLowerCase() !== cleanName), name];
    }
    setSelected(next);
    onCommit(taskId, next);
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const name = customName.trim();
    try {
      if (createPicInline) {
        await createPicInline(name, 'Project Team Member');
      }
    } catch (err) {
      console.error('Error creating PIC inline:', err);
    }
    const cleanName = name.replace(/\s*\((?:Tôi|Me)\)\s*$/i, '').trim().toLowerCase();
    if (!selected.some((s) => s.replace(/\s*\((?:Tôi|Me)\)\s*$/i, '').trim().toLowerCase() === cleanName)) {
      const next = [...selected, name];
      setSelected(next);
      onCommit(taskId, next);
    }
    setCustomName('');
  };

  const getInitials = (n: string) => {
    const clean = n.replace(/\s*\((?:Tôi|Me)\)\s*$/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Strictly driven by registered PICs from Settings (pics table in SQLite)
  const allAvailableList = React.useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(registeredPics)) {
      for (const p of registeredPics) {
        if (p.name && !list.includes(p.name)) {
          list.push(p.name);
        }
      }
    }
    // Preserve any custom PIC assigned to this task without duplicating registered members
    for (const p of pics) {
      if (!p) continue;
      const cleanP = p.replace(/\s*\((?:Tôi|Me)\)\s*$/i, '').trim().toLowerCase();
      const alreadyCovered = list.some(
        (existing) =>
          existing.toLowerCase() === p.toLowerCase() ||
          existing.replace(/\s*\((?:Tôi|Me)\)\s*$/i, '').trim().toLowerCase() === cleanP
      );
      if (!alreadyCovered) {
        list.push(p);
      }
    }
    return list;
  }, [registeredPics, pics]);

  return (
    <div className="relative inline-block text-left" ref={popoverRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={selected.length > 0 ? `PIC: ${selected.join(', ')} (Click to edit)` : 'No PIC assigned (Click to add)'}
        className="flex items-center justify-start p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
      >
        {selected.length === 0 ? (
          <span
            title="No PIC assigned (Click to add)"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold font-mono border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            +
          </span>
        ) : (
          <div className="flex items-center -space-x-1.5 overflow-hidden py-0.5 justify-start">
            {selected.slice(0, 3).map((picName) => {
              const picRecord = registeredPics?.find((m) => m.name.toLowerCase() === picName.toLowerCase());
              const isMe = picName.includes('Me') || picName.includes('Tôi') || picName.includes('Ho Quoc Viet');
              if (picRecord?.avatar) {
                return (
                  <img
                    key={picName}
                    src={picRecord.avatar}
                    alt={picName}
                    className="w-5 h-5 rounded-full object-cover ring-1.5 ring-white dark:ring-slate-900 shadow-2xs shrink-0"
                    title={`${picName}${picRecord.role ? ` (${picRecord.role})` : ''}`}
                  />
                );
              }
              return (
                <span
                  key={picName}
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[8.5px] font-bold ring-1.5 ring-white dark:ring-slate-900 shadow-2xs font-mono shrink-0 ${
                    isMe
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                  title={`${picName}${picRecord?.role ? ` (${picRecord.role})` : ''}`}
                >
                  {getInitials(picName)}
                </span>
              );
            })}
            {selected.length > 3 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1.5 ring-white dark:ring-slate-900 font-mono shrink-0">
                +{selected.length - 3}
              </span>
            )}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-72 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2.5 space-y-2 text-xs animate-in fade-in duration-100">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-[11px] text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Person In Charge</span>
            </span>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono font-semibold">
              {selected.length} / {allAvailableList.length} assigned
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1 scrollbar-crystal-dark">
            {allAvailableList.map((p) => {
              const cleanP = p.replace(/\s*\((?:Tôi|Me)\)\s*$/i, '').trim().toLowerCase();
              const isChecked = selected.some((s) => {
                if (s === p) return true;
                return s.replace(/\s*\((?:Tôi|Me)\)\s*$/i, '').trim().toLowerCase() === cleanP;
              });
              const picRecord = registeredPics?.find((m) => m.name.toLowerCase() === p.toLowerCase());
              const isMe = p.includes('Me') || p.includes('Tôi') || p.includes('Ho Quoc Viet');
              return (
                <label
                  key={p}
                  className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors text-xs select-none ${
                    isChecked
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePic(p)}
                      className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />
                    {picRecord?.avatar ? (
                      <img src={picRecord.avatar} alt={p} className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                    ) : (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold font-mono shrink-0 ${
                        isMe ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        {getInitials(p)}
                      </span>
                    )}
                    <div className="truncate">
                      <div className="truncate leading-tight">{p}</div>
                      {picRecord?.role && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate leading-tight">
                          {picRecord.role}
                        </div>
                      )}
                    </div>
                  </div>
                  {isMe && (
                    <span className="text-[9px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1 py-0.2 rounded font-bold shrink-0">
                      ME
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <form onSubmit={handleAddCustom} className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex gap-1">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Add other person..."
              className="flex-1 text-[11px] px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!customName.trim()}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold disabled:opacity-50 cursor-pointer flex items-center gap-0.5"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Add</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export const TaskListTable: React.FC<TaskListTableProps> = ({
  tasks,
  selectedTaskIds,
  onToggleSelect,
  onSelectAll,
  onQuickStatusChange,
  onQuickPriorityChange,
  onQuickProgressChange,
  onQuickPicsChange,
  onQuickDisciplineChange,
  onDeleteTask,
  onSortChange,
  currentSort,
  searchQuery,
  onSearchQueryChange,
  priorityFilter = 'ALL',
  onPriorityFilterChange,
  statusFilter = 'ALL',
  onStatusFilterChange,
  categoryFilter = 'ALL',
  onCategoryFilterChange,
  deadlineFilter = 'all',
  onDeadlineFilterChange,
  forecastFilter = 'all',
  onForecastFilterChange,
  progressFilter = 'ALL',
  onProgressFilterChange,
  picFilter = 'ALL',
  onPicFilterChange,
  interfaceFilter = 'ALL',
  onInterfaceFilterChange,
  onResetColumnFilters,
  hideFilterRow = false,
  emptyMessage,
}) => {
  const {
    setSelectedTaskId,
    selectedTaskId,
    lastActiveTaskId,
    setLastActiveTaskId,
    isQuickTaskModalOpen,
    filterTagId,
    setFilterTagId,
    filterPackageId,
    setFilterPackageId,
    filterProjectId,
    setFilterProjectId,
    projects,
    packages,
    categories,
    tags,
    users,
    pics,
  } = useApp();

  const settingPics = React.useMemo(() => {
    if (!Array.isArray(pics) || pics.length === 0) return [];
    return pics.map((p) => p.name).filter(Boolean);
  }, [pics]);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // Keyboard navigation: ArrowUp/ArrowDown to select task row, Enter to open task details
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do nothing if detail modal or quick task modal is currently open
      if (selectedTaskId || isQuickTaskModalOpen) return;

      // Do nothing if user is typing in an input, textarea, select dropdown, or contentEditable
      const activeEl = document.activeElement;
      const isTypingField =
        activeEl &&
        ((activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type !== 'checkbox') ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isTypingField) return;

      if (e.key === 'ArrowDown') {
        if (!tasks || tasks.length === 0) return;
        e.preventDefault();
        const currentIndex = tasks.findIndex((t) => t.id === lastActiveTaskId);
        if (currentIndex === -1) {
          const firstTask = tasks[0];
          setLastActiveTaskId(firstTask.id);
          rowRefs.current[firstTask.id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (currentIndex < tasks.length - 1) {
          const nextTask = tasks[currentIndex + 1];
          setLastActiveTaskId(nextTask.id);
          rowRefs.current[nextTask.id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp') {
        if (!tasks || tasks.length === 0) return;
        e.preventDefault();
        const currentIndex = tasks.findIndex((t) => t.id === lastActiveTaskId);
        if (currentIndex === -1) {
          const firstTask = tasks[0];
          setLastActiveTaskId(firstTask.id);
          rowRefs.current[firstTask.id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (currentIndex > 0) {
          const prevTask = tasks[currentIndex - 1];
          setLastActiveTaskId(prevTask.id);
          rowRefs.current[prevTask.id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else if (e.key === 'Enter') {
        // Do not intercept if a button is focused (standard click executes)
        if (activeEl && activeEl.tagName === 'BUTTON') return;

        if (lastActiveTaskId) {
          const taskExists = tasks.some((t) => t.id === lastActiveTaskId);
          if (taskExists) {
            e.preventDefault();
            setSelectedTaskId(lastActiveTaskId);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tasks, lastActiveTaskId, selectedTaskId, isQuickTaskModalOpen, setLastActiveTaskId, setSelectedTaskId]);

  const allSelected = tasks.length > 0 && selectedTaskIds.length === tasks.length;
  const isIndeterminate = selectedTaskIds.length > 0 && selectedTaskIds.length < tasks.length;

  const hasActiveFilters =
    Boolean(searchQuery && searchQuery.trim().length > 0) ||
    (priorityFilter && priorityFilter !== 'ALL') ||
    (statusFilter && statusFilter !== 'ALL') ||
    (categoryFilter && categoryFilter !== 'ALL') ||
    (deadlineFilter && deadlineFilter !== 'all') ||
    (forecastFilter && forecastFilter !== 'all') ||
    (progressFilter && progressFilter !== 'ALL') ||
    (picFilter && picFilter !== 'ALL') ||
    (interfaceFilter && interfaceFilter !== 'ALL') ||
    Boolean(filterProjectId) ||
    Boolean(filterPackageId) ||
    Boolean(filterTagId);

  const handleResetFilters = () => {
    if (onSearchQueryChange) onSearchQueryChange('');
    if (onPriorityFilterChange) onPriorityFilterChange('ALL');
    if (onStatusFilterChange) onStatusFilterChange('ALL');
    if (onCategoryFilterChange) onCategoryFilterChange('ALL');
    if (onDeadlineFilterChange) onDeadlineFilterChange('all');
    if (onForecastFilterChange) onForecastFilterChange('all');
    if (onProgressFilterChange) onProgressFilterChange('ALL');
    if (onPicFilterChange) onPicFilterChange('ALL');
    if (onInterfaceFilterChange) onInterfaceFilterChange('ALL');
    setFilterProjectId(null);
    setFilterPackageId(null);
    setFilterTagId(null);
    if (onResetColumnFilters) {
      onResetColumnFilters();
    }
  };

  const getPriorityStyle = (priority: TaskPriority, isDone: boolean) => {
    if (isDone) {
      return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 font-normal';
    }
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold';
      case 'HIGH':
        return 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800 font-bold';
      case 'MEDIUM':
        return 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 font-bold';
      case 'LOW':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-bold';
    }
  };

  const getStatusStyle = (status: TaskStatus, isDone: boolean) => {
    if (isDone) {
      return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 font-normal';
    }
    switch (status) {
      case 'DONE':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 font-normal';
      case 'IN PROGRESS':
        return 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 font-semibold';
      case 'WAITING':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-semibold';
      case 'ON HOLD':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold';
      case 'CANCELLED':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 line-through font-medium';
      case 'TODO':
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-semibold';
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs transition-colors print:border-none print:shadow-none print:overflow-visible print:bg-white">
      <div className="flex-1 min-h-0 overflow-auto print:overflow-visible">
        <table className="table-fixed w-full text-left border-separate border-spacing-0 text-xs min-w-[940px] print:min-w-0 print:text-[8pt]">
          <colgroup>
            <col className="w-8" />
            <col className="w-[68px]" />
            <col className="w-[82px]" />
            <col />
            <col className="w-[126px]" />
            <col className="w-[84px]" />
            <col className="w-[96px] print:w-20" />
            <col className="w-[82px]" />
            <col className="w-[78px]" />
            <col className="w-[62px]" />
            <col className="w-[44px] print:hidden" />
          </colgroup>
          <thead className="select-none print:table-header-group">
            {/* ROW 1: Clean Column Titles with 2-Way Sort Arrows */}
            <tr className="h-9 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs print:bg-slate-100">
              {/* Select All */}
              <th className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 w-8 py-2 px-1 text-center align-middle print:hidden border-b border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  title="Select all tasks"
                />
              </th>

              {/* Priority */}
              <th className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 w-[68px] print:w-14 py-2 px-1 text-left align-middle border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => onSortChange && onSortChange('priority')}
                  className={`inline-flex items-center space-x-1 transition-colors cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group text-[11px] ${
                    currentSort?.startsWith('priority') ? 'text-blue-600 dark:text-blue-400 font-bold' : ''
                  }`}
                  title="Sort by priority"
                >
                  <span>Priority</span>
                  <ArrowUpDown className={`w-3 h-3 ${
                    currentSort?.startsWith('priority') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500'
                  } print:hidden`} />
                </button>
              </th>

              {/* Status */}
              <th className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 w-[82px] print:w-16 py-2 px-1 text-left align-middle border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => onSortChange && onSortChange('status')}
                  className={`inline-flex items-center space-x-1 transition-colors cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group text-[11px] ${
                    currentSort?.startsWith('status') ? 'text-blue-600 dark:text-blue-400 font-bold' : ''
                  }`}
                  title="Sort by status"
                >
                  <span>Status</span>
                  <ArrowUpDown className={`w-3 h-3 ${
                    currentSort?.startsWith('status') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500'
                  } print:hidden`} />
                </button>
              </th>

              {/* Task Name / Note */}
              <th className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 py-2 px-2.5 text-left align-middle border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => onSortChange && onSortChange('title')}
                  className={`inline-flex items-center space-x-1.5 transition-colors cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group ${
                    currentSort?.startsWith('title') ? 'text-blue-600 dark:text-blue-400 font-bold' : ''
                  }`}
                  title="Sort by task name"
                >
                  <span>Task Name / Note</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${
                    currentSort?.startsWith('title') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500'
                  } print:hidden`} />
                </button>
              </th>

              {/* Project / Package */}
              <th className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 w-[126px] print:w-28 py-2 px-1 text-left align-middle border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => onSortChange && onSortChange('package')}
                  className={`inline-flex items-center space-x-1 transition-colors cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group text-[11px] truncate max-w-full ${
                    currentSort?.startsWith('package') ? 'text-blue-600 dark:text-blue-400 font-bold' : ''
                  }`}
                  title="Sort by project or package"
                >
                  <span className="truncate">Project / Package</span>
                  <ArrowUpDown className={`w-3 h-3 shrink-0 ${
                    currentSort?.startsWith('package') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500'
                  } print:hidden`} />
                </button>
              </th>

              {/* PIC - Person In Charge */}
              <th className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 w-[84px] print:w-20 py-2 px-1 text-left align-middle border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => onSortChange && onSortChange('pic')}
                  className={`inline-flex items-center space-x-1 transition-colors cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group text-[11px] text-left ${
                    currentSort?.startsWith('pic') ? 'text-blue-600 dark:text-blue-400 font-bold' : ''
                  }`}
                  title="Sort by PIC"
                >
                  <span>PIC</span>
                  <ArrowUpDown className={`w-3 h-3 ${
                    currentSort?.startsWith('pic') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500'
                  } print:hidden`} />
                </button>
              </th>

              {/* Interface */}
              <th className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 w-[96px] print:w-20 py-2 px-1 text-left align-middle border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => onSortChange && onSortChange('interface')}
                  className={`inline-flex items-center space-x-1 transition-colors cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group text-[11px] text-left ${
                    currentSort?.startsWith('interface') ? 'text-blue-600 dark:text-blue-400 font-bold' : ''
                  }`}
                  title="Sort by Interface Discipline"
                >
                  <span>Interface</span>
                  <ArrowUpDown className={`w-3 h-3 ${
                    currentSort?.startsWith('interface') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500'
                  } print:hidden`} />
                </button>
              </th>

              {/* Deadline */}
              <th className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 w-[82px] print:w-18 py-2 px-1 text-left align-middle border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => onSortChange && onSortChange('deadline')}
                  className={`inline-flex items-center space-x-1 transition-colors cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group text-[11px] ${
                    currentSort?.startsWith('deadline') ? 'text-blue-600 dark:text-blue-400 font-bold' : ''
                  }`}
                  title="Sort by deadline"
                >
                  <span>Deadline</span>
                  <ArrowUpDown className={`w-3 h-3 ${
                    currentSort?.startsWith('deadline') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500'
                  } print:hidden`} />
                </button>
              </th>

              {/* Forecast */}
              <th className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 w-[78px] print:w-18 py-2 px-1 text-left align-middle border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => onSortChange && onSortChange('forecast')}
                  className={`inline-flex items-center space-x-1 transition-colors cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 group text-[11px] ${
                    currentSort?.startsWith('forecast') ? 'text-blue-600 dark:text-blue-400 font-bold' : ''
                  }`}
                  title="Sort by forecast finish date"
                >
                  <span>Forecast</span>
                  <ArrowUpDown className={`w-3 h-3 ${
                    currentSort?.startsWith('forecast') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500'
                  } print:hidden`} />
                </button>
              </th>

              {/* Tags */}
              <th className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 w-[62px] print:w-14 py-2 px-1 text-left align-middle border-b border-slate-200 dark:border-slate-700">
                <span className="text-[11px]">Tags</span>
              </th>

              {/* Actions */}
              <th className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800 w-[44px] py-2 px-1 text-center align-middle print:hidden border-b border-slate-200 dark:border-slate-700">
                <span className="text-[11px]">Action</span>
              </th>
            </tr>

            {/* ROW 2: Smart Filter Boxes (Dedicated boxes neatly aligned underneath each header text) */}
            {!hideFilterRow && (
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 print:hidden text-xs">
              {/* Select All column filter placeholder */}
              <th className="sticky top-9 z-20 bg-slate-50 dark:bg-slate-900 w-8 py-1.5 px-1 text-center align-middle border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-center text-slate-400 dark:text-slate-500" title="Column Filters">
                  <Filter className="w-3.5 h-3.5" />
                </div>
              </th>

              {/* Priority Filter Box */}
              <th className="sticky top-9 z-20 bg-slate-50 dark:bg-slate-900 w-[68px] py-1 px-0.5 text-left align-middle font-normal border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                {onPriorityFilterChange && (
                  <select
                    value={priorityFilter}
                    onChange={(e) => onPriorityFilterChange(e.target.value)}
                    aria-label="Filter Priority"
                    className={`w-full text-[9.5px] py-0.5 px-0.5 rounded-md border outline-none font-medium transition-colors shadow-2xs cursor-pointer ${
                      priorityFilter !== 'ALL'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500'
                    }`}
                  >
                    <option value="ALL">All Prio</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                )}
              </th>

              {/* Status Filter Box */}
              <th className="sticky top-9 z-20 bg-slate-50 dark:bg-slate-900 w-[82px] py-1 px-0.5 text-left align-middle font-normal border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                {onStatusFilterChange && (
                  <select
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value)}
                    aria-label="Filter Status"
                    className={`w-full text-[9.5px] py-0.5 px-0.5 rounded-md border outline-none font-medium transition-colors shadow-2xs cursor-pointer ${
                      statusFilter !== 'ALL'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500'
                    }`}
                  >
                    <option value="ALL">All Status</option>
                    <option value="OPEN">Open</option>
                    <option value="TODO">TODO</option>
                    <option value="IN PROGRESS">IN PROG</option>
                    <option value="WAITING">WAITING</option>
                    <option value="ON HOLD">ON HOLD</option>
                    <option value="DONE">DONE</option>
                    <option value="CANCELLED">CANCEL</option>
                  </select>
                )}
              </th>

              {/* Task Name / Note Filter Box */}
              <th className="sticky top-9 z-20 bg-slate-50 dark:bg-slate-900 py-1 px-1.5 text-left align-middle font-normal border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="relative flex items-center">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery || ''}
                    onChange={(e) => onSearchQueryChange && onSearchQueryChange(e.target.value)}
                    placeholder="Filter name / note..."
                    aria-label="Filter Task Name"
                    className={`w-full text-[9.5px] py-0.5 pl-6 pr-5 rounded-md border outline-none font-medium transition-colors shadow-2xs ${
                      searchQuery
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onSearchQueryChange && onSearchQueryChange('')}
                      className="absolute right-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Clear task name filter"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </th>

              {/* Project / Package Filter Box */}
              <th className="sticky top-9 z-20 bg-slate-50 dark:bg-slate-900 w-[126px] py-1 px-0.5 text-left align-middle font-normal border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="grid grid-cols-2 gap-0.5">
                  <select
                    value={filterProjectId || 'ALL'}
                    onChange={(e) => setFilterProjectId(e.target.value === 'ALL' ? null : e.target.value)}
                    title={
                      filterProjectId
                        ? `Project: ${projects.find((p) => p.id === filterProjectId)?.code} - ${projects.find((p) => p.id === filterProjectId)?.name}`
                        : "Filter by Project (All Projects)"
                    }
                    aria-label="Filter Project"
                    className={`w-full text-[9px] py-0.5 px-0.5 rounded-md border outline-none transition-colors truncate shadow-2xs cursor-pointer ${
                      filterProjectId
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500'
                    }`}
                  >
                    <option value="ALL" title="All Projects">Prj: All</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} title={`${p.code} - ${p.name}`}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterPackageId || 'ALL'}
                    onChange={(e) => setFilterPackageId(e.target.value === 'ALL' ? null : e.target.value)}
                    title={
                      filterPackageId
                        ? filterPackageId === 'GENERAL'
                          ? 'Package: General (No package assigned)'
                          : `Package: ${packages.find((pkg) => pkg.id === filterPackageId)?.code} - ${packages.find((pkg) => pkg.id === filterPackageId)?.name}`
                        : "Filter by Package (All Packages)"
                    }
                    aria-label="Filter Package"
                    className={`w-full text-[9px] py-0.5 px-0.5 rounded-md border outline-none font-mono transition-colors truncate shadow-2xs cursor-pointer ${
                      filterPackageId
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500'
                    }`}
                  >
                    <option value="ALL" title="All Packages">Pkg: All</option>
                    <option value="GENERAL" title="General (No package assigned)">General</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id} title={`${pkg.code} - ${pkg.name}`}>
                        {pkg.code} - {pkg.name}
                      </option>
                    ))}
                  </select>
                </div>
              </th>

              {/* PIC Filter Box */}
              <th className="sticky top-9 z-20 bg-slate-50 dark:bg-slate-900 w-[84px] py-1 px-0.5 text-left align-middle font-normal border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                {onPicFilterChange ? (
                  <select
                    value={picFilter || 'ALL'}
                    onChange={(e) => onPicFilterChange(e.target.value)}
                    aria-label="Filter PIC"
                    className={`w-full text-[9px] py-0.5 px-0.5 rounded-md border outline-none transition-colors shadow-2xs cursor-pointer ${
                      picFilter && picFilter !== 'ALL'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500'
                    }`}
                  >
                    <option value="ALL">All PICs</option>
                    <option value="UNASSIGNED">Unassigned</option>
                    {settingPics.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 text-left py-0.5 font-mono">
                    PIC
                  </div>
                )}
              </th>

              {/* Interface Filter Box */}
              <th className="sticky top-9 z-20 bg-slate-50 dark:bg-slate-900 w-[96px] py-1 px-0.5 text-left align-middle font-normal border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                {onInterfaceFilterChange ? (
                  <select
                    value={interfaceFilter}
                    onChange={(e) => onInterfaceFilterChange(e.target.value)}
                    aria-label="Filter Interface"
                    className={`w-full text-[9px] py-0.5 px-0.5 rounded-md border outline-none font-medium transition-colors shadow-2xs cursor-pointer ${
                      interfaceFilter !== 'ALL'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500'
                    }`}
                  >
                    <option value="ALL">All Disciplines</option>
                    {INTERFACE_DISCIPLINES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 text-left py-0.5 font-mono">
                    Itf
                  </div>
                )}
              </th>

              {/* Deadline Filter Box */}
              <th className="sticky top-9 z-20 bg-slate-50 dark:bg-slate-900 w-[82px] py-1 px-0.5 text-left align-middle font-normal border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                {onDeadlineFilterChange ? (
                  <select
                    value={deadlineFilter}
                    onChange={(e) => onDeadlineFilterChange(e.target.value)}
                    aria-label="Filter Deadline"
                    className={`w-full text-[9.5px] py-0.5 px-0.5 rounded-md border outline-none transition-colors shadow-2xs cursor-pointer ${
                      deadlineFilter !== 'all'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500'
                    }`}
                  >
                    <option value="all">All Dates</option>
                    <option value="overdue">Overdue</option>
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="this_week">This Wk</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="done">Done</option>
                  </select>
                ) : (
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 text-center py-0.5">
                    Dates
                  </div>
                )}
              </th>

              {/* Forecast Filter Box */}
              <th className="sticky top-9 z-20 bg-slate-50 dark:bg-slate-900 w-[78px] py-1 px-0.5 text-left align-middle font-normal border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                {onForecastFilterChange ? (
                  <select
                    value={forecastFilter}
                    onChange={(e) => onForecastFilterChange(e.target.value)}
                    aria-label="Filter Forecast"
                    className={`w-full text-[9.5px] py-0.5 px-0.5 rounded-md border outline-none transition-colors shadow-2xs cursor-pointer ${
                      forecastFilter !== 'all'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500'
                    }`}
                  >
                    <option value="all">All Dates</option>
                    <option value="overdue">Late</option>
                    <option value="revised">Revised</option>
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="this_week">This Wk</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="done">Done</option>
                  </select>
                ) : (
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 text-center py-0.5">
                    Dates
                  </div>
                )}
              </th>

              {/* Tags Filter Box */}
              <th className="sticky top-9 z-20 bg-slate-50 dark:bg-slate-900 w-[62px] py-1 px-0.5 text-left align-middle font-normal border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                <select
                  value={filterTagId || 'ALL'}
                  onChange={(e) => setFilterTagId(e.target.value === 'ALL' ? null : e.target.value)}
                  aria-label="Filter Tag"
                  className={`w-full text-[9px] py-0.5 px-0.5 rounded-md border outline-none font-mono transition-colors truncate shadow-2xs cursor-pointer ${
                    filterTagId
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500'
                  }`}
                >
                  <option value="ALL">All Tags</option>
                  {tags.map((tg) => (
                    <option key={tg.id} value={tg.id}>
                      #{tg.name}
                    </option>
                  ))}
                </select>
              </th>

              {/* Actions Reset Button */}
              <th className="sticky top-9 z-20 bg-slate-50 dark:bg-slate-900 w-[44px] py-1 px-0.5 text-right align-middle font-normal border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex justify-end">
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-1 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[8.5px] font-bold flex items-center justify-center gap-0.5 shadow-2xs cursor-pointer transition-colors w-full"
                      title="Clear all active column filters"
                    >
                      <RotateCcw className="w-2.5 h-2.5 shrink-0" />
                      <span>Reset</span>
                    </button>
                  ) : (
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal pr-0.5">Filter</span>
                  )}
                </div>
              </th>
            </tr>
            )}
          </thead>
          <tbody className="bg-white dark:bg-slate-900 print:bg-white">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <div className="space-y-2">
                    <p>{emptyMessage || 'No engineering tasks match your current filters.'}</p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Reset column filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const isSelected = selectedTaskIds.includes(task.id);
                const isDone = task.status === 'DONE';
                const isCancelled = task.status === 'CANCELLED';
                const isCurrentlyActive = task.id === selectedTaskId;
                const isRecentlySelected = (!selectedTaskId && task.id === lastActiveTaskId) || task.id === lastActiveTaskId;
                const isRowActive = isCurrentlyActive || isRecentlySelected;
                const deadlineInfo = getDeadlineBadge(task.deadline, task.status, task.forecast_finish);
                const variance = getScheduleVariance(task.deadline, task.forecast_finish);
                const projectObj = projects.find((p) => p.id === (task.project_id || task.effective_project_id)) ||
                                   (task.project_code ? projects.find((p) => p.code === task.project_code) : undefined);
                const pCode = task.project_code || projectObj?.code;
                const pName = task.project_name || projectObj?.name;

                const getCellBorderClass = (pos: 'first' | 'middle' | 'last') => {
                  if (isRowActive || isSelected) {
                    if (pos === 'first') {
                      return 'border-b border-transparent shadow-[inset_2px_2px_0_#2563eb,inset_0_-2px_0_#2563eb] rounded-l-lg bg-blue-50/70 dark:bg-blue-950/45 print:shadow-none print:bg-transparent';
                    }
                    if (pos === 'last') {
                      return 'border-b border-transparent shadow-[inset_-2px_2px_0_#2563eb,inset_0_-2px_0_#2563eb] rounded-r-lg bg-blue-50/70 dark:bg-blue-950/45 print:shadow-none print:bg-transparent';
                    }
                    return 'border-b border-transparent shadow-[inset_0_2px_0_#2563eb,inset_0_-2px_0_#2563eb] bg-blue-50/70 dark:bg-blue-950/45 print:shadow-none print:bg-transparent';
                  }
                  return 'border-b border-slate-200 dark:border-slate-800';
                };

                return (
                  <tr
                    key={task.id}
                    ref={(el) => {
                      rowRefs.current[task.id] = el;
                    }}
                    tabIndex={0}
                    onClick={() => {
                      setLastActiveTaskId(task.id);
                    }}
                    onDoubleClick={() => {
                      setSelectedTaskId(task.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setSelectedTaskId(task.id);
                      }
                    }}
                    title="Use Up/Down arrow keys to select, press Enter or double-click to open task details"
                    className={`cursor-pointer relative group outline-none ${
                      isRowActive || isSelected ? 'z-[2]' : ''
                    } ${
                      isCancelled
                        ? 'opacity-50 grayscale hover:opacity-75'
                        : isDone
                        ? 'opacity-70 hover:opacity-90'
                        : isRowActive || isSelected
                        ? ''
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className={`py-2.5 px-1.5 text-center align-top print:hidden ${getCellBorderClass('first')}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => onToggleSelect(task.id)}
                        className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
                      />
                    </td>

                    {/* Priority (Unhighlighted gray if isDone or isCancelled) */}
                    <td className={`py-2 px-1 text-left align-top ${getCellBorderClass('middle')}`}>
                      <div className="print:hidden">
                        <select
                          value={task.priority}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onQuickPriorityChange && onQuickPriorityChange(task.id, e.target.value as TaskPriority)}
                          title={`Priority: ${task.priority} (Click to change)`}
                          aria-label={`Change Priority for task ${task.title}`}
                          className={`w-full h-4.5 text-[8.5px] py-0 px-0.5 rounded border font-mono uppercase outline-none cursor-pointer text-center ${getPriorityStyle(
                            task.priority,
                            isDone || isCancelled
                          )}`}
                        >
                          <option value="CRITICAL">CRITICAL</option>
                          <option value="HIGH">HIGH</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="LOW">LOW</option>
                        </select>
                      </div>
                      <span className="hidden print:inline-block font-mono font-bold text-[7.5pt] uppercase text-slate-500">
                        {task.priority}
                      </span>
                    </td>

                    {/* Status (Unhighlighted gray if isDone or isCancelled) */}
                    <td className={`py-2 px-1 text-left align-top ${getCellBorderClass('middle')}`}>
                      <div className="print:hidden">
                        <select
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onQuickStatusChange(task.id, e.target.value as TaskStatus)}
                          className={`w-full h-4.5 text-[8.5px] py-0 px-0.5 rounded border font-mono uppercase outline-none cursor-pointer text-center ${getStatusStyle(
                            task.status,
                            isDone || isCancelled
                          )}`}
                        >
                          <option value="TODO">TODO</option>
                          <option value="IN PROGRESS">IN PROGRESS</option>
                          <option value="WAITING">WAITING</option>
                          <option value="ON HOLD">ON HOLD</option>
                          <option value="DONE">DONE</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
                      <span className="hidden print:inline-block font-mono font-bold text-[7.5pt] uppercase text-slate-500">
                        {task.status}
                      </span>
                    </td>

                    {/* Task Title & Note (Grayed out if done) */}
                    <td className={`py-2.5 px-2.5 text-left align-top ${getCellBorderClass('middle')}`}>
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        {isCancelled && (
                          <span className="text-[9px] uppercase font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-1 py-0.2 rounded shrink-0 line-through">
                            CANCELLED
                          </span>
                        )}
                        {task.type !== 'TASK' && (
                          <span
                            className={`text-[9px] uppercase font-mono font-bold px-1 py-0.2 rounded shrink-0 border ${
                              isDone || isCancelled
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            }`}
                          >
                            {task.type}
                          </span>
                        )}
                        {task.group_id && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold px-1 py-0.2 rounded shrink-0 border bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                            title={`Linked group task across multiple packages (Group #${task.group_id.slice(-8)})`}
                          >
                            <Link2 className="w-2.5 h-2.5" />
                            <span>GRP</span>
                          </span>
                        )}
                        <span
                          className={`font-bold ${
                            isCancelled
                              ? 'line-through decoration-slate-400 text-slate-400 dark:text-slate-500 font-normal'
                              : isDone
                              ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                              : 'text-[#0f4c81] hover:text-[#0b3b70] dark:text-[#93c5fd] dark:hover:text-[#bfdbfe]'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                      {task.description && (
                        <div
                          className={`text-[11.5px] print:text-[7.5pt] whitespace-pre-wrap break-words font-normal mt-1 leading-relaxed text-left ${
                            isCancelled
                              ? 'line-through text-slate-400'
                              : isDone
                              ? 'text-slate-400 dark:text-slate-500 line-through'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {task.description}
                        </div>
                      )}
                    </td>

                    {/* Project & Package (Grayed out if done) */}
                    <td className={`py-2 px-1 text-left align-top ${getCellBorderClass('middle')}`}>
                      <div className="space-y-0.5 max-w-full text-left">
                        {(pCode || pName) && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetId = task.project_id || projectObj?.id;
                              if (targetId) setFilterProjectId(targetId);
                            }}
                            title={pCode && pName ? `Project: ${pCode} - ${pName}` : pName || pCode || ''}
                            className={`text-[9px] print:text-[7pt] font-mono font-medium truncate text-left cursor-pointer hover:underline ${
                              isCancelled || isDone ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            📁 {pCode && pName ? (pName.toLowerCase().startsWith(pCode.toLowerCase()) ? pName : `${pCode}: ${pName}`) : (pName || pCode)}
                          </div>
                        )}
                        {task.package_name ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (task.package_id) setFilterPackageId(task.package_id);
                            }}
                            title={task.package_code ? `${task.package_code}: ${task.package_name}` : task.package_name}
                            className={`text-[9.5px] print:text-[7.5pt] font-mono border px-1 py-0.2 rounded truncate max-w-full block text-left cursor-pointer transition-colors ${
                              isCancelled || isDone
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                                : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/90 dark:border-slate-700/80 hover:bg-slate-200/80 dark:hover:bg-slate-700'
                            }`}
                          >
                            {task.package_code ? `${task.package_code}: ` : ''}{task.package_name.replace(' Package', '')}
                          </span>
                        ) : (
                          <span className="text-[9.5px] print:text-[7.5pt] font-mono text-slate-400 dark:text-slate-500 text-left block">General</span>
                        )}
                      </div>
                    </td>

                    {/* PIC - Person In Charge (Replaces Progress column) */}
                    <td className={`py-2 px-1 text-left align-top ${getCellBorderClass('middle')}`}>
                      <div className="print:hidden flex items-center justify-start">
                        <InlinePicSelector
                          taskId={task.id}
                          pics={Array.isArray(task.pics) ? task.pics : []}
                          presetPics={settingPics}
                          onCommit={(taskId, newPics) => {
                            if (onQuickPicsChange) {
                              onQuickPicsChange(taskId, newPics);
                            }
                          }}
                        />
                      </div>
                      <span className="hidden print:inline-block font-mono text-[7.5pt] text-slate-600 text-left">
                        {Array.isArray(task.pics) && task.pics.length > 0 ? task.pics.join(', ') : '-'}
                      </span>
                    </td>

                    {/* Interface Discipline Selector (Click to switch on the fly) */}
                    <td className={`py-2 px-1 text-left align-top ${getCellBorderClass('middle')}`}>
                      {(() => {
                        const currentDiscipline =
                          task.interfaces && task.interfaces.length > 0 && task.interfaces[0].discipline
                            ? task.interfaces[0].discipline
                            : 'Instrument';
                        const color = DISCIPLINE_COLORS[currentDiscipline] || DISCIPLINE_COLORS.Other;
                        return (
                          <div className="print:hidden">
                            <select
                              value={currentDiscipline}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const newDisc = e.target.value;
                                if (onQuickDisciplineChange) {
                                  onQuickDisciplineChange(task.id, newDisc);
                                }
                              }}
                              title={`Interface Discipline: ${currentDiscipline} (Click to switch)`}
                              aria-label={`Change discipline for task ${task.title}`}
                              className={`w-full h-4.5 text-[8.5px] py-0 px-0.5 rounded border font-mono font-medium outline-none cursor-pointer truncate max-w-full text-center ${
                                isCancelled || isDone
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                                  : `${color.bg} ${color.text} ${color.border}`
                              }`}
                            >
                              {INTERFACE_DISCIPLINES.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}
                      <span className="hidden print:inline-block font-mono text-[7.5pt] text-slate-600">
                        {task.interfaces && task.interfaces.length > 0
                          ? task.interfaces.map((i) => i.discipline).join(', ')
                          : 'Instrument'}
                      </span>
                    </td>

                    {/* Deadline (Grayed out if done) */}
                    <td className={`py-2 px-1 text-left align-top ${getCellBorderClass('middle')}`}>
                      {task.deadline ? (
                        <div className="space-y-0.5 text-left">
                          <div className={`text-[10.5px] print:text-[7.5pt] font-mono font-medium text-left ${
                            isCancelled || isDone ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {formatDateDdMmYyyy(task.deadline)}
                          </div>
                          <span
                            title={deadlineInfo.fullDescription}
                            className={`w-full max-w-[76px] print:w-auto h-4.5 text-[8.5px] print:text-[7pt] px-1 py-0 rounded border inline-flex items-center justify-center space-x-0.5 font-mono leading-none text-center select-none shrink-0 truncate ${
                              isCancelled || isDone
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                                : `${deadlineInfo.bgClass} ${deadlineInfo.colorClass} ${deadlineInfo.borderClass}`
                            }`}
                          >
                            <Clock className="w-2 h-2 shrink-0 print:hidden text-slate-400" />
                            <span className="whitespace-nowrap truncate">{isCancelled ? 'Cancelled' : isDone ? 'Done' : deadlineInfo.label}</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 font-mono text-[10px] print:text-[7.5pt] text-left block">—</span>
                      )}
                    </td>

                    {/* Forecast (Grayed out if done) */}
                    <td className={`py-2 px-1 text-left align-top ${getCellBorderClass('middle')}`}>
                      {task.forecast_finish ? (
                        <div className="space-y-0.5 text-left font-mono">
                          <div className={`text-[10.5px] print:text-[7.5pt] font-medium leading-tight ${isCancelled || isDone ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                            {formatDateDdMmYyyy(task.forecast_finish)}
                          </div>
                          {variance && !isCancelled && !isDone && (
                            <div
                              className={`text-[8.5px] print:text-[7pt] font-semibold leading-tight truncate ${
                                variance.isLate ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                              title={variance.text}
                            >
                              {variance.isLate ? `+${variance.days}d late` : `${variance.days}d early`}
                            </div>
                          )}
                          {/* Forecast Revision Indicator */}
                          {Boolean(task.forecast_revision_count && task.forecast_revision_count > 0) && (
                            <div className="pt-0.5">
                              {task.forecast_revision_count === 1 ? (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[8px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 cursor-help select-none"
                                  title="Forecast finish date has been revised 1 time."
                                >
                                  Rev #1
                                </span>
                              ) : task.forecast_revision_count === 2 ? (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[8px] font-mono font-bold bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-200 border border-orange-300 dark:border-orange-800 cursor-help select-none"
                                  title="Forecast finish date revised 2 times! Please monitor closely to prevent delay."
                                >
                                  <AlertTriangle className="w-2 h-2 text-orange-600 dark:text-orange-400 shrink-0" />
                                  Rev #2
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[8px] font-mono font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 animate-pulse cursor-help select-none"
                                  title={`CRITICAL: Forecast date revised ${task.forecast_revision_count} times! Repeated schedule slippage - immediate expediting required!`}
                                >
                                  <AlertCircle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                  Rev #{task.forecast_revision_count} (Expedite!)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0.5 text-left font-mono">
                          <span className="text-slate-300 dark:text-slate-600 font-mono text-left block">—</span>
                          {Boolean(task.forecast_revision_count && task.forecast_revision_count > 0) && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[8px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 cursor-help"
                              title={`Forecast date was previously revised ${task.forecast_revision_count} times.`}
                            >
                              Rev #{task.forecast_revision_count}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Tags (Grayed out if done) */}
                    <td className={`py-2 px-1 text-left align-top ${getCellBorderClass('middle')}`}>
                      <div className="flex flex-col gap-0.5 max-w-full text-left">
                        {task.tags && task.tags.length > 0 ? (
                          task.tags.map((tg) => (
                            <span
                              key={tg.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isCancelled && !isDone) setFilterTagId(tg.id);
                              }}
                              title={`#${tg.name}`}
                              className={`text-[8.5px] print:text-[7pt] font-mono px-1 py-0 rounded truncate block max-w-full cursor-pointer ${
                                isCancelled || isDone
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              #{tg.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-mono text-[10px] text-left block">—</span>
                        )}
                      </div>
                    </td>

                    {/* Actions (Vertical layout: Mark as done on top, Delete on bottom) */}
                    <td className={`py-1.5 px-0.5 text-center align-top print:hidden ${getCellBorderClass('last')}`}>
                      <div className="flex flex-col items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickStatusChange(task.id, isDone ? 'TODO' : 'DONE');
                          }}
                          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                            isDone ? 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300' : 'text-slate-400 hover:text-emerald-600'
                          }`}
                          title={isDone ? 'Mark as TODO' : 'Mark as Done'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteTask && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask(task.id);
                            }}
                            className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
