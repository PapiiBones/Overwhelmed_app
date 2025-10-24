import React, { useState, useRef, useEffect } from 'react';
import { Task, Importance, Project } from '../types';
import { IMPORTANCE_STYLES } from '../constants';
import { TrashIcon, CalendarIcon, CheckIcon, PencilIcon, SparklesIcon } from './Icons';
import { geminiService } from '../services/geminiService';

interface TaskItemProps {
  task: Task;
  projects: Project[];
  onUpdateTask: (id: string, updatedTask: Partial<Omit<Task, 'id' | 'timestamp'>>) => void;
  onDeleteTask: (id:string) => void;
  onComplete: (id: string, completed: boolean) => void;
  isFocused: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, projects, onUpdateTask, onDeleteTask, onComplete, isFocused }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<Partial<Task>>(task);
  const [isThinking, setIsThinking] = useState(false);
  const [justUpdatedFields, setJustUpdatedFields] = useState<string[]>([]);
  
  const contentInputRef = useRef<HTMLInputElement>(null);

  const project = projects.find(p => p.id === task.projectId);

  useEffect(() => {
    if (isEditing) {
        setEditState(task);
        contentInputRef.current?.focus();
    }
  }, [isEditing, task]);

  const styles = IMPORTANCE_STYLES[task.importance];
  const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();

  const handleSave = () => {
    const changes: Partial<Omit<Task, 'id' | 'timestamp'>> = {};
    (Object.keys(editState) as Array<keyof Task>).forEach(key => {
        if (editState[key] !== task[key]) {
            (changes as any)[key] = editState[key];
        }
    });
    if (Object.keys(changes).length > 0) {
        onUpdateTask(task.id, changes);
    }
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setJustUpdatedFields([]);
  };

  const handleSmartUpdate = async () => {
    if (!editState.content || editState.content.trim() === task.content) return;
    setIsThinking(true);
    try {
        const updatedFields = await geminiService.getSmartUpdate(editState.content, task, projects);
        const newEditState = { ...editState, ...updatedFields };
        setEditState(newEditState);

        const updatedKeys = Object.keys(updatedFields);
        if (updatedKeys.length > 0) {
            setJustUpdatedFields(updatedKeys.filter(k => k !== 'content'));
            setTimeout(() => setJustUpdatedFields([]), 1500);
        }
    } catch (error) {
        console.error("Smart Update failed", error);
    } finally {
        setIsThinking(false);
    }
  };
  
  const formatDateForInput = (isoDate?: string) => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  };

  const renderDisplayView = () => {
      if (task.isProcessing) {
        return (
            <div className="relative flex items-start gap-4 p-4 rounded-lg bg-slate-800/50 opacity-60">
                <div className="mt-1 w-6 h-6 flex-shrink-0 rounded-full border-2 border-slate-600"></div>
                <div className="flex-grow">
                    <p className="text-slate-300 italic text-lg">{task.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                        <div className="w-4 h-4 border-2 border-t-transparent border-slate-400 rounded-full animate-spin"></div>
                        <span>AI is enhancing...</span>
                    </div>
                </div>
            </div>
        )
      }

      return (
        <div 
          onDoubleClick={() => setIsEditing(true)}
          className={`
            relative flex items-start gap-3 p-3 rounded-lg border-l-4 transition-all duration-200 group
            ${task.completed 
              ? `bg-slate-800/30 border-slate-700 opacity-60` 
              : `${styles.bg} ${styles.border} hover:brightness-125`
            }
            ${isFocused ? 'scale-[1.01] shadow-lg shadow-indigo-500/50 ring-2 ring-indigo-500' : ''}
          `}
        >
          <button
            onClick={() => onComplete(task.id, !task.completed)}
            className={`mt-1 w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
              task.completed ? 'bg-green-500 border-green-500' : 'border-slate-500 group-hover:border-green-400'
            }`}
            aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {task.completed && <CheckIcon className="w-4 h-4 text-slate-900" />}
          </button>

          <div className="flex-grow">
            <p className={`text-slate-100 text-lg ${task.completed ? 'line-through text-slate-400' : ''}`}>
                {task.content}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-slate-400">
              {project && <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: project.color}}></div> {project.name}</span>}
              {task.contact && <span className="bg-slate-700/50 px-2 py-0.5 rounded-full">{task.contact}</span>}
              {task.dueDate && (
                  <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-400 font-semibold' : ''}`}>
                      <CalendarIcon className="w-4 h-4" />
                      {new Date(task.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                  </span>
              )}
            </div>
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setIsEditing(true)} className="p-2 text-slate-500 hover:text-indigo-400 transition-colors rounded-full hover:bg-slate-600/50"><PencilIcon className="w-5 h-5" /></button>
            <button onClick={() => onDeleteTask(task.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-full hover:bg-slate-600/50"><TrashIcon className="w-5 h-5" /></button>
          </div>
        </div>
      );
  }

  const renderEditView = () => (
     <div className="p-4 rounded-lg bg-slate-800/80 ring-2 ring-indigo-500">
        <div className="relative mb-2">
            <input 
                ref={contentInputRef}
                type="text"
                placeholder="Task description..."
                value={editState.content || ''}
                onChange={(e) => setEditState(s => ({...s, content: e.target.value}))}
                className="w-full bg-slate-700 text-slate-100 p-2 pr-10 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
                onClick={handleSmartUpdate}
                disabled={isThinking}
                className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-indigo-400 hover:text-indigo-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                title="Use AI to update fields from the text"
            >
                {isThinking ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <SparklesIcon className="w-5 h-5" />}
            </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
            <select
                value={editState.projectId || ''}
                onChange={(e) => setEditState(s => ({...s, projectId: e.target.value || undefined}))}
                className={`bg-slate-700 text-slate-300 p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 ${justUpdatedFields.includes('projectId') ? 'animate-field-update' : ''}`}
            >
                <option value="">No Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input 
                type="text"
                placeholder="Contact..."
                value={editState.contact || ''}
                onChange={(e) => setEditState(s => ({...s, contact: e.target.value}))}
                className={`bg-slate-700 text-slate-300 p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 ${justUpdatedFields.includes('contact') ? 'animate-field-update' : ''}`}
            />
             <select 
                value={editState.importance || Importance.MEDIUM}
                onChange={(e) => setEditState(s => ({...s, importance: e.target.value as Importance}))}
                className={`bg-slate-700 text-slate-300 p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 ${justUpdatedFields.includes('importance') ? 'animate-field-update' : ''}`}
            >
                {Object.values(Importance).map(level => <option key={level} value={level}>{level}</option>)}
            </select>
            <input 
                type="datetime-local"
                value={formatDateForInput(editState.dueDate)}
                onChange={(e) => setEditState(s => ({...s, dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined}))}
                className={`bg-slate-700 text-slate-300 p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 ${justUpdatedFields.includes('dueDate') ? 'animate-field-update' : ''}`}
            />
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
            <button onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 rounded-md">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md">Save Changes</button>
        </div>
     </div>
  );

  return isEditing ? renderEditView() : renderDisplayView();
};

export default TaskItem;