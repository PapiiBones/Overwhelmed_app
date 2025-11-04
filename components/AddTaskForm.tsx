import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, SparklesIcon, MicrophoneIcon, InboxIcon } from './Icons';
import { AppSettings, ToastState, Project, SidebarItem } from '../types';
import { geminiService } from '../services/geminiService';

interface AddTaskFormProps {
  onAddTask: (rawContent: string, isSmartAdd: boolean, projectId?: string) => void;
  isBusy: boolean;
  settings: AppSettings;
  dispatch: React.Dispatch<{ type: 'SET_TOAST_STATE', payload: ToastState | null }>;
  projects: Project[];
  currentViewId: string;
  sidebarItems: SidebarItem[];
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, isBusy, settings, dispatch, projects, currentViewId, sidebarItems }) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const projectSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentViewItem = sidebarItems.find(item => item.id === currentViewId);
    if (currentViewItem?.type === 'project') {
      setSelectedProjectId(currentViewItem.id);
    } else {
      setSelectedProjectId(undefined); // Default to Inbox
    }
  }, [currentViewId, sidebarItems]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectSelectorRef.current && !projectSelectorRef.current.contains(event.target as Node)) {
        setIsProjectSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isBusy || isRecording || isTranscribing) return;
    onAddTask(inputValue, true, selectedProjectId); // Always use Smart Add
    setInputValue('');
  };

  const handleMicClick = async () => {
    if (isTranscribing) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          if (audioBlob.size === 0) return;
          
          setIsTranscribing(true);
          try {
            const audioBase64 = await blobToBase64(audioBlob);
            const transcribedText = await geminiService.transcribeAudio(audioBase64);
            setInputValue(current => (current ? current + ' ' : '') + transcribedText);
          } catch (error) {
            console.error('Transcription failed:', error);
            dispatch({ type: 'SET_TOAST_STATE', payload: { type: 'error', message: 'Transcription failed. Please try again.' } });
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        dispatch({ type: 'SET_TOAST_STATE', payload: { type: 'error', message: 'Microphone access denied. Please enable it in your browser settings.' } });
      }
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isDisabled = isBusy || isRecording || isTranscribing;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-grow">
        <label htmlFor="add-task-input" className="sr-only">Add a new task</label>
        <SparklesIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 pointer-events-none" />
        <input
          id="add-task-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isRecording ? "Listening..." : (isTranscribing ? "Transcribing..." : "e.g., 'Call Jane by 5pm tomorrow...'")}
          className={`w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border-primary)] rounded-full py-3 pr-14 pl-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-[var(--color-text-tertiary)] transition-all text-lg`}
          disabled={isDisabled}
        />
        <button
          type="button"
          onClick={handleMicClick}
          disabled={isBusy || isTranscribing}
          className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isRecording ? 'bg-red-500/20 text-red-400' : 'hover:bg-[var(--color-nav-item-hover-bg)] text-[var(--color-text-tertiary)]'
          }`}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isTranscribing ? (
            <div className="w-6 h-6 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-t-transparent border-[var(--color-text-secondary)] rounded-full animate-spin"></div>
            </div>
          ) : (
            <MicrophoneIcon className="w-6 h-6" />
          )}
        </button>
      </div>
       <div className="relative" ref={projectSelectorRef}>
        <button
          type="button"
          onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
          disabled={isDisabled}
          className="flex-shrink-0 bg-[var(--color-surface-secondary)] border border-[var(--color-border-primary)] rounded-full h-full px-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-border-secondary)] transition-colors disabled:opacity-50"
          aria-label={`Current project: ${selectedProject ? selectedProject.name : 'Inbox'}`}
        >
          {selectedProject ? (
            <>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedProject.color }}></div>
              <span className="truncate max-w-[100px]">{selectedProject.name}</span>
            </>
          ) : (
            <>
              <InboxIcon className="w-4 h-4" />
              <span>Inbox</span>
            </>
          )}
        </button>
        {isProjectSelectorOpen && (
          <div className="absolute bottom-full mb-2 w-56 bg-[var(--color-surface-primary)] border border-[var(--color-border-secondary)] rounded-lg shadow-lg z-10 p-2 animate-fade-in max-h-60 overflow-y-auto">
            <ul>
              <li
                onClick={() => { setSelectedProjectId(undefined); setIsProjectSelectorOpen(false); }}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--color-nav-item-hover-bg)] cursor-pointer text-[var(--color-text-primary)]"
              >
                <InboxIcon className="w-5 h-5 text-sky-400" />
                <span>Inbox</span>
              </li>
              {projects.map(project => (
                <li
                  key={project.id}
                  onClick={() => { setSelectedProjectId(project.id); setIsProjectSelectorOpen(false); }}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--color-nav-item-hover-bg)] cursor-pointer text-[var(--color-text-primary)]"
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }}></div>
                  <span className="truncate">{project.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <button
        type="submit"
        style={{ 
            backgroundImage: `linear-gradient(to right, var(--color-button-gradient-start), var(--color-button-gradient-end))`,
        }}
        className="flex items-center gap-2 disabled:bg-none disabled:bg-[var(--color-surface-tertiary)] disabled:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105"
        disabled={!inputValue.trim() || isDisabled}
      >
        <PlusIcon className="w-5 h-5" />
        <span>Add Task</span>
      </button>
    </form>
  );
};

export default AddTaskForm;