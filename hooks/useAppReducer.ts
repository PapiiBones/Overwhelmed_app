
import { useReducer } from 'react';
import { Task, Project, ChatMessage, ToastState, AppSettings, Tag, SidebarItem, AppState, Contact } from '../types';
import { InboxIcon, DateRangeIcon, CalendarIcon } from '../components/Icons';
import React from 'react';
import { PROJECT_COLORS } from '../constants';

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
  | { type: 'UPSERT_CONTACT'; payload: Contact }
  | { type: 'SET_CHAT_HISTORY'; payload: ChatMessage[] }
  | { type: 'SET_TOAST_STATE'; payload: ToastState | null }
  | { type: 'RESTORE_UNDO_STATE' }
  | { type: 'UPDATE_SETTINGS', payload: Partial<AppSettings> }
  | { type: 'REORDER_SIDEBAR_ITEMS', payload: { draggedId: string, targetId: string } }
  | { type: 'UPDATE_SIDEBAR_ITEM', payload: SidebarItem };

const initialSidebarItems: SidebarItem[] = [
    { id: 'inbox', type: 'inbox', label: 'Inbox', isEditable: true, isDeletable: false },
    { id: 'today', type: 'today', label: 'Today', isEditable: true, isDeletable: false },
    { id: 'upcoming', type: 'upcoming', label: 'Upcoming', isEditable: true, isDeletable: false },
    { id: 'calendar', type: 'calendar', label: 'Calendar', isEditable: true, isDeletable: false },
];

const initialState: AppState = {
  tasks: [],
  projects: [],
  tags: [],
  contacts: [],
  sidebarItems: initialSidebarItems,
  chatHistory: [],
  toastState: null,
  settings: {
    theme: 'system',
    aiEnabled: true,
    reminderTime: 10,
  }
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'REPLACE_STATE': {
      const loadedPayload = action.payload;
      const contacts: Contact[] = loadedPayload.contacts || [];
      const contactNameMap = new Map<string, string>();
      contacts.forEach(c => contactNameMap.set(c.name.toLowerCase(), c.id));

      const migratedTasks = (loadedPayload.tasks || []).map(t => {
        const legacyTask = t as any;
        if (typeof legacyTask.contact === 'string' && legacyTask.contact) {
          const contactName = legacyTask.contact;
          const lowerCaseName = contactName.toLowerCase();
          let contactId = contactNameMap.get(lowerCaseName);

          if (!contactId) {
            const newContact: Contact = { id: crypto.randomUUID(), name: contactName };
            contacts.push(newContact);
            contactNameMap.set(lowerCaseName, newContact.id);
            contactId = newContact.id;
          }
          
          const { contact, ...newTask } = legacyTask;
          return { ...newTask, contactId };
        }
        return t;
      });

      const loadedState = { 
          ...initialState, 
          ...loadedPayload, 
          tasks: migratedTasks,
          contacts,
          settings: { ...initialState.settings, ...loadedPayload.settings }
      };

      // Migration logic for customizable sidebar
      if (!loadedState.sidebarItems || loadedState.sidebarItems.length < 4) {
        const migratedSidebarItems = [...initialSidebarItems];
        loadedState.projects.forEach(p => {
            if (!migratedSidebarItems.some(si => si.id === p.id)) {
                migratedSidebarItems.push({ id: p.id, type: 'project', label: p.name, color: p.color, isEditable: false, isDeletable: true });
            }
        });
        loadedState.tags.forEach(t => {
            if (!migratedSidebarItems.some(si => si.id === t.id)) {
                 migratedSidebarItems.push({ id: t.id, type: 'tag', label: t.name, color: t.color, isEditable: true, isDeletable: true });
            }
        });
        loadedState.sidebarItems = migratedSidebarItems;
      }
      return loadedState;
    }
    case 'RESET_STATE':
        return initialState;
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
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
    case 'ADD_PROJECT': {
        const newProject = action.payload;
        const newSidebarItem: SidebarItem = {
            id: newProject.id,
            type: 'project',
            label: newProject.name,
            color: newProject.color,
            isEditable: false, // Project name is edited via the project itself
            isDeletable: true,
        };
        return { 
            ...state, 
            projects: [...state.projects, newProject],
            sidebarItems: [...state.sidebarItems, newSidebarItem] 
        };
    }
    case 'DELETE_PROJECT': {
        const projectId = action.payload;
        return {
            ...state,
            tasks: state.tasks.map(t => (t.projectId === projectId ? { ...t, projectId: undefined } : t)),
            projects: state.projects.filter(p => p.id !== projectId),
            sidebarItems: state.sidebarItems.filter(item => item.id !== projectId)
        };
    }
    case 'ADD_TAG': {
        const newTag = action.payload;
        const newSidebarItem: SidebarItem = {
            id: newTag.id,
            type: 'tag',
            label: newTag.name,
            color: newTag.color,
            isEditable: true,
            isDeletable: true,
        };
        return { 
            ...state, 
            tags: [...state.tags, newTag],
            sidebarItems: [...state.sidebarItems, newSidebarItem] 
        };
    }
    case 'UPDATE_TAG': {
        const updatedTag = action.payload;
        return { 
            ...state, 
            tags: state.tags.map(t => t.id === updatedTag.id ? updatedTag : t),
            sidebarItems: state.sidebarItems.map(item => item.id === updatedTag.id ? { ...item, label: updatedTag.name, color: updatedTag.color } : item)
        };
    }
    case 'DELETE_TAG': {
        const tagId = action.payload;
        return {
            ...state,
            tasks: state.tasks.map(task => ({
                ...task,
                tagIds: task.tagIds?.filter(id => id !== tagId)
            })),
            tags: state.tags.filter(t => t.id !== tagId),
            sidebarItems: state.sidebarItems.filter(item => item.id !== tagId)
        };
    }
     case 'UPSERT_CONTACT': {
      const existingContact = state.contacts.find(c => c.name.toLowerCase() === action.payload.name.toLowerCase());
      if (existingContact) {
        return state; // Do nothing if contact already exists
      }
      return { ...state, contacts: [...state.contacts, action.payload] };
    }
    case 'UPDATE_SIDEBAR_ITEM': {
        const updatedItem = action.payload;
        const newState = {
            ...state,
            sidebarItems: state.sidebarItems.map(item => item.id === updatedItem.id ? updatedItem : item)
        };
        // Also update the underlying project/tag if its name changed
        if (updatedItem.type === 'tag') {
            newState.tags = newState.tags.map(t => t.id === updatedItem.id ? { ...t, name: updatedItem.label } : t);
        }
        return newState;
    }
    case 'REORDER_SIDEBAR_ITEMS': {
        const { draggedId, targetId } = action.payload;
        const items = [...state.sidebarItems];
        const draggedIndex = items.findIndex(item => item.id === draggedId);
        const targetIndex = items.findIndex(item => item.id === targetId);
        if (draggedIndex === -1 || targetIndex === -1) return state;

        const [draggedItem] = items.splice(draggedIndex, 1);
        items.splice(targetIndex, 0, draggedItem);
        return { ...state, sidebarItems: items };
    }
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

export const useAppReducer = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return { state, dispatch };
};