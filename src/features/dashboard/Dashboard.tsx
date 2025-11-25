'use client';

import { useEffect, useState } from 'react';
import { config } from '@/config';
import { StatCard } from '@/components/ui/StatCard';
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
    const interval = setInterval(fetchStats, 10000); // Refresh every 10s

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <p className="text-white/60 font-mono">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <p className="text-white/60 font-mono">Failed to load stats</p>
      </div>
    );
  }

  // Mock chart data (will be replaced with real data from DB)
  const revenueData = [
    { date: '11/20', revenue: 15.5 },
    { date: '11/21', revenue: 22.3 },
    { date: '11/22', revenue: 31.2 },
    { date: '11/23', revenue: 28.7 },
    { date: '11/24', revenue: 42.1 },
    { date: '11/25', revenue: parseFloat(stats.totalRevenue) },
  ];

  const usageData = [
    { service: 'Agent', count: stats.agentMessages },
    { service: 'Swap', count: stats.swapCount },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats.totalUsers.toString()} />
        <StatCard title="Total Revenue" value={`$${stats.totalRevenue}`} />
        <StatCard title="Agent Messages" value={stats.agentMessages.toString()} />
        <StatCard title="Swaps" value={stats.swapCount.toString()} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={revenueData} />
        <UsageChart data={usageData} />
      </div>

      <p className="text-xs text-white/40 font-mono text-center">
        Last updated: {new Date(stats.lastUpdated).toLocaleString()}
      </p>
    </div>
  );
}
