'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { config } from '@/config';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { RevenueChart } from './components/RevenueChart';
import { UsageChart } from './components/UsageChart';
import { motion, AnimatePresence } from 'framer-motion';

type Overview = {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  totalRevenue: string;
  agentRevenue: string;
  swapRevenue: string;
  baseRevenue: string;
  solanaRevenue: string;
  agentMessages: number;
  swapCount: number;
};

type ChartData = {
  revenue: { date: string; revenue: number }[];
  usage: { date: string; agent: number; swap: number }[];
};

type Transaction = {
  id: string;
  type: string;
  amount: string;
  chain: string;
  status: string;
  createdAt: string;
};

type DetailedStats = {
  overview: Overview;
  charts: ChartData;
  recentTransactions: Transaction[];
  lastUpdated: string;
};

type UserStats = {
  exists: boolean;
  userId?: string;
  address?: string;
  joinedAt?: string;
  totalSpent: string;
  agentMessages: number;
  swapCount: number;
  payments: Transaction[];
  agentHistory: { id: string; message: string; fee: string; createdAt: string }[];
  swapHistory: { id: string; chain: string; fromToken: string; toToken: string; fromAmount: string; toAmount: string; fee: string; txHash?: string; createdAt: string }[];
};

type TabType = 'overview' | 'user';

