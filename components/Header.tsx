import React, { useState, useRef, useEffect } from 'react';
import { Importance, SortBy, AppSettings } from '../types';
import { BrainIcon, StarIcon, SettingsIcon, EnvelopeIcon } from './Icons';

interface HeaderProps {
    viewLabel: string;
    activeTasksCount: number;
    settings: AppSettings;
    isAnalyzing: boolean;
    onAnalyze: () => void;
    onFindFocus: () => void;
    searchTerm: string;
    onSearchTermChange: (term: string) => void;
    filterBy: Importance | 'all';
    onFilterByChange: (filter: Importance | 'all') => void;
    sortBy: SortBy;
    onSortByChange: (sort: SortBy) => void;
    isCalendarView: boolean;
    onOpenEmailProcessor: () => void;
}

const Header: React.FC<HeaderProps> = ({
    viewLabel, activeTasksCount, settings, isAnalyzing, onAnalyze, onFindFocus,
    searchTerm, onSearchTermChange, filterBy, onFilterByChange, sortBy, onSortByChange, isCalendarView,
    onOpenEmailProcessor
}) => {
    const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false);
    const viewOptionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (viewOptionsRef.current && !viewOptionsRef.current.contains(event.target as Node)) {
                setIsViewOptionsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="flex justify-between items-center mb-6 flex-shrink-0">
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">{viewLabel}</h1>
            <div className="flex items-center gap-2 md:gap-4">
                <button 
                    onClick={onOpenEmailProcessor} 
                    disabled={!settings.aiEnabled}
                    className="hidden sm:flex items-center gap-2 bg-[var(--color-surface-tertiary)] hover:bg-[var(--color-border-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-full transition-colors"
                    title="Process task from email"
                >
                    <EnvelopeIcon className="w-5 h-5"/> <span>Email Magic</span>
                </button>
                <button onClick={onFindFocus} disabled={!settings.aiEnabled || isAnalyzing || activeTasksCount < 2} className="hidden sm:flex items-center gap-2 bg-[var(--color-surface-tertiary)] hover:bg-[var(--color-border-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-full transition-colors">
                    <StarIcon className="w-5 h-5"/> <span>Start Here</span>
                </button>
                {settings.aiEnabled && activeTasksCount > 0 && (
                    <button onClick={onAnalyze} disabled={isAnalyzing} 
                      style={{ backgroundImage: `linear-gradient(to right, var(--color-button-gradient-start), var(--color-button-gradient-end))` }}
                      className="flex items-center gap-2 disabled:bg-none disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-full transition-all duration-300 transform hover:scale-105">
                        <BrainIcon className="w-5 h-5"/> <span>Analyze</span>
                    </button>
                )}
                 {!isCalendarView && (
                    <div className="relative" ref={viewOptionsRef}>
                        <button onClick={() => setIsViewOptionsOpen(prev => !prev)} className="p-2.5 rounded-full bg-[var(--color-surface-tertiary)] hover:bg-[var(--color-border-tertiary)] transition-colors">
                            <SettingsIcon className="w-5 h-5" />
                        </button>
                        {isViewOptionsOpen && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-[var(--color-surface-primary)] border border-[var(--color-border-secondary)] rounded-lg shadow-2xl z-20 p-4 animate-fade-in">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Search</label>
                                         <input type="text" placeholder="Search tasks..." value={searchTerm} onChange={(e) => onSearchTermChange(e.target.value)}
                                            className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border-primary)] rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-[var(--color-text-tertiary)] transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Filter by Importance</label>
                                        <div className="flex items-center gap-1 bg-[var(--color-surface-secondary)] p-1 rounded-full border border-[var(--color-border-primary)]">
                                            {(['all', ...Object.values(Importance)] as const).map(level => (
                                                <button key={level} onClick={() => onFilterByChange(level)} className={`flex-1 capitalize text-center px-2 py-1 text-xs font-semibold rounded-full transition-colors ${filterBy === level ? "bg-[var(--color-surface-tertiary)] text-[var(--color-text-accent)]" : `hover:bg-[var(--color-nav-item-hover-bg)] text-[var(--color-text-secondary)]`}`}>
                                                    {level === 'all' ? 'All' : level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Sort By</label>
                                        <select value={sortBy} onChange={(e) => onSortByChange(e.target.value as SortBy)} className="w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border-primary)] rounded-full py-2 px-4 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm appearance-none text-[var(--color-text-secondary)]">
                                            <optgroup label="Creation Date">
                                                <option value="timestamp_desc">Newest First</option>
                                                <option value="timestamp_asc">Oldest First</option>
                                            </optgroup>
                                            <optgroup label="Due Date">
                                                <option value="dueDate_asc">Soonest First</option>
                                                <option value="dueDate_desc">Latest First</option>
                                            </optgroup>
                                            <optgroup label="Importance">
                                                <option value="importance_desc">Highest First</option>
                                                <option value="importance_asc">Lowest First</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                 )}
            </div>
        </header>
    );
};

export default Header;