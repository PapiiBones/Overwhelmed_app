import React, { useState } from 'react';
import { Project, User, Tag } from '../types';
import { InboxIcon, DateRangeIcon, CalendarIcon, TrashIcon, PlusIcon, SettingsIcon, PencilIcon, CheckIcon } from './Icons';

type View = { type: 'inbox' | 'today' | 'upcoming' | 'project' | 'calendar' | 'tag', projectId?: string, tagId?: string };

interface SidebarProps {
  projects: Project[];
  tags: Tag[];
  currentView: View;
  onSelectView: (view: View) => void;
  onAddProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onAddTag: (name: string) => void;
  onDeleteTag: (id: string) => void;
  onUpdateTag: (tag: Tag) => void;
  currentUser: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onSettingsClick: () => void;
}

interface NavItemProps {
  icon?: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  color?: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick, onDelete, onEdit, color }) => (
    <div
        className={`group flex items-center justify-between w-full text-left px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
            isActive ? 'bg-[var(--color-nav-item-active-bg)] text-[var(--color-nav-item-active-text)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-nav-item-hover-bg)] hover:text-[var(--color-text-primary)]'
        }`}
        onClick={onClick}
    >
        <div className="flex items-center gap-3">
            {color ? <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: color}} /> : icon}
            <span className="font-medium">{label}</span>
        </div>
        { (onDelete || onEdit) &&
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 text-[var(--color-text-tertiary)] hover:text-indigo-400 rounded-full hover:bg-[var(--color-nav-item-hover-bg)]">
                        <PencilIcon className="w-4 h-4" />
                    </button>
                )}
                {onDelete && (
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-[var(--color-text-tertiary)] hover:text-red-400 rounded-full hover:bg-[var(--color-nav-item-hover-bg)]" aria-label={`Delete ${label}`}>
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        }
    </div>
);

const Sidebar: React.FC<SidebarProps> = ({ 
    projects, tags, currentView, onSelectView, 
    onAddProject, onDeleteProject, 
    onAddTag, onDeleteTag, onUpdateTag,
    currentUser, onLoginClick, onLogoutClick, onSettingsClick 
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
        onAddProject(newProjectName.trim());
        setNewProjectName('');
        setIsAddingProject(false);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
        onAddTag(newTagName.trim());
        setNewTagName('');
        setIsAddingTag(false);
    }
  };
  
  const handleEditTag = (tag: Tag) => {
      setEditingTagId(tag.id);
      setEditingTagName(tag.name);
  }

  const handleSaveTag = (tag: Tag) => {
      if (editingTagName.trim() && editingTagName.trim() !== tag.name) {
          onUpdateTag({ ...tag, name: editingTagName.trim() });
      }
      setEditingTagId(null);
      setEditingTagName('');
  }

  return (
    <aside className="hidden md:flex w-72 bg-[var(--color-sidebar-bg)] backdrop-blur-md p-4 flex-col border-r border-[var(--color-sidebar-border)] h-full">
        <div className="flex items-center gap-2 mb-8 px-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="logoGradient" x1="4" y1="16" x2="28" y2="16" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#A855F7"/>
                        <stop offset="1" stop-color="#6366F1"/>
                    </linearGradient>
                </defs>
                <path d="M16 16C18.5 16 18.5 13.5 16 13.5C13.5 13.5 13.5 18.5 16 18.5C21 18.5 21 11.5 16 11.5C11 11.5 11 20.5 16 20.5C23 20.5 23 9.5 16 9.5C9 9.5 9 22.5 16 22.5L28 22.5" stroke="url(#logoGradient)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            </svg>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Overwhelmed</h1>
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
            <h2 className="px-3 text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Projects</h2>
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
         <div className="pt-2">
            {isAddingProject ? (
                <form onSubmit={handleAddProject}>
                    <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="New project name..."
                        autoFocus
                        onBlur={() => { if(!newProjectName) setIsAddingProject(false); }}
                        className="w-full bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </form>
            ) : (
                <button 
                    onClick={() => setIsAddingProject(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-nav-item-hover-bg)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span className="font-medium">Add Project</span>
                </button>
            )}
        </div>
        
        <div className="pt-6 pb-2">
            <h2 className="px-3 text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Tags</h2>
        </div>
        {tags.map(tag => (
            editingTagId === tag.id ? (
                <div key={tag.id} className="flex items-center gap-2 px-3 py-1.5">
                    <input
                        type="text"
                        value={editingTagName}
                        onChange={(e) => setEditingTagName(e.target.value)}
                        autoFocus
                        onBlur={() => handleSaveTag(tag)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTag(tag)}
                        className="w-full bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] px-2 py-1 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button onClick={() => handleSaveTag(tag)} className="p-1.5 hover:bg-[var(--color-nav-item-hover-bg)] rounded-md"><CheckIcon className="w-4 h-4 text-green-400"/></button>
                </div>
            ) : (
                <NavItem 
                    key={tag.id}
                    color={tag.color}
                    label={tag.name}
                    isActive={currentView.type === 'tag' && currentView.tagId === tag.id}
                    onClick={() => onSelectView({ type: 'tag', tagId: tag.id })}
                    onEdit={() => handleEditTag(tag)}
                    onDelete={() => onDeleteTag(tag.id)}
                />
            )
        ))}
         <div className="pt-2">
            {isAddingTag ? (
                <form onSubmit={handleAddTag}>
                    <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="New tag name..."
                        autoFocus
                        onBlur={() => { if(!newTagName) setIsAddingTag(false); }}
                        className="w-full bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </form>
            ) : (
                <button 
                    onClick={() => setIsAddingTag(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-nav-item-hover-bg)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span className="font-medium">Add Tag</span>
                </button>
            )}
        </div>
      </nav>
      <div className="mt-4 pt-4 border-t border-[var(--color-sidebar-border)]">
        {currentUser ? (
          <div className="flex items-center justify-between">
            <div className="text-sm">
                <p className="font-medium text-[var(--color-text-primary)]">Signed in as</p>
                <p className="text-[var(--color-text-secondary)] truncate">{currentUser.email}</p>
            </div>
            <div className="flex items-center">
                 <button onClick={onSettingsClick} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-[var(--color-nav-item-hover-bg)] transition-colors" aria-label="Settings">
                    <SettingsIcon className="w-5 h-5" />
                 </button>
                 <button onClick={onLogoutClick} className="ml-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300">
                    Logout
                 </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Login to Sync
          </button>
        )}
      </div>
    </aside>
  );
};

  export default Sidebar;