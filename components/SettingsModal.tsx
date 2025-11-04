
import React, { useRef, useState } from 'react';
import { AppSettings } from '../types';
import { CloseIcon } from './Icons';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onDeleteAllData: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdateSettings, onExport, onImport, onClose, onDeleteAllData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDeleteClick = () => {
    if (window.confirm("Are you sure you want to delete all your data for this account? This action cannot be undone.")) {
      onDeleteAllData();
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--color-surface-primary)] rounded-xl shadow-2xl w-full max-w-lg border border-[var(--color-border-secondary)] relative overflow-hidden animate-slide-in-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        <header className="flex justify-between items-center p-4 border-b border-[var(--color-border-secondary)] flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Settings</h2>
          <button onClick={onClose} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-tertiary)] rounded-full" aria-label="Close settings">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Appearance Section */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Appearance</h3>
            <div className="flex items-center gap-2 bg-[var(--color-surface-secondary)] p-1 rounded-full border border-[var(--color-border-primary)]">
                {(['light', 'dark', 'system'] as const).map(theme => (
                    <button key={theme} onClick={() => onUpdateSettings({ theme })} className={`flex-1 capitalize px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${settings.theme === theme ? "bg-[var(--color-surface-tertiary)] text-[var(--color-text-accent)]" : "hover:bg-[var(--color-border-primary)] text-[var(--color-text-secondary)]"}`}>
                        {theme}
                    </button>
                ))}
            </div>
          </div>

          {/* AI Features Section */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">AI Features</h3>
            <div className="p-4 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border-primary)]">
                <div className="flex items-center justify-between">
                    <label htmlFor="ai-enabled" className="font-medium text-[var(--color-text-secondary)]">Enable AI Features</label>
                    <button
                        id="ai-enabled"
                        role="switch"
                        aria-checked={settings.aiEnabled}
                        onClick={() => onUpdateSettings({ aiEnabled: !settings.aiEnabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.aiEnabled ? 'bg-indigo-600' : 'bg-[var(--color-border-tertiary)]'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.aiEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Enables features like Smart Add, Smart Update, and AI Analysis.</p>
            </div>
          </div>

          {/* Notifications Section */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Notifications</h3>
            <div className="flex items-center gap-4">
              <label htmlFor="reminder-time" className="text-sm font-medium text-[var(--color-text-secondary)]">Default reminder time</label>
              <select
                id="reminder-time"
                value={settings.reminderTime}
                onChange={(e) => onUpdateSettings({ reminderTime: parseInt(e.target.value, 10) as any })}
                className="w-full bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={5}>5 minutes before</option>
                <option value={10}>10 minutes before</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
              </select>
            </div>
          </div>
          
          {/* Data Management Section */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Data Management</h3>
            <div className="space-y-3">
              <p className="text-[var(--color-text-secondary)] text-sm">
                Export your data as a backup, or import a file to restore your planner.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={onExport}
                  className="flex-1 px-4 py-2 font-semibold text-[var(--color-text-primary)] bg-[var(--color-surface-tertiary)] hover:bg-[var(--color-border-tertiary)] rounded-md transition-colors"
                >
                  Export Data
                </button>
                <button
                  onClick={handleImportClick}
                  style={{ backgroundImage: `linear-gradient(to right, var(--color-button-gradient-start), var(--color-button-gradient-end))` }}
                  className="flex-1 px-4 py-2 font-semibold text-white rounded-md transition-all"
                >
                  Import Data
                </button>
                <input type="file" ref={fileInputRef} accept=".json" onChange={onImport} className="hidden" />
              </div>
               <div className="pt-4 border-t border-[var(--color-border-primary)]">
                    <button
                        onClick={handleDeleteClick}
                        className="w-full px-4 py-2 font-semibold text-red-400 hover:bg-red-500/10 rounded-md transition-colors border border-red-500/20 hover:border-red-500/40"
                    >
                        Delete All Data
                    </button>
               </div>
            </div>                                                                                                                              
          </div>
        </div>

        <footer className="flex justify-end p-4 border-t border-[var(--color-border-secondary)] bg-[var(--color-surface-secondary)]/50 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] rounded-md">Close</button>
        </footer>
      </div>
    </div>
  );
};

export default SettingsModal;