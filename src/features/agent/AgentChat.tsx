'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { config } from '@/config';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Card } from '@/components/ui/Card';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <Card className="flex flex-col h-[700px] overflow-hidden border-accent-glow/20" glow>
      <div className="p-6 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-mono text-white glow-text flex items-center gap-3">
              <span className="w-3 h-3 bg-accent-glow animate-pulse rounded-full shadow-[0_0_10px_#7fff00]" />
              [AI_AGENT_TERMINAL]
            </h2>
            <p className="text-sm text-white/40 mt-1 font-mono pl-6">
              SECURE_CONNECTION_ESTABLISHED // FEE: {config.fees.agent} USDC
            </p>
          </div>
          <div className="px-3 py-1 border border-accent-glow/30 rounded text-xs font-mono text-accent-glow bg-accent-glow/5">
            STATUS: ONLINE
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-black/20 relative">
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none scanline-bg opacity-20" />
        
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/20 font-mono space-y-4">
            <div className="w-16 h-16 border border-current rounded-full flex items-center justify-center animate-pulse">
              <div className="w-12 h-12 border border-current rounded-full" />
            </div>
            <p className="text-sm tracking-widest">[AWAITING_INPUT]</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-black/40 border-t border-white/10 backdrop-blur-md relative z-10">
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} disabled={!isConnected} />
      </div>
    </Card>
  );
}
