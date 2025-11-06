import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Task, Importance, Project, ChatMessage, ModalState, SortBy, Subtask, User, AppSettings, Tag, ToastState, SidebarItem, AppState, Contact } from './types';
import AddTaskForm from './components/AddTaskForm';
import TaskItem from './components/TaskItem';
import Chatbot from './components/Chatbot';
import CalendarView from './components/CalendarView';
import ContactsView from './components/ContactsView';
import ContactDetailModal from './components/ContactDetailModal';
import ProjectsView from './components/ProjectsView';
import ProjectDetailModal from './components/ProjectDetailModal';
import Toast from './components/Toast';
import Sidebar from './components/Sidebar';
import TaskDetailPanel from './components/TaskDetailPanel';
import AIAnalysisModal from './components/AIAnalysisModal';
import LoginModal from './components/LoginModal';
import SettingsModal from './components/SettingsModal';
import EmailProcessorModal from './components/EmailProcessorModal';
import authService from './services/mockAuthService';
import { geminiService } from './services/geminiService';
import { PROJECT_COLORS } from './constants';
import { useAppReducer } from './hooks/useAppReducer';
import { useAIActions } from './hooks/useAIActions';
import { sortTasks } from './utils/sorting';
import { calculateNextDueDate } from './utils/date';
import Header from './components/Header';

