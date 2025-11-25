'use client';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-accent-glow/20 border border-accent-glow/30 text-white'
            : 'bg-white/5 border border-white/10 text-white/90'
        }`}
      >
        <p className="font-mono text-sm leading-relaxed">{message.content}</p>
        <p className="text-xs text-white/40 mt-2">
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

