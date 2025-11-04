import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Task, Project, Importance, RecurrenceRule, Subtask, AppSettings, Tag, ToastState, Contact } from '../types';
import { geminiService } from '../services/geminiService';
import { CloseIcon, CalendarIcon, PlusIcon, TrashIcon, SparklesIcon, CheckIcon } from './Icons';

interface TaskDetailPanelProps {
  task: Task;
  allTasks: Task[];
  projects: Project[];
  tags: Tag[];
  contacts: Contact[];
  onClose: () => void;
  onUpdateTask: (id: string, updatedTask: Partial<Omit<Task, 'id' | 'timestamp'>>) => void;
  onDeleteTask: (id: string) => void;
  onAddTag: (name: string) => Tag;
  onUpsertContact: (name: string) => string;
  settings: AppSettings;
  dispatch: React.Dispatch<{ type: 'SET_TOAST_STATE', payload: ToastState | null }>;
}

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
  'project', 'move to', 'every day', 'daily', 'weekly', 'monthly',
  '#'
];
const smartUpdateRegex = new RegExp(`(${SMART_UPDATE_KEYWORDS.join('|')})`, 'i');

// Fix: Update AISuggestion to include optional 'contact' string
type AISuggestion = Omit<Partial<Task>, 'subtasks' | 'tagIds' | 'contactId'> & { subtasks?: string[]; tags?: string[]; suggestionText?: string; contact?: string };

const shouldAttemptSmartUpdate = (text: string): boolean => {
  return smartUpdateRegex.test(text);
};

const markdownToHtml = (markdown: string): string => {
    if (!markdown) return '';

    const applyInlineMarkdown = (text: string): string => {
        return text
            // Links
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">$1</a>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            // Strikethrough (before italic)
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>');
    };

    const lines = markdown
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .split('\n');
        
    let html = '';
    let inList = false;

    for (const line of lines) {
        // Unordered List
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            html += `<li>${applyInlineMarkdown(line.trim().substring(2))}</li>`;
        } else {
            // Close list if we are leaving one
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            // Paragraphs (only if there's content)
            if (line.trim()) {
                html += `<p>${applyInlineMarkdown(line)}</p>`;
            }
        }
    }

    // Close any open list at the end
    if (inList) {
        html += '</ul>';
    }

    return html;
};

