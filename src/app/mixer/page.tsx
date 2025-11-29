'use client';

import { MixerForm } from '@/features/mixer/MixerForm';
import { motion } from 'framer-motion';

export default function MixerPage() {
  return (
    <div className="min-h-screen relative">
      <div className="relative z-10 max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-mono text-white mb-4">
            <span className="text-[#b8d1b3]">[</span>MIXER<span className="text-[#b8d1b3]">]</span>
          </h1>
          <p className="text-white/60 font-mono max-w-2xl mx-auto">
            Anonymous transfers. Break the on-chain link between sender and receiver.
          </p>
        </motion.div>

        <MixerForm />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-6 bg-white/5 border border-white/10 rounded-2xl"
        >
          <h3 className="text-white font-mono text-sm uppercase tracking-wider mb-4">How it works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-[#b8d1b3]/20 flex items-center justify-center text-[#b8d1b3] font-mono font-bold">1</div>
              <h4 className="text-white font-mono text-sm">Deposit</h4>
              <p className="text-white/50 font-mono text-xs">
                Send funds to the mixer pool from your wallet
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-[#b8d1b3]/20 flex items-center justify-center text-[#b8d1b3] font-mono font-bold">2</div>
              <h4 className="text-white font-mono text-sm">Mix</h4>
              <p className="text-white/50 font-mono text-xs">
                Funds are pooled with other users, breaking the trail
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-[#b8d1b3]/20 flex items-center justify-center text-[#b8d1b3] font-mono font-bold">3</div>
              <h4 className="text-white font-mono text-sm">Withdraw</h4>
              <p className="text-white/50 font-mono text-xs">
                Receive fresh funds at your destination address
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 text-center">
          <p className="text-white/30 font-mono text-xs">
            ⚠️ Use responsibly. Privacy is a right, not a tool for illegal activity.
          </p>
        </div>
      </div>
    </div>
  );
}

