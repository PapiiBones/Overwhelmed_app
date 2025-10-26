import React from 'react';
import { AnalysisReport } from '../types';
import { CloseIcon, BrainIcon, CheckIcon } from './Icons';

interface AIAnalysisModalProps {
  report: AnalysisReport | null;
  onClose: () => void;
  isLoading: boolean;
}

const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({ report, onClose, isLoading }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-700 relative overflow-hidden animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-fuchsia-600"></div>
        <header className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <BrainIcon className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-slate-100">AI Analysis</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full" aria-label="Close analysis">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="flex-grow p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center min-h-[200px]">
                <div className="w-8 h-8 border-4 border-t-transparent border-purple-400 rounded-full animate-spin mb-4"></div>
                <h3 className="text-lg font-semibold text-slate-200">Analyzing your tasks...</h3>
                <p className="text-slate-400">The AI is looking for patterns and priorities.</p>
            </div>
          ) : (
            report && (
                <>
                <p className="text-slate-300 mb-6 text-lg">{report.summary}</p>
                {report.priorities.length > 0 && (
                    <>
                        <h4 className="font-semibold text-slate-100 mb-3 text-lg border-b border-slate-700 pb-2">Your Top Priorities:</h4>
                        <ul className="space-y-3">
                            {report.priorities.map((item, index) => (
                                <li key={index} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-md">
                                    <CheckIcon className="w-5 h-5 mt-0.5 text-indigo-400 flex-shrink-0" />
                                    <span className="text-slate-200">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
                </>
            )
          )}
        </main>
        <footer className="flex justify-end p-4 border-t border-slate-700 flex-shrink-0 bg-slate-800/50">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md">Close</button>
        </footer>
      </div>
    </div>
  );
};

export default AIAnalysisModal;