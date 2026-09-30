import React from 'react';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { getDeadlineBadge, getScheduleVariance, formatDateDisplay, formatShortDate } from '../../lib/dateUtils';
import { CheckCircle2, Circle, Clock, Paperclip, MessageSquare, AlertCircle, ChevronRight, MoreVertical, Link2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onQuickStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onQuickProgressChange?: (taskId: string, newProgress: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onQuickStatusChange, onQuickProgressChange }) => {
  const { setSelectedTaskId, setFilterTagId, setFilterPackageId, setFilterProjectId, setActiveView } = useApp();

  const deadlineInfo = getDeadlineBadge(task.deadline, task.status, task.forecast_finish);
  const variance = getScheduleVariance(task.deadline, task.forecast_finish);

  const getPriorityStyle = (priority: TaskPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          pill: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
          dot: 'bg-rose-600',
          bar: 'bg-rose-500',
        };
      case 'HIGH':
        return {
          pill: 'bg-orange-50 text-orange-700 border-orange-200 font-semibold',
          dot: 'bg-orange-500',
          bar: 'bg-orange-500',
        };
      case 'MEDIUM':
        return {
          pill: 'bg-amber-50 text-amber-800 border-amber-200 font-medium',
          dot: 'bg-amber-500',
          bar: 'bg-amber-400',
        };
      case 'LOW':
      default:
        return {
          pill: 'bg-slate-50 text-slate-600 border-slate-200 font-normal',
          dot: 'bg-slate-400',
          bar: 'bg-slate-300',
        };
    }
  };

  const priorityStyle = getPriorityStyle(task.priority);
  const isCompleted = task.status === 'DONE';

  return (
    <div
      onClick={() => setSelectedTaskId(task.id)}
      className={`group relative bg-white border rounded-md p-3 transition-all hover:shadow-xs hover:border-slate-400 cursor-pointer ${
        isCompleted
          ? 'bg-slate-50/70 border-slate-200 opacity-75'
          : task.priority === 'CRITICAL' && deadlineInfo.type === 'overdue'
          ? 'border-rose-300 bg-rose-50/20'
          : 'border-slate-200'
      }`}
    >
      {/* Priority accent left border strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${priorityStyle.bar}`} />

      <div className="flex items-start justify-between gap-2 pl-1.5">
        {/* Left: Checkbox + Title + Description */}
        <div className="flex items-start space-x-2.5 flex-1 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onQuickStatusChange) {
                onQuickStatusChange(task.id, isCompleted ? 'TODO' : 'DONE');
              }
            }}
            className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0"
            title={isCompleted ? 'Mark as Incomplete' : 'Mark as Done'}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
            ) : (
              <Circle className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              {/* Type pill if not standard task */}
              {task.type !== 'TASK' && (
                <span className="text-[10px] uppercase tracking-wider font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded">
                  {task.type}
                </span>
              )}

              {task.group_id && (
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border bg-sky-50 text-sky-700 border-sky-200"
                  title="Linked group task across multiple packages"
                >
                  <Link2 className="w-2.5 h-2.5" />
                  <span>GRP</span>
                </span>
              )}

              <h4
                className={`text-xs font-semibold text-slate-900 leading-snug break-words ${
                  isCompleted ? 'line-through text-slate-500' : ''
                }`}
              >
                {task.title}
              </h4>
            </div>

            {task.description && (
              <p className="text-[11px] text-slate-600 whitespace-pre-wrap break-words mt-1 font-normal leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Tags & Meta row */}
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mt-2">
              {/* Project pill */}
              {(task.project_code || task.project_name) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (task.project_id) {
                      setFilterProjectId(task.project_id);
                      setActiveView('tasks');
                    }
                  }}
                  className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-colors font-medium"
                >
                  📁 {task.project_code || task.project_name}
                </button>
              )}

              {/* Package pill */}
              {task.package_name ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (task.package_id) {
                      setFilterPackageId(task.package_id);
                      setActiveView('tasks');
                    }
                  }}
                  className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors"
                >
                  {task.package_code ? `${task.package_code}: ` : ''}{task.package_name.replace(' Package', '')}
                </button>
              ) : (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  General
                </span>
              )}

              {/* Priority badge */}
              <span className={`text-[10px] border px-1.5 py-0.5 rounded flex items-center space-x-1 ${priorityStyle.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                <span>{task.priority}</span>
              </span>

              {/* Status badge */}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                  task.status === 'DONE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : task.status === 'IN PROGRESS'
                    ? 'bg-sky-50 text-sky-700 border-sky-200 font-semibold'
                    : task.status === 'WAITING'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {task.status}
              </span>

              {/* Custom Tags */}
              {task.tags &&
                task.tags.map((tg) => (
                  <button
                    key={tg.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterTagId(tg.id);
                      setActiveView('tasks');
                    }}
                    className="text-[10px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded transition-colors"
                  >
                    #{tg.name}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Right: Deadline & Progress */}
        <div className="flex flex-col items-end shrink-0 space-y-1.5 text-right pl-2">
          {/* Deadline badge */}
          <div className="flex flex-col items-end space-y-0.5">
            <span
              title={deadlineInfo.fullDescription}
              className={`text-[10px] px-2 py-0.5 rounded border flex items-center space-x-1 font-mono leading-none ${deadlineInfo.bgClass} ${deadlineInfo.colorClass} ${deadlineInfo.borderClass}`}
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>{deadlineInfo.label}</span>
            </span>
            {task.deadline && (
              <span className="text-[9px] font-mono text-slate-500">
                Due: {formatShortDate(task.deadline)}
              </span>
            )}
          </div>

          {/* Schedule variance if late vs forecast & Revision count */}
          <div className="flex items-center space-x-1">
            {variance && (
              <span className={`text-[9px] font-mono ${variance.isLate ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                {variance.text}
              </span>
            )}
            {Boolean(task.forecast_revision_count && task.forecast_revision_count > 0) && (
              <span
                className={`text-[8px] font-mono font-bold px-1 rounded border ${
                  task.forecast_revision_count >= 3
                    ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                    : task.forecast_revision_count === 2
                    ? 'bg-orange-100 text-orange-800 border-orange-300'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
                title={`Forecast date revised ${task.forecast_revision_count} times`}
              >
                Rev #{task.forecast_revision_count}
              </span>
            )}
          </div>

          {/* Progress Bar & percentage */}
          <div className="flex items-center space-x-1.5 w-24">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isCompleted ? 'bg-emerald-500' : task.progress > 70 ? 'bg-blue-600' : 'bg-slate-400'
                }`}
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 w-7 text-right">{task.progress}%</span>
          </div>

          {/* Indicators for comments & attachments */}
          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
            {(task.comment_count || 0) > 0 && (
              <span className="flex items-center space-x-0.5 text-slate-500" title={`${task.comment_count} notes/comments`}>
                <MessageSquare className="w-3 h-3" />
                <span>{task.comment_count}</span>
              </span>
            )}
            {(task.attachment_count || 0) > 0 && (
              <span className="flex items-center space-x-0.5 text-slate-500" title={`${task.attachment_count} attachments`}>
                <Paperclip className="w-3 h-3" />
                <span>{task.attachment_count}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
