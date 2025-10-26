import React, { useEffect, useState } from 'react';
import { UndoIcon } from './Icons';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onAction?: () => void;
  actionText?: string;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onAction, actionText }) => {
  const [show, setShow] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
    } else {
      // Wait for fade out animation before removing from DOM
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white py-3 px-6 rounded-full shadow-lg border border-slate-700 flex items-center gap-4 z-50 transition-all duration-300 ${isVisible ? 'animate-slide-in-up' : 'opacity-0 translate-y-4'}`}
    >
      <p>{message}</p>
      {onAction && actionText && (
        <button
          onClick={onAction}
          className="flex items-center gap-1.5 font-semibold text-indigo-400 hover:text-indigo-300"
        >
          <UndoIcon className="w-4 h-4"/>
          {actionText}
        </button>
      )}
    </div>
  );
};

export default Toast;