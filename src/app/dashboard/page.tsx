import { Dashboard } from '@/features/dashboard/Dashboard';

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-mono text-white glow-text mb-4">
          [Dashboard]
        </h1>
        <p className="text-white/60 font-mono">
          Real-time analytics for NoLimit platform usage and revenue.
        </p>
      </div>
      <Dashboard />
    </div>
  );
}









