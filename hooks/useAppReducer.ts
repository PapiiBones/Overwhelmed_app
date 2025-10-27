import { useReducer, useEffect } from 'react';
import { Task, Project, ChatMessage, UndoState, Subtask } from '../types';

interface AppState {
  tasks: Task[];
  projects: Project[];
  chatHistory: ChatMessage[];
  undoState: UndoState | null;
}

type Action =
  | { type: 'SET_INITIAL_STATE'; payload: Partial<AppState> }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updatedFields: Partial<Omit<Task, 'id' | 'timestamp'>> } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_CHAT_HISTORY'; payload: ChatMessage[] }
  | { type: 'SET_UNDO_STATE'; payload: UndoState | null }
  | { type: 'RESTORE_UNDO_STATE' };

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_INITIAL_STATE':
      return { ...state, ...action.payload };
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
    default:
      return state;
  }
};

const initialState: AppState = {
  tasks: [],
  projects: [],
  chatHistory: [],
  undoState: null,
};

export const useAppReducer = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('ai-planner-tasks-v2');
      const storedProjects = localStorage.getItem('ai-planner-projects-v2');
      const storedHistory = localStorage.getItem('ai-planner-chat-history-v1');
      
      const payload: Partial<AppState> = {};
      if (storedTasks) payload.tasks = JSON.parse(storedTasks);
      if (storedProjects) payload.projects = JSON.parse(storedProjects);
      if (storedHistory) payload.chatHistory = JSON.parse(storedHistory);
      
      dispatch({ type: 'SET_INITIAL_STATE', payload });
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      // Filter out transient processing tasks before saving
      const tasksToSave = state.tasks.filter(t => !t.isProcessing);
      localStorage.setItem('ai-planner-tasks-v2', JSON.stringify(tasksToSave));
    } catch (error) {
      console.error("Failed to save tasks", error);
    }
  }, [state.tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('ai-planner-projects-v2', JSON.stringify(state.projects));
    } catch (error) {
      console.error("Failed to save projects", error);
    }
  }, [state.projects]);

  useEffect(() => {
    try {
      localStorage.setItem('ai-planner-chat-history-v1', JSON.stringify(state.chatHistory));
    } catch (error) {
      console.error("Failed to save chat history", error);
    }
  }, [state.chatHistory]);

  return { state, dispatch };
};