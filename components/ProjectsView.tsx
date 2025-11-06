import React from 'react';
import { Project, Task } from '../types';
import ProjectCard from './ProjectCard';
import { PlusIcon } from './Icons';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  onAddProject: () => void;
  onSelectProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, tasks, onAddProject, onSelectProject, onEditProject, onDeleteProject }) => {
  return (
    <div className="p-4 md:p-8 h-full flex flex-col">
      <header className="flex justify-between items-center mb-6 flex-shrink-0">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">Projects</h1>
        <button
          onClick={onAddProject}
          style={{ backgroundImage: `linear-gradient(to right, var(--color-button-gradient-start), var(--color-button-gradient-end))` }}
          className="flex items-center gap-2 text-white font-bold py-2 px-4 rounded-full transition-all duration-300 transform hover:scale-105"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Project</span>
        </button>
      </header>
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              taskCount={tasks.filter(t => t.projectId === project.id && !t.completed).length}
              onSelect={() => onSelectProject(project)}
              onEdit={() => onEditProject(project)}
              onDelete={() => onDeleteProject(project.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-[var(--color-surface-primary)] rounded-lg border border-dashed border-[var(--color-border-secondary)]">
          <h2 className="text-2xl font-semibold text-[var(--color-text-secondary)]">No Projects Yet</h2>
          <p className="text-[var(--color-text-tertiary)] mt-2">Create a project to organize your tasks.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectsView;