const stripMarkdown = (text: string): string => {
    if (!text) return '';
    let stripped = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    stripped = stripped.replace(/[*_~`#]/g, '');
    return stripped;
};

const getContrastingTextColor = (hexcolor: string) => {
    if (hexcolor.startsWith('#')) {
        hexcolor = hexcolor.slice(1);
    }
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'var(--color-text-primary)' : 'var(--color-bg-gradient-start)';
};

const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ task, allTasks, projects, tags, contacts, onClose, onUpdateTask, onDeleteTask, onAddTag, onUpsertContact, settings, dispatch }) => {
  const [editState, setEditState] = useState<Partial<Task>>(task);
  const [isThinking, setIsThinking] = useState(false);
  const [notesView, setNotesView] = useState<'write' | 'preview'>('write');
  const [newSubtask, setNewSubtask] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditState({ 
        ...task, 
        subtasks: task.subtasks ? [...task.subtasks.map(st => ({...st}))] : [],
        tagIds: task.tagIds ? [...task.tagIds] : [],
        dependencies: task.dependencies ? [...task.dependencies] : []
    });
    setAiSuggestion(null);
    const contactName = contacts.find(c => c.id === task.contactId)?.name || '';
    setContactInput(contactName);
    setTimeout(() => contentInputRef.current?.focus(), 100);
  }, [task, contacts]);

  const handleContentBlur = async () => {
    const newContent = editState.content?.trim();
    const originalContent = task.content.trim();

    if (settings.aiEnabled && newContent && newContent !== originalContent && shouldAttemptSmartUpdate(newContent)) {
        setIsThinking(true);
        setAiSuggestion(null);
        try {
            const suggestion = await geminiService.getSmartUpdate(newContent, task, projects);
            
            if (suggestion && suggestion.suggestionText && Object.keys(suggestion).length > 1) {
              setAiSuggestion(suggestion);
            }

        } catch (error) {
            console.error("Smart Update on blur failed.", error);
            dispatch({ type: 'SET_TOAST_STATE', payload: { type: 'error', message: 'AI suggestion failed. Check API key.' } });
        } finally {
            setIsThinking(false);
        }
    }
  };

  const handleAcceptSuggestion = () => {
    if (!aiSuggestion) return;
    const { subtasks: aiSubtasks, tags: aiTags, contact: contactName, suggestionText, ...restOfAiFields } = aiSuggestion;
    
    const updatedFields: Partial<Task> = { ...restOfAiFields };

    if (aiSubtasks) {
        updatedFields.subtasks = aiSubtasks.map(content => ({
            id: crypto.randomUUID(),
            content,
            completed: false
        }));
    }
    
    if (contactName) {
        setContactInput(contactName);
    }

    if (aiTags) {
        const tagIds: string[] = [];
        aiTags.forEach(name => {
            const normalizedName = name.trim();
            if (!normalizedName) return;
            const existingTag = tags.find(t => t.name.toLowerCase() === normalizedName.toLowerCase());
            if (existingTag) {
                if (!editState.tagIds?.includes(existingTag.id)) {
                    tagIds.push(existingTag.id);
                }
            } else {
                const newTag = onAddTag(normalizedName);
                tagIds.push(newTag.id);
            }
        });
        updatedFields.tagIds = [...(editState.tagIds || []), ...tagIds];
    }
    
    setEditState(s => ({ ...s, ...updatedFields }));
    setAiSuggestion(null);
  };

  const handleRejectSuggestion = () => {
    setAiSuggestion(null);
  };
  
  const handleSave = () => {
    const getChangedFields = (currentState: Partial<Task>): Partial<Omit<Task, 'id' | 'timestamp'>> => {
      const changes: Partial<Omit<Task, 'id' | 'timestamp'>> = {};
      (Object.keys(currentState) as Array<keyof Task>).forEach(key => {
        if (key !== 'id' && key !== 'timestamp' && key !== 'contactId') { // Exclude contactId from this check
          if (key === 'recurrenceRule' || key === 'subtasks' || key === 'tagIds' || key === 'dependencies') {
            if (JSON.stringify(currentState[key]) !== JSON.stringify(task[key])) {
               (changes as any)[key] = currentState[key];
            }
          } else if (currentState[key] !== task[key]) {
            (changes as any)[key] = currentState[key];
          }
        }
      });
      if (task.recurrenceRule && !currentState.recurrenceRule) {
        changes.recurrenceRule = undefined;
      }
      return changes;
    };

    const changesToSave = getChangedFields(editState);
    
    const initialContactName = contacts.find(c => c.id === task.contactId)?.name || '';
    if (contactInput.trim() !== initialContactName) {
        changesToSave.contactId = onUpsertContact(contactInput);
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
    } catch (e) { return ''; }
  };

  const handleRecurrenceChange = (frequency: RecurrenceRule['frequency'] | 'never') => {
    if (frequency === 'never') {
      setEditState(s => ({ ...s, recurrenceRule: undefined }));
    } else {
      setEditState(s => ({ ...s, recurrenceRule: { frequency, interval: 1 } }));
    }
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim() === '') return;
    const subtask: Subtask = { id: crypto.randomUUID(), content: newSubtask, completed: false };
    setEditState(s => ({ ...s, subtasks: [...(s.subtasks || []), subtask] }));
    setNewSubtask('');
  };

  const handleSubtaskChange = (id: string, newContent: string) => {
    setEditState(s => ({ ...s, subtasks: s.subtasks?.map(st => st.id === id ? { ...st, content: newContent } : st) }));
  };

  const handleSubtaskToggle = (id: string) => {
    setEditState(s => ({ ...s, subtasks: s.subtasks?.map(st => st.id === id ? { ...st, completed: !st.completed } : st) }));
  };

  const handleSubtaskDelete = (id: string) => {
    setEditState(s => ({ ...s, subtasks: s.subtasks?.filter(st => st.id !== id) }));
  };

  const handleAddTag = (tagName: string) => {
    if (!tagName.trim()) return;
    const existingTag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    if (existingTag) {
        if (!editState.tagIds?.includes(existingTag.id)) {
            setEditState(s => ({ ...s, tagIds: [...(s.tagIds || []), existingTag.id] }));
        }
    } else {
        const newTag = onAddTag(tagName);
        setEditState(s => ({ ...s, tagIds: [...(s.tagIds || []), newTag.id] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagId: string) => {
    setEditState(s => ({ ...s, tagIds: s.tagIds?.filter(id => id !== tagId)}));
  };

  const handleAddDependency = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const depId = e.target.value;
    if (depId && !editState.dependencies?.includes(depId)) {
        setEditState(s => ({ ...s, dependencies: [...(s.dependencies || []), depId] }));
    }
  };

  const handleRemoveDependency = (depId: string) => {
    setEditState(s => ({ ...s, dependencies: s.dependencies?.filter(id => id !== depId) }));
  };

  const generateGoogleCalendarLink = useCallback(() => {
    const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    const title = encodeURIComponent(editState.content || '');
    const notes = encodeURIComponent(stripMarkdown(editState.notes || ''));
    const dueDate = editState.dueDate;
    if (!dueDate) return `${baseUrl}&text=${title}&details=${notes}`;
    const startTime = new Date(dueDate);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    const formatGCDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');
    const dates = `&dates=${formatGCDate(startTime)}/${formatGCDate(endTime)}`;
    return `${baseUrl}&text=${title}&dates=${dates}&details=${notes}`;
  }, [editState.content, editState.dueDate, editState.notes]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      <div 
        className="fixed top-0 right-0 h-full w-full max-w-[450px] bg-[var(--color-surface-primary)] shadow-2xl flex flex-col border-l border-[var(--color-border-secondary)] z-50 transform transition-transform duration-300 ease-in-out animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        <header className="flex justify-between items-center p-4 border-b border-[var(--color-border-secondary)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => onDeleteTask(task.id)} className="p-2 text-[var(--color-text-tertiary)] hover:text-red-400 hover:bg-[var(--color-surface-tertiary)] rounded-full" aria-label="Delete Task">
                <TrashIcon className="w-5 h-5" />
            </button>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-tertiary)] rounded-full" aria-label="Close panel">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="flex-grow p-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
                <label htmlFor="task-content" className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  <span>Task</span>
                  {settings.aiEnabled && <span className="text-indigo-400" title="AI Smart Update is enabled. Type a date or time and tab away."><SparklesIcon className="w-4 h-4" /></span>}
                </label>
                <div className="relative">
                    <input 
                        id="task-content"
                        ref={contentInputRef}
                        type="text"
                        placeholder="Task description..."
                        value={editState.content || ''}
                        onChange={(e) => setEditState(s => ({...s, content: e.target.value}))}
                        onBlur={handleContentBlur}
                        className="w-full bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {isThinking && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 border-2 border-t-transparent border-indigo-400 rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
            </div>
            {aiSuggestion && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 my-2 flex items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-3">
                  <SparklesIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <p className="text-sm text-[var(--color-text-accent)]">{aiSuggestion.suggestionText}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={handleRejectSuggestion} className="p-2 text-red-400 hover:bg-red-500/10 rounded-full transition-colors" aria-label="Reject suggestion">
                    <CloseIcon className="w-5 h-5" />
                  </button>
                  <button onClick={handleAcceptSuggestion} className="p-2 text-green-400 hover:bg-green-500/10 rounded-full transition-colors" aria-label="Accept suggestion">
                    <CheckIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
            <div>
                <label htmlFor="task-dependencies" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Depends On</label>
                <div className="flex flex-wrap items-center gap-2 p-2 bg-[var(--color-surface-tertiary)] rounded-md mb-2 min-h-[40px]">
                    {editState.dependencies?.map(depId => {
                        const depTask = allTasks.find(t => t.id === depId);
                        if (!depTask) return null;
                        return (
                            <span key={depId} className="flex items-center gap-1.5 text-sm px-2 py-1 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]">
                                {depTask.content}
                                <button onClick={() => handleRemoveDependency(depId)} className="opacity-70 hover:opacity-100">
                                    <CloseIcon className="w-3 h-3"/>
                                </button>
                            </span>
                        );
                    })}
                </div>
                <select
                    id="task-dependencies"
                    onChange={handleAddDependency}
                    value=""
                    className="w-full bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="" disabled>Add a dependency...</option>
                    {allTasks
                        .filter(t => t.id !== editState.id && !t.completed && !editState.dependencies?.includes(t.id))
                        .map(t => (
                            <option key={t.id} value={t.id}>{t.content}</option>
                        ))
                    }
                </select>
            </div>
             <div>
                <label htmlFor="task-tags" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Tags</label>
                <div className="flex flex-wrap items-center gap-2 p-2 bg-[var(--color-surface-tertiary)] rounded-md">
                    {editState.tagIds?.map(tagId => {
                        const tag = tags.find(t => t.id === tagId);
                        if (!tag) return null;
                        return (
                            <span key={tag.id} className="flex items-center gap-1.5 text-sm px-2 py-1 rounded-full" style={{ backgroundColor: tag.color, color: getContrastingTextColor(tag.color) }}>
                                {tag.name}
                                <button onClick={() => handleRemoveTag(tag.id)} className="opacity-70 hover:opacity-100">
                                    <CloseIcon className="w-3 h-3"/>
                                </button>
                            </span>
                        )
                    })}
                    <input 
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                handleAddTag(tagInput);
                            }
                        }}
                        placeholder="Add tag..."
                        className="flex-grow bg-transparent outline-none text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-tertiary)]"
                    />
                </div>
             </div>
             <div>
                <label htmlFor="task-subtasks" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Subtasks</label>
                <div className="space-y-2">
                    {editState.subtasks?.map(subtask => (
                        <div key={subtask.id} className="flex items-center gap-2 group">
                            <input
                                type="checkbox"
                                checked={subtask.completed}
                                onChange={() => handleSubtaskToggle(subtask.id)}
                                className="h-4 w-4 rounded border-[var(--color-border-tertiary)] bg-[var(--color-surface-tertiary)] text-indigo-600 focus:ring-indigo-500"
                            />
                            <input
                                type="text"
                                value={subtask.content}
                                onChange={(e) => handleSubtaskChange(subtask.id, e.target.value)}
                                className={`w-full bg-transparent text-[var(--color-text-primary)] outline-none focus:bg-[var(--color-surface-secondary)]/50 p-1 rounded-md ${subtask.completed ? 'line-through text-[var(--color-text-tertiary)]' : ''}`}
                            />
                            <button onClick={() => handleSubtaskDelete(subtask.id)} className="text-[var(--color-text-tertiary)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <div className="flex items-center gap-2">
                         <input
                            type="text"
                            placeholder="Add new subtask..."
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                            className="w-full bg-[var(--color-surface-secondary)]/50 text-[var(--color-text-primary)] p-1 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-[var(--color-text-tertiary)]"
                         />
                         <button onClick={handleAddSubtask} className="p-1.5 bg-[var(--color-surface-tertiary)] hover:bg-[var(--color-border-tertiary)] rounded-md">
                            <PlusIcon className="w-4 h-4" />
                         </button>
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="task-notes" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Notes</label>
                <div className="bg-black/20 border border-[var(--color-border-secondary)] rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                    <div className="flex items-center gap-1 p-1 border-b border-[var(--color-border-secondary)] bg-[var(--color-surface-secondary)]/50">
                        <button onClick={() => setNotesView('write')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${notesView === 'write' ? 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)]'}`}>Write</button>
                        <button onClick={() => setNotesView('preview')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${notesView === 'preview' ? 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)]'}`}>Preview</button>
                    </div>
                    {notesView === 'write' ? (
                         <textarea
                            id="task-notes"
                            placeholder="Add more details... (Markdown supported)"
                            value={editState.notes || ''}
                            onChange={(e) => setEditState(s => ({...s, notes: e.target.value}))}
                            className="w-full bg-transparent text-[var(--color-text-primary)] p-2 outline-none h-24 resize-y placeholder:text-[var(--color-text-tertiary)]"
                        />
                    ) : (
                        <div 
                            className="p-3 min-h-[112px] text-[var(--color-text-secondary)] [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic [&_p]:mb-2 last:[&_p]:mb-0"
                            dangerouslySetInnerHTML={{ __html: markdownToHtml(editState.notes || '') || `<p class="text-[var(--color-text-tertiary)]">Nothing to preview.</p>` }} 
                        />
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="task-project" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Project</label>
                    <select
                        id="task-project"
                        value={editState.projectId || ''}
                        onChange={(e) => setEditState(s => ({...s, projectId: e.target.value || undefined}))}
                        className="w-full bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">No Project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="task-contact" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Contact</label>
                    <input 
                        id="task-contact"
                        type="text"
                        list="contacts-list"
                        placeholder="Contact name..."
                        value={contactInput}
                        onChange={(e) => setContactInput(e.target.value)}
                        className="w-full bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-[var(--color-text-tertiary)]"
                    />
                    <datalist id="contacts-list">
                        {contacts.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                </div>
                 <div>
                    <label htmlFor="task-importance" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Importance</label>
                    <select 
                        id="task-importance"
                        value={editState.importance || Importance.MEDIUM}
                        onChange={(e) => setEditState(s => ({...s, importance: e.target.value as Importance}))}
                        className="w-full bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {Object.values(Importance).map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="task-duedate" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Due Date</label>
                    <input 
                        id="task-duedate"
                        type="datetime-local"
                        value={formatDateForInput(editState.dueDate)}
                        onChange={(e) => setEditState(s => ({...s, dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined}))}
                        className="w-full bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                 <div>
                    <label htmlFor="task-recurrence" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Repeats</label>
                    <select
                        id="task-recurrence"
                        value={editState.recurrenceRule?.frequency || 'never'}
                        onChange={(e) => handleRecurrenceChange(e.target.value as any)}
                        className="w-full bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="h-4 w-4 rounded border-[var(--color-border-tertiary)] bg-[var(--color-surface-tertiary)] text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="task-priority" className="ml-2 block text-sm text-[var(--color-text-primary)]">
                        Mark as Priority
                    </label>
                </div>
            </div>
          </div>
        </main>
        <footer className="flex justify-between items-center gap-2 p-4 border-t border-[var(--color-border-secondary)] flex-shrink-0 bg-[var(--color-surface-secondary)]/50">
            <a
                href={generateGoogleCalendarLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] rounded-md transition-colors"
                aria-label="Add to Google Calendar"
            >
                <CalendarIcon className="w-4 h-4" />
                Add to GCal
            </a>
            <div className="flex items-center gap-2">
                <button onClick={onClose} disabled={isThinking} className="px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] rounded-md disabled:opacity-50">Cancel</button>
                <button 
                  onClick={handleSave} 
                  disabled={isThinking} 
                  style={{ backgroundImage: `linear-gradient(to right, var(--color-button-gradient-start), var(--color-button-gradient-end))` }}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-md w-32 flex justify-center items-center disabled:bg-none disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    {isThinking ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : 'Save Changes'}
                </button>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default TaskDetailPanel;