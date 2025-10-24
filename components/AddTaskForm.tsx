import React, { useState } from 'react';
import { PlusIcon, SparklesIcon } from './Icons';

interface AddTaskFormProps {
  onAddTask: (rawContent: string) => void;
  isBusy: boolean;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, isBusy }) => {
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
        <input
          id="add-task-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="e.g., 'Call Jane about the project by 5pm tomorrow, it's critical'"
          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 transition-all text-lg"
          disabled={isBusy}
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-400 pointer-events-none">
          <SparklesIcon />
        </div>
      </div>
      <button
        type="submit"
        className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105"
        disabled={!inputValue.trim() || isBusy}
      >
        <PlusIcon className="w-5 h-5" />
        <span>Add</span>
      </button>
    </form>
  );
};

export default AddTaskForm;