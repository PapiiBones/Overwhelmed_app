import React from 'react';
import { Project } from '../types';
import { TrashIcon, PencilIcon } from './Icons';

interface ProjectCardProps {
  project: Project;
  taskCount: number;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, taskCount, onSelect, onEdit, onDelete }) => {
  return (
    <div
      onClick={onSelect}
      className="group relative bg-[var(--color-surface-primary)] p-4 rounded-lg border border-[var(--color-border-primary)] cursor-pointer transition-all hover:border-[var(--color-border-secondary)] hover:shadow-lg flex flex-col justify-between"
      style={{ borderLeft: `4px solid ${project.color}` }}
    >
      <div>
        <h3 className="font-bold text-lg text-[var(--color-text-primary)] truncate">{project.name}</h3>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)] mt-4">{taskCount} active task{taskCount !== 1 ? 's' : ''}</p>
      
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-2 text-[var(--color-text-tertiary)] hover:text-indigo-400 rounded-full bg-[var(--color-surface-primary)]/50 hover:bg-[var(--color-surface-tertiary)]"
          aria-label={`Edit ${project.name}`}
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 text-[var(--color-text-tertiary)] hover:text-red-400 rounded-full bg-[var(--color-surface-primary)]/50 hover:bg-[var(--color-surface-tertiary)]"
          aria-label={`Delete ${project.name}`}
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;
