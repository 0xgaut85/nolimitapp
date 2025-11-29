'use client';

import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

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
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 md:mb-6 lg:mb-8"
          >
            <Image 
              src="/logoblack.svg" 
              alt="noLimit" 
              width={500} 
              height={500}
              className="object-contain w-[200px] sm:w-[280px] md:w-[400px] lg:w-[500px]"
              priority
            />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl md:text-3xl lg:text-4xl max-w-4xl mx-auto text-black leading-relaxed"
          >
            Private Payment Infrastructure
          </motion.p>
        </div>
      </section>

      {/* Features Section - Matching main site aesthetic */}
      <section className="bg-white py-16 md:py-24 px-4 md:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-12 md:mb-16"
          >
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 text-[#2d5a3d]">
              <span className="font-mono bracket-text">Protocol Modules</span>
            </h2>
            <p className="text-lg md:text-xl text-black max-w-2xl">
              Deploy payment-gated AI agents and execute private swaps on Base and Solana.
            </p>
          </motion.div>

          {/* Feature Grid - Main site style */}
          <div className="grid md:grid-cols-12 gap-6">
            {/* Large featured card - noLimit LLM */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}
              className="md:col-span-7"
            >
              <Link href="/agent" className="block h-full">
                <div className="bg-[#e8f5e6] border border-[#d0e8cd] p-6 md:p-10 h-full hover:border-[#7fff00] transition-colors">
                  <div className="text-3xl md:text-4xl font-mono mb-4 md:mb-6 text-[#b8d1b3]">[01]</div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-[#2d5a3d]">noLimit LLM</h3>
                  <p className="text-base md:text-lg text-black leading-relaxed mb-4 md:mb-6">
                    Secure terminal for autonomous AI interactions. Powered by x402 payments with complete privacy and zero data retention.
                  </p>
                  <div className="font-mono text-sm text-[#4a7c59]">
                    → 0.05 USDC per message
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Smaller card - Dashboard */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.7 }}
              whileHover={{ y: -8, scale: 1.03, transition: { duration: 0.3 } }}
              className="md:col-span-5"
            >
              <Link href="/dashboard" className="block h-full">
                <div className="bg-[#e8f5e6] border border-[#d0e8cd] p-6 md:p-10 h-full hover:border-[#7fff00] transition-colors">
                  <div className="text-3xl md:text-4xl font-mono mb-4 md:mb-6 text-[#b8d1b3]">[02]</div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-[#2d5a3d]">Live Dashboard</h3>
                  <p className="text-black leading-relaxed">
                    Real-time analytics and protocol metrics. Track usage, revenue, and transaction history across all services.
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* Smaller card - Integration */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.7 }}
              whileHover={{ y: -8, scale: 1.03, transition: { duration: 0.3 } }}
              className="md:col-span-5"
            >
              <Link href="/integration" className="block h-full">
                <div className="bg-[#e8f5e6] border border-[#d0e8cd] p-6 md:p-10 h-full hover:border-[#7fff00] transition-colors">
                  <div className="text-3xl md:text-4xl font-mono mb-4 md:mb-6 text-[#b8d1b3]">[03]</div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-[#2d5a3d]">Integration Guide</h3>
                  <p className="text-black leading-relaxed">
                    Documentation for integrating x402 private payments into any DApp. Build payment-gated AI agents.
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* Large card - noLimit Swap */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.45, duration: 0.7 }}
              whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}
              className="md:col-span-7"
            >
              <Link href="/swap" className="block h-full">
                <div className="bg-[#e8f5e6] border border-[#d0e8cd] p-6 md:p-10 h-full hover:border-[#7fff00] transition-colors">
                  <div className="text-3xl md:text-4xl font-mono mb-4 md:mb-6 text-[#b8d1b3]">[04]</div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-[#2d5a3d]">noLimit Swap</h3>
                  <p className="text-base md:text-lg text-black leading-relaxed mb-4 md:mb-6">
                    High-frequency trading router with privacy preservation. Multi-chain support for Base and Solana with optimal execution and MEV protection.
                  </p>
                  <div className="font-mono text-sm text-[#4a7c59]">
                    → 0.10 USDC per swap
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
