'use client';

export function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-6">
      <p className="text-sm text-white/60 font-mono mb-2">{title}</p>
      <p className="text-3xl font-mono text-white glow-text">{value}</p>
    </div>
  );
}

