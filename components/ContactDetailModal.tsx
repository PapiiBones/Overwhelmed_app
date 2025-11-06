import React, { useState, useEffect } from 'react';
import { Contact, Task } from '../types';
import { CloseIcon } from './Icons';
import { PROJECT_COLORS } from '../constants';

interface ContactDetailModalProps {
  contact?: Contact;
  tasks: Task[];
  onClose: () => void;
  onSave: (contact: Omit<Contact, 'id'> & { id?: string }) => void;
  onSelectTask: (task: Task) => void;
}

const getContrastingTextColor = (hexcolor: string) => {
    if (!hexcolor) return '#1e293b';
    if (hexcolor.startsWith('#')) {
        hexcolor = hexcolor.slice(1);
    }
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1e293b' : '#f1f5f9';
};

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length > 1 && parts[parts.length - 1]) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const ContactDetailModal: React.FC<ContactDetailModalProps> = ({ contact, tasks, onClose, onSave, onSelectTask }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setColor(contact.color);
    } else {
      setName('');
      setColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
    }
  }, [contact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ id: contact?.id, name: name.trim(), color });
  };

  const associatedTasks = contact ? tasks.filter(t => t.contactId === contact.id) : [];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface-primary)] rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-[var(--color-border-secondary)] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-[var(--color-border-secondary)] flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{contact ? 'Edit Contact' : 'New Contact'}</h2>
          <button onClick={onClose} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-tertiary)] rounded-full" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto">
                <div className="flex items-center gap-4">
                    <div
                        className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold flex-shrink-0"
                        style={{ backgroundColor: color, color: getContrastingTextColor(color) }}
                    >
                        {getInitials(name)}
                    </div>
                    <div className="flex-grow">
                        <label htmlFor="contact-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Name</label>
                        <input
                            id="contact-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contact's full name"
                            required
                            autoFocus
                            className="w-full bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] p-2 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
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
                {contact && associatedTasks.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mt-4 mb-2 border-t border-[var(--color-border-secondary)] pt-4">Associated Tasks ({associatedTasks.length})</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {associatedTasks.map(t => (
                                <div key={t.id} onClick={() => onSelectTask(t)} className="p-2 bg-[var(--color-surface-secondary)] rounded-md cursor-pointer hover:bg-[var(--color-surface-tertiary)]">
                                    <p className={`text-[var(--color-text-primary)] ${t.completed ? 'line-through text-[var(--color-text-tertiary)]' : ''}`}>{t.content}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <footer className="flex justify-end p-4 border-t border-[var(--color-border-secondary)] flex-shrink-0 bg-[var(--color-surface-secondary)]/50">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)] rounded-md">Cancel</button>
                <button
                  type="submit"
                  style={{ backgroundImage: `linear-gradient(to right, var(--color-button-gradient-start), var(--color-button-gradient-end))` }}
                  className="ml-2 px-4 py-2 text-sm font-semibold text-white rounded-md"
                >
                  Save Contact
                </button>
            </footer>
        </form>
      </div>
    </div>
  );
};

export default ContactDetailModal;
