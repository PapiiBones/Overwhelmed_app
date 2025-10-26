import React, { useState, useEffect, useRef } from 'react';
import { Task, Project, Importance, RecurrenceRule } from '../types';
import { geminiService } from '../services/geminiService';
import { CloseIcon, CalendarIcon } from './Icons';

interface TaskDetailModalProps {
  task: Task;
  projects: Project[];
  onClose: () => void;
  onUpdateTask: (id: string, updatedTask: Partial<Omit<Task, 'id' | 'timestamp'>>) => void;
}

// Keywords that suggest a task description contains structured data worth parsing.
const SMART_UPDATE_KEYWORDS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
  'today', 'tomorrow', 'next week', 'next month', 'tonight',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  'am', 'pm', 'o\'clock', 'noon', 'midnight',
  'by', 'at', 'on', 'due', 'in', 'for',
  'critical', 'high', 'medium', 'low', 'urgent', 'important',
  'call', 'email', 'meet', 'text', 'remind',
  'project', 'move to', 'every day', 'daily', 'weekly', 'monthly'
];
const smartUpdateRegex = new RegExp(`\\b(${SMART_UPDATE_KEYWORDS.join('|')})\\b`, 'i');

const shouldAttemptSmartUpdate = (text: string): boolean => {
  return smartUpdateRegex.test(text);
};

