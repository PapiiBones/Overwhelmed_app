import React, { useState, useRef } from 'react';
import { PlusIcon, SparklesIcon, MicrophoneIcon } from './Icons';
import { AppSettings, ToastState } from '../types';
import { geminiService } from '../services/geminiService';

interface AddTaskFormProps {
  onAddTask: (rawContent: string) => void;
  isBusy: boolean;
  settings: AppSettings;
  dispatch: React.Dispatch<{ type: 'SET_TOAST_STATE', payload: ToastState | null }>;
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

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAddTask, isBusy, settings, dispatch }) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isBusy || isRecording || isTranscribing) return;
    onAddTask(inputValue);
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
            if (!settings.apiKey) {
                throw new Error("API Key is not configured.");
            }
            const audioBase64 = await blobToBase64(audioBlob);
            const transcribedText = await geminiService.transcribeAudio(audioBase64, settings.apiKey);
            setInputValue(current => (current ? current + ' ' : '') + transcribedText);
          } catch (error) {
            console.error('Transcription failed:', error);
            dispatch({ type: 'SET_TOAST_STATE', payload: { type: 'error', message: 'Transcription failed. Check API key and permissions.' } });
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

  const isDisabled = isBusy || isRecording || isTranscribing;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-grow">
        <label htmlFor="add-task-input" className="sr-only">{settings.aiEnabled ? 'Add a new task with AI' : 'Add a new task'}</label>
        <input
          id="add-task-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isRecording ? "Listening..." : (isTranscribing ? "Transcribing..." : (settings.aiEnabled ? "e.g., 'Call Jane by 5pm tomorrow...'" : "Add a new task..."))}
          className={`w-full bg-[var(--color-surface-secondary)] border border-[var(--color-border-primary)] rounded-full py-3 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-[var(--color-text-tertiary)] transition-all text-lg ${settings.aiEnabled ? 'pl-12' : 'pl-5'}`}
          disabled={isDisabled}
        />
        {settings.aiEnabled && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-400 pointer-events-none">
            <SparklesIcon />
          </div>
        )}
        <button
          type="button"
          onClick={handleMicClick}
          disabled={isBusy || isTranscribing}
          className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
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
      <button
        type="submit"
        className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:bg-[var(--color-surface-tertiary)] disabled:from-transparent disabled:to-transparent disabled:text-[var(--color-text-tertiary)] disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-full transition-all duration-300 transform hover:scale-105"
        disabled={!inputValue.trim() || isDisabled}
      >
        <PlusIcon className="w-5 h-5" />
        <span>Add</span>
      </button>
    </form>
  );
};

export default AddTaskForm;