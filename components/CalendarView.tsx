import React, { useState, useMemo } from 'react';
import { Task, Importance, Project } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import DayDetailModal from './DayDetailModal';

interface CalendarViewProps {
  tasks: Task[];
  projects: Project[];
  onUpdateTask: (id: string, updatedTask: Partial<Omit<Task, 'id' | 'timestamp'>>) => void;
  onDeleteTask: (id: string) => void;
  onComplete: (id: string, completed: boolean) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, projects, onUpdateTask, onDeleteTask, onComplete }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startOfMonth.getDay());

  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const today = new Date();
  const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  const formatDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return (
    <>
      <div className="bg-slate-800/50 p-4 sm:p-6 rounded-lg border border-slate-700/50">
        <div className="flex justify-between items-center mb-4">
          <button onClick={prevMonth} className="p-2 rounded-full hover:bg-slate-700 transition-colors"><ChevronLeftIcon className="w-6 h-6" /></button>
          <h2 className="text-xl sm:text-2xl font-bold text-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={nextMonth} className="p-2 rounded-full hover:bg-slate-700 transition-colors"><ChevronRightIcon className="w-6 h-6" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-slate-400 text-xs sm:text-sm mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((d, i) => {
            const isCurrentMonth = d.getMonth() === currentDate.getMonth();
            const isToday = isSameDay(d, today);
            const tasksForDay = tasksByDate.get(formatDateKey(d)) || [];
            return (
              <div
                key={i}
                onClick={() => setSelectedDate(d)}
                className={`h-24 sm:h-32 rounded-lg p-1.5 sm:p-2 border transition-all duration-200 cursor-pointer ${
                  isCurrentMonth ? 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-700/70 hover:border-slate-600' : 'bg-slate-900/50 border-transparent'
                } ${isToday ? '!border-indigo-500 ring-1 ring-indigo-500' : ''}`}
              >
                <span className={`text-xs sm:text-sm flex items-center justify-center ${isToday ? 'bg-indigo-500 text-white font-bold rounded-full w-6 h-6' : isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}`}>
                  {d.getDate()}
                </span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {tasksForDay.slice(0, 3).map(task => {
                      const project = projects.find(p => p.id === task.projectId);
                      return (
                         <div key={task.id} title={task.content} className={`w-2 h-2 rounded-full ${task.completed ? 'opacity-30' : ''}`} style={{ backgroundColor: project?.color || '#64748b' }}></div>
                      )
                  })}
                  {tasksForDay.length > 3 && <span className="text-xs text-slate-500 ml-1">+{tasksForDay.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedDate && (
        <DayDetailModal 
          date={selectedDate} 
          tasks={tasksByDate.get(formatDateKey(selectedDate)) || []} 
          projects={projects}
          onClose={() => setSelectedDate(null)} 
          onUpdateTask={onUpdateTask} 
          onDeleteTask={onDeleteTask} 
          onComplete={onComplete}
        />
      )}
    </>
  );
};

export default CalendarView;