import React, { useState, useMemo } from 'react';
import { Task, Project, Tag } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import DayDetailModal from './DayDetailModal';

interface CalendarViewProps {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  onDeleteTask: (id: string) => void;
  onComplete: (id: string, completed: boolean) => void;
  onSelectTask: (task: Task) => void;
  onUpdateTask: (id: string, updatedFields: Partial<Omit<Task, 'id' | 'timestamp'>>) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, projects, tags, onDeleteTask, onComplete, onSelectTask, onUpdateTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [tasks]);

  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  const formatDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const originalTask = tasks.find(t => t.id === taskId);
    if (originalTask && originalTask.dueDate) {
      const originalDate = new Date(originalTask.dueDate);
      const newDate = new Date(day);
      // Preserve original time
      newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds(), originalDate.getMilliseconds());
      onUpdateTask(taskId, { dueDate: newDate.toISOString() });
    }
    setDragOverDate(null);
  };

  const renderMonthView = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startOfMonth.getDay());
    const days = Array.from({ length: 42 }, (_, i) => new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i));

    return (
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((d, i) => {
          const isCurrentMonth = d.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(d, new Date());
          const tasksForDay = tasksByDate.get(formatDateKey(d)) || [];
          return (
            <div
              key={i}
              onClick={() => setSelectedDate(d)}
              className={`h-24 sm:h-32 rounded-lg p-1.5 sm:p-2 border transition-all duration-200 cursor-pointer ${
                isCurrentMonth ? 'bg-[var(--color-surface-primary)] border-[var(--color-border-primary)] hover:bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-secondary)]' : 'bg-transparent border-transparent'
              } ${isToday ? '!border-indigo-500 ring-1 ring-indigo-500' : ''}`}
            >
              <span className={`text-xs sm:text-sm flex items-center justify-center ${isToday ? 'bg-indigo-500 text-white font-bold rounded-full w-6 h-6' : isCurrentMonth ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)] opacity-50'}`}>
                {d.getDate()}
              </span>
              <div className="mt-2 flex flex-wrap gap-1">
                {tasksForDay.slice(0, 3).map(task => {
                    const project = projects.find(p => p.id === task.projectId);
                    return (
                       <div key={task.id} title={task.content} className={`w-2 h-2 rounded-full ${task.completed ? 'opacity-30' : ''}`} style={{ backgroundColor: project?.color || 'var(--color-text-tertiary)' }}></div>
                    )
                })}
                {tasksForDay.length > 3 && <span className="text-xs text-[var(--color-text-tertiary)] ml-1">+{tasksForDay.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const days = Array.from({ length: 7 }, (_, i) => new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i));
    
    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const tasksForDay = tasksByDate.get(formatDateKey(day)) || [];
          const isToday = isSameDay(day, new Date());
          const isDragOver = dragOverDate && isSameDay(day, dragOverDate);
          return (
            <div 
              key={i}
              onClick={() => setSelectedDate(day)}
              onDragOver={(e) => { e.preventDefault(); setDragOverDate(day); }}
              onDragLeave={() => setDragOverDate(null)}
              onDrop={(e) => handleDrop(e, day)}
              className={`min-h-[200px] rounded-lg p-2 border transition-colors cursor-pointer hover:bg-[var(--color-surface-secondary)] ${ isDragOver ? 'bg-[var(--color-surface-tertiary)]' : 'bg-[var(--color-surface-primary)] border-[var(--color-border-primary)]' }`}
            >
              <div className={`text-sm font-semibold mb-2 flex items-center justify-center ${isToday ? 'bg-indigo-500 text-white rounded-full w-6 h-6' : 'text-[var(--color-text-primary)]'}`}>
                {day.getDate()}
              </div>
              <div className="space-y-2">
                {tasksForDay.map(task => {
                  const project = projects.find(p => p.id === task.projectId);
                  return (
                    <div 
                      key={task.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                      onClick={(e) => { e.stopPropagation(); onSelectTask(task); }}
                      className={`p-1.5 rounded-md text-xs cursor-grab ${task.completed ? 'bg-[var(--color-surface-secondary)] opacity-60' : 'bg-[var(--color-surface-tertiary)]'}`}
                    >
                      <span className="font-semibold" style={{ color: project?.color || 'var(--color-text-secondary)' }}>
                          {project?.name}
                      </span>
                      <p className={`text-[var(--color-text-primary)] ${task.completed ? 'line-through' : ''}`}>{task.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  const handleDateChange = (amount: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + amount);
    } else {
      newDate.setDate(currentDate.getDate() + (amount * 7));
    }
    setCurrentDate(newDate);
  };

  return (
    <>
      <div className="bg-[var(--color-surface-primary)] p-4 sm:p-6 rounded-lg border border-[var(--color-border-primary)]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => handleDateChange(-1)} className="p-2 rounded-full hover:bg-[var(--color-surface-tertiary)] transition-colors"><ChevronLeftIcon className="w-6 h-6" /></button>
            <h2 className="text-xl sm:text-2xl font-bold text-center">
                {viewMode === 'month' 
                    ? currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
                    : `${new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay())).toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 6)).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`
                }
            </h2>
            <button onClick={() => handleDateChange(1)} className="p-2 rounded-full hover:bg-[var(--color-surface-tertiary)] transition-colors"><ChevronRightIcon className="w-6 h-6" /></button>
          </div>
          <div className="flex items-center gap-2 bg-[var(--color-surface-secondary)] p-1 rounded-full border border-[var(--color-border-primary)]">
            <button onClick={() => setViewMode('month')} className={`px-3 py-1 text-sm rounded-full ${viewMode === 'month' ? 'bg-[var(--color-surface-tertiary)]' : 'hover:bg-[var(--color-nav-item-hover-bg)]'}`}>Month</button>
            <button onClick={() => setViewMode('week')} className={`px-3 py-1 text-sm rounded-full ${viewMode === 'week' ? 'bg-[var(--color-surface-tertiary)]' : 'hover:bg-[var(--color-nav-item-hover-bg)]'}`}>Week</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[var(--color-text-secondary)] text-xs sm:text-sm mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>
      {selectedDate && (
        <DayDetailModal 
          date={selectedDate} 
          tasks={tasksByDate.get(formatDateKey(selectedDate)) || []} 
          projects={projects}
          tags={tags}
          onClose={() => setSelectedDate(null)} 
          onDeleteTask={onDeleteTask} 
          onComplete={onComplete}
          onSelectTask={onSelectTask}
          onUpdateTask={onUpdateTask}
        />
      )}
    </>
  );
};

 export default CalendarView;