import { Task, Importance, SortBy } from '../types';

const importanceOrder: Importance[] = [Importance.CRITICAL, Importance.HIGH, Importance.MEDIUM, Importance.LOW];

/**
 * Sorts tasks based on a specific hierarchy and a selected sort criteria.
 * The sorting order is as follows:
 * 1. Active tasks appear before completed tasks.
 * 2. Within active tasks, priority tasks (isPriority=true) appear first.
 * 3. Within both priority and non-priority groups, the selected `sortBy` criteria is applied.
 */
export const sortTasks = (tasks: Task[], sortBy: SortBy): Task[] => {
  return [...tasks].sort((a, b) => {
    // 1. Completed tasks always at the bottom
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // 2. Priority tasks bubble up to the top of active tasks
    if (a.isPriority !== b.isPriority) {
      return a.isPriority ? -1 : 1;
    }
    
    // 3. Apply selected sort criteria
    switch (sortBy) {
      case 'importance_desc':
        return importanceOrder.indexOf(a.importance) - importanceOrder.indexOf(b.importance);
      case 'importance_asc':
        return importanceOrder.indexOf(b.importance) - importanceOrder.indexOf(a.importance);
      
      case 'dueDate_asc':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case 'dueDate_desc':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();

      case 'timestamp_asc':
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      case 'timestamp_desc':
      default:
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
  });
};