'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-xs font-mono text-accent-glow/80 uppercase tracking-wider">
          {`> ${label}`}
        </label>
      )}
      <div className="relative group">
        <input
          className={`
            w-full bg-black/40 border border-white/10 
            text-white font-mono text-sm px-4 py-3
            focus:outline-none focus:border-accent-glow/50 focus:bg-black/60
            placeholder:text-white/20
            transition-all duration-200
            ${error ? 'border-red-500/50 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {/* Blinking cursor effect block */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-4 bg-accent-glow/50 animate-pulse pointer-events-none opacity-0 group-focus-within:opacity-100" />
      </div>
      {error && (
        <span className="text-xs font-mono text-red-400">
          [ERROR]: {error}
        </span>
      )}
    </div>
  );
}

