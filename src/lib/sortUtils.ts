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
 * Authoritative Default Task Sorter:
 * Default ordering MUST be created_at DESC (newest created tasks appear at the TOP).
 * Editing priority, status, deadline, forecast, PIC, category, or tag MUST NOT
 * move a task to another position.
 */
export function sortTasksDefault(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const createdA = a.created_at || '';
    const createdB = b.created_at || '';
    if (createdA !== createdB) {
      return createdB.localeCompare(createdA);
    }
    return (b.id || '').localeCompare(a.id || '');
  });
}

/**
 * Backward compatibility alias: adheres to authoritative rule that default
 * task sorting is created_at DESC so editing fields does not shift task position.
 */
export function sortTasksByPriorityAndDate(tasks: Task[]): Task[] {
  return sortTasksDefault(tasks);
}
