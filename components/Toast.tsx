import React, { useEffect, useState } from 'react';
import { UndoIcon, ErrorIcon } from './Icons';
import { ToastState } from '../types';

interface ToastProps {
  toastState: ToastState | null;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ toastState, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (toastState) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [toastState, onClose]);
  
  const handleAction = () => {
    if (toastState?.onAction) {
        toastState.onAction();
    }
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!toastState) return null;
  
  const toastStyles = {
    info: 'border-[var(--color-border-secondary)]',
    undo: 'border-[var(--color-border-secondary)]',
    error: 'border-red-500/50',
  };
  
  const toastIcon = {
    info: null,
    undo: <UndoIcon className="w-5 h-5 text-indigo-400"/>,
    error: <ErrorIcon className="w-5 h-5 text-red-400"/>,
  }

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] py-3 px-6 rounded-full shadow-lg border flex items-center gap-4 z-50 transition-all duration-300 ${isVisible ? 'animate-slide-in-up' : 'opacity-0 translate-y-4'} ${toastStyles[toastState.type]}`}
    >
      {toastIcon[toastState.type] && <div className="flex-shrink-0">{toastIcon[toastState.type]}</div>}
      <p>{toastState.message}</p>
      {toastState.type === 'undo' && toastState.onAction && (
        <button
          onClick={handleAction}
          className="flex items-center gap-1.5 font-semibold text-indigo-400 hover:text-indigo-300"
        >
          <UndoIcon className="w-4 h-4"/>
          {toastState.actionText || 'Undo'}
        </button>
      )}
    </div>
  );
};

 export default Toast;