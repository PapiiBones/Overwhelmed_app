import React, { useState } from 'react';
import { CloseIcon } from './Icons';

interface LoginModalProps {
  onLogin: (email: string) => void;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onLogin(email.trim());
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--color-surface-primary)] rounded-xl shadow-2xl w-full max-w-sm border border-[var(--color-border-secondary)] relative overflow-hidden animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        <header className="flex justify-between items-center p-4 border-b border-[var(--color-border-secondary)]">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Login to Sync</h2>
          <button onClick={onClose} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-tertiary)] rounded-full" aria-label="Close login">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-[var(--color-text-secondary)] text-sm">
            Enter an email to sync your data. This is a simulation and no actual email is sent.
          </p>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button 
            type="submit"
            className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md flex justify-center items-center disabled:bg-indigo-800"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

 export default LoginModal;