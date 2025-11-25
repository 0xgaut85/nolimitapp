export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-6xl font-mono text-white glow-text mb-6">
        [NoLimit]
      </h1>
      <p className="text-xl text-white/80 font-mono mb-12">
        Private Payment Infrastructure for DeFi
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          title="AI Agent"
          description="Chat with NoLimit AI powered by x402 payments"
          href="/agent"
        />
        <FeatureCard
          title="Dashboard"
          description="Real-time analytics and usage statistics"
          href="/dashboard"
        />
        <FeatureCard
          title="Swap"
          description="Privacy-focused token swaps on Base and Solana"
          href="/swap"
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <a
      href={href}
      className="block p-6 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 hover:border-accent-glow/30 transition-all group"
    >
      <h3 className="text-xl font-mono text-white glow-text mb-3 group-hover:text-accent-glow transition-colors">
        [{title}]
      </h3>
      <p className="text-sm text-white/60 font-mono">{description}</p>
    </a>
  );
}
