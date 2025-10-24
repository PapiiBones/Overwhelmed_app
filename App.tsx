import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, Importance, UndoState, Project, ChatMessage } from './types';
import AddTaskForm from './components/AddTaskForm';
import TaskItem from './components/TaskItem';
import Chatbot from './components/Chatbot';
import CalendarView from './components/CalendarView';
import Toast from './components/Toast';
import Sidebar from './components/Sidebar';
import { geminiService } from './services/geminiService';
import { BrainIcon, StarIcon } from './components/Icons';
import { PROJECT_COLORS } from './constants';

type View = { type: 'inbox' | 'today' | 'upcoming' | 'project' | 'calendar', projectId?: string };

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentView, setCurrentView] = useState<View>({ type: 'inbox' });
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterBy, setFilterBy] = useState<Importance | 'all'>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'importance' | 'dueDate'>('timestamp');
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  
  const completeSoundRef = useRef<HTMLAudioElement | null>(null);

  // --- Data Persistence ---
  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('ai-planner-tasks-v2');
      if (storedTasks) setTasks(JSON.parse(storedTasks));
      const storedProjects = localStorage.getItem('ai-planner-projects-v2');
      if (storedProjects) setProjects(JSON.parse(storedProjects));
      const storedHistory = localStorage.getItem('ai-planner-chat-history-v1');
      if (storedHistory) setChatHistory(JSON.parse(storedHistory));
      completeSoundRef.current = document.getElementById('complete-sound') as HTMLAudioElement;
    } catch (error) { console.error("Failed to load data", error); }
  }, []);

  useEffect(() => {
    try {
      const tasksToSave = tasks.filter(t => !t.isProcessing);
      localStorage.setItem('ai-planner-tasks-v2', JSON.stringify(tasksToSave));
    } catch (error) { console.error("Failed to save tasks", error); }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('ai-planner-projects-v2', JSON.stringify(projects));
    } catch (error) { console.error("Failed to save projects", error); }
  }, [projects]);
  
  useEffect(() => {
    try {
      localStorage.setItem('ai-planner-chat-history-v1', JSON.stringify(chatHistory));
    } catch (error) { console.error("Failed to save chat history", error); }
  }, [chatHistory]);
  
  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
        if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            document.getElementById('add-task-input')?.focus();
        }
        if (e.key === 'c' || e.key === 'C') {
            e.preventDefault();
            setIsChatOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- CRUD Operations ---
  const addTask = (rawContent: string) => {
    const provisionalId = crypto.randomUUID();
    const provisionalTask: Task = {
      id: provisionalId,
      content: rawContent,
      timestamp: new Date().toISOString(),
      completed: false,
      importance: Importance.MEDIUM,
      isProcessing: true,
      projectId: currentView.type === 'project' ? currentView.projectId : undefined,
    };
    setTasks(prevTasks => [provisionalTask, ...prevTasks]);

    geminiService.getSmartTask(rawContent)
      .then(smartTask => updateTask(provisionalId, { ...smartTask, isProcessing: false }))
      .catch(error => {
        console.error("Failed to smart-add task", error);
        updateTask(provisionalId, { isProcessing: false });
      });
  };

  const updateTask = (id: string, updatedFields: Partial<Omit<Task, 'id' | 'timestamp'>>) => {
    setTasks(prevTasks => prevTasks.map(task => (task.id === id ? { ...task, ...updatedFields } : task)));
  };

  const deleteTask = (id: string) => {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;
    
    const taskToDelete = tasks[taskIndex];
    setUndoState({ task: taskToDelete, index: taskIndex });
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
    
    setTimeout(() => setUndoState(null), 5000);
  };

  const handleCompleteTask = (id: string, completed: boolean) => {
    if (completed && completeSoundRef.current) {
        completeSoundRef.current.currentTime = 0;
        completeSoundRef.current.play().catch(e => console.error("Audio play failed", e));
    }
    updateTask(id, { completed });
  };
  
  const handleUndoDelete = () => {
    if (!undoState) return;
    const newTasks = [...tasks];
    newTasks.splice(undoState.index, 0, undoState.task);
    setTasks(newTasks);
    setUndoState(null);
  };

  const addProject = (name: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
    };
    setProjects(prev => [...prev, newProject]);
  };

  const deleteProject = (id: string) => {
    // Reassign tasks from deleted project to inbox
    setTasks(prev => prev.map(t => t.projectId === id ? {...t, projectId: undefined} : t));
    setProjects(prev => prev.filter(p => p.id !== id));
    // If we were viewing the deleted project, switch to inbox
    if (currentView.type === 'project' && currentView.projectId === id) {
        setCurrentView({ type: 'inbox' });
    }
  };

  // --- AI Actions ---
  const handleSendMessage = async (newMessage: string) => {
    const userMessage: ChatMessage = { role: 'user', parts: [{ text: newMessage }] };
    const historyForApi = [...chatHistory];
    setChatHistory(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
        const responseText = await geminiService.getChatResponse(historyForApi, newMessage, tasks, projects);
        const modelMessage: ChatMessage = { role: 'model', parts: [{ text: responseText }] };
        setChatHistory(prev => [...prev, modelMessage]);
    } catch(error) {
        console.error("Chatbot error:", error);
        const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Sorry, I'm having trouble responding right now." }] };
        setChatHistory(prev => [...prev, errorMessage]);
    } finally {
        setIsChatLoading(false);
    }
  };
  
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult('');
    try {
        const result = await geminiService.analyzeTasks(tasks);
        setAnalysisResult(result);
    } catch (error) {
        setAnalysisResult("<p>An error occurred during analysis.</p>");
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  const handleFocus = async () => {
      setIsAnalyzing(true);
      try {
        const focusedId = await geminiService.getFocusTask(tasks);
        setFocusTaskId(focusedId);
      } catch (error) { console.error("Focus mode failed", error); } 
      finally { setIsAnalyzing(false); }
  };

  // --- Filtering & Sorting ---
  const displayedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const upcomingEndDate = new Date(today);
    upcomingEndDate.setDate(today.getDate() + 7);

    let filtered = tasks;
    
    switch (currentView.type) {
        case 'inbox':
            filtered = tasks.filter(t => !t.projectId);
            break;
        case 'today':
            filtered = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= endOfToday);
            break;
        case 'upcoming':
            filtered = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= upcomingEndDate);
            break;
        case 'project':
            filtered = tasks.filter(t => t.projectId === currentView.projectId);
            break;
    }
    
    if (currentView.type !== 'calendar' && filterBy !== 'all') {
        filtered = filtered.filter(task => task.importance === filterBy);
    }

    const importanceOrder: Importance[] = [Importance.CRITICAL, Importance.HIGH, Importance.MEDIUM, Importance.LOW];
    return filtered.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (sortBy === 'importance') return importanceOrder.indexOf(a.importance) - importanceOrder.indexOf(b.importance);
        if (sortBy === 'dueDate') {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [tasks, currentView, filterBy, sortBy]);

  const activeTasksCount = tasks.filter(t => !t.completed).length;
  
  const viewTitles: {[key: string]: string} = {
    inbox: 'Inbox',
    today: 'Today',
    upcoming: 'Upcoming',
  }
  
  const currentTitle = currentView.type === 'project'
    ? projects.find(p => p.id === currentView.projectId)?.name || 'Project'
    : viewTitles[currentView.type] || 'Planner';

  return (
    <div className={`h-screen flex text-slate-100 font-sans transition-all duration-500 ${focusTaskId ? 'pt-16' : 'pt-0'}`}>
      {focusTaskId && (
        <div className="fixed top-0 left-0 right-0 bg-indigo-600/50 backdrop-blur-md p-4 text-center z-50 flex justify-between items-center animate-fade-in">
            <h2 className="text-xl font-bold">Your Next Step</h2>
            <button onClick={() => setFocusTaskId(null)} className="font-semibold hover:bg-white/10 px-3 py-1 rounded-md">See All Tasks</button>
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
                  <button onClick={handleFocus} disabled={isAnalyzing || activeTasksCount < 2} className="hidden sm:flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-full transition-colors">
                    <StarIcon className="w-5 h-5"/> <span>Start Here</span>
                  </button>
                  <button onClick={handleAnalyze} disabled={isAnalyzing || activeTasksCount === 0} className="hidden sm:flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-full transition-colors">
                      {isAnalyzing && focusTaskId === null ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <BrainIcon className="w-5 h-5"/>}
                      <span>Analyze</span>
                  </button>
                </div>
            </header>
            
            {analysisResult && (
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 relative animate-fade-in mb-6" dangerouslySetInnerHTML={{__html: `<button id="close-analysis" class="absolute top-2 right-2 p-1 text-slate-400 hover:text-white">&times;</button><h3 class="font-bold text-lg mb-2 text-purple-400">AI Analysis</h3>` + analysisResult}} onClick={(e) => (e.target as HTMLElement).id === 'close-analysis' && setAnalysisResult('')}></div>
            )}
            
            <div className={`transition-opacity duration-300 ${focusTaskId ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                {currentView.type !== 'calendar' && <div className="mb-6"><AddTaskForm onAddTask={addTask} isBusy={false} /></div>}

                {currentView.type === 'calendar' ? (
                    <CalendarView tasks={tasks} projects={projects} onUpdateTask={updateTask} onDeleteTask={deleteTask} onComplete={handleCompleteTask} />
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
                              <TaskItem task={task} projects={projects} onUpdateTask={updateTask} onDeleteTask={deleteTask} onComplete={handleCompleteTask} isFocused={focusTaskId === task.id} />
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-16 px-4 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                            <h2 className="text-2xl font-semibold text-slate-300">All Clear!</h2>
                            <p className="text-slate-400 mt-2">There are no tasks in this view. Add one above to get started!</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
            </div>
        </div>
      </main>
      <Chatbot 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(prev => !prev)} 
        messages={chatHistory} 
        onSendMessage={handleSendMessage}
        isLoading={isChatLoading}
      />
      <Toast message="Task deleted" isVisible={!!undoState} onAction={handleUndoDelete} actionText="Undo" />
    </div>
  );
};

export default App;