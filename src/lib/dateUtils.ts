import { TaskStatus } from '../types';

export function getTodayYmd(): string {
  return new Date().toISOString().split('T')[0];
}

export function parseDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

export function isOverdue(deadline?: string | null, status?: TaskStatus): boolean {
  if (!deadline || status === 'DONE' || status === 'CANCELLED') return false;
  const today = getTodayYmd();
  return deadline < today;
}

export function isDueToday(deadline?: string | null, status?: TaskStatus): boolean {
  if (!deadline || status === 'DONE' || status === 'CANCELLED') return false;
  const today = getTodayYmd();
  return deadline === today;
}

export function isDueTomorrow(deadline?: string | null, status?: TaskStatus): boolean {
  if (!deadline || status === 'DONE' || status === 'CANCELLED') return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  return deadline === tomorrowStr;
}

export function isDueThisWeek(deadline?: string | null, status?: TaskStatus): boolean {
  if (!deadline || status === 'DONE' || status === 'CANCELLED') return false;
  const today = getTodayYmd();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  return deadline >= today && deadline <= nextWeekStr;
}

export function getDaysDifference(targetDateStr?: string | null, baseDateStr?: string | null): number | null {
  if (!targetDateStr) return null;
  const target = parseDate(targetDateStr);
  const base = baseDateStr ? parseDate(baseDateStr) : parseDate(getTodayYmd());
  if (!target || !base) return null;
  const diffTime = target.getTime() - base.getTime();
  return Math.round(diffTime / (1000 * 3600 * 24));
}

export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateDdMmYyyy(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function formatDateTimeDisplay(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const parsed = parseDate(dateStr);
      if (!parsed) return dateStr;
      return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch (e) {
    return dateStr;
  }
}

export interface DeadlineBadgeInfo {
  label: string;
  daysText: string;
  formattedDate: string;
  fullDescription: string;
  type: 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'upcoming' | 'done' | 'none';
  colorClass: string;
  bgClass: string;
  borderClass: string;
  daysDiff: number | null;
  overdueDays: number | null;
  remainingDays: number | null;
}

export function getDeadlineBadge(deadline?: string | null, status?: TaskStatus, forecastFinish?: string | null): DeadlineBadgeInfo {
  const formattedDate = formatDateDisplay(deadline);

  if (status === 'DONE') {
    return {
      label: 'Completed',
      daysText: 'Done',
      formattedDate,
      fullDescription: `Completed (Deadline: ${formattedDate})`,
      type: 'done',
      colorClass: 'text-emerald-700 font-semibold',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
      daysDiff: null,
      overdueDays: null,
      remainingDays: null,
    };
  }

  if (!deadline) {
    return {
      label: 'No deadline',
      daysText: '—',
      formattedDate: '—',
      fullDescription: 'No deadline set',
      type: 'none',
      colorClass: 'text-slate-400',
      bgClass: 'bg-slate-50',
      borderClass: 'border-slate-200',
      daysDiff: null,
      overdueDays: null,
      remainingDays: null,
    };
  }

  const days = getDaysDifference(deadline);

  if (days === null) {
    return {
      label: formattedDate,
      daysText: formattedDate,
      formattedDate,
      fullDescription: `Deadline: ${formattedDate}`,
      type: 'upcoming',
      colorClass: 'text-slate-700',
      bgClass: 'bg-slate-50',
      borderClass: 'border-slate-200',
      daysDiff: null,
      overdueDays: null,
      remainingDays: null,
    };
  }

  if (days < 0) {
    const overdueDays = Math.abs(days);
    return {
      label: `Overdue ${overdueDays}d`,
      daysText: `+${overdueDays}d overdue`,
      formattedDate,
      fullDescription: `Overdue by ${overdueDays} days (Deadline: ${formattedDate})`,
      type: 'overdue',
      colorClass: 'text-rose-700 font-semibold',
      bgClass: 'bg-rose-50',
      borderClass: 'border-rose-300',
      daysDiff: days,
      overdueDays,
      remainingDays: null,
    };
  }

  if (days === 0) {
    return {
      label: 'Due today',
      daysText: 'Today (0d)',
      formattedDate,
      fullDescription: `Due today (${formattedDate})`,
      type: 'today',
      colorClass: 'text-amber-800 font-bold',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-300',
      daysDiff: 0,
      overdueDays: null,
      remainingDays: 0,
    };
  }

  if (days === 1) {
    return {
      label: 'Due tomorrow',
      daysText: '1d left',
      formattedDate,
      fullDescription: `Due tomorrow (${formattedDate})`,
      type: 'tomorrow',
      colorClass: 'text-amber-700 font-semibold',
      bgClass: 'bg-amber-50/80',
      borderClass: 'border-amber-200',
      daysDiff: 1,
      overdueDays: null,
      remainingDays: 1,
    };
  }

  if (days <= 7) {
    return {
      label: `${days}d left`,
      daysText: `${days}d left`,
      formattedDate,
      fullDescription: `${days} days remaining (Deadline: ${formattedDate})`,
      type: 'this_week',
      colorClass: 'text-blue-700 font-semibold',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      daysDiff: days,
      overdueDays: null,
      remainingDays: days,
    };
  }

  return {
    label: `${days}d left`,
    daysText: `${days}d left`,
    formattedDate,
    fullDescription: `${days} days remaining (Deadline: ${formattedDate})`,
    type: 'upcoming',
    colorClass: 'text-slate-700 font-medium',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
    daysDiff: days,
    overdueDays: null,
    remainingDays: days,
  };
}

export function getScheduleVariance(deadline?: string | null, forecastFinish?: string | null): { text: string; isLate: boolean; days: number } | null {
  if (!deadline || !forecastFinish) return null;
  const varianceDays = getDaysDifference(forecastFinish, deadline);
  if (varianceDays === null || varianceDays === 0) return null;

  if (varianceDays > 0) {
    return {
      text: `+${varianceDays}d late vs baseline`,
      isLate: true,
      days: varianceDays,
    };
  } else {
    return {
      text: `${varianceDays}d early`,
      isLate: false,
      days: varianceDays,
    };
  }
}
