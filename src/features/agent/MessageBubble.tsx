'use client';

import { motion } from 'framer-motion';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.3, type: "spring" }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] relative group ${
          isUser ? 'items-end' : 'items-start'
        } flex flex-col`}
      >
        <div className={`text-[10px] font-mono mb-1 opacity-50 ${isUser ? 'text-accent-glow' : 'text-white'}`}>
          {isUser ? '[USER]' : '[SYSTEM]'} {'//'} {message.timestamp.toLocaleTimeString()}
        </div>
        
        <div
          className={`
            relative px-6 py-4 rounded-lg backdrop-blur-md border
            ${isUser 
              ? 'bg-accent-glow/10 border-accent-glow/30 text-white shadow-[0_0_15px_rgba(127,255,0,0.1)]' 
              : 'bg-white/5 border-white/10 text-white/90'
            }
          `}
        >
          {/* Corner accents */}
          <span className={`absolute top-0 w-2 h-2 border-t border-current opacity-50 ${isUser ? 'right-0 border-r' : 'left-0 border-l'}`} />
          <span className={`absolute bottom-0 w-2 h-2 border-b border-current opacity-50 ${isUser ? 'left-0 border-l' : 'right-0 border-r'}`} />

          <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
