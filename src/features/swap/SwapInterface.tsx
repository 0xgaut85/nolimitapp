'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { SwapForm } from './components/SwapForm';
import { SwapRewards } from './components/SwapRewards';

export function SwapInterface() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="border-b border-white/5 mb-12">
        <div className="max-w-7xl mx-auto text-center px-4 md:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="font-mono bracket-text">Token Swap</span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Multi-chain decentralized trading with institutional-grade execution
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Swap Interface Container */}
      <div className="relative">
        {/* Vault Background Decoration */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'url(/illustration/vault.png)',
            backgroundSize: 'auto 56%',
            backgroundPosition: '0% 0%',
            backgroundRepeat: 'no-repeat',
          }}
        />
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <div className="grid lg:grid-cols-[1fr_400px] gap-6 lg:pl-28 xl:pl-32">
            <SwapForm />
            <SwapRewards />
          </div>

          {/* Protocol Features */}
          <div className="grid md:grid-cols-3 gap-1 mt-12 border border-white/10 overflow-hidden rounded-2xl bg-black/40 backdrop-blur-sm">
            {[
              {
                title: "Minimal Fees",
                desc: "Competitive 0.3% trading fee with optimized gas efficiency for cost-effective transactions",
                number: "01"
              },
              {
                title: "Instant Execution",
                desc: "High-performance routing engine delivers sub-second trade execution across multiple liquidity pools",
                number: "02"
              },
              {
                title: "Non-Custodial",
                desc: "Fully decentralized architecture ensures complete asset custody and transaction sovereignty",
                number: "03"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + (i * 0.1) }}
                className="bg-white/5 backdrop-blur-sm border-r border-white/10 last:border-r-0 p-6 md:p-8 hover:bg-white/10 transition-colors group"
              >
                <div className="mb-4">
                  <span className="text-5xl md:text-6xl font-bold text-white/10 font-mono group-hover:text-[#b8d1b3]/20 transition-colors">
                    {feature.number}
                  </span>
                </div>
                <h3 className="font-mono font-bold text-lg md:text-xl text-white mb-3 uppercase tracking-wider">{feature.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed font-mono">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Chain Support Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-20 mb-20 w-full"
      >
        <div className="grid lg:grid-cols-2 gap-0 min-h-[600px]">
          {/* Left Side - Big Text */}
          <div className="flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16 bg-gradient-to-br from-white/5 to-transparent">
            <motion.h3 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
              className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-8 font-mono uppercase tracking-wider leading-tight"
            >
              Multi-Chain<br />Protocol
            </motion.h3>
            <motion.p 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              className="text-white/80 text-xl md:text-2xl lg:text-3xl leading-relaxed max-w-2xl font-light font-mono"
            >
              Privacy-focused decentralized exchange enabling fully anonymous cross-chain swaps and bridges. 
              No KYC. No tracking. No data collection.
            </motion.p>
          </div>

          {/* Right Side - Scrolling Carousel */}
          <div className="relative flex items-center justify-center py-16 overflow-hidden bg-gradient-to-bl from-white/5 to-transparent">
            <div className="scroll-container w-full h-full">
              <div className="scroll-content">
                {[
                  { name: "Ethereum", logo: "/logos/ethereum.jpg" },
                  { name: "Arbitrum", logo: "/logos/arbitrum.jpg" },
                  { name: "Optimism", logo: "/logos/optimism.jpg" },
                  { name: "BSC", logo: "/logos/BSC.jpg" },
                  { name: "Avalanche", logo: "/logos/avalanche.jpg" },
                  { name: "Solana", logo: "/logos/solana.jpg" },
                  { name: "Base", logo: "/logos/base.jpg" }
                ].concat([
                  { name: "Ethereum", logo: "/logos/ethereum.jpg" },
                  { name: "Arbitrum", logo: "/logos/arbitrum.jpg" },
                  { name: "Optimism", logo: "/logos/optimism.jpg" },
                  { name: "BSC", logo: "/logos/BSC.jpg" },
                  { name: "Avalanche", logo: "/logos/avalanche.jpg" },
                  { name: "Solana", logo: "/logos/solana.jpg" },
                  { name: "Base", logo: "/logos/base.jpg" }
                ]).map((chain, index) => (
                  <motion.div
                    key={`${chain.name}-${index}`}
                    className="scroll-item backdrop-blur-2xl px-12 py-8 border border-white/10 hover:border-[#b8d1b3]/30 transition-all duration-500 rounded-3xl mx-4 group w-[400px]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(184,209,179,0.03) 100%)',
                      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2), inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-white font-mono text-2xl md:text-3xl font-bold uppercase tracking-wider group-hover:text-[#b8d1b3] transition-colors duration-500">
                        {chain.name}
                      </span>
                      <div className="w-16 h-16 relative flex-shrink-0 rounded-full overflow-hidden border-2 border-white/20 shadow-xl group-hover:border-[#b8d1b3]/50 group-hover:scale-110 transition-all duration-500">
                        <Image
                          src={chain.logo}
                          alt={chain.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .scroll-container {
            height: 600px;
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            padding: 0 2rem;
          }

          .scroll-content {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            animation: scrollVertical 25s linear infinite;
          }

          .scroll-item {
            flex-shrink: 0;
          }

          @keyframes scrollVertical {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(-50%);
            }
          }

          .scroll-container:hover .scroll-content {
            animation-play-state: paused;
          }
        `}</style>
      </motion.div>
    </div>
  );
}
