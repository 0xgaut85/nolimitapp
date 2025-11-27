import { AgentChat } from '@/features/agent/AgentChat';

export default function AgentPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-mono text-white glow-text mb-4">
          [NoLimit AI Agent]
        </h1>
        <p className="text-white/60 font-mono">
          Chat with our AI agent powered by secure x402 payments. Each message costs 0.05 USDC.
        </p>
      </div>
      <AgentChat />
    </div>
  );
}


