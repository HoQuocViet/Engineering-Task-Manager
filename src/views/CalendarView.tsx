import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { Task, OutlookEvent } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Video,
  CalendarCheck,
  ExternalLink,
  PlusCircle,
  Clock,
} from 'lucide-react';
import { isOverdue } from '../lib/dateUtils';
import { OutlookEventModal } from '../components/calendar/OutlookEventModal';
import { MeetingModal } from '../components/calendar/MeetingModal';
import { getHeaderBoxClasses, getHeaderBoxStyle } from '../lib/headerTheme';

// Helper to format Date to local 'YYYY-MM-DD' without UTC timezone offset issues
const formatDateYmd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Returns Sunday of the week containing the given date
const getSundayOfWeek = (d: Date): Date => {
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = result.getDay(); // 0 is Sunday
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
};

// Returns the initial calendar start Sunday for a given month and year
const getInitialStartDateForMonth = (year: number, month: number): Date => {
  const firstOfMonth = new Date(year, month, 1);
  return getSundayOfWeek(firstOfMonth);
};

export const CalendarView: React.FC = () => {
  const { setSelectedTaskId, openNewTaskModal, filterProjectId, filterPackageId, dataVersion, showToast, workspaceBranding } = useApp();

  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date();
    return getInitialStartDateForMonth(now.getFullYear(), now.getMonth());
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const lastWheelTime = useRef(0);

  // Calendar Meetings (MS Teams) States
  const [meetings, setMeetings] = useState<OutlookEvent[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<OutlookEvent | null>(null);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingToEdit, setMeetingToEdit] = useState<OutlookEvent | null>(null);
  const [initialDateForMeeting, setInitialDateForMeeting] = useState<string>('');

  // Right-Click Context Menu on Calendar Days
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    dateStr: string;
  } | null>(null);

  const fetchCalendarTasks = async () => {
    setLoading(true);
    try {
      const res = await api.getTasks({
        projectId: filterProjectId || undefined,
        packageId: filterPackageId || undefined,
        limit: 500,
        sort: 'deadline_asc',
      });
      setTasks(res.tasks);
    } catch (err: any) {
      showToast(`Error loading calendar tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetingsData = async () => {
    try {
      const res = await api.getOutlookEvents();
      setMeetings(res.events || []);
    } catch (err) {
      console.warn('Could not load calendar meetings:', err);
    }
  };

  useEffect(() => {
    fetchCalendarTasks();
  }, [filterProjectId, filterPackageId, dataVersion]);

  useEffect(() => {
    fetchMeetingsData();
  }, []);

  // Close context menu on any global click or Esc
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Reference date around the middle of the 6 visible weeks (day 17) to determine dominant month/year
  const referenceDate = useMemo(() => {
    return new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 17);
  }, [startDate]);

  const displayMonth = referenceDate.getMonth();
  const displayYear = referenceDate.getFullYear();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Scroll by 1 week (7 days)
  const scrollWeek = (deltaWeeks: number) => {
    setStartDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + deltaWeeks * 7);
      return next;
    });
  };

  const prevMonth = () => {
    const target = new Date(displayYear, displayMonth - 1, 1);
    setStartDate(getInitialStartDateForMonth(target.getFullYear(), target.getMonth()));
  };

  const nextMonth = () => {
    const target = new Date(displayYear, displayMonth + 1, 1);
    setStartDate(getInitialStartDateForMonth(target.getFullYear(), target.getMonth()));
  };

  const setToday = () => {
    const now = new Date();
    setStartDate(getInitialStartDateForMonth(now.getFullYear(), now.getMonth()));
  };

  const handleWheel = (e: React.WheelEvent) => {
    const target = e.target as HTMLElement;
    const taskContainer = target?.closest('.task-cell-scroll');
    if (taskContainer && taskContainer.scrollHeight > taskContainer.clientHeight) {
      const atTop = taskContainer.scrollTop === 0;
      const atBottom = Math.abs(taskContainer.scrollHeight - taskContainer.clientHeight - taskContainer.scrollTop) < 2;
      if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) {
        return;
      }
    }

    const now = Date.now();
    if (now - lastWheelTime.current < 200) return;

    if (e.deltaY > 10 || e.deltaX > 10) {
      lastWheelTime.current = now;
      scrollWeek(1);
    } else if (e.deltaY < -10 || e.deltaX < -10) {
      lastWheelTime.current = now;
      scrollWeek(-1);
    }
  };

  // 6 weeks of 7 days (42 grid cells) starting from startDate
  const calendarDays = useMemo(() => {
    const days = [];
    const totalCells = 42;

    for (let i = 0; i < totalCells; i++) {
      const thisDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const dateStr = formatDateYmd(thisDate);
      days.push({
        date: thisDate,
        dateStr,
        dayNum: thisDate.getDate(),
        month: thisDate.getMonth(),
        year: thisDate.getFullYear(),
        isCurrentMonth: thisDate.getMonth() === displayMonth,
      });
    }

    return days;
  }, [startDate, displayMonth]);

  // Group tasks by deadline date string
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.deadline) {
        if (!map[t.deadline]) map[t.deadline] = [];
        map[t.deadline].push(t);
      }
    });
    return map;
  }, [tasks]);

  // Group meetings by start_date
  const meetingsByDate = useMemo(() => {
    const map: Record<string, OutlookEvent[]> = {};
    meetings.forEach((evt) => {
      if (evt.start_date) {
        if (!map[evt.start_date]) map[evt.start_date] = [];
        map[evt.start_date].push(evt);
      }
    });
    return map;
  }, [meetings]);

  const todayStr = useMemo(() => formatDateYmd(new Date()), []);

  // Context menu trigger
  const handleDayContextMenu = (e: React.MouseEvent, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Position menu within viewport boundaries
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 150);
    setContextMenu({
      isOpen: true,
      x,
      y,
      dateStr,
    });
  };

  const handleOpenAddMeeting = (dateStr: string) => {
    setInitialDateForMeeting(dateStr);
    setMeetingToEdit(null);
    setIsMeetingModalOpen(true);
    setContextMenu(null);
  };

  const handleOpenAddTaskForDate = (dateStr: string) => {
    openNewTaskModal();
    setContextMenu(null);
  };

  const handleEditMeeting = (evt: OutlookEvent) => {
    setSelectedMeeting(null);
    setMeetingToEdit(evt);
    setIsMeetingModalOpen(true);
  };

  const handleDeleteMeeting = async (id: string) => {
    try {
      await api.deleteMeeting(id);
      showToast('Meeting deleted from calendar.');
      fetchMeetingsData();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div 
      onWheel={handleWheel}
      className="flex-1 bg-slate-50 dark:bg-slate-950 p-1 flex flex-col min-h-0 overflow-hidden space-y-1.5 transition-colors select-none"
    >
      {/* Calendar Header */}
      <div
        className={`shrink-0 min-h-[62px] sm:h-[62px] ${getHeaderBoxClasses(workspaceBranding)} rounded-xl px-3.5 py-2 sm:px-4 sm:py-2 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all`}
        style={getHeaderBoxStyle(workspaceBranding)}
      >
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-white/15 backdrop-blur-xs border border-white/20 shrink-0">
              <CalendarIcon className="w-4 h-4 text-sky-200" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
              DEADLINES & CALENDAR TIMELINES
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 backdrop-blur-xs text-sky-200 font-semibold border border-white/20">
              TIMELINE
            </span>
          </div>
          <p className="text-xs text-sky-100/90 hidden sm:block">
            Visual monthly timeline showing deliverable target dates, milestone deadlines & scheduled MS Teams meetings. Right-click any day to add meetings.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Today */}
          <button
            onClick={setToday}
            className="text-xs px-2.5 py-1 bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/20 rounded-lg text-white font-medium cursor-pointer transition-colors"
          >
            Today
          </button>

          {/* Month Switcher */}
          <div className="flex items-center bg-white/15 border border-white/20 rounded-lg shadow-2xs text-white">
            <button
              onClick={prevMonth}
              title="Previous Month"
              className="p-1 hover:bg-white/15 text-white/90 hover:text-white rounded-l border-r border-white/20 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 text-xs font-bold text-white min-w-[120px] text-center font-mono select-none">
              {monthNames[displayMonth]} {displayYear}
            </span>
            <button
              onClick={nextMonth}
              title="Next Month"
              className="p-1 hover:bg-white/15 text-white/90 hover:text-white rounded-r border-l border-white/20 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Add MS Teams Meeting Button */}
          <button
            onClick={() => handleOpenAddMeeting(todayStr)}
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
            title="Schedule an MS Teams meeting on the calendar"
          >
            <Video className="w-3.5 h-3.5" />
            <span>New Meeting</span>
          </button>

          {/* Add Task Button */}
          <button
            onClick={() => openNewTaskModal()}
            className="bg-white hover:bg-sky-50 active:bg-sky-100 text-[#0b3b70] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden flex flex-col">
        {/* Days of Week Header */}
        <div className="shrink-0 grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-300 select-none text-center py-2">
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* Days Cells Grid (6 weeks, 7 columns) */}
        <div className="grid grid-cols-7 grid-rows-6 flex-1 min-h-0 divide-x divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
          {calendarDays.map((d) => {
            const dayTasks = tasksByDate[d.dateStr] || [];
            const dayMeetings = meetingsByDate[d.dateStr] || [];
            const isToday = d.dateStr === todayStr;

            return (
              <div
                key={d.dateStr}
                onContextMenu={(e) => handleDayContextMenu(e, d.dateStr)}
                className={`p-1 sm:p-1.5 flex flex-col min-h-0 overflow-hidden transition-colors relative group/cell ${
                  !d.isCurrentMonth
                    ? 'bg-slate-50/60 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600'
                    : isToday
                    ? 'bg-blue-50/30 dark:bg-blue-950/20'
                    : 'bg-white dark:bg-slate-900'
                }`}
              >
                {/* Cell Header: Day Number */}
                <div className="flex justify-between items-center mb-0.5 shrink-0">
                  <span
                    className={`text-xs font-mono font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-[#0b3b70] text-white shadow-2xs'
                        : d.isCurrentMonth
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {d.dayNum}
                  </span>
                  <div className="flex items-center space-x-1">
                    {dayMeetings.length > 0 && (
                      <span className="text-[9px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-1 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-0.5" title={`${dayMeetings.length} MS Teams meeting${dayMeetings.length > 1 ? 's' : ''}`}>
                        <Video className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                        {dayMeetings.length}
                      </span>
                    )}
                    {dayTasks.length > 0 && (
                      <span className="text-[9px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded border border-slate-200 dark:border-slate-700">
                        {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                    {/* Hover quick action to add meeting */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddMeeting(d.dateStr);
                      }}
                      title="Add MS Teams meeting for this date"
                      className="opacity-0 group-hover/cell:opacity-100 p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-opacity cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Day Items List (MS Teams Meetings + Task Deadlines) */}
                <div className="task-cell-scroll flex-1 min-h-0 space-y-1 overflow-y-auto">
                  {/* MS Teams Meetings */}
                  {dayMeetings.map((evt) => {
                    const timeStr = evt.is_all_day ? 'All day' : (evt.start_time ? evt.start_time.slice(11, 16) : '');
                    const hasLink = Boolean(evt.meeting_link && evt.meeting_link.trim());

                    return (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedMeeting(evt)}
                        className="w-full text-left text-[10px] p-1 rounded-md border leading-tight transition-all hover:scale-[1.01] block cursor-pointer bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/80 text-indigo-950 dark:text-indigo-200 shadow-2xs hover:border-indigo-400 group/meeting"
                        title={`[MS Teams Meeting] ${evt.subject} (${timeStr})${hasLink ? ' - Click Join icon to enter call' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center space-x-1 truncate font-semibold">
                            <Video className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span className="truncate">{evt.subject}</span>
                          </div>
                          {hasLink && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(evt.meeting_link, '_blank');
                              }}
                              title="Join MS Teams Meeting directly"
                              className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[8.5px] font-bold shrink-0 flex items-center gap-0.5 shadow-2xs transition-colors cursor-pointer"
                            >
                              <span>Join</span>
                              <ExternalLink className="w-2 h-2" />
                            </button>
                          )}
                        </div>
                        {timeStr && (
                          <div className="text-[8px] font-mono text-indigo-700/80 dark:text-indigo-300/80 pl-3.5 truncate">
                            {timeStr} {evt.location ? `• ${evt.location}` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Tasks */}
                  {dayTasks.map((t) => {
                    const isTaskDone = t.status === 'DONE';
                    const overdue = isOverdue(t.deadline, t.status);

                    let badgeColor = 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';
                    if (isTaskDone) {
                      badgeColor = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 line-through opacity-70';
                    } else if (overdue) {
                      badgeColor = 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold';
                    } else if (t.priority === 'CRITICAL') {
                      badgeColor = 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold';
                    } else if (t.priority === 'HIGH') {
                      badgeColor = 'bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300';
                    }

                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTaskId(t.id)}
                        className={`w-full text-left text-[10px] p-1 rounded border leading-tight truncate transition-transform hover:scale-[1.01] block cursor-pointer ${badgeColor}`}
                        title={`${t.title} (${t.priority}) - ${t.status}`}
                      >
                        <div className="truncate font-medium">{t.title}</div>
                        {t.package_code && (
                          <div className="text-[8px] font-mono opacity-80">{t.package_code}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1.5 px-1 min-w-[200px] text-xs animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1 text-[10.5px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
            {contextMenu.dateStr}
          </div>
          <button
            type="button"
            onClick={() => handleOpenAddMeeting(contextMenu.dateStr)}
            className="w-full px-2.5 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer font-medium"
          >
            <Video className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Add MS Teams Meeting</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAddTaskForDate(contextMenu.dateStr)}
            className="w-full px-2.5 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>Add New Task</span>
          </button>
        </div>
      )}

      {/* Meeting Details View Modal */}
      <OutlookEventModal
        event={selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        onEdit={handleEditMeeting}
        onDelete={handleDeleteMeeting}
      />

      {/* Create / Edit MS Teams Meeting Modal */}
      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => {
          setIsMeetingModalOpen(false);
          setMeetingToEdit(null);
        }}
        onSaved={fetchMeetingsData}
        initialDate={initialDateForMeeting}
        meetingToEdit={meetingToEdit}
        showToast={showToast}
      />
    </div>
  );
};
