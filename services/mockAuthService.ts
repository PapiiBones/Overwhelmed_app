import { User } from '../types';
import { AppState } from '../hooks/useAppReducer';

const SESSION_KEY = 'ai-planner-currentUser';

const authService = {
  login: (email: string): User => {
    const user = { email };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  logout: (): void => {
    sessionStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const userJson = sessionStorage.getItem(SESSION_KEY);
    return userJson ? JSON.parse(userJson) : null;
  },
  
  saveData: (email: string, state: Omit<AppState, 'undoState'>): void => {
    try {
      const dataKey = `ai-planner-data-${email}`;
      const dataToSave = JSON.stringify(state);
      localStorage.setItem(dataKey, dataToSave);
    } catch (error) {
      console.error("Failed to save user data to localStorage", error);
    }
  },

  loadData: (email: string): Partial<AppState> | null => {
    try {
      const dataKey = `ai-planner-data-${email}`;
      const dataJson = localStorage.getItem(dataKey);
      return dataJson ? JSON.parse(dataJson) : null;
    } catch (error) {
      console.error("Failed to load user data from localStorage", error);
      return null;
    }
  },

  // Fix: Add deleteData method to authService.
  deleteData: (email: string): void => {
    try {
      const dataKey = `ai-planner-data-${email}`;
      localStorage.removeItem(dataKey);
    } catch (error) {
      console.error("Failed to delete user data from localStorage", error);
    }
  },
};

  export default authService;