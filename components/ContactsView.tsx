import React from 'react';
import { Contact, Task } from '../types';
import ContactCard from './ContactCard';
import { PlusIcon } from './Icons';

interface ContactsViewProps {
  contacts: Contact[];
  tasks: Task[];
  onAddContact: () => void;
  onSelectContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
}

const ContactsView: React.FC<ContactsViewProps> = ({ contacts, tasks, onAddContact, onSelectContact, onDeleteContact }) => {
  return (
    <div className="p-4 md:p-8 h-full flex flex-col">
      <header className="flex justify-between items-center mb-6 flex-shrink-0">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">Contacts</h1>
        <button
          onClick={onAddContact}
          style={{ backgroundImage: `linear-gradient(to right, var(--color-button-gradient-start), var(--color-button-gradient-end))` }}
          className="flex items-center gap-2 text-white font-bold py-2 px-4 rounded-full transition-all duration-300 transform hover:scale-105"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Contact</span>
        </button>
      </header>
      {contacts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto">
          {contacts.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              taskCount={tasks.filter(t => t.contactId === contact.id && !t.completed).length}
              onClick={() => onSelectContact(contact)}
              onDelete={() => onDeleteContact(contact.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-[var(--color-surface-primary)] rounded-lg border border-dashed border-[var(--color-border-secondary)]">
          <h2 className="text-2xl font-semibold text-[var(--color-text-secondary)]">No Contacts Yet</h2>
          <p className="text-[var(--color-text-tertiary)] mt-2">Add a contact to a task or create one here to get started.</p>
        </div>
      )}
    </div>
  );
};

export default ContactsView;