export function Dashboard() {
  // EVM wallet (Base)
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  
  // Solana wallet (via Reown)
  const solanaAccount = useAppKitAccount({ namespace: 'solana' });
  
  // Get effective address (EVM or Solana)
  const address = useMemo(() => {
    if (evmAddress) return evmAddress;
    if (solanaAccount.address) return solanaAccount.address;
    return undefined;
  }, [evmAddress, solanaAccount.address]);
  
  const isConnected = evmConnected || solanaAccount.isConnected;
  
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${config.x402ServerUrl}/api/stats/detailed`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!address) {
        setUserStats(null);
        return;
      }

      try {
        const response = await fetch(`${config.x402ServerUrl}/api/stats/user/${address}`);
        const data = await response.json();
        setUserStats(data);
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      }
    };

    fetchUserStats();
    const interval = setInterval(fetchUserStats, 30000);

    return () => clearInterval(interval);
  }, [address]);

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

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`font-mono text-sm px-4 py-2 transition-all ${
            activeTab === 'overview'
              ? 'text-accent-glow border-b-2 border-accent-glow'
              : 'text-white/60 hover:text-white'
          }`}
        >
          [PLATFORM_OVERVIEW]
        </button>
        <button
          onClick={() => setActiveTab('user')}
          className={`font-mono text-sm px-4 py-2 transition-all ${
            activeTab === 'user'
              ? 'text-accent-glow border-b-2 border-accent-glow'
              : 'text-white/60 hover:text-white'
          }`}
        >
          [MY_ACTIVITY]
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Header Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="TOTAL_USERS" value={stats.overview.totalUsers.toString()} subtitle={`+${stats.overview.newUsersToday} today`} />
              <StatCard title="TOTAL_REVENUE" value={`$${stats.overview.totalRevenue}`} subtitle="USDC" />
              <StatCard title="AGENT_MESSAGES" value={stats.overview.agentMessages.toString()} subtitle={`$${stats.overview.agentRevenue} revenue`} />
              <StatCard title="TOTAL_SWAPS" value={stats.overview.swapCount.toString()} subtitle={`$${stats.overview.swapRevenue} revenue`} />
            </div>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src="/logos/base.jpg" alt="Base" className="w-5 h-5 rounded-full" />
                    <span className="text-white/60 font-mono text-xs">BASE_REVENUE</span>
                  </div>
                  <span className="text-accent-glow font-mono font-bold">${stats.overview.baseRevenue}</span>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src="/logos/solana.jpg" alt="Solana" className="w-5 h-5 rounded-full" />
                    <span className="text-white/60 font-mono text-xs">SOLANA_REVENUE</span>
                  </div>
                  <span className="text-accent-glow font-mono font-bold">${stats.overview.solanaRevenue}</span>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 font-mono text-xs">NEW_USERS_7D</span>
                  <span className="text-accent-glow font-mono font-bold">{stats.overview.newUsersWeek}</span>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 font-mono text-xs">AVG_FEE</span>
                  <span className="text-accent-glow font-mono font-bold">
                    ${((stats.overview.agentMessages * 0.05 + stats.overview.swapCount * 0.10) / Math.max(stats.overview.agentMessages + stats.overview.swapCount, 1)).toFixed(2)}
                  </span>
                </div>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card glow className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-mono text-white flex items-center gap-2">
                    <span className="text-accent-glow">[</span>REVENUE_TREND<span className="text-accent-glow">]</span>
                  </h3>
                  <span className="text-xs font-mono text-accent-glow/50">30_DAY_VIEW</span>
                </div>
                <RevenueChart data={stats.charts.revenue} />
              </Card>

              <Card glow className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-mono text-white flex items-center gap-2">
                    <span className="text-accent-glow">[</span>SERVICE_USAGE<span className="text-accent-glow">]</span>
                  </h3>
                  <span className="text-xs font-mono text-accent-glow/50">PROTOCOL_ACTIVITY</span>
                </div>
                <UsageChart data={stats.charts.usage} />
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card glow className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-mono text-white flex items-center gap-2">
                  <span className="text-accent-glow">[</span>RECENT_TRANSACTIONS<span className="text-accent-glow">]</span>
                </h3>
                <span className="text-xs font-mono text-accent-glow/50">LIVE_FEED</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr className="text-white/40 text-xs border-b border-white/10">
                      <th className="text-left py-3 px-2">TYPE</th>
                      <th className="text-left py-3 px-2">AMOUNT</th>
                      <th className="text-left py-3 px-2">CHAIN</th>
                      <th className="text-left py-3 px-2">STATUS</th>
                      <th className="text-left py-3 px-2">TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-white/40">
                          No transactions yet
                        </td>
                      </tr>
                    ) : (
                      stats.recentTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              tx.type === 'agent' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {tx.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-accent-glow">${tx.amount}</td>
                          <td className="py-3 px-2 text-white/60">{tx.chain}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              tx.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-white/40">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="user"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {!isConnected ? (
              <Card className="p-12 text-center">
                <div className="text-accent-glow text-6xl mb-4">🔗</div>
                <h3 className="text-xl font-mono text-white mb-2">Connect Your Wallet</h3>
                <p className="text-white/60 font-mono text-sm">
                  Connect your wallet to view your personal activity and transaction history.
                </p>
              </Card>
            ) : !userStats?.exists ? (
              <Card className="p-12 text-center">
                <div className="text-accent-glow text-6xl mb-4">📊</div>
                <h3 className="text-xl font-mono text-white mb-2">No Activity Yet</h3>
                <p className="text-white/60 font-mono text-sm">
                  Start using the AI Agent or Swap to see your activity here.
                </p>
              </Card>
            ) : (
              <>
                {/* User Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="TOTAL_SPENT" value={`$${userStats.totalSpent}`} subtitle="USDC" />
                  <StatCard title="AGENT_MESSAGES" value={userStats.agentMessages.toString()} subtitle={`$${(userStats.agentMessages * 0.05).toFixed(2)} spent`} />
                  <StatCard title="SWAPS" value={userStats.swapCount.toString()} subtitle={`$${(userStats.swapCount * 0.10).toFixed(2)} spent`} />
                  <StatCard 
                    title="MEMBER_SINCE" 
                    value={userStats.joinedAt ? new Date(userStats.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'} 
                    subtitle={userStats.joinedAt ? new Date(userStats.joinedAt).getFullYear().toString() : ''} 
                  />
                </div>

                {/* Wallet Info */}
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 font-mono text-xs">WALLET_ADDRESS</span>
                    <span className="text-white font-mono text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                  </div>
                </Card>

                {/* User Payment History */}
                <Card glow className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-mono text-white flex items-center gap-2">
                      <span className="text-accent-glow">[</span>MY_PAYMENTS<span className="text-accent-glow">]</span>
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm">
                      <thead>
                        <tr className="text-white/40 text-xs border-b border-white/10">
                          <th className="text-left py-3 px-2">TYPE</th>
                          <th className="text-left py-3 px-2">AMOUNT</th>
                          <th className="text-left py-3 px-2">CHAIN</th>
                          <th className="text-left py-3 px-2">STATUS</th>
                          <th className="text-left py-3 px-2">TIME</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userStats.payments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-white/40">
                              No payments yet
                            </td>
                          </tr>
                        ) : (
                          userStats.payments.map((tx) => (
                            <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-3 px-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  tx.type === 'agent' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                                }`}>
                                  {tx.type.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-accent-glow">${tx.amount}</td>
                              <td className="py-3 px-2 text-white/60">{tx.chain}</td>
                              <td className="py-3 px-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  tx.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-white/40">
                                {new Date(tx.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Agent History */}
                <Card glow className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-mono text-white flex items-center gap-2">
                      <span className="text-accent-glow">[</span>AGENT_HISTORY<span className="text-accent-glow">]</span>
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {userStats.agentHistory.length === 0 ? (
                      <p className="text-center py-8 text-white/40 font-mono text-sm">No agent messages yet</p>
                    ) : (
                      userStats.agentHistory.map((msg) => (
                        <div key={msg.id} className="p-4 bg-white/5 rounded border border-white/10 hover:border-accent-glow/30 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-white/40 font-mono text-xs">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                            <span className="text-accent-glow font-mono text-xs">${msg.fee}</span>
                          </div>
                          <p className="text-white/80 font-mono text-sm">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* Swap History */}
                <Card glow className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-mono text-white flex items-center gap-2">
                      <span className="text-accent-glow">[</span>SWAP_HISTORY<span className="text-accent-glow">]</span>
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm">
                      <thead>
                        <tr className="text-white/40 text-xs border-b border-white/10">
                          <th className="text-left py-3 px-2">CHAIN</th>
                          <th className="text-left py-3 px-2">FROM</th>
                          <th className="text-left py-3 px-2">TO</th>
                          <th className="text-left py-3 px-2">FEE</th>
                          <th className="text-left py-3 px-2">TIME</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userStats.swapHistory.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-white/40">
                              No swaps yet
                            </td>
                          </tr>
                        ) : (
                          userStats.swapHistory.map((swap) => (
                            <tr key={swap.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-3 px-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  swap.chain === 'solana' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {swap.chain.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-white/80">{swap.fromToken}</td>
                              <td className="py-3 px-2 text-white/80">{swap.toToken}</td>
                              <td className="py-3 px-2 text-accent-glow">${swap.fee}</td>
                              <td className="py-3 px-2 text-white/40">
                                {new Date(swap.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        <p className="text-[10px] text-white/30 font-mono uppercase">
          LAST_SYNC: {new Date(stats.lastUpdated).toLocaleString()} {'//'} AUTO_REFRESH: 30s
        </p>
      </div>
    </div>
  );
}
