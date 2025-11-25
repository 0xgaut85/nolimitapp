'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { config } from '@/config';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export function AgentChat() {
  const { address, isConnected } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Using x402-fetch to handle payment flow
      const x402Module = await import('x402-fetch');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const x402Fetch = (x402Module as any).x402Fetch || (x402Module as any).default;
      
      const response = await x402Fetch(`${config.x402ServerUrl}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userAddress: address,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Agent error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-black/40 backdrop-blur-sm rounded-lg border border-white/10">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-2xl font-mono text-white glow-text">
          [NoLimit AI Agent]
        </h2>
        <p className="text-sm text-white/60 mt-1">
          Fee: {config.fees.agent} USDC per message
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/40 font-mono">
            <p>Send a message to start chatting</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </div>

      <ChatInput onSend={handleSendMessage} isLoading={isLoading} disabled={!isConnected} />
    </div>
  );
}

