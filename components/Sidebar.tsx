import React, { useState } from 'react';
import { Project } from '../types';
import { InboxIcon, DateRangeIcon, CalendarIcon, TrashIcon, PlusIcon } from './Icons';

type View = { type: 'inbox' | 'today' | 'upcoming' | 'project' | 'calendar', projectId?: string };

interface SidebarProps {
  projects: Project[];
  currentView: View;
  onSelectView: (view: View) => void;
  onAddProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
}

interface NavItemProps {
  icon?: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
  color?: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick, onDelete, color }) => (
    <div
        className={`group flex items-center justify-between w-full text-left px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
            isActive ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
        }`}
        onClick={onClick}
    >
        <div className="flex items-center gap-3">
            {color ? <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: color}} /> : icon}
            <span className="font-medium">{label}</span>
        </div>
        {onDelete && (
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-slate-600"
                aria-label={`Delete project ${label}`}
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        )}
    </div>
);

const Sidebar: React.FC<SidebarProps> = ({ projects, currentView, onSelectView, onAddProject, onDeleteProject }) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [isAddingProject, setIsAddingProject] = useState(false);

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
        onAddProject(newProjectName.trim());
        setNewProjectName('');
        setIsAddingProject(false);
    }
  };

  return (
    <aside className="hidden md:flex w-72 bg-slate-900/70 backdrop-blur-md p-4 flex-col border-r border-slate-800 h-full">
        <div className="flex items-center gap-2 mb-8 px-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.6667 4H8C5.79086 4 4 5.79086 4 8V12.6667" stroke="url(#paint0_linear_1_2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19.3333 4H24C26.2091 4 28 5.79086 28 8V12.6667" stroke="url(#paint1_linear_1_2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12.6667 28H8C5.79086 28 4 26.2091 4 24V19.3333" stroke="url(#paint2_linear_1_2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19.3333 28H24C26.2091 28 28 26.2091 28 24V19.3333" stroke="url(#paint3_linear_1_2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                    <linearGradient id="paint0_linear_1_2" x1="8.33333" y1="4" x2="8.33333" y2="12.6667" gradientUnits="userSpaceOnUse"><stop stopColor="#6366F1"/><stop offset="1" stopColor="#A855F7"/></linearGradient>
                    <linearGradient id="paint1_linear_1_2" x1="23.6667" y1="4" x2="23.6667" y2="12.6667" gradientUnits="userSpaceOnUse"><stop stopColor="#6366F1"/><stop offset="1" stopColor="#A855F7"/></linearGradient>
                    <linearGradient id="paint2_linear_1_2" x1="8.33333" y1="19.3333" x2="8.33333" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#6366F1"/><stop offset="1" stopColor="#A855F7"/></linearGradient>
                    <linearGradient id="paint3_linear_1_2" x1="23.6667" y1="19.3333" x2="23.6667" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#6366F1"/><stop offset="1" stopColor="#A855F7"/></linearGradient>
                </defs>
            </svg>
            <h1 className="text-2xl font-bold text-slate-100">Overwhelmed</h1>
        </div>
      <nav className="flex-grow space-y-1.5 overflow-y-auto pr-1 -mr-2">
        <NavItem 
            icon={<InboxIcon className="w-5 h-5 text-sky-400" />}
            label="Inbox"
            isActive={currentView.type === 'inbox'}
            onClick={() => onSelectView({ type: 'inbox' })}
        />
        <NavItem
            icon={<DateRangeIcon className="w-5 h-5 text-green-400" />}
            label="Today"
            isActive={currentView.type === 'today'}
            onClick={() => onSelectView({ type: 'today' })}
        />
        <NavItem
            icon={<DateRangeIcon className="w-5 h-5 text-yellow-400" />}
            label="Upcoming"
            isActive={currentView.type === 'upcoming'}
            onClick={() => onSelectView({ type: 'upcoming' })}
        />
        <NavItem
            icon={<CalendarIcon className="w-5 h-5 text-purple-400" />}
            label="Calendar"
            isActive={currentView.type === 'calendar'}
            onClick={() => onSelectView({ type: 'calendar' })}
        />

        <div className="pt-6 pb-2">
            <h2 className="px-3 text-sm font-semibold text-slate-500 uppercase tracking-wider">Projects</h2>
        </div>
        {projects.map(project => (
          <NavItem 
            key={project.id}
            color={project.color}
            label={project.name}
            isActive={currentView.type === 'project' && currentView.projectId === project.id}
            onClick={() => onSelectView({ type: 'project', projectId: project.id })}
            onDelete={() => onDeleteProject(project.id)}
          />
        ))}

      </nav>
      <div className="mt-4 pt-4 border-t border-slate-800">
        {isAddingProject ? (
            <form onSubmit={handleAddProject}>
                <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="New project name..."
                    autoFocus
                    onBlur={() => { if(!newProjectName) setIsAddingProject(false); }}
                    className="w-full bg-slate-700/50 text-slate-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </form>
        ) : (
            <button 
                onClick={() => setIsAddingProject(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition-colors"
            >
                <PlusIcon className="w-5 h-5" />
                <span className="font-medium">Add Project</span>
            </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;