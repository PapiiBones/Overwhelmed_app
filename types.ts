export enum Importance {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
}

export interface Subtask {
  id: string;
  content: string;
  completed: boolean;
}

export interface Task {
  id:string;
  content: string;
  contact?: string;
  timestamp: string;
  importance: Importance;
  dueDate?: string;
  completed: boolean;
  projectId?: string;
  isProcessing?: boolean;
  notes?: string;
  isPriority?: boolean;
  recurrenceRule?: RecurrenceRule;
  subtasks?: Subtask[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface UndoState {
  task: Task;
  index: number;
}

export interface AnalysisReport {
  summary: string;
  priorities: string[];
}

export type SortBy = 'timestamp' | 'importance' | 'dueDate';

export type ModalState =
  | { type: 'none' }
  | { type: 'task-detail'; task: Task }
  | { type: 'ai-analysis'; report: AnalysisReport | null }
  | { type: 'chatbot' };