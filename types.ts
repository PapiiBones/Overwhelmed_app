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

export interface Tag {
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
  tagIds?: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ToastState {
  type: 'undo' | 'error' | 'info';
  message: string;
  onAction?: () => void;
  actionText?: string;
  data?: any; // For undo state
}


export interface AnalysisReport {
  summary: string;
  priorities: string[];
}

export interface User {
  email: string;
}

export type SortBy = 'timestamp' | 'importance' | 'dueDate';

export type Theme = 'light' | 'dark' | 'system';
export type ReminderTime = 5 | 10 | 15 | 30 | 60;

export interface AppSettings {
    theme: Theme;
    aiEnabled: boolean;
    apiKey: string;
    reminderTime: ReminderTime;
}

export interface AppState {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  chatHistory: ChatMessage[];
  toastState: ToastState | null;
  settings: AppSettings;
}


export type ModalState =
  | { type: 'none' }
  | { type: 'task-detail'; task: Task }
  | { type: 'ai-analysis'; report: AnalysisReport | null }
  | { type: 'chatbot' }
  | { type: 'login' }
  | { type: 'settings' };