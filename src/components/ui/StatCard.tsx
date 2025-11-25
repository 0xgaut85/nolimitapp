'use client';

import { Card } from './Card';

export function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card glow className="p-6 group">
      <div className="flex justify-between items-start mb-4">
        <p className="text-xs font-mono text-white/40 uppercase tracking-wider">{title}</p>
        <div className="w-2 h-2 rounded-full bg-accent-glow/20 group-hover:bg-accent-glow/80 transition-colors" />
      </div>
      <p className="text-3xl font-mono text-white glow-text tracking-tight">
        {value}
      </p>
      
      {/* Decorative data line */}
      <div className="mt-4 h-[1px] w-full bg-white/5 overflow-hidden">
        <div className="h-full w-1/2 bg-accent-glow/30 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
      </div>
    </Card>
  );
}
