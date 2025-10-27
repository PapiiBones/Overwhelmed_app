import { RecurrenceRule } from '../types';

export const calculateNextDueDate = (currentDueDate: string, rule: RecurrenceRule): string => {
  const date = new Date(currentDueDate);
  const interval = rule.interval || 1;

  switch (rule.frequency) {
    case 'daily':
      date.setDate(date.getDate() + interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7 * interval);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + interval);
      break;
  }
  return date.toISOString();
 };
