'use client';

import { useState } from 'react';

type ChatInputProps = {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled: boolean;
};

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={disabled ? 'Connect wallet to send messages' : 'Type your message...'}
          disabled={disabled || isLoading}
          className="flex-1 px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/40 font-mono focus:outline-none focus:border-accent-glow/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || isLoading || !message.trim()}
          className="px-6 py-3 bg-accent-glow/20 hover:bg-accent-glow/30 rounded-lg border border-accent-glow/30 text-accent-glow font-mono transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
}

