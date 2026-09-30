import { Task } from '../types';

/**
 * Priority numeric weighting (Lower number = higher in the list)
 */
export function getPriorityWeight(priority?: string): number {
  switch (priority?.toUpperCase()) {
    case 'CRITICAL':
      return 1;
    case 'HIGH':
      return 2;
    case 'MEDIUM':
      return 3;
    case 'LOW':
      return 4;
    default:
      return 5;
  }
}

/**
 * Standard EPC Task Sorter:
 * 1. Active items sorted by Priority: CRITICAL -> HIGH -> MEDIUM -> LOW -> Unassigned
 * 2. Inactive/Closed items (DONE, CANCELLED) placed at the bottom of the list
 * 3. Within each priority section: sorted by NEAREST date (forecast_finish or deadline) to the top
 * 4. Secondary sort by created_at DESC
 */
export function sortTasksByPriorityAndDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aIsClosed = a.status === 'DONE' || a.status === 'CANCELLED';
    const bIsClosed = b.status === 'DONE' || b.status === 'CANCELLED';

    // 1. Closed/Done/Cancelled tasks go to the bottom of the list
    if (aIsClosed && !bIsClosed) return 1;
    if (!aIsClosed && bIsClosed) return -1;

    // If both are closed (DONE or CANCELLED)
    if (aIsClosed && bIsClosed) {
      // Sort closed items by completion date / deadline / created_at (most recent first)
      const dateA = a.completed_date || a.forecast_finish || a.deadline || a.created_at || '';
      const dateB = b.completed_date || b.forecast_finish || b.deadline || b.created_at || '';
      if (dateA && dateB) {
        if (dateA !== dateB) return dateB.localeCompare(dateA);
      } else if (dateA && !dateB) return -1;
      else if (!dateA && dateB) return 1;
      return (b.id || '').localeCompare(a.id || '');
    }

    // 2. Both are active: Sort by Priority (CRITICAL=1 -> HIGH=2 -> MEDIUM=3 -> LOW=4 -> 5)
    const weightA = getPriorityWeight(a.priority);
    const weightB = getPriorityWeight(b.priority);
    if (weightA !== weightB) {
      return weightA - weightB;
    }

    // 3. Within the same priority section: Sort by NEAREST date (forecast_finish or deadline)
    // Nearest date comes first (ascending order e.g. overdue -> today -> tomorrow -> next week)
    const targetDateA = a.forecast_finish || a.deadline || a.start_date || '';
    const targetDateB = b.forecast_finish || b.deadline || b.start_date || '';

    if (targetDateA && targetDateB) {
      if (targetDateA !== targetDateB) {
        return targetDateA.localeCompare(targetDateB);
      }
    } else if (targetDateA && !targetDateB) {
      // Tasks with explicit target date come before tasks with no date
      return -1;
    } else if (!targetDateA && targetDateB) {
      return 1;
    }

    // 4. If dates are identical or missing, sort by created_at DESC (newest first)
    const createdA = a.created_at || '';
    const createdB = b.created_at || '';
    if (createdA !== createdB) {
      return createdB.localeCompare(createdA);
    }

    return (b.id || '').localeCompare(a.id || '');
  });
}
