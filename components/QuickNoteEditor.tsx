import React, { useState } from 'react';
import { Task } from '../types';

interface QuickNoteEditorProps {
  task: Task;
  onSave: (note: string) => void;
  onCancel: () => void;
}

const QuickNoteEditor: React.FC<QuickNoteEditorProps> = ({ task, onSave, onCancel }) => {
  const [noteInput, setNoteInput] = useState(task.notes || '');

  const handleSaveNote = () => {
    if (noteInput !== task.notes) {
      onSave(noteInput);
    } else {
      onCancel();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSaveNote();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="mt-2" onClick={e => e.stopPropagation()}>
      <textarea
        value={noteInput}
        onChange={(e) => setNoteInput(e.target.value)}
        onBlur={handleSaveNote}
        onKeyDown={handleKeyDown}
        className="w-full bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-[var(--color-text-tertiary)] resize-y"
        autoFocus
        placeholder="Add a quick note... (Ctrl+Enter to save)"
      />
    </div>
  );
};

  export default QuickNoteEditor;