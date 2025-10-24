import React, { useState, useEffect, useRef } from 'react';
import { Task, Project, Importance } from '../types';
import { geminiService } from '../services/geminiService';
import { CloseIcon } from './Icons';

interface TaskDetailModalProps {
  task: Task;
  projects: Project[];
  onClose: () => void;
  onUpdateTask: (id: string, updatedTask: Partial<Omit<Task, 'id' | 'timestamp'>>) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, projects, onClose, onUpdateTask }) => {
  const [editState, setEditState] = useState<Partial<Task>>(task);
  const [isThinking, setIsThinking] = useState(false);
  const contentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditState(task);
    setTimeout(() => contentInputRef.current?.focus(), 100);
  }, [task]);
  
  const handleSave = async () => {
    setIsThinking(true);
    try {
      const contentHasChanged = editState.content?.trim() !== task.content.trim() && editState.content?.trim();
      
      let allChanges = { ...editState };
      
      if (contentHasChanged) {
        // If content changed, get AI updates and merge them. AI updates take precedence.
        const aiUpdatedFields = await geminiService.getSmartUpdate(editState.content!, task, projects);
        allChanges = { ...editState, ...aiUpdatedFields };
      }
      
      // Determine the final set of fields that actually changed from the original task
      const finalChanges: Partial<Omit<Task, 'id' | 'timestamp'>> = {};
      (Object.keys(allChanges) as Array<keyof Task>).forEach(key => {
        if (key !== 'id' && key !== 'timestamp' && allChanges[key] !== task[key]) {
          (finalChanges as any)[key] = allChanges[key];
        }
      });
      
      if (Object.keys(finalChanges).length > 0) {
        onUpdateTask(task.id, finalChanges);
      }
    } catch (error) {
      console.error("Smart Update on save failed", error);
      // Fallback to only saving manual edits if AI fails
      onUpdateTask(task.id, editState);
    } finally {
      setIsThinking(false);
      onClose();
    }
  };
  
  const formatDateForInput = (isoDate?: string) => {
    if (!isoDate) return '';
    try {
      const d = new Date(isoDate);
      return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-700 relative overflow-hidden animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        <header className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-100">Edit Task</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full" aria-label="Close modal">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="flex-grow p-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
                <label htmlFor="task-content" className="block text-sm font-medium text-slate-400 mb-1">Task</label>
                <input 
                    id="task-content"
                    ref={contentInputRef}
                    type="text"
                    placeholder="Task description..."
                    value={editState.content || ''}
                    onChange={(e) => setEditState(s => ({...s, content: e.target.value}))}
                    className="w-full bg-slate-700 text-slate-100 p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label htmlFor="task-notes" className="block text-sm font-medium text-slate-400 mb-1">Notes</label>
                <textarea
                    id="task-notes"
                    placeholder="Add more details..."
                    value={editState.notes || ''}
                    onChange={(e) => setEditState(s => ({...s, notes: e.target.value}))}
                    className="w-full bg-slate-700 text-slate-100 p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-y placeholder:text-slate-500"
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="task-project" className="block text-sm font-medium text-slate-400 mb-1">Project</label>
                    <select
                        id="task-project"
                        value={editState.projectId || ''}
                        onChange={(e) => setEditState(s => ({...s, projectId: e.target.value || undefined}))}
                        className="w-full bg-slate-700 text-slate-300 p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">No Project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="task-contact" className="block text-sm font-medium text-slate-400 mb-1">Contact</label>
                    <input 
                        id="task-contact"
                        type="text"
                        placeholder="Contact name..."
                        value={editState.contact || ''}
                        onChange={(e) => setEditState(s => ({...s, contact: e.target.value}))}
                        className="w-full bg-slate-700 text-slate-300 p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                    />
                </div>
                 <div>
                    <label htmlFor="task-importance" className="block text-sm font-medium text-slate-400 mb-1">Importance</label>
                    <select 
                        id="task-importance"
                        value={editState.importance || Importance.MEDIUM}
                        onChange={(e) => setEditState(s => ({...s, importance: e.target.value as Importance}))}
                        className="w-full bg-slate-700 text-slate-300 p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {Object.values(Importance).map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="task-duedate" className="block text-sm font-medium text-slate-400 mb-1">Due Date</label>
                    <input 
                        id="task-duedate"
                        type="datetime-local"
                        value={formatDateForInput(editState.dueDate)}
                        onChange={(e) => setEditState(s => ({...s, dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined}))}
                        className="w-full bg-slate-700 text-slate-300 p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>
          </div>
        </main>
        <footer className="flex justify-end gap-2 p-4 border-t border-slate-700 flex-shrink-0 bg-slate-800/50">
            <button onClick={onClose} disabled={isThinking} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 rounded-md disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={isThinking} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md w-32 flex justify-center items-center disabled:bg-indigo-800 disabled:cursor-not-allowed">
                {isThinking ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : 'Save Changes'}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default TaskDetailModal;