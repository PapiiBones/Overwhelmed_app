import { useReducer } from 'react';
import { Task, Project, ChatMessage, UndoState, AppSettings } from '../types';

export interface AppState {
  tasks: Task[];
  projects: Project[];
  chatHistory: ChatMessage[];
  undoState: UndoState | null;
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
  | { type: 'SET_CHAT_HISTORY'; payload: ChatMessage[] }
  | { type: 'SET_UNDO_STATE'; payload: UndoState | null }
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
      const taskWithSubtasks = { ...action.payload, subtasks: action.payload.subtasks || [] };
      return { ...state, tasks: [taskWithSubtasks, ...state.tasks] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? { ...task, ...action.payload.updatedFields } : task
        ),
      };
    case 'DELETE_TASK': {
      const taskIndex = state.tasks.findIndex(t => t.id === action.payload);
      if (taskIndex === -1) return state;
      const taskToDelete = state.tasks[taskIndex];
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
        undoState: { task: taskToDelete, index: taskIndex },
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
    case 'SET_CHAT_HISTORY':
      return { ...state, chatHistory: action.payload };
    case 'SET_UNDO_STATE':
        return { ...state, undoState: action.payload };
    case 'RESTORE_UNDO_STATE': {
      if (!state.undoState) return state;
      const newTasks = [...state.tasks];
      newTasks.splice(state.undoState.index, 0, state.undoState.task);
      return { ...state, tasks: newTasks, undoState: null };
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
  chatHistory: [],
  undoState: null,
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