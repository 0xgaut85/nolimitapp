'use client';

import { useEffect, useState } from 'react';
import { config } from '@/config';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { RevenueChart } from './components/RevenueChart';
import { UsageChart } from './components/UsageChart';

type Stats = {
  totalUsers: number;
  totalRevenue: string;
  agentMessages: number;
  swapCount: number;
  lastUpdated: string;
};

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${config.x402ServerUrl}/api/stats`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-2 border-accent-glow border-t-transparent rounded-full animate-spin" />
          <p className="text-accent-glow font-mono animate-pulse">[LOADING_SYSTEM_METRICS]</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="p-6 border border-red-500/50 bg-red-500/10 rounded text-red-400 font-mono">
          [ERROR]: FAILED_TO_LOAD_STATS
        </div>
      </div>
    );
  }

  // Mock chart data with improved structure
  const revenueData = [
    { date: '11/20', revenue: 15.5 },
    { date: '11/21', revenue: 22.3 },
    { date: '11/22', revenue: 31.2 },
    { date: '11/23', revenue: 28.7 },
    { date: '11/24', revenue: 42.1 },
    { date: '11/25', revenue: parseFloat(stats.totalRevenue) },
  ];

  const usageData = [
    { service: 'AGENT', count: stats.agentMessages },
    { service: 'SWAP', count: stats.swapCount },
  ];

  return (
    <div className="space-y-8">
      {/* Header Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="TOTAL_USERS" value={stats.totalUsers.toString()} />
        <StatCard title="TOTAL_REVENUE" value={`$${stats.totalRevenue}`} />
        <StatCard title="AGENT_MESSAGES" value={stats.agentMessages.toString()} />
        <StatCard title="TOTAL_SWAPS" value={stats.swapCount.toString()} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card glow className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-mono text-white flex items-center gap-2">
              <span className="text-accent-glow">[</span>REVENUE_TREND<span className="text-accent-glow">]</span>
            </h3>
            <span className="text-xs font-mono text-accent-glow/50">LIVE_DATA</span>
          </div>
          <RevenueChart data={revenueData} />
        </Card>

        <Card glow className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-mono text-white flex items-center gap-2">
              <span className="text-accent-glow">[</span>SERVICE_USAGE<span className="text-accent-glow">]</span>
            </h3>
            <span className="text-xs font-mono text-accent-glow/50">PROTOCOL_ACTIVITY</span>
          </div>
          <UsageChart data={usageData} />
        </Card>
      </div>

      <div className="flex justify-end">
        <p className="text-[10px] text-white/30 font-mono uppercase">
          LAST_SYNC: {new Date(stats.lastUpdated).toLocaleString()} {'//'} BLOCK_TIME: 2s
        </p>
      </div>
    </div>
  );
}
