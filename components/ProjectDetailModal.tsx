import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { CloseIcon } from './Icons';
import { PROJECT_COLORS } from '../constants';

interface ProjectDetailModalProps {
  project?: Project;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id'> & { id?: string }) => void;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setColor(project.color);
    } else {
      setName('');
      setColor(PROJECT_COLORS[0]);
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ id: project?.id, name: name.trim(), color });
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface-primary)] rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-[var(--color-border-secondary)] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-[var(--color-border-secondary)] flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-tertiary)] rounded-full" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto">
                <div>
                    <label htmlFor="project-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Project Name</label>
                    <input
                        id="project-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Marketing Campaign"
                        required
                        autoFocus
                        className="w-full bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div>
                     <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Color</label>
                     <div className="flex flex-wrap gap-2">
                        {PROJECT_COLORS.map(c => (
                            <button
                                type="button"
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-indigo-400 ring-offset-[var(--color-surface-primary)]' : ''}`}
                                style={{ backgroundColor: c }}
                                aria-label={`Select color ${c}`}
                            />
                        ))}
                     </div>
                </div>
            </div>

            <footer className="flex justify-end p-4 border-t border-[var(--color-border-secondary)] flex-shrink-0 bg-[var(--color-surface-secondary)]/50">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] rounded-md">Cancel</button>
                <button
                  type="submit"
                  style={{ backgroundImage: `linear-gradient(to right, var(--color-button-gradient-start), var(--color-button-gradient-end))` }}
                  className="ml-2 px-4 py-2 text-sm font-semibold text-white rounded-md"
                >
                  {project ? 'Save Changes' : 'Create Project'}
                </button>
            </footer>
        </form>
      </div>
    </div>
  );
};

export default ProjectDetailModal;
