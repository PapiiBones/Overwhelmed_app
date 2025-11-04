import React, { useState } from 'react';
import { Task, Subtask } from '../types';
import { CloseIcon, SparklesIcon, PlusIcon, EnvelopeIcon } from './Icons';
import { geminiService } from '../services/geminiService';

interface EmailProcessorModalProps {
  onClose: () => void;
  // Fix: Update onAddTask prop to accept a contact string.
  onAddTask: (taskData: Partial<Omit<Task, 'id'|'timestamp' | 'contactId'>> & { _rawTagNames?: string[], contact?: string }) => void;
}

const EmailProcessorModal: React.FC<EmailProcessorModalProps> = ({ onClose, onAddTask }) => {
  const [emailContent, setEmailContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Fix: Update state type to allow for a contact string property.
  const [processedTask, setProcessedTask] = useState<Partial<Omit<Task, 'id'|'timestamp' | 'contactId'>> & { _rawTagNames?: string[], contact?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcessEmail = async () => {
    if (!emailContent.trim()) return;
    setIsLoading(true);
    setError(null);
    setProcessedTask(null);
    try {
      const { subtasks: aiSubtasks, tags: aiTags, ...taskData } = await geminiService.createTaskFromEmail(emailContent);
      
      const subtasks: Subtask[] | undefined = aiSubtasks?.map(content => ({
        id: crypto.randomUUID(),
        content,
        completed: false,
      }));

      setProcessedTask({ ...taskData, subtasks, _rawTagNames: aiTags });
      
    } catch (e) {
      console.error(e);
      setError('Failed to process email. The AI could not identify a clear task. Please check your API key.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddTask = () => {
    if (!processedTask) return;
    onAddTask(processedTask);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--color-surface-primary)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-[var(--color-border-secondary)] relative overflow-hidden animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-sky-600"></div>
        <header className="flex justify-between items-center p-4 border-b border-[var(--color-border-secondary)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <EnvelopeIcon className="w-6 h-6 text-sky-400" />
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Add Task from Email</h2>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-tertiary)] rounded-full" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-grow p-6 overflow-y-auto space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">Paste an email below. The AI will summarize it into a single task, extracting any relevant details like due dates or contacts.</p>
          <textarea
            placeholder="Paste your email content here..."
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            disabled={isLoading || !!processedTask}
            className="w-full h-48 bg-black/20 text-[var(--color-text-primary)] p-3 rounded-md outline-none focus:ring-2 focus:ring-sky-500 border border-[var(--color-border-secondary)] resize-y"
          />

          {isLoading && (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-t-transparent border-sky-400 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-[var(--color-text-secondary)]">Finding the action item...</p>
            </div>
          )}

          {error && <p className="text-red-400 text-center">{error}</p>}
          
          {processedTask && (
            <div className="p-4 bg-[var(--color-surface-secondary)] border border-[var(--color-border-secondary)] rounded-lg space-y-2 animate-fade-in">
              <h3 className="font-semibold text-[var(--color-text-accent)]">Suggested Task:</h3>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{processedTask.content}</p>
              <div className="text-sm text-[var(--color-text-secondary)] space-y-1">
                {processedTask.dueDate && <p><strong>Due:</strong> {new Date(processedTask.dueDate).toLocaleString()}</p>}
                {processedTask.importance && <p><strong>Importance:</strong> {processedTask.importance}</p>}
                {processedTask.contact && <p><strong>Contact:</strong> {processedTask.contact}</p>}
                {(processedTask._rawTagNames?.length || 0) > 0 && <p><strong>Tags:</strong> {processedTask._rawTagNames?.join(', ')}</p>}
              </div>
            </div>
          )}
        </main>

        <footer className="flex justify-between p-4 border-t border-[var(--color-border-secondary)] flex-shrink-0 bg-[var(--color-surface-secondary)]/50">
          <button 
            onClick={() => {
              setProcessedTask(null);
              setEmailContent('');
              setError(null);
            }}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] rounded-md disabled:opacity-50"
          >
            {processedTask ? 'Start Over' : 'Clear'}
          </button>
          
          {processedTask ? (
            <button
              onClick={handleAddTask}
              style={{ backgroundImage: `linear-gradient(to right, var(--color-button-gradient-start), var(--color-button-gradient-end))` }}
              className="px-4 py-2 text-sm font-semibold text-white rounded-md flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" /> Add This Task
            </button>
          ) : (
            <button
              onClick={handleProcessEmail}
              disabled={!emailContent.trim() || isLoading}
              style={{ backgroundImage: `linear-gradient(to right, var(--color-button-gradient-start), var(--color-button-gradient-end))` }}
              className="w-40 px-4 py-2 text-sm font-semibold text-white rounded-md flex justify-center items-center gap-2 disabled:bg-none disabled:bg-[var(--color-surface-tertiary)] disabled:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed"
            >
              <SparklesIcon className="w-4 h-4" /> Process Email
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default EmailProcessorModal;