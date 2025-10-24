
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

export interface Task {
  id: string;
  content: string;
  contact?: string;
  timestamp: string;
  importance: Importance;
  dueDate?: string;
  completed: boolean;
  projectId?: string;
  isProcessing?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface UndoState {
  task: Task;
  index: number;
}