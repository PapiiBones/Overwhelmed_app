import { Importance } from './types';

export const IMPORTANCE_STYLES: { [key in Importance]: { border: string; text: string; bg: string; } } = {
  [Importance.LOW]: {
    border: 'border-l-sky-500',
    text: 'text-sky-400',
    bg: 'bg-sky-500/10'
  },
  [Importance.MEDIUM]: {
    border: 'border-l-yellow-500',
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/10'
  },
  [Importance.HIGH]: {
    border: 'border-l-orange-500',
    text: 'text-orange-400',
    bg: 'bg-orange-500/10'
  },
  [Importance.CRITICAL]: {
    border: 'border-l-red-500',
    text: 'text-red-400',
    bg: 'bg-red-500/10'
  },
};

export const PROJECT_COLORS = [
  '#ef4444', 
  '#f97316', 
  '#eab308', 
  '#84cc16', 
  '#22c55e', 
  '#14b8a6', 
  '#06b6d4', 
  '#3b82f6', 
  '#8b5cf6', 
  '#d946ef', 
  '#ec4899', 
];
