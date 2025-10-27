import { useReducer } from 'react';
import { Task, Project, ChatMessage, ToastState, AppSettings, Tag } from '../types';

export interface AppState {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  chatHistory: ChatMessage[];
  toastState: ToastState | null;
  settings: AppSettings;
}

type Action =
  | { type: 'REPLACE_STATE'; payload: Partial<AppState> }
  | { type: 'RESET_STATE' }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updatedFields: Partial<Omit<Task, 'id' | 'timestamp'>> } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'ADD_TAG'; payload: Tag }
  | { type: 'UPDATE_TAG'; payload: Tag }
  | { type: 'DELETE_TAG'; payload: string }
  | { type: 'SET_CHAT_HISTORY'; payload: ChatMessage[] }
  | { type: 'SET_TOAST_STATE'; payload: ToastState | null }
  | { type: 'RESTORE_UNDO_STATE' }
  | { type: 'UPDATE_SETTINGS', payload: Partial<AppSettings> };

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'REPLACE_STATE':
      return { 
          ...initialState, 
          ...action.payload, 
          settings: { ...initialState.settings, ...action.payload.settings }
      };
    case 'RESET_STATE':
        return initialState;
    case 'ADD_TASK':
      const taskWithDefaults = { 
        ...action.payload, 
        subtasks: action.payload.subtasks || [],
        tagIds: action.payload.tagIds || [] 
      };
      return { ...state, tasks: [...state.tasks, taskWithDefaults] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? { ...task, ...action.payload.updatedFields } : task
        ),
      };
    case 'DELETE_TASK': {
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
      };
    }
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'DELETE_PROJECT':
      return {
        ...state,
        tasks: state.tasks.map(t => (t.projectId === action.payload ? { ...t, projectId: undefined } : t)),
        projects: state.projects.filter(p => p.id !== action.payload),
      };
    case 'ADD_TAG':
        return { ...state, tags: [...state.tags, action.payload] };
    case 'UPDATE_TAG':
        return { ...state, tags: state.tags.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TAG':
        return {
            ...state,
            tasks: state.tasks.map(task => ({
                ...task,
                tagIds: task.tagIds?.filter(id => id !== action.payload)
            })),
            tags: state.tags.filter(t => t.id !== action.payload),
        };
    case 'SET_CHAT_HISTORY':
      return { ...state, chatHistory: action.payload };
    case 'SET_TOAST_STATE':
        return { ...state, toastState: action.payload };
    case 'RESTORE_UNDO_STATE': {
      if (!state.toastState || state.toastState.type !== 'undo' || !state.toastState.data) return state;
      const { task, index } = state.toastState.data;
      const newTasks = [...state.tasks];
      newTasks.splice(index, 0, task);
      return { ...state, tasks: newTasks, toastState: null };
    }
    case 'UPDATE_SETTINGS':
        return {
            ...state,
            settings: { ...state.settings, ...action.payload }
        }
    default:
      return state;
  }
};

const initialState: AppState = {
  tasks: [],
  projects: [],
  tags: [],
  chatHistory: [],
  toastState: null,
  settings: {
    theme: 'system',
    aiEnabled: true,
    apiKey: '',
    reminderTime: 10,
  }
};

export const useAppReducer = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return { state, dispatch };
   };