import React from 'react';
import { Contact } from '../types';
import { TrashIcon } from './Icons';

interface ContactCardProps {
  contact: Contact;
  taskCount: number;
  onClick: () => void;
  onDelete: () => void;
}

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length > 1 && parts[parts.length - 1]) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getContrastingTextColor = (hexcolor: string) => {
    if (hexcolor.startsWith('#')) {
        hexcolor = hexcolor.slice(1);
    }
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1e293b' : '#f1f5f9'; // dark or light text
};

const ContactCard: React.FC<ContactCardProps> = ({ contact, taskCount, onClick, onDelete }) => {
  return (
    <div
      onClick={onClick}
      className="group relative bg-[var(--color-surface-primary)] p-4 rounded-lg border border-[var(--color-border-primary)] cursor-pointer transition-all hover:border-[var(--color-border-secondary)] hover:shadow-lg"
    >
      <div className="flex flex-col items-center text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-3"
          style={{ backgroundColor: contact.color, color: getContrastingTextColor(contact.color) }}
        >
          {getInitials(contact.name)}
        </div>
        <h3 className="font-semibold text-lg text-[var(--color-text-primary)] truncate w-full">{contact.name}</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">{taskCount} active task{taskCount !== 1 ? 's' : ''}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-2 right-2 p-2 text-[var(--color-text-tertiary)] hover:text-red-400 rounded-full bg-[var(--color-surface-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Delete ${contact.name}`}
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ContactCard;
