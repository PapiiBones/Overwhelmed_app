import { Task, Importance, SortBy } from '../types';

const importanceOrder: Importance[] = [Importance.CRITICAL, Importance.HIGH, Importance.MEDIUM, Importance.LOW];

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
      case 'importance':
        return importanceOrder.indexOf(a.importance) - importanceOrder.indexOf(b.importance);
      case 'dueDate':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case 'timestamp':
      default:
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
  });
  };
