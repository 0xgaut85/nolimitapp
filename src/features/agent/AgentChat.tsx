'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import { config } from '@/config';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { wrapFetchWithPayment } from 'x402-fetch';
import { base } from 'wagmi/chains';
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react';
import type { Provider } from '@reown/appkit-utils/solana';
import { createX402SolanaSignerFromReown } from '@/lib/solanaSignerAdapter';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export function AgentChat() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: walletClient } = useWalletClient();
  const evmAccount = useAppKitAccount();
  const solanaAccount = useAppKitAccount({ namespace: 'solana' });
  const { caipNetwork } = useAppKitNetwork();
  const { walletProvider: solanaProvider } = useAppKitProvider<Provider>('solana');

  // Check if Solana wallet is connected
  const isSolanaActive = caipNetwork?.namespace === 'solana' || (!isConnected && solanaAccount.isConnected);
  const connectedAddress = (isSolanaActive ? solanaAccount.address : evmAccount.address) || address;
  const isWalletConnected = Boolean(connectedAddress);

  // x402-fetch for EVM (Base)
  const evmFetchWithPayment = useMemo(() => {
    if (!walletClient) return null;
    try {
      return wrapFetchWithPayment(
        fetch,
        walletClient as any,
        BigInt(1 * 10 ** 6), // max 1 USDC
      );
    } catch (err) {
      console.error('[x402-fetch] Failed to initialize EVM:', err);
      return null;
    }
  }, [walletClient]);

  // x402-fetch for Solana using adapter
  const solanaFetchWithPayment = useMemo(() => {
    if (!solanaProvider || !solanaAccount.address) return null;
    try {
      const solanaSigner = createX402SolanaSignerFromReown(solanaProvider, solanaAccount.address);
      return wrapFetchWithPayment(
        fetch,
        solanaSigner as any,
        BigInt(1 * 10 ** 6), // max 1 USDC
        undefined,
        { svmConfig: { rpcUrl: config.networks.solana.rpcUrl } },
      );
    } catch (err) {
      console.error('[x402-fetch] Failed to initialize Solana:', err);
      return null;
    }
  }, [solanaProvider, solanaAccount.address]);

  // Select the right fetch based on active network
  const fetchWithPayment = isSolanaActive ? solanaFetchWithPayment : evmFetchWithPayment;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    if (!isWalletConnected || !connectedAddress) {
      setError('Please connect your wallet first');
      return;
    }
    if (!fetchWithPayment) {
      setError('Payment client not available. Ensure your wallet is connected.');
      return;
    }
    // Validate network - either Base or Solana
    if (!isSolanaActive && (!chainId || chainId !== base.id)) {
      setError('Switch to Base network to continue.');
      return;
    }

    const messageContent = input.trim();
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const apiPath = isSolanaActive ? '/api/noLimitLLM/solana' : '/api/noLimitLLM';
      const response = await fetchWithPayment(apiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          userAddress: connectedAddress,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Agent error:', err);
      const errorContent = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorContent);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto">
      {/* Error Banner */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-mono flex items-center justify-between"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-4">✕</button>
        </motion.div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="mb-8">
              <Image 
                src="/logo3.svg" 
                alt="noLimit" 
                width={120} 
                height={120}
                className="opacity-50"
              />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              noLimit LLM
            </h2>
            <p className="text-white/60 max-w-md mb-4">
              Uncensored AI assistant powered by Venice AI.
            </p>
            <div className="flex items-center gap-2 mb-8 px-4 py-2 bg-[#7fff00]/10 border border-[#7fff00]/30 rounded-lg">
              <span className="text-[#7fff00] font-mono text-sm">{config.fees.agent} USDC</span>
              <span className="text-white/40 text-sm">per message via x402</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
              {[
                'Explain quantum computing simply',
                'Write a Python web scraper',
                'How do smart contracts work?',
                'Create a trading bot strategy'
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="p-4 text-left bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all text-white/80 text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`py-6 px-4 ${msg.role === 'assistant' ? 'bg-white/5' : ''}`}
                >
                  <div className="max-w-3xl mx-auto flex gap-4">
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.role === 'assistant' 
                        ? 'bg-[#7fff00] text-black' 
                        : 'bg-white/20 text-white'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">
                          {msg.role === 'assistant' ? 'noLimit LLM' : 'You'}
                        </span>
                        <span className="text-xs text-white/40">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-white/90 whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-6 px-4 bg-white/5"
              >
                <div className="max-w-3xl mx-auto flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#7fff00] text-black flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-white/5 border border-white/20 rounded-2xl overflow-hidden focus-within:border-[#7fff00]/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isWalletConnected ? "Message noLimit LLM..." : "Connect wallet to chat..."}
              disabled={!isWalletConnected || isLoading}
              rows={1}
              className="w-full bg-transparent text-white placeholder-white/40 px-4 py-4 pr-14 resize-none focus:outline-none disabled:opacity-50 max-h-[200px]"
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || !isWalletConnected || isLoading}
              className="absolute right-2 bottom-2 p-2 bg-[#7fff00] text-black rounded-lg hover:bg-[#6ee600] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <p className="text-xs text-white/40">
              {config.fees.agent} USDC per message
            </p>
            <span className="text-white/20">•</span>
            <p className="text-xs text-white/40">
              Powered by noLimit LLM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
