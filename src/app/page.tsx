'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';

// Dynamically import Three.js component to avoid SSR issues
const HeroAurora = dynamic(() => import('@/components/HeroAurora'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-white" />,
});

export default function HomePage() {
  return (
    <>
      {/* Three.js Aurora Background */}
      <div className="fixed inset-0 -z-10">
        <HeroAurora />
      </div>
      
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center max-w-5xl mx-auto relative z-10">
        {/* Hero Title */}
        <div className="relative mb-12 group">
          <div className="absolute -inset-1 bg-accent-glow/20 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
          <h1 className="text-6xl md:text-8xl font-mono text-white glow-text tracking-tighter mb-2 relative z-10">
            NO<span className="text-accent-glow">LIMIT</span>
          </h1>
          <p className="text-sm md:text-base font-mono text-accent-glow/80 tracking-[0.2em] uppercase">
            Private Payment Infrastructure // V1.0.0
          </p>
        </div>

        {/* Value Prop */}
        <p className="text-xl text-white/60 font-mono mb-16 max-w-2xl leading-relaxed">
          Deploy payment-gated AI agents and execute private swaps on Base and Solana. 
          <span className="text-white block mt-2">Zero friction. Maximum privacy.</span>
        </p>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <FeatureCard
            title="noLimit_LLM"
            description="Secure terminal for autonomous interactions powered by x402 payments."
            href="/agent"
            delay={0}
          />
          <FeatureCard
            title="LIVE_DASHBOARD"
            description="Real-time analytics and protocol metrics visualization."
            href="/dashboard"
            delay={0.1}
              />
          <FeatureCard
            title="noLimit_Swap"
            description="High-frequency trading router with privacy preservation."
            href="/swap"
            delay={0.2}
          />
          </div>
      </div>
    </>
  );
}

function FeatureCard({ title, description, href, delay }: { title: string; description: string; href: string; delay: number }) {
  return (
    <Link href={href} className="block group h-full" style={{ animationDelay: `${delay}s` }}>
      <Card glow className="h-full p-8 flex flex-col items-start text-left hover:-translate-y-1 transition-transform duration-300">
        <div className="mb-6 p-3 bg-accent-glow/10 rounded-lg border border-accent-glow/20 group-hover:border-accent-glow/50 transition-colors">
          <div className="w-6 h-6 bg-accent-glow/80" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)' }} />
        </div>
        <h3 className="text-xl font-mono text-white group-hover:text-accent-glow transition-colors mb-3 tracking-wider">
          [{title}]
        </h3>
        <p className="text-sm text-white/50 font-mono leading-relaxed">
          {description}
        </p>
        <div className="mt-auto pt-6 flex items-center text-xs font-mono text-accent-glow/60 group-hover:text-accent-glow transition-colors">
          INITIALIZE_MODULE <span className="ml-2 text-lg">→</span>
        </div>
      </Card>
    </Link>
  );
}
