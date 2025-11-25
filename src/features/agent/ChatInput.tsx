'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
      <div className="flex-1">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={disabled ? 'CONNECT_WALLET_TO_INITIALIZE' : 'ENTER_COMMAND...'}
          disabled={disabled || isLoading}
          className="bg-black/60 border-white/20 focus:border-accent-glow/60 h-12"
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        glow
        disabled={disabled || isLoading || !message.trim()}
        className="h-12 px-8"
      >
        {isLoading ? 'PROCESSING...' : 'TRANSMIT'}
      </Button>
    </form>
  );
}
