'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function Card({ children, className = '', glow = false, ...props }: CardProps) {
  return (
    <div 
      className={`
        relative overflow-hidden
        bg-black/60 backdrop-blur-md
        border border-white/10
        ${glow ? 'border-accent-glow/30 shadow-[0_0_30px_rgba(127,255,0,0.05)]' : 'hover:border-white/20'}
        transition-all duration-300
        ${className}
      `}
      {...props}
    >
      {/* Glass reflection */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Grid background texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px),
                           linear-gradient(to bottom, #fff 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}



