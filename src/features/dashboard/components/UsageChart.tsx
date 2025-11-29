'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type UsageData = {
  date: string;
  agent: number;
  swap: number;
  mixer?: number;
};

export function UsageChart({ data }: { data: UsageData[] }) {
  return (
    <div className="relative h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barSize={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="rgba(255,255,255,0.4)" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Space Mono' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="rgba(255,255,255,0.4)" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Space Mono' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{
              backgroundColor: 'rgba(10, 10, 10, 0.9)',
              border: '1px solid rgba(127, 255, 0, 0.3)',
              borderRadius: '4px',
              fontFamily: 'Space Mono',
              fontSize: '12px',
              color: '#fff',
              boxShadow: '0 0 20px rgba(127,255,0,0.1)'
            }}
            itemStyle={{ color: '#7fff00' }}
          />
          <Legend 
            wrapperStyle={{ 
              fontFamily: 'Space Mono', 
              fontSize: '10px',
              color: 'rgba(255,255,255,0.6)'
            }}
          />
          <Bar dataKey="agent" name="AGENT" fill="#7fff00" fillOpacity={0.9} radius={[2, 2, 0, 0]} />
          <Bar dataKey="swap" name="SWAP" fill="#a78bfa" fillOpacity={0.9} radius={[2, 2, 0, 0]} />
          <Bar dataKey="mixer" name="MIXER" fill="#22c55e" fillOpacity={0.9} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
