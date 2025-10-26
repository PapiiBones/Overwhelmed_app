import React, { useState } from 'react';
import { Task, Project } from '../types';
import { IMPORTANCE_STYLES } from '../constants';
import { TrashIcon, CalendarIcon, CheckIcon, PencilIcon, ListIcon, ChatBubbleIcon, StarIcon } from './Icons';
import QuickNoteEditor from './QuickNoteEditor';

interface TaskItemProps {
  task: Task;
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onDeleteTask: (id:string) => void;
  onComplete: (id: string, completed: boolean) => void;
  onUpdateTask: (id: string, updatedFields: Partial<Omit<Task, 'id' | 'timestamp'>>) => void;
  isFocused: boolean;
}

const stripMarkdown = (text?: string): string => {
    if (!text) return '';
    // Remove links, keeping the text
    let stripped = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    // Remove formatting characters
    stripped = stripped.replace(/[*_~`#]/g, '');
    // Collapse whitespace
    stripped = stripped.replace(/\s+/g, ' ').trim();
    // Limit length for tooltip
    if (stripped.length > 100) {
        return stripped.substring(0, 100) + '...';
    }
    return stripped;
};


const TaskItem: React.FC<TaskItemProps> = ({ task, projects, onSelectTask, onDeleteTask, onComplete, onUpdateTask, isFocused }) => {
  const project = projects.find(p => p.id === task.projectId);
  const styles = IMPORTANCE_STYLES[task.importance];
  const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
  
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const handleSaveNote = (note: string) => {
    onUpdateTask(task.id, { notes: note });
    setIsEditingNotes(false);
  };
  
  const handlePriorityToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateTask(task.id, { isPriority: !task.isPriority });
  }

  if (task.isProcessing) {
    return (
        <div className="relative flex items-start gap-4 p-4 rounded-lg bg-slate-800/50 opacity-60">
            <div className="mt-1 w-6 h-6 flex-shrink-0 rounded-full border-2 border-slate-600"></div>
            <div className="flex-grow">
                <p className="text-slate-300 italic text-lg">{task.content}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                    <div className="w-4 h-4 border-2 border-t-transparent border-slate-400 rounded-full animate-spin"></div>
                    <span>Filling Details...</span>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div 
      onDoubleClick={() => onSelectTask(task)}
      className={`
        relative flex items-start gap-3 p-3 rounded-lg border-l-4 transition-all duration-200 group cursor-pointer
        ${task.completed 
          ? `bg-slate-800/30 border-slate-700 opacity-60` 
          : `${styles.bg} ${styles.border} hover:brightness-125`
        }
        ${isFocused ? 'scale-[1.01] shadow-lg shadow-indigo-500/50 ring-2 ring-indigo-500' : ''}
        ${task.isPriority && !task.completed ? 'shadow-md shadow-yellow-400/20' : ''}
      `}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(task.id, !task.completed); }}
        className={`mt-1 w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
          task.completed ? 'bg-green-500 border-green-500' : 'border-slate-500 group-hover:border-green-400'
        }`}
        aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
      >
        {task.completed && <CheckIcon className="w-4 h-4 text-slate-900" />}
      </button>

      <div className="flex-grow pr-28">
        <p className={`text-slate-100 text-lg ${task.completed ? 'line-through text-slate-400' : ''}`}>
            {task.content}
        </p>
        
        {isEditingNotes ? (
            <QuickNoteEditor
              task={task}
              onSave={handleSaveNote}
              onCancel={() => setIsEditingNotes(false)}
            />
        ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-slate-400">
                {project && <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: project.color}}></div> {project.name}</span>}
                {task.contact && <span className="bg-slate-700/50 px-2 py-0.5 rounded-full">{task.contact}</span>}
                {task.dueDate && (
                    <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-400 font-semibold' : ''}`}>
                        <CalendarIcon className="w-4 h-4" />
                        {new Date(task.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit', hour12: true })}
                    </span>
                )}
                {task.notes && (
                    <span className="flex items-center gap-1.5" title={stripMarkdown(task.notes)}>
                        <ListIcon className="w-4 h-4" />
                    </span>
                )}
            </div>
        )}

      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={handlePriorityToggle} className={`p-2 transition-colors rounded-full hover:bg-slate-600/50 ${task.isPriority ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-500 hover:text-yellow-400'}`} aria-label="Toggle priority">
          <StarIcon className={`w-5 h-5 ${task.isPriority ? 'fill-current' : ''}`} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setIsEditingNotes(true); }} className="p-2 text-slate-500 hover:text-indigo-400 transition-colors rounded-full hover:bg-slate-600/50" aria-label="Quick note"><ChatBubbleIcon className="w-5 h-5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onSelectTask(task); }} className="p-2 text-slate-500 hover:text-indigo-400 transition-colors rounded-full hover:bg-slate-600/50" aria-label="Edit task"><PencilIcon className="w-5 h-5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-full hover:bg-slate-600/50" aria-label="Delete task"><TrashIcon className="w-5 h-5" /></button>
      </div>
    </div>
  );
};

export default TaskItem;