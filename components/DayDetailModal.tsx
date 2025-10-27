import React from 'react';
import { Task, Project } from '../types';
import TaskItem from './TaskItem';
import { CloseIcon } from './Icons';
import { sortTasks } from '../utils/sorting';

interface DayDetailModalProps {
  date: Date;
  tasks: Task[];
  projects: Project[];
  onClose: () => void;
  onDeleteTask: (id: string) => void;
  onComplete: (id: string, completed: boolean) => void;
  onSelectTask: (task: Task) => void;
  onUpdateTask: (id: string, updatedFields: Partial<Omit<Task, 'id' | 'timestamp'>>) => void;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({ date, tasks, projects, onClose, onDeleteTask, onComplete, onSelectTask, onUpdateTask }) => {
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sortedTasks = sortTasks(tasks, 'importance');

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--color-surface-primary)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-[var(--color-border-secondary)] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        <header className="flex justify-between items-center p-4 border-b border-[var(--color-border-secondary)] flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{formattedDate}</h2>
          <button onClick={onClose} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-tertiary)] rounded-full" aria-label="Close day detail">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="flex-grow p-4 overflow-y-auto space-y-4">
          {sortedTasks.length > 0 ? (
            sortedTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                projects={projects}
                onSelectTask={onSelectTask}
                onDeleteTask={onDeleteTask}
                onComplete={onComplete}
                onUpdateTask={onUpdateTask}
                isFocused={false}
              />
            ))
          ) : (
            <div className="text-center py-16 px-4">
                <h3 className="text-2xl font-semibold text-[var(--color-text-primary)]">No Tasks Scheduled</h3>
                <p className="text-[var(--color-text-secondary)] mt-2">There are no tasks due on this day.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

   export default DayDetailModal;