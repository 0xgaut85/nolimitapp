'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  glow?: boolean;
}

export function Button({ 
  children, 
  className = '', 
  variant = 'primary', 
  glow = false,
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = "relative px-6 py-3 font-mono text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden";
  
  const variants = {
    primary: "bg-accent-glow/10 border border-accent-glow/30 text-accent-glow hover:bg-accent-glow/20 hover:border-accent-glow/60",
    secondary: "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20",
    danger: "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/60"
  };

  const glowStyles = glow ? "shadow-[0_0_20px_rgba(127,255,0,0.15)] hover:shadow-[0_0_30px_rgba(127,255,0,0.3)]" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${glowStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {/* Corner markers */}
      <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-current opacity-50" />
      <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current opacity-50" />
      <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current opacity-50" />
      <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-current opacity-50" />
      
      {/* Scanline effect on hover */}
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      
      <span className="relative z-10 flex items-center justify-center gap-2">
        {disabled && <span className="text-xs">[OFFLINE]</span>}
        {!disabled && children}
      </span>
    </button>
  );
}








