import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Task, Importance, Project, ChatMessage, ModalState, SortBy, Subtask } from './types';
import AddTaskForm from './components/AddTaskForm';
import TaskItem from './components/TaskItem';
import Chatbot from './components/Chatbot';
import CalendarView from './components/CalendarView';
import Toast from './components/Toast';
import Sidebar from './components/Sidebar';
import TaskDetailModal from './components/TaskDetailModal';
import AIAnalysisModal from './components/AIAnalysisModal';
import { geminiService } from './services/geminiService';
import { BrainIcon, StarIcon } from './components/Icons';
import { PROJECT_COLORS } from './constants';
import { useAppReducer } from './hooks/useAppReducer';
import { useAIActions } from './hooks/useAIActions';
import { sortTasks } from './utils/sorting';
import { calculateNextDueDate } from './utils/date';

type View = { type: 'inbox' | 'today' | 'upcoming' | 'project' | 'calendar', projectId?: string };

const App: React.FC = () => {
  const { state, dispatch } = useAppReducer();
  const { tasks, projects, chatHistory, undoState } = state;

  const [currentView, setCurrentView] = useState<View>({ type: 'inbox' });
  const [filterBy, setFilterBy] = useState<Importance | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('timestamp');
  const [searchTerm, setSearchTerm] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  const {
    isAnalyzing,
    focusTaskId,
    analyzeTasks,
    findFocusTask,
    clearFocusTask,
  } = useAIActions(tasks);
  
  const completeSoundRef = useRef<HTMLAudioElement | null>(null);
  const notifiedTaskIds = useRef(new Set());

  useEffect(() => {
    completeSoundRef.current = document.getElementById('complete-sound') as HTMLAudioElement;
  }, []);

  // Request Notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  // Notification scheduling effect
  useEffect(() => {
    const checkNotifications = () => {
        if (Notification.permission !== 'granted') return;
        
        const now = new Date();
        const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

        tasks.forEach(task => {
            if (!task.completed && task.dueDate && !notifiedTaskIds.current.has(task.id)) {
                const dueDate = new Date(task.dueDate);
                if (dueDate > now && dueDate <= tenMinutesFromNow) {
                    new Notification('Task Due Soon', {
                        body: task.content,
                        icon: '/vite.svg'
                    });
                    notifiedTaskIds.current.add(task.id);
                }
            }
        });
    };
    
    const intervalId = setInterval(checkNotifications, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [tasks]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.matches('input, select, textarea')) return;
        if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            document.getElementById('add-task-input')?.focus();
        }
        if (e.key === 'c' || e.key === 'C') {
            e.preventDefault();
            setModal(prev => prev.type === 'chatbot' ? { type: 'none' } : { type: 'chatbot' });
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- CRUD Operations ---
  const addTask = useCallback((rawContent: string) => {
    const provisionalId = crypto.randomUUID();
    const provisionalTask: Task = {
      id: provisionalId,
      content: rawContent,
      timestamp: new Date().toISOString(),
      completed: false,
      importance: Importance.MEDIUM,
      isProcessing: true,
      notes: '',
      isPriority: false,
      projectId: currentView.type === 'project' ? currentView.projectId : undefined,
      subtasks: [],
    };
    dispatch({ type: 'ADD_TASK', payload: provisionalTask });

    geminiService.getSmartTask(rawContent)
      .then(smartTask => {
          const subtasks: Subtask[] | undefined = smartTask.subtasks?.map(content => ({
              id: crypto.randomUUID(),
              content,
              completed: false
          }));
          dispatch({ type: 'UPDATE_TASK', payload: { id: provisionalId, updatedFields: { ...smartTask, subtasks, isProcessing: false } } });
      })
      .catch(error => {
        console.error("Failed to smart-add task", error);
        dispatch({ type: 'UPDATE_TASK', payload: { id: provisionalId, updatedFields: { isProcessing: false } } });
      });
  }, [dispatch, currentView]);

  const updateTask = useCallback((id: string, updatedFields: Partial<Omit<Task, 'id' | 'timestamp'>>) => {
    dispatch({ type: 'UPDATE_TASK', payload: { id, updatedFields } });
  }, [dispatch]);

  const deleteTask = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TASK', payload: id });
    setTimeout(() => dispatch({ type: 'SET_UNDO_STATE', payload: null }), 5000);
  }, [dispatch]);

  const handleCompleteTask = useCallback((id: string, completed: boolean) => {
    if (completed) {
      const task = tasks.find(t => t.id === id);
      // If it's a recurring task, reschedule it instead of marking complete
      if (task?.recurrenceRule) {
        const nextDueDate = calculateNextDueDate(task.dueDate || new Date().toISOString(), task.recurrenceRule);
        updateTask(id, { dueDate: nextDueDate });
        if (completeSoundRef.current) {
          completeSoundRef.current.currentTime = 0;
          completeSoundRef.current.play().catch(e => console.error("Audio play failed", e));
        }
        return; // Exit early
      }
    }

    // Original logic for non-recurring tasks or marking as incomplete
    if (completed && completeSoundRef.current) {
        completeSoundRef.current.currentTime = 0;
        completeSoundRef.current.play().catch(e => console.error("Audio play failed", e));
    }
    updateTask(id, { completed });
  }, [tasks, updateTask]);
  
  const handleUndoDelete = useCallback(() => {
    dispatch({ type: 'RESTORE_UNDO_STATE' });
  }, [dispatch]);

  const addProject = useCallback((name: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
    };
    dispatch({ type: 'ADD_PROJECT', payload: newProject });
  }, [dispatch, projects.length]);

  const deleteProject = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PROJECT', payload: id });
    if (currentView.type === 'project' && currentView.projectId === id) {
        setCurrentView({ type: 'inbox' });
    }
  }, [dispatch, currentView]);

  // --- AI Actions ---
  const handleSendMessage = async (newMessage: string) => {
    const userMessage: ChatMessage = { role: 'user', parts: [{ text: newMessage }] };
    const newHistory = [...chatHistory, userMessage];
    dispatch({ type: 'SET_CHAT_HISTORY', payload: newHistory });
    setIsChatLoading(true);

    try {
        const responseText = await geminiService.getChatResponse(chatHistory, newMessage, tasks, projects);
        const modelMessage: ChatMessage = { role: 'model', parts: [{ text: responseText }] };
        dispatch({ type: 'SET_CHAT_HISTORY', payload: [...newHistory, modelMessage] });
    } catch(error) {
        console.error("Chatbot error:", error);
        const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Sorry, I'm having trouble responding right now." }] };
        dispatch({ type: 'SET_CHAT_HISTORY', payload: [...newHistory, errorMessage] });
    } finally {
        setIsChatLoading(false);
    }
  };
  
  const handleAnalyze = async () => {
    setModal({ type: 'ai-analysis', report: null });
    const report = await analyzeTasks();
    setModal({ type: 'ai-analysis', report });
  };
  
  // --- Filtering & Sorting ---
  const displayedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    const upcomingEndDate = new Date(today);
    upcomingEndDate.setDate(today.getDate() + 7);

    let filtered = tasks;
    
    switch (currentView.type) {
        case 'inbox': filtered = tasks.filter(t => !t.projectId); break;
        case 'today': filtered = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= endOfToday); break;
        case 'upcoming': filtered = tasks.filter(t => t.dueDate && new Date(t.dueDate) > endOfToday && new Date(t.dueDate) <= upcomingEndDate); break;
        case 'project': filtered = tasks.filter(t => t.projectId === currentView.projectId); break;
    }
    
    if (currentView.type !== 'calendar' && filterBy !== 'all') {
        filtered = filtered.filter(task => task.importance === filterBy);
    }
    
    if (currentView.type !== 'calendar' && searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(task => {
            const project = projects.find(p => p.id === task.projectId);
            return (
                task.content.toLowerCase().includes(lowercasedTerm) ||
                (task.notes && task.notes.toLowerCase().includes(lowercasedTerm)) ||
                (task.contact && task.contact.toLowerCase().includes(lowercasedTerm)) ||
                (project && project.name.toLowerCase().includes(lowercasedTerm))
            );
        });
    }

    return sortTasks(filtered, sortBy);
  }, [tasks, projects, currentView, filterBy, sortBy, searchTerm]);

  const activeTasksCount = useMemo(() => tasks.filter(t => !t.completed).length, [tasks]);
  const isAddingTask = useMemo(() => tasks.some(t => t.isProcessing), [tasks]);
  
  const viewTitles: {[key: string]: string} = { inbox: 'Inbox', today: 'Today', upcoming: 'Upcoming' };
  const currentTitle = currentView.type === 'project'
    ? projects.find(p => p.id === currentView.projectId)?.name || 'Project'
    : viewTitles[currentView.type] || 'Planner';

  return (
    <div className={`h-screen flex text-slate-100 font-sans transition-all duration-500 ${focusTaskId ? 'pt-16' : 'pt-0'}`}>
      {focusTaskId && (
        <div className="fixed top-0 left-0 right-0 bg-indigo-600/50 backdrop-blur-md p-4 text-center z-50 flex justify-between items-center animate-fade-in">
            <h2 className="text-xl font-bold">Your Next Step</h2>
            <button onClick={clearFocusTask} className="font-semibold hover:bg-white/10 px-3 py-1 rounded-md">See All Tasks</button>
        </div>
      )}
      <Sidebar 
        projects={projects}
        currentView={currentView}
        onSelectView={setCurrentView}
        onAddProject={addProject}
        onDeleteProject={deleteProject}
      />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-4 md:p-8 flex-grow">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-100">{currentTitle}</h1>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="hidden md:block bg-slate-800/50 border border-slate-700/50 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 transition-all w-40 focus:w-64"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 hidden md:block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                  </div>
                  <button onClick={findFocusTask} disabled={isAnalyzing || activeTasksCount < 2} className="hidden sm:flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-full transition-colors">
                    <StarIcon className="w-5 h-5"/> <span>Start Here</span>
                  </button>
                  <button 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing || activeTasksCount === 0} 
                    className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-full transition-all duration-300 transform hover:scale-105"
                  >
                      <BrainIcon className="w-5 h-5"/>
                      <span>Analyze</span>
                  </button>
                </div>
            </header>
            
            <div className={`transition-opacity duration-300 ${focusTaskId ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                {currentView.type !== 'calendar' && <div className="mb-6"><AddTaskForm onAddTask={addTask} isBusy={isAddingTask} /></div>}

                {currentView.type === 'calendar' ? (
                    <CalendarView tasks={tasks} projects={projects} onDeleteTask={deleteTask} onComplete={handleCompleteTask} onSelectTask={(task) => setModal({ type: 'task-detail', task })} onUpdateTask={updateTask} />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-full border border-slate-700/50">
                            {(['all', ...Object.values(Importance)] as const).map(level => (
                                <button key={level} onClick={() => setFilterBy(level)} className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${filterBy === level ? "bg-slate-700 text-indigo-300" : "hover:bg-slate-600/50 text-slate-400"}`}>
                                    {level === 'all' ? 'All' : level}
                                </button>
                            ))}
                        </div>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-slate-800/50 border border-slate-700/50 rounded-full py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm appearance-none">
                            <option value="timestamp">Sort: Newest</option>
                            <option value="importance">Sort: Importance</option>
                            <option value="dueDate">Sort: Due Date</option>
                        </select>
                    </div>
                     <div className="space-y-4">
                      {displayedTasks.length > 0 ? (
                        displayedTasks.map(task => (
                          <div key={task.id} className={`transition-all duration-300 ${focusTaskId && focusTaskId !== task.id ? 'opacity-30 blur-sm' : ''}`}>
                              <TaskItem task={task} projects={projects} onSelectTask={(task) => setModal({ type: 'task-detail', task })} onDeleteTask={deleteTask} onComplete={handleCompleteTask} onUpdateTask={updateTask} isFocused={focusTaskId === task.id} />
                          </div>
                        ))
                      ) : (
                        tasks.length === 0 ? (
                           <div className="text-center py-16 px-4 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                                <h2 className="text-2xl font-semibold text-slate-300">Welcome!</h2>
                                <p className="text-slate-400 mt-2">Get started by adding a task. Try typing 'Call Zoe tomorrow at 5' to see the AI in action.</p>
                            </div>
                        ) : (
                           <div className="text-center py-16 px-4 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                                <h2 className="text-2xl font-semibold text-slate-300">{searchTerm ? 'No Matching Tasks' : 'All Clear!'}</h2>
                                <p className="text-slate-400 mt-2">{searchTerm ? 'Try a different search term.' : 'There are no tasks in this view. Add one above to get started!'}</p>
                            </div>
                        )
                      )}
                    </div>
                  </>
                )}
            </div>
        </div>
      </main>
      <Chatbot 
        isOpen={modal.type === 'chatbot'} 
        onToggle={() => setModal(prev => prev.type === 'chatbot' ? { type: 'none' } : { type: 'chatbot' })} 
        messages={chatHistory} 
        onSendMessage={handleSendMessage}
        isLoading={isChatLoading}
      />
      {modal.type === 'task-detail' && (
        <TaskDetailModal
          task={modal.task}
          projects={projects}
          onClose={() => setModal({ type: 'none' })}
          onUpdateTask={updateTask}
        />
      )}
      {modal.type === 'ai-analysis' && (
        <AIAnalysisModal
            isLoading={isAnalyzing}
            report={modal.report}
            onClose={() => setModal({ type: 'none' })}
        />
      )}
      <Toast message="Task deleted" isVisible={!!undoState} onAction={handleUndoDelete} actionText="Undo" />
    </div>
  );
};

export default App;