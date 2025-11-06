import React, { useState } from 'react';
import { User, SidebarItem, AppState } from '../types';
import { InboxIcon, TodayIcon, UpcomingIcon, CalendarIcon, TrashIcon, PlusIcon, SettingsIcon, PencilIcon, CheckIcon, UsersIcon, FolderIcon } from './Icons';

interface SidebarProps {
  sidebarItems: SidebarItem[];
  currentViewId: string;
  onSelectView: (id: string) => void;
  dispatch: React.Dispatch<any>; // Using any for simplicity, but a specific action type is better.
  currentUser: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onSettingsClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    sidebarItems, currentViewId, onSelectView, 
    dispatch,
    currentUser, onLoginClick, onLogoutClick, onSettingsClick 
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemLabel, setEditingItemLabel] = useState('');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const handleEdit = (item: SidebarItem) => {
    setEditingItemId(item.id);
    setEditingItemLabel(item.label);
  };

  const handleSaveEdit = (item: SidebarItem) => {
    if (editingItemLabel.trim() && editingItemLabel.trim() !== item.label) {
      dispatch({ type: 'UPDATE_SIDEBAR_ITEM', payload: { ...item, label: editingItemLabel.trim() } });
    }
    setEditingItemId(null);
    setEditingItemLabel('');
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: SidebarItem) => {
    setDraggedItemId(item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetItem: SidebarItem) => {
    e.preventDefault();
    if (draggedItemId && draggedItemId !== targetItem.id) {
      dispatch({ type: 'REORDER_SIDEBAR_ITEMS', payload: { draggedId: draggedItemId, targetId: targetItem.id } });
    }
    setDraggedItemId(null);
  };
  
  const getIconForType = (type: SidebarItem['type']) => {
    switch(type) {
      case 'inbox': return <InboxIcon className="w-5 h-5 text-sky-400" />;
      case 'today': return <TodayIcon className="w-5 h-5 text-amber-400" />;
      case 'upcoming': return <UpcomingIcon className="w-5 h-5 text-green-400" />;
      case 'projects': return <FolderIcon className="w-5 h-5 text-fuchsia-400" />;
      case 'contacts': return <UsersIcon className="w-5 h-5 text-rose-400" />;
      case 'calendar': return <CalendarIcon className="w-5 h-5 text-purple-400" />;
      default: return null;
    }
  };

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
                <path d="M16 16C18.5 16 18.5 13.5 16 13.5C13.5 13.5 13.5 18.5 16 18.5C21 18.5 21 11.5 16 11.5C11 11.5 11 20.5 16 20.5C23 20.5 23 9.5 16 9.5C9 9.5 9 22.5 16 22.5L28 22.5" stroke="url(#logoGradient)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            </svg>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Overwhelmed</h1>
        </div>
      <nav className="flex-grow space-y-1.5 overflow-y-auto pr-1 -mr-2">
        {sidebarItems.map(item => (
            <div key={item.id}
                draggable={item.isDeletable}
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item)}
                className={`group flex items-center justify-between w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    currentViewId === item.id ? 'bg-[var(--color-nav-item-active-bg)] text-[var(--color-nav-item-active-text)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-nav-item-hover-bg)] hover:text-[var(--color-text-primary)]'
                } ${item.isDeletable ? 'cursor-grab' : 'cursor-pointer'}`}
                onClick={() => onSelectView(item.id)}
            >
                <div className="flex items-center gap-3">
                    {item.color ? <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: item.color}} /> : getIconForType(item.type)}
                    {editingItemId === item.id && item.isEditable ? (
                         <input
                            type="text"
                            value={editingItemLabel}
                            onChange={(e) => setEditingItemLabel(e.target.value)}
                            autoFocus
                            onBlur={() => handleSaveEdit(item)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item);
                                if (e.key === 'Escape') setEditingItemId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-transparent text-[var(--color-text-primary)] py-0 rounded-md text-base focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium -ml-1 pl-1"
                         />
                    ) : (
                         <span onDoubleClick={() => item.isEditable && handleEdit(item)} className="font-medium">{item.label}</span>
                    )}
                </div>
                 { editingItemId !== item.id && 
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.isEditable && (
                            <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-1 text-[var(--color-text-tertiary)] hover:text-indigo-400 rounded-full hover:bg-[var(--color-nav-item-hover-bg)]">
                                <PencilIcon className="w-4 h-4" />
                            </button>
                        )}
                        {item.isDeletable && (
                            <button onClick={(e) => { e.stopPropagation(); dispatch({ type: item.type === 'project' ? 'DELETE_PROJECT' : 'DELETE_TAG', payload: item.id }) }} className="p-1 text-[var(--color-text-tertiary)] hover:text-red-400 rounded-full hover:bg-[var(--color-nav-item-hover-bg)]" aria-label={`Delete ${item.label}`}>
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                }
            </div>
        ))}
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