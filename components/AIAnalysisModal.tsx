import React from 'react';
import { AnalysisReport, Task } from '../types';
import { CloseIcon, BrainIcon, CheckIcon, LockClosedIcon } from './Icons';

interface AIAnalysisModalProps {
  report: AnalysisReport | null;
  onClose: () => void;
  isLoading: boolean;
  tasks: Task[];
}

const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({ report, onClose, isLoading, tasks }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--color-surface-primary)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-[var(--color-border-secondary)] relative overflow-hidden animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-fuchsia-600"></div>
        <header className="flex justify-between items-center p-4 border-b border-[var(--color-border-secondary)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <BrainIcon className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">AI Analysis</h2>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-tertiary)] rounded-full" aria-label="Close analysis">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="flex-grow p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center min-h-[200px]">
                <div className="w-8 h-8 border-4 border-t-transparent border-purple-400 rounded-full animate-spin mb-4"></div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Analyzing your tasks...</h3>
                <p className="text-[var(--color-text-secondary)]">The AI is looking for patterns and priorities.</p>
            </div>
          ) : (
            report && (
                <div className="space-y-6">
                    <p className="text-[var(--color-text-secondary)] text-lg">{report.summary}</p>
                    
                    {report.priorities.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-[var(--color-text-primary)] mb-3 text-lg border-b border-[var(--color-border-secondary)] pb-2">Your Top Priorities:</h4>
                            <ul className="space-y-3">
                                {report.priorities.map((item, index) => (
                                    <li key={index} className="flex items-start gap-3 p-3 bg-[var(--color-surface-secondary)] rounded-md">
                                        <CheckIcon className="w-5 h-5 mt-0.5 text-indigo-400 flex-shrink-0" />
                                        <span className="text-[var(--color-text-primary)]">{item.content}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {report.bottlenecks && report.bottlenecks.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-[var(--color-text-primary)] mb-3 text-lg border-b border-[var(--color-border-secondary)] pb-2">Potential Bottlenecks</h4>
                            <ul className="space-y-4">
                                {report.bottlenecks.map((bottleneck, index) => {
                                    const blockingTask = tasks.find(t => t.id === bottleneck.blockingTaskId);
                                    const blockedTasks = bottleneck.blockedTaskIds.map(id => tasks.find(t => t.id === id)).filter((t): t is Task => !!t);

                                    if (!blockingTask) return null;

                                    return (
                                        <li key={index} className="p-3 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-md">
                                            <div className="flex items-start gap-3">
                                                <LockClosedIcon className="w-5 h-5 mt-0.5 text-amber-400 flex-shrink-0" />
                                                <div>
                                                    <p className="font-semibold text-amber-400">"{blockingTask.content}" is blocking {blockedTasks.length} task(s).</p>
                                                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">{bottleneck.reason}</p>
                                                    {blockedTasks.length > 0 && (
                                                        <ul className="mt-2 space-y-1 text-sm list-disc list-inside text-[var(--color-text-tertiary)]">
                                                            {blockedTasks.map(bt => <li key={bt.id}>{bt.content}</li>)}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    {report.suggestedGroups && report.suggestedGroups.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-[var(--color-text-primary)] mb-3 text-lg border-b border-[var(--color-border-secondary)] pb-2">Suggested Groups</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {report.suggestedGroups.map((group, index) => {
                                    const groupTasks = group.taskIds.map(id => tasks.find(t => t.id === id)).filter((t): t is Task => !!t);
                                    return (
                                        <div key={index} className="p-4 bg-[var(--color-surface-secondary)] rounded-lg">
                                            <h5 className="font-bold text-sky-400">{group.name}</h5>
                                            <p className="text-xs text-[var(--color-text-tertiary)] mb-3">{group.reason}</p>
                                            <ul className="space-y-1.5 text-sm">
                                                {groupTasks.map(task => (
                                                    <li key={task.id} className="text-[var(--color-text-secondary)] truncate">
                                                        - {task.content}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )
          )}
        </main>
        <footer className="flex justify-end p-4 border-t border-[var(--color-border-secondary)] flex-shrink-0 bg-[var(--color-surface-secondary)]/50">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-tertiary)] hover:bg-[var(--color-border-tertiary)] rounded-md">Close</button>
        </footer>
      </div>
    </div>
  );
};

 export default AIAnalysisModal;