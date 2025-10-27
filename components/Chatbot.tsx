import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { ChatBubbleIcon, CloseIcon, SendIcon } from './Icons';

interface ChatbotProps {
    isOpen: boolean;
    onToggle: () => void;
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onToggle, messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (input.trim() === '' || isLoading) return;
    onSendMessage(input);
    setInput('');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  }

  return (
    <>
      <button
        onClick={onToggle}
        style={{ 
            backgroundImage: `linear-gradient(to right, var(--color-button-gradient-start), var(--color-button-gradient-end))`,
        }}
        className="fixed bottom-6 right-6 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 z-50"
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
      >
        {isOpen ? <CloseIcon className="w-8 h-8" /> : <ChatBubbleIcon className="w-8 h-8" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[90vw] max-w-md h-[70vh] max-h-[600px] bg-[var(--color-sidebar-bg)] backdrop-blur-md rounded-xl shadow-2xl flex flex-col z-50 animate-slide-in-up border border-[var(--color-sidebar-border)]">
          <header className="flex justify-between items-center p-4 border-b border-[var(--color-sidebar-border)]"
             style={{ 
                backgroundImage: `linear-gradient(to right, var(--color-button-gradient-start), var(--color-button-gradient-end))`,
                backgroundClip: 'text',
                color: 'transparent'
             }}
          >
            <h3 className="font-bold text-lg">AI Assistant</h3>
          </header>
          <div className="flex-grow p-4 overflow-y-auto">
            <div className="flex flex-col gap-4">
              {messages.length === 0 && <div className="text-center text-[var(--color-text-secondary)] text-sm">Ask me anything about your tasks, like "What's my most important task for work?"</div>}
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)]'}`}>
                    <p className="text-base whitespace-pre-wrap">{msg.parts[0].text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-lg bg-[var(--color-surface-tertiary)] text-[var(--color-text-primary)] flex items-center gap-2">
                     <div className="w-2 h-2 bg-[var(--color-text-secondary)] rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                     <div className="w-2 h-2 bg-[var(--color-text-secondary)] rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                     <div className="w-2 h-2 bg-[var(--color-text-secondary)] rounded-full animate-pulse"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="p-4 border-t border-[var(--color-sidebar-border)]">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="w-full bg-[var(--color-surface-tertiary)] border border-[var(--color-border-secondary)] rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-[var(--color-text-primary)]"
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors">
                <SendIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
