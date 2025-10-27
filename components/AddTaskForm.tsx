import React, { useState } from 'react';
import { PlusIcon, SparklesIcon } from './Icons';

interface AddTaskFormProps {
  onAddTask: (rawContent: string) => void;
  isBusy: boolean;
  aiEnabled: boolean;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, isBusy, aiEnabled }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isBusy) return;
    onAddTask(inputValue);
    setInputValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-grow">
        <label htmlFor="add-task-input" className="sr-only">{aiEnabled ? 'Add a new task with AI' : 'Add a new task'}</label>
        <input
          id="add-task-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={aiEnabled ? "e.g., 'Call Jane about the project by 5pm tomorrow, it's critical'" : "Add a new task..."}
          className={`w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border-primary)] rounded-full py-3 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-[var(--color-text-tertiary)] transition-all text-lg ${aiEnabled ? 'pl-12' : 'pl-5'}`}
          disabled={isBusy}
        />
        {aiEnabled && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-400 pointer-events-none">
            <SparklesIcon />
          </div>
        )}
      </div>
      <button
        type="submit"
        className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:bg-[var(--color-surface-tertiary)] disabled:from-transparent disabled:to-transparent disabled:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105"
        disabled={!inputValue.trim() || isBusy}
      >
        <PlusIcon className="w-5 h-5" />
        <span>Add</span>
      </button>
    </form>
  );
};

export default AddTaskForm;