'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type UsageData = {
  service: string;
  count: number;
};

export function UsageChart({ data }: { data: UsageData[] }) {
  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-6">
      <h3 className="text-xl font-mono text-white mb-4 bracket-text">Service Usage</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="service" stroke="rgba(255,255,255,0.6)" />
          <YAxis stroke="rgba(255,255,255,0.6)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0,0,0,0.9)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="count" fill="#7fff00" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