const markdownToHtml = (markdown: string): string => {
    if (!markdown) return '';

    const lines = markdown
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .split('\n');
    
    let html = '';
    let inList = false;

    for (const line of lines) {
        let processedLine = ' ' + line + ' ';

        // Links
        processedLine = processedLine.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Bold and Italic
        processedLine = processedLine.replace(/(\s)\*\*(.*?)\*\*(\s)/g, '$1<strong>$2</strong>$3');
        processedLine = processedLine.replace(/(\s)__(.*?)__(\s)/g, '$1<strong>$2</strong>$3');
        processedLine = processedLine.replace(/(\s)\*(.*?)\*(\s)/g, '$1<em>$2</em>$3');
        processedLine = processedLine.replace(/(\s)_(.*?)_(\s)/g, '$1<em>$2</em>$3');

        // Lists
        if (processedLine.trim().startsWith('- ')) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            html += `<li>${processedLine.trim().substring(2)}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            // Paragraphs for non-empty lines
            if (processedLine.trim()) {
                html += `<p>${processedLine.trim()}</p>`;
            }
        }
    }

    if (inList) {
        html += '</ul>';
    }

    return html;
};


const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, projects, onClose, onUpdateTask }) => {
  const [editState, setEditState] = useState<Partial<Task>>(task);
  const [isThinking, setIsThinking] = useState(false);
  const [notesView, setNotesView] = useState<'write' | 'preview'>('write');
  const contentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditState(task);
    setTimeout(() => contentInputRef.current?.focus(), 100);
  }, [task]);
  
  const handleSave = async () => {
    const contentHasChanged = editState.content?.trim() !== task.content.trim() && editState.content?.trim();
    
    const getChangedFields = (currentState: Partial<Task>): Partial<Omit<Task, 'id' | 'timestamp'>> => {
      const changes: Partial<Omit<Task, 'id' | 'timestamp'>> = {};
      (Object.keys(currentState) as Array<keyof Task>).forEach(key => {
        if (key !== 'id' && key !== 'timestamp') {
          // Deep compare for recurrenceRule
          if (key === 'recurrenceRule') {
            if (JSON.stringify(currentState.recurrenceRule) !== JSON.stringify(task.recurrenceRule)) {
               (changes as any)[key] = currentState[key];
            }
          } else if (currentState[key] !== task[key]) {
            (changes as any)[key] = currentState[key];
          }
        }
      });
      // Handle case where recurrenceRule is removed
      if (task.recurrenceRule && !currentState.recurrenceRule) {
        changes.recurrenceRule = undefined;
      }
      return changes;
    };

    let changesToSave: Partial<Omit<Task, 'id' | 'timestamp'>> = {};

    if (contentHasChanged && editState.content && shouldAttemptSmartUpdate(editState.content)) {
      setIsThinking(true);
      try {
        const aiUpdatedFields = await geminiService.getSmartUpdate(editState.content, task, projects);
        const allChanges = { ...editState, ...aiUpdatedFields };
        changesToSave = getChangedFields(allChanges);
      } catch (error) {
        console.error("Smart Update failed, saving manual changes.", error);
        changesToSave = getChangedFields(editState);
      } finally {
        setIsThinking(false);
      }
    } else {
      changesToSave = getChangedFields(editState);
    }

    if (Object.keys(changesToSave).length > 0) {
      onUpdateTask(task.id, changesToSave);
    }
    
    onClose();
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

  const handleRecurrenceChange = (frequency: RecurrenceRule['frequency'] | 'never') => {
    if (frequency === 'never') {
      const { recurrenceRule, ...rest } = editState;
      setEditState(rest);
    } else {
      setEditState(s => ({ ...s, recurrenceRule: { frequency, interval: 1 } }));
    }
  };

  const generateGoogleCalendarLink = () => {
    const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    const title = encodeURIComponent(task.content);
    const notes = encodeURIComponent(stripMarkdown(task.notes || ''));
    
    if (!task.dueDate) {
        return `${baseUrl}&text=${title}&details=${notes}`;
    }

    const startTime = new Date(task.dueDate);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Assume 1 hour duration

    const formatGCDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');
    
    const dates = `&dates=${formatGCDate(startTime)}/${formatGCDate(endTime)}`;

    return `${baseUrl}&text=${title}&dates=${dates}&details=${notes}`;
  };

  const stripMarkdown = (text: string): string => {
    let stripped = text.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Links
    stripped = stripped.replace(/[*_~`#]/g, ''); // Formatting
    return stripped;
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
                <div className="bg-slate-900/50 border border-slate-700 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                    <div className="flex items-center gap-1 p-1 border-b border-slate-700 bg-slate-800/50">
                        <button onClick={() => setNotesView('write')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${notesView === 'write' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:bg-slate-700'}`}>Write</button>
                        <button onClick={() => setNotesView('preview')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${notesView === 'preview' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:bg-slate-700'}`}>Preview</button>
                    </div>
                    {notesView === 'write' ? (
                         <textarea
                            id="task-notes"
                            placeholder="Add more details... (Markdown supported)"
                            value={editState.notes || ''}
                            onChange={(e) => setEditState(s => ({...s, notes: e.target.value}))}
                            className="w-full bg-transparent text-slate-200 p-2 outline-none h-24 resize-y placeholder:text-slate-500"
                        />
                    ) : (
                        <div 
                            className="p-3 min-h-[112px] text-slate-300 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic [&_p]:mb-2 last:[&_p]:mb-0 [&_a]:text-indigo-400 [&_a]:hover:underline"
                            dangerouslySetInnerHTML={{ __html: markdownToHtml(editState.notes || '') || '<p class="text-slate-500">Nothing to preview.</p>' }} 
                        />
                    )}
                </div>
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
                 <div>
                    <label htmlFor="task-recurrence" className="block text-sm font-medium text-slate-400 mb-1">Repeats</label>
                    <select
                        id="task-recurrence"
                        value={editState.recurrenceRule?.frequency || 'never'}
                        onChange={(e) => handleRecurrenceChange(e.target.value as any)}
                        className="w-full bg-slate-700 text-slate-300 p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="never">Never</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
                 <div className="flex items-center pt-6">
                    <input
                        id="task-priority"
                        type="checkbox"
                        checked={!!editState.isPriority}
                        onChange={(e) => setEditState(s => ({ ...s, isPriority: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="task-priority" className="ml-2 block text-sm text-slate-300">
                        Mark as Priority
                    </label>
                </div>
            </div>
          </div>
        </main>
        <footer className="flex justify-between items-center gap-2 p-4 border-t border-slate-700 flex-shrink-0 bg-slate-800/50">
            <a
                href={generateGoogleCalendarLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 rounded-md transition-colors"
                aria-label="Add to Google Calendar"
            >
                <CalendarIcon className="w-4 h-4" />
                Add to Google Calendar
            </a>
            <div className="flex items-center gap-2">
                <button onClick={onClose} disabled={isThinking} className="px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 rounded-md disabled:opacity-50">Cancel</button>
                <button onClick={handleSave} disabled={isThinking} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md w-32 flex justify-center items-center disabled:bg-indigo-800 disabled:cursor-not-allowed">
                    {isThinking ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : 'Save Changes'}
                </button>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default TaskDetailModal;