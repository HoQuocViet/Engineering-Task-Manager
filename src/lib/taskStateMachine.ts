export type TaskStatus = 'TODO' | 'IN PROGRESS' | 'WAITING' | 'ON HOLD' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TaskStateInput {
  status?: string;
  progress?: number | string | null;
  completedDate?: string | null;
  existingStatus?: string;
  existingProgress?: number | string | null;
  existingCompletedDate?: string | null;
  today?: string;
}

export interface NormalizedTaskState {
  status: TaskStatus;
  progress: number;
  completed_date: string | null;
}

export function getTodayYmdString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Authoritative Task State Machine & Normalization Engine.
 *
 * Rules:
 * 1. DONE: progress is strictly 100%, completed_date must be set (defaults to today).
 * 2. TODO: progress is strictly 0%, completed_date is null.
 * 3. IN PROGRESS: progress must be 1..99% (defaults to 50% if transitioning from 0 or 100), completed_date is null.
 * 4. WAITING / ON HOLD: progress must be 0..99% (cannot be 100%; capped to 50 or existing if 100), completed_date is null.
 * 5. CANCELLED: progress preserved if <= 99% (or capped to 0), completed_date is null.
 *
 * Cross-synchronization:
 * - Setting progress to 100% -> status becomes DONE, completed_date = today.
 * - Setting progress to 0% -> status becomes TODO, completed_date = null.
 * - Setting progress to 1..99% from TODO or DONE -> status becomes IN PROGRESS, completed_date = null.
 * - Setting status to DONE -> progress becomes 100%, completed_date = today.
 * - Setting status to TODO -> progress becomes 0%, completed_date = null.
 * - Setting status from DONE to WAITING/ON HOLD -> progress becomes 50% (or existing < 100), completed_date = null.
 */
export function normalizeTaskState(input: TaskStateInput): NormalizedTaskState {
  const today = input.today || getTodayYmdString();

  const prevStatus = (input.existingStatus as TaskStatus) || 'TODO';
  const prevProgress = input.existingProgress !== undefined && input.existingProgress !== null
    ? Math.max(0, Math.min(100, Math.round(Number(input.existingProgress))))
    : 0;

  const hasStatusUpdate = input.status !== undefined && input.status !== null;
  const hasProgressUpdate = input.progress !== undefined && input.progress !== null;

  let rawStatus = hasStatusUpdate ? String(input.status).toUpperCase().trim() : prevStatus;
  const validStatuses: TaskStatus[] = ['TODO', 'IN PROGRESS', 'WAITING', 'ON HOLD', 'DONE', 'CANCELLED'];
  if (!validStatuses.includes(rawStatus as TaskStatus)) {
    rawStatus = prevStatus;
  }

  let rawProgress = hasProgressUpdate
    ? Math.max(0, Math.min(100, Math.round(Number(input.progress))))
    : prevProgress;

  let completedDate = input.completedDate !== undefined
    ? (input.completedDate ? String(input.completedDate).slice(0, 10) : null)
    : (input.existingCompletedDate ? String(input.existingCompletedDate).slice(0, 10) : null);

  // Scenario 1: Only progress was explicitly provided (status was omitted)
  if (hasProgressUpdate && !hasStatusUpdate) {
    if (rawProgress === 100) {
      return {
        status: 'DONE',
        progress: 100,
        completed_date: completedDate || today,
      };
    } else if (rawProgress === 0) {
      return {
        status: 'TODO',
        progress: 0,
        completed_date: null,
      };
    } else {
      // 1 <= rawProgress <= 99
      let nextStatus: TaskStatus = prevStatus;
      if (prevStatus === 'DONE' || prevStatus === 'TODO') {
        nextStatus = 'IN PROGRESS';
      }
      return {
        status: nextStatus,
        progress: rawProgress,
        completed_date: null,
      };
    }
  }

  // Scenario 2: Only status was explicitly provided (progress was omitted)
  if (hasStatusUpdate && !hasProgressUpdate) {
    if (rawStatus === 'DONE') {
      return {
        status: 'DONE',
        progress: 100,
        completed_date: completedDate || today,
      };
    } else if (rawStatus === 'TODO') {
      return {
        status: 'TODO',
        progress: 0,
        completed_date: null,
      };
    } else if (rawStatus === 'IN PROGRESS') {
      const p = prevProgress > 0 && prevProgress < 100 ? prevProgress : 50;
      return {
        status: 'IN PROGRESS',
        progress: p,
        completed_date: null,
      };
    } else if (rawStatus === 'WAITING' || rawStatus === 'ON HOLD') {
      const p = prevProgress === 100 ? 50 : prevProgress;
      return {
        status: rawStatus as TaskStatus,
        progress: p,
        completed_date: null,
      };
    } else if (rawStatus === 'CANCELLED') {
      const p = prevProgress === 100 ? 50 : prevProgress;
      return {
        status: 'CANCELLED',
        progress: p,
        completed_date: null,
      };
    }
  }

  // Scenario 3: Both were provided or neither
  if (rawStatus === 'DONE') {
    return {
      status: 'DONE',
      progress: 100,
      completed_date: completedDate || today,
    };
  } else if (rawStatus === 'TODO') {
    return {
      status: 'TODO',
      progress: 0,
      completed_date: null,
    };
  } else if (rawStatus === 'IN PROGRESS') {
    let p = rawProgress;
    if (p <= 0 || p >= 100) {
      p = 50;
    }
    return {
      status: 'IN PROGRESS',
      progress: p,
      completed_date: null,
    };
  } else {
    // WAITING, ON HOLD, CANCELLED
    let p = Math.min(99, Math.max(0, rawProgress));
    return {
      status: rawStatus as TaskStatus,
      progress: p,
      completed_date: null,
    };
  }
}

