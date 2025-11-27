'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';

// Dynamically import Three.js component to avoid SSR issues
const HeroAurora = dynamic(() => import('@/components/HeroAurora'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-white" />,
});

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Three.js Aurora as full background */}
      <div className="fixed inset-0 -z-10">
        <HeroAurora />
      </div>

      {/* Hero Section */}
      <section className="min-h-[70vh] flex items-center justify-center relative">
        <div className="text-center px-4 md:px-6 flex flex-col items-center">
          <div className="mb-4 md:mb-6 lg:mb-8">
            <Image 
              src="/logoblack.svg" 
              alt="noLimit" 
              width={500} 
              height={500}
              className="object-contain w-[200px] sm:w-[280px] md:w-[400px] lg:w-[500px]"
              priority
            />
          </div>
          <p className="text-lg sm:text-xl md:text-3xl lg:text-4xl max-w-4xl mx-auto text-black leading-relaxed">
            Private Payment Infrastructure
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-black/90 backdrop-blur-sm py-16 md:py-24 px-4 md:px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-mono text-white mb-4">
              [<span className="text-[#7fff00]">PROTOCOL</span>_MODULES]
            </h2>
            <p className="text-white/60 font-mono max-w-2xl mx-auto">
              Deploy payment-gated AI agents and execute private swaps on Base and Solana.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              title="noLimit_LLM"
              description="Secure terminal for autonomous interactions powered by x402 payments."
              href="/agent"
              icon="🤖"
            />
            <FeatureCard
              title="LIVE_DASHBOARD"
              description="Real-time analytics and protocol metrics visualization."
              href="/dashboard"
              icon="📊"
            />
            <FeatureCard
              title="noLimit_Swap"
              description="High-frequency trading router with privacy preservation."
              href="/swap"
              icon="🔄"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, description, href, icon }: { title: string; description: string; href: string; icon: string }) {
  return (
    <Link href={href} className="block group h-full">
      <Card glow className="h-full p-8 flex flex-col items-start text-left hover:-translate-y-1 transition-transform duration-300">
        <div className="mb-6 p-3 bg-[#7fff00]/10 rounded-lg border border-[#7fff00]/20 group-hover:border-[#7fff00]/50 transition-colors text-2xl">
          {icon}
        </div>
        <h3 className="text-xl font-mono text-white group-hover:text-[#7fff00] transition-colors mb-3 tracking-wider">
          [{title}]
        </h3>
        <p className="text-sm text-white/50 font-mono leading-relaxed">
          {description}
        </p>
        <div className="mt-auto pt-6 flex items-center text-xs font-mono text-[#7fff00]/60 group-hover:text-[#7fff00] transition-colors">
          INITIALIZE_MODULE <span className="ml-2 text-lg">→</span>
        </div>
      </Card>
    </Link>
  );
}