const App: React.FC = () => {
  const { state, dispatch } = useAppReducer();
  const { tasks, projects, tags, contacts, sidebarItems, chatHistory, toastState, settings } = state;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentViewId, setCurrentViewId] = useState<string>('inbox');
  const [filterBy, setFilterBy] = useState<Importance | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('timestamp_desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const {
    isAnalyzing,
    focusTaskId,
    analyzeTasks,
    findFocusTask,
    clearFocusTask,
  } = useAIActions(tasks, settings);
  
  const completeSoundRef = useRef<HTMLAudioElement | null>(null);
  const notifiedTaskIds = useRef(new Set());

  // --- Auth & Data Sync ---
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      const data = authService.loadData(user.email);
      if (data) {
        dispatch({ type: 'REPLACE_STATE', payload: data });
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (currentUser) {
      const { toastState, ...savableState } = state;
      authService.saveData(currentUser.email, savableState);
    }
  }, [state, currentUser]);

  const handleLogin = (email: string) => {
    const user = authService.login(email);
    setCurrentUser(user);
    const data = authService.loadData(email);
    if (data) {
      dispatch({ type: 'REPLACE_STATE', payload: data });
    } else {
      dispatch({ type: 'RESET_STATE' });
    }
    setModal({ type: 'none' });
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    dispatch({ type: 'RESET_STATE' });
    setCurrentViewId('inbox');
  };
  
  // --- Settings & Data Management ---
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
  };
  
  const handleDeleteAllData = () => {
    if (currentUser) {
        authService.deleteData(currentUser.email);
    }
    dispatch({ type: 'RESET_STATE' });
    setModal({ type: 'none' });
  };

  const handleExportData = () => {
    const { toastState, ...exportableState } = state;
    const dataStr = JSON.stringify(exportableState, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'overwhelmed_backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileReader = new FileReader();
      if (event.target.files && event.target.files[0]) {
          fileReader.readAsText(event.target.files[0], "UTF-8");
          fileReader.onload = e => {
              if (e.target?.result) {
                  try {
                      const importedState = JSON.parse(e.target.result as string) as AppState;
                      dispatch({ type: 'REPLACE_STATE', payload: importedState });
                      setModal({ type: 'none' });
                  } catch (error) {
                      console.error("Error parsing imported file:", error);
                      dispatch({ type: 'SET_TOAST_STATE', payload: { type: 'error', message: 'Could not import data. The file might be corrupted.' }});
                  }
              }
          };
      }
  };
  
  // --- Standard Effects ---
  useEffect(() => {
    completeSoundRef.current = document.getElementById('complete-sound') as HTMLAudioElement;
  }, []);

  useEffect(() => {
    const handleThemeChange = () => {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (settings.theme === 'dark' || (settings.theme === 'system' && isSystemDark)) {
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
      }
    };
    handleThemeChange();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, [settings.theme]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkNotifications = () => {
        if (Notification.permission !== 'granted') return;
        const now = new Date();
        const reminderTimeInMs = settings.reminderTime * 60 * 1000;
        const reminderWindow = new Date(now.getTime() + reminderTimeInMs);

        tasks.forEach(task => {
            if (!task.completed && task.dueDate && !notifiedTaskIds.current.has(task.id)) {
                const dueDate = new Date(task.dueDate);
                if (dueDate > now && dueDate <= reminderWindow) {
                    new Notification('Task Due Soon', { body: task.content, icon: '/vite.svg' });
                    notifiedTaskIds.current.add(task.id);
                }
            }
        });
    };
    const intervalId = setInterval(checkNotifications, 60000);
    return () => clearInterval(intervalId);
  }, [tasks, settings.reminderTime]);
  
  useEffect(() => {
    const currentViewItem = sidebarItems.find(item => item.id === currentViewId);
    if(currentViewItem?.type === 'contacts' || currentViewItem?.type === 'projects') {
        setSearchTerm('');
        setSelectedTask(null);
    }
  }, [currentViewId, sidebarItems]);
  
  // --- CRUD Operations ---
  const handleTagNames = useCallback((tagNames: string[]): string[] => {
    const tagIds: string[] = [];
    tagNames.forEach(name => {
      const normalizedName = name.trim().toLowerCase();
      if (!normalizedName) return;
      const existingTag = tags.find(t => t.name.toLowerCase() === normalizedName);
      if (existingTag) {
        tagIds.push(existingTag.id);
      } else {
        const newTag: Tag = {
          id: crypto.randomUUID(),
          name: name.trim(),
          color: PROJECT_COLORS[tags.length % PROJECT_COLORS.length],
        };
        dispatch({ type: 'ADD_TAG', payload: newTag });
        tagIds.push(newTag.id);
      }
    });
    return tagIds;
  }, [tags, dispatch]);

  const handleUpsertContact = useCallback((name: string): string => {
    if (!name.trim()) return '';
    const normalizedName = name.trim();
    const existing = contacts.find(c => c.name.toLowerCase() === normalizedName.toLowerCase());
    if (existing) {
        return existing.id;
    } else {
        const newContact: Contact = { 
            id: crypto.randomUUID(), 
            name: normalizedName,
            color: PROJECT_COLORS[contacts.length % PROJECT_COLORS.length]
        };
        dispatch({ type: 'UPSERT_CONTACT', payload: newContact });
        return newContact.id;
    }
  }, [contacts, dispatch]);

  const addTask = useCallback(async (rawContent: string, isSmartAdd: boolean, projectId?: string) => {
    const newTaskBase = {
      id: crypto.randomUUID(),
      content: rawContent,
      timestamp: new Date().toISOString(),
      completed: false,
      importance: Importance.MEDIUM,
      projectId: projectId,
    };

    if (isSmartAdd && settings.aiEnabled) {
      dispatch({ type: 'ADD_TASK', payload: { ...newTaskBase, isProcessing: true } as Task });
      try {
        const { subtasks: aiSubtasks, tags: aiTags, contact: contactName, ...smartTaskData } = await geminiService.getSmartTask(rawContent);
        
        if (!smartTaskData.content?.trim()) {
          throw new Error("AI response was missing a valid 'content' field.");
        }

        const subtasks: Subtask[] | undefined = aiSubtasks?.map(content => ({
          id: crypto.randomUUID(),
          content,
          completed: false,
        }));

        const tagIds = aiTags ? handleTagNames(aiTags) : [];
        const contactId = contactName ? handleUpsertContact(contactName) : undefined;

        dispatch({ type: 'UPDATE_TASK', payload: { id: newTaskBase.id, updatedFields: { ...smartTaskData, subtasks, tagIds, contactId, isProcessing: false } } });
      } catch (error) {
        console.error("Failed to smart-add task", error);
        dispatch({ type: 'UPDATE_TASK', payload: { id: newTaskBase.id, updatedFields: { isProcessing: false } } });
        dispatch({ type: 'SET_TOAST_STATE', payload: { type: 'error', message: 'AI enhancement failed. Check API key.' } });
      }
    } else {
      dispatch({ type: 'ADD_TASK', payload: newTaskBase as Task });
    }
  }, [dispatch, settings.aiEnabled, handleTagNames, handleUpsertContact]);

  const addProcessedTask = useCallback((taskData: any) => {
    const { _rawTagNames, contact: contactName, ...restOfTaskData } = taskData;
    const tagIds = _rawTagNames ? handleTagNames(_rawTagNames) : [];
    const contactId = contactName ? handleUpsertContact(contactName) : undefined;

    const newTask: Task = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      completed: false,
      importance: Importance.MEDIUM, // default
      ...restOfTaskData,
      tagIds,
      contactId,
    };
    
    dispatch({ type: 'ADD_TASK', payload: newTask });
  }, [dispatch, handleTagNames, handleUpsertContact]);
  
  const updateTask = useCallback((id: string, updatedFields: Partial<Omit<Task, 'id' | 'timestamp'>>) => {
    dispatch({ type: 'UPDATE_TASK', payload: { id, updatedFields } });
    if(selectedTask && selectedTask.id === id) {
        setSelectedTask(prev => prev ? { ...prev, ...updatedFields } : null);
    }
  }, [dispatch, selectedTask]);
  
  const handleUndoDelete = useCallback(() => {
    dispatch({ type: 'RESTORE_UNDO_STATE' });
  }, [dispatch]);

  const deleteTask = useCallback((id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;
    const taskIndex = tasks.indexOf(taskToDelete);
    if (selectedTask?.id === id) {
        setSelectedTask(null);
    }
    dispatch({ type: 'DELETE_TASK', payload: id });
    const toastData: ToastState = { type: 'undo', message: 'Task deleted', actionText: 'Undo', onAction: handleUndoDelete, data: { task: taskToDelete, index: taskIndex }};
    dispatch({ type: 'SET_TOAST_STATE', payload: toastData });
  }, [dispatch, tasks, handleUndoDelete, selectedTask]);

  const handleCompleteTask = useCallback((id: string, completed: boolean) => {
    const task = tasks.find(t => t.id === id);
    if (completed && task?.recurrenceRule) {
      const nextDueDate = calculateNextDueDate(task.dueDate || new Date().toISOString(), task.recurrenceRule);
      updateTask(id, { dueDate: nextDueDate });
    } else {
      updateTask(id, { completed });
    }
    if (completed && completeSoundRef.current) {
        completeSoundRef.current.currentTime = 0;
        completeSoundRef.current.play().catch(e => console.error("Audio play failed", e));
    }
  }, [tasks, updateTask]);

  const handleSaveContact = (contactData: Omit<Contact, 'id'> & { id?: string }) => {
    if (contactData.id) {
        dispatch({ type: 'UPDATE_CONTACT', payload: contactData as Contact });
    } else {
        dispatch({ type: 'ADD_CONTACT', payload: { ...contactData, id: crypto.randomUUID() } });
    }
    setModal({ type: 'none' });
  };

  const handleDeleteContact = (contactId: string) => {
    dispatch({ type: 'DELETE_CONTACT', payload: contactId });
    setModal({ type: 'none' });
  };

  const handleSaveProject = (projectData: Omit<Project, 'id'> & { id?: string }) => {
    if (projectData.id) {
        dispatch({ type: 'UPDATE_PROJECT', payload: projectData as Project });
    } else {
        const newProject: Project = {
            id: crypto.randomUUID(),
            name: projectData.name,
            color: projectData.color
        };
        dispatch({ type: 'ADD_PROJECT', payload: newProject });
    }
    setModal({ type: 'none' });
  };

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm("Are you sure you want to delete this project? All tasks within it will be moved to the Inbox.")) {
        dispatch({ type: 'DELETE_PROJECT', payload: projectId });
        setModal({ type: 'none' });
        if (currentViewId === projectId) {
            setCurrentViewId('inbox');
        }
    }
  };
  
  // --- AI Actions ---
  const handleSendMessage = async (newMessage: string) => {
    const userMessage: ChatMessage = { role: 'user', parts: [{ text: newMessage }] };
    const historyWithUserMessage = [...chatHistory, userMessage];
    dispatch({ type: 'SET_CHAT_HISTORY', payload: historyWithUserMessage });

    if (!settings.aiEnabled) {
      const modelMessage: ChatMessage = { role: 'model', parts: [{ text: "AI features are disabled. You can enable them in the Settings panel." }] };
      dispatch({ type: 'SET_CHAT_HISTORY', payload: [...historyWithUserMessage, modelMessage] });
      return;
    }

    setIsChatLoading(true);
    try {
        const responseText = await geminiService.getChatResponse(chatHistory, newMessage, tasks, projects, tags);
        const modelMessage: ChatMessage = { role: 'model', parts: [{ text: responseText }] };
        dispatch({ type: 'SET_CHAT_HISTORY', payload: [...historyWithUserMessage, modelMessage] });
    } catch(error) {
        console.error("Chatbot error:", error);
        const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Sorry, I'm having trouble responding right now. Please check your API key in Settings." }] };
        dispatch({ type: 'SET_CHAT_HISTORY', payload: [...historyWithUserMessage, errorMessage] });
    } finally {
        setIsChatLoading(false);
    }
  };
  
  const handleAnalyze = async () => {
    setModal({ type: 'ai-analysis', report: null });
    const report = await analyzeTasks();
    setModal({ type: 'ai-analysis', report });
  };
  
  // --- Filtering, Sorting, and View Logic ---
  const displayedTasks = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today); endOfToday.setHours(23, 59, 59, 999);
    const upcomingEndDate = new Date(today); upcomingEndDate.setDate(today.getDate() + 7);
    
    const currentViewItem = sidebarItems.find(item => item.id === currentViewId);
    let filtered = tasks;

    if (currentViewItem) {
        switch (currentViewItem.type) {
            case 'inbox': filtered = tasks.filter(t => !t.projectId); break;
            case 'today': filtered = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= endOfToday); break;
            case 'upcoming': filtered = tasks.filter(t => t.dueDate && new Date(t.dueDate) > endOfToday && new Date(t.dueDate) <= upcomingEndDate); break;
            case 'project': filtered = tasks.filter(t => t.projectId === currentViewItem.id); break;
            case 'tag': filtered = tasks.filter(t => t.tagIds?.includes(currentViewItem.id || '')); break;
        }
    }
    
    if (currentViewItem?.type !== 'contacts' && currentViewItem?.type !== 'projects' && filterBy !== 'all') {
        filtered = filtered.filter(task => task.importance === filterBy);
    }
    
    if (currentViewItem?.type !== 'contacts' && currentViewItem?.type !== 'projects' && searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(task => {
            const project = projects.find(p => p.id === task.projectId);
            const contact = contacts.find(c => c.id === task.contactId);
            const taskTags = task.tagIds?.map(id => tags.find(t => t.id === id)?.name).filter(Boolean) || [];
            return (
                task.content.toLowerCase().includes(lowercasedTerm) ||
                (task.notes && task.notes.toLowerCase().includes(lowercasedTerm)) ||
                (contact && contact.name.toLowerCase().includes(lowercasedTerm)) ||
                (project && project.name.toLowerCase().includes(lowercasedTerm)) ||
                taskTags.some(tagName => tagName.toLowerCase().includes(lowercasedTerm))
            );
        });
    }

    return sortTasks(filtered, sortBy);
  }, [tasks, projects, tags, contacts, sidebarItems, currentViewId, filterBy, sortBy, searchTerm]);

  const activeTasksCount = useMemo(() => tasks.filter(t => !t.completed).length, [tasks]);
  const isAddingTask = useMemo(() => tasks.some(t => t.isProcessing), [tasks]);
  
  const currentViewItem = sidebarItems.find(item => item.id === currentViewId);

  const renderCurrentView = () => {
    if (!currentViewItem) return null; // Or some fallback UI

    switch(currentViewItem.type) {
      case 'projects':
        return (
          <div className="flex-1 overflow-y-auto">
            <ProjectsView
              projects={projects}
              tasks={tasks}
              onAddProject={() => setModal({ type: 'project-detail' })}
              onSelectProject={(project) => setCurrentViewId(project.id)}
              onEditProject={(project) => setModal({ type: 'project-detail', project })}
              onDeleteProject={handleDeleteProject}
            />
          </div>
        );
      case 'contacts':
        return (
          <div className="flex-1 overflow-y-auto">
            <ContactsView 
                contacts={contacts} 
                tasks={tasks}
                onAddContact={() => setModal({ type: 'contact-detail' })}
                onSelectContact={(contact) => setModal({ type: 'contact-detail', contact })}
                onDeleteContact={handleDeleteContact}
            />
          </div>
        );
      default: // All task list views
        return (
          <div className="flex-1 flex h-full">
            {/* Left Panel: Task List */}
            <div className="w-1/2 flex flex-col overflow-y-auto">
              <div className="p-4 md:p-8">
                <Header
                    viewLabel={currentViewItem?.label || 'Overwhelmed'}
                    activeTasksCount={activeTasksCount}
                    settings={settings}
                    isAnalyzing={isAnalyzing}
                    onAnalyze={handleAnalyze}
                    onFindFocus={findFocusTask}
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    filterBy={filterBy}
                    onFilterByChange={setFilterBy}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    onOpenEmailProcessor={() => setModal({ type: 'email-processor' })}
                />
                <div className={`transition-opacity duration-300 ${focusTaskId ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                  <div className="mb-6">
                    <AddTaskForm 
                      onAddTask={addTask} 
                      isBusy={isAddingTask} 
                      settings={settings} 
                      dispatch={dispatch}
                      projects={projects}
                      currentViewId={currentViewId}
                      sidebarItems={sidebarItems}
                    />
                  </div>
                  <div className="space-y-4">
                    {displayedTasks.length > 0 ? (
                        displayedTasks.map(task => (
                        <div key={task.id} className={`transition-all duration-300 ${focusTaskId && focusTaskId !== task.id ? 'opacity-30 blur-sm' : ''}`}>
                            <TaskItem task={task} allTasks={tasks} projects={projects} tags={tags} contacts={contacts} onSelectTask={(task) => setSelectedTask(task)} onDeleteTask={deleteTask} onComplete={handleCompleteTask} onUpdateTask={updateTask} isFocused={focusTaskId === task.id} />
                        </div>
                        ))
                    ) : (
                        (tasks.length === 0 && !searchTerm) ? (
                        <div className="text-center py-16 px-4 bg-[var(--color-surface-primary)] rounded-lg border border-dashed border-[var(--color-border-secondary)]">
                            <h2 className="text-2xl font-semibold text-[var(--color-text-secondary)]">Welcome! Get started by adding a task.</h2>
                            <p className="text-[var(--color-text-tertiary)] mt-2">Try typing 'Call Zoe tomorrow at 5 #work' to see the AI in action.</p>
                        </div>
                        ) : (
                        <div className="text-center py-16 px-4 bg-[var(--color-surface-primary)] rounded-lg border border-dashed border-[var(--color-border-secondary)]">
                            <h2 className="text-2xl font-semibold text-[var(--color-text-secondary)]">{searchTerm ? 'No Matching Tasks' : 'All Clear!'}</h2>
                            <p className="text-[var(--color-text-tertiary)] mt-2">{searchTerm ? 'Try a different search term.' : 'There are no tasks in this view. Add one above to get started!'}</p>
                        </div>
                        )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Calendar */}
            <div className="w-1/2 border-l border-[var(--color-border-secondary)] hidden lg:flex flex-col h-full">
              <div className="p-4 md:p-6 h-full overflow-y-auto">
                  <CalendarView tasks={tasks} projects={projects} tags={tags} contacts={contacts} onDeleteTask={deleteTask} onComplete={handleCompleteTask} onSelectTask={(task) => setSelectedTask(task)} onUpdateTask={updateTask} />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`h-screen flex font-sans transition-all duration-500 ${focusTaskId ? 'pt-16' : 'pt-0'}`}>
      {focusTaskId && (
        <div className="fixed top-0 left-0 right-0 bg-indigo-600/50 backdrop-blur-md p-4 text-center z-50 flex justify-between items-center animate-fade-in">
            <h2 className="text-xl font-bold">Your Next Step</h2>
            <button onClick={clearFocusTask} className="font-semibold hover:bg-white/10 px-3 py-1 rounded-md">See All Tasks</button>
        </div>
      )}
      <Sidebar 
        sidebarItems={sidebarItems}
        currentViewId={currentViewId}
        onSelectView={setCurrentViewId}
        dispatch={dispatch}
        currentUser={currentUser}
        onLoginClick={() => setModal({ type: 'login' })} onLogoutClick={handleLogout}
        onSettingsClick={() => setModal({ type: 'settings' })}
      />
      <main className="flex-1 flex overflow-hidden">
        <div className={`flex-1 flex transition-all duration-300 ${selectedTask ? 'mr-[450px]' : 'mr-0'}`}>
          {renderCurrentView()}
        </div>
        
        {selectedTask && (
            <TaskDetailPanel 
              task={selectedTask} 
              allTasks={tasks} 
              projects={projects} 
              tags={tags} 
              contacts={contacts}
              onClose={() => setSelectedTask(null)} 
              onUpdateTask={updateTask} 
              onDeleteTask={deleteTask}
              onAddTag={(name) => {
                  const newTag = { id: crypto.randomUUID(), name, color: PROJECT_COLORS[tags.length % PROJECT_COLORS.length] };
                  dispatch({ type: 'ADD_TAG', payload: newTag });
                  return newTag;
              }}
              onUpsertContact={handleUpsertContact} 
              settings={settings} 
              dispatch={dispatch} 
            />
        )}
      </main>
      {settings.aiEnabled && 
          <Chatbot isOpen={modal.type === 'chatbot'} onToggle={() => setModal(prev => prev.type === 'chatbot' ? { type: 'none' } : { type: 'chatbot' })} 
          messages={chatHistory} onSendMessage={handleSendMessage} isLoading={isChatLoading} />
      }
      
      {modal.type === 'ai-analysis' && (
        <AIAnalysisModal isLoading={isAnalyzing} report={modal.report} onClose={() => setModal({ type: 'none' })} tasks={tasks} />
      )}
      {modal.type === 'login' && (
        <LoginModal onLogin={handleLogin} onClose={() => setModal({ type: 'none' })} />
      )}
      {modal.type === 'settings' && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onExport={handleExportData}
          onImport={handleImportData}
          onDeleteAllData={handleDeleteAllData}
          onClose={() => setModal({ type: 'none' })}
        />
      )}
       {modal.type === 'contact-detail' && (
        <ContactDetailModal
            contact={modal.contact}
            tasks={tasks}
            onClose={() => setModal({ type: 'none' })}
            onSave={handleSaveContact}
            onSelectTask={(task) => {
                setModal({ type: 'none' });
                // Timeout to allow the contact modal to close before opening the task panel
                setTimeout(() => setSelectedTask(task), 100);
            }}
        />
      )}
      {modal.type === 'project-detail' && (
        <ProjectDetailModal
            project={modal.project}
            onClose={() => setModal({ type: 'none' })}
            onSave={handleSaveProject}
        />
      )}
      {modal.type === 'email-processor' && (
          <EmailProcessorModal 
              onClose={() => setModal({ type: 'none' })}
              onAddTask={addProcessedTask}
          />
      )}
      <Toast toastState={toastState} onClose={() => dispatch({ type: 'SET_TOAST_STATE', payload: null })} />
    </div>
  );
};

 export default App;