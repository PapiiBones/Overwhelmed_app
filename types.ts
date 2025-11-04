// Fix: Add React import for React.ReactNode type
import React from 'react';

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

export interface Contact {
  id: string;
  name: string;
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
  contactId?: string;
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
  dependencies?: string[];
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
  data?: any; 
}

export interface PriorityTask {
  taskId: string;
  content: string;
}

export interface Bottleneck {
  blockingTaskId: string;
  blockedTaskIds: string[];
  reason: string;
}

export interface SuggestedGroup {
  name: string;
  taskIds: string[];
  reason: string;
}

export interface AnalysisReport {
  summary: string;
  priorities: PriorityTask[];
  bottlenecks?: Bottleneck[];
  suggestedGroups?: SuggestedGroup[];
}


export interface User {
  email: string;
}

export type SortBy =
  | 'timestamp_desc'
  | 'timestamp_asc'
  | 'importance_desc'
  | 'importance_asc'
  | 'dueDate_asc'
  | 'dueDate_desc';

export type Theme = 'light' | 'dark' | 'system';
export type ReminderTime = 5 | 10 | 15 | 30 | 60;

export interface AppSettings {
    theme: Theme;
    aiEnabled: boolean;
    reminderTime: ReminderTime;
}

export interface SidebarItem {
    id: string;
    type: 'inbox' | 'today' | 'upcoming' | 'calendar' | 'project' | 'tag';
    label: string;
    icon?: React.ReactNode;
    color?: string; // For projects and tags
    isEditable: boolean;
    isDeletable: boolean;
}


export interface AppState {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  contacts: Contact[];
  sidebarItems: SidebarItem[];
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
  | { type: 'settings' }
  | { type: 'email-processor' };