/**
 * Derived Task Health Indicator (Section 32).
 * This does NOT alter the database or mutate priority/status; it is a derived indicator for UX and AI insights.
 */
export type TaskHealthStatus = 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' | 'COMPLETED' | 'CANCELLED';

export interface TaskHealth {
  status: TaskHealthStatus;
  label: string;
  reasons: string[];
}

export function computeTaskHealth(
  task: {
    status?: string;
    priority?: string;
    deadline?: string | null;
    forecast_finish?: string | null;
    forecast_revision_count?: number | null;
  },
  todayStr?: string
): TaskHealth {
  const today = todayStr || getTodayYmdString();
  const status = (task.status || 'TODO').toUpperCase();
  const priority = (task.priority || 'MEDIUM').toUpperCase();
  const deadline = task.deadline || null;
  const forecast = task.forecast_finish || null;
  const revCount = Number(task.forecast_revision_count) || 0;

  if (status === 'DONE') {
    return { status: 'COMPLETED', label: 'Completed', reasons: ['Task completed'] };
  }
  if (status === 'CANCELLED') {
    return { status: 'CANCELLED', label: 'Cancelled', reasons: ['Task cancelled'] };
  }

  const reasons: string[] = [];
  const isOverdue = Boolean(deadline && deadline < today);
  const isForecastDelayed = Boolean(forecast && deadline && forecast > deadline);
  const isForecastPastToday = Boolean(forecast && forecast < today);

  if (isOverdue) reasons.push(`Deadline passed (${deadline})`);
  if (isForecastDelayed) reasons.push(`Forecast finish (${forecast}) is past deadline (${deadline})`);
  if (revCount >= 2) reasons.push(`Forecast revised ${revCount} times`);
  if (status === 'WAITING') reasons.push('Currently Waiting on external feedback');

  if (isOverdue || (priority === 'CRITICAL' && isForecastDelayed) || revCount >= 3) {
    return { status: 'CRITICAL', label: 'Critical Risk', reasons };
  }
  if (isForecastDelayed || isForecastPastToday || revCount >= 2 || status === 'WAITING') {
    return { status: 'AT_RISK', label: 'At Risk', reasons };
  }

  return { status: 'ON_TRACK', label: 'On Track', reasons: reasons.length ? reasons : ['Within schedule'] };
}
