'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';

interface PrivacyToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function SwapRewards() {
  const { isConnected } = useAccount();

  const [useRelayer, setUseRelayer] = useState(true);
  const [stealthAddresses, setStealthAddresses] = useState(false);
  const [privacyMixer, setPrivacyMixer] = useState(false);
  const [zeroKnowledge, setZeroKnowledge] = useState(true);
  const [dummyTransactions, setDummyTransactions] = useState(false);

  const privacySettings: PrivacyToggleProps[] = [
    {
      label: 'Use Relayer Network',
      description: 'Submit transactions through relayers to hide your IP address',
      checked: useRelayer,
      onChange: setUseRelayer,
    },
    {
      label: 'Stealth Addresses',
      description: 'Generate one-time addresses to break wallet heuristics',
      checked: stealthAddresses,
      onChange: setStealthAddresses,
    },
    {
      label: 'Privacy Pool Mixer',
      description: 'Route through privacy pools to obfuscate transaction origin',
      checked: privacyMixer,
      onChange: setPrivacyMixer,
    },
    {
      label: 'Zero-Knowledge Proofs',
      description: 'Prove validity without revealing any trade metadata (zk-SNARKs)',
      checked: zeroKnowledge,
      onChange: setZeroKnowledge,
    },
    {
      label: 'Dummy Transactions',
      description: 'Emit timed decoy swaps to hide execution patterns',
      checked: dummyTransactions,
      onChange: setDummyTransactions,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      className="hidden lg:flex flex-col gap-6"
    >
      <div
        className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative rounded-3xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(184,209,179,0.02) 0%, rgba(184,209,179,0.01) 100%)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Image src="/illustration/logox.jpg" alt="NL Token" width={40} height={40} className="rounded-full" />
          <h3 className="text-white font-mono text-lg font-bold uppercase tracking-wider">$NL Rewards</h3>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-mono text-white/50 uppercase tracking-wider mb-2">Total Earned</p>
              <p className="text-3xl font-bold font-mono text-[#b8d1b3]">
                0.00 <span className="text-xl text-white/50">$NL</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 p-3 rounded-xl">
                <p className="text-xs font-mono text-white/50 mb-1">This Week</p>
                <p className="text-lg font-bold font-mono text-white">0.0</p>
              </div>
              <div className="bg-black/30 p-3 rounded-xl">
                <p className="text-xs font-mono text-white/50 mb-1">Last Swap</p>
                <p className="text-lg font-bold font-mono text-white">0.0</p>
              </div>
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs font-mono text-white/60 leading-relaxed">
                Earn <span className="text-[#b8d1b3] font-bold">$NL tokens</span> with every swap or bridge transaction. Higher
                volumes unlock boosted multipliers and retroactive drops.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-mono text-white/50 mb-2">Connect Wallet</p>
            <p className="text-xs font-mono text-white/30">to view your $NL rewards</p>
          </div>
        )}
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-[#b8d1b3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-white font-mono text-base font-bold uppercase tracking-wider">Privacy</h3>
        </div>
        <div className="space-y-3">
          {privacySettings.map((setting) => (
            <PrivacyToggle key={setting.label} {...setting} />
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-[10px] font-mono text-white/40 leading-relaxed">
            Privacy layers stack for exponential obfuscation. Some options may increase gas cost on Base or require extra
            compute on Solana. Choose the posture that matches your threat model.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function PrivacyToggle({ label, description, checked, onChange }: PrivacyToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only peer"
        />
        <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#b8d1b3]" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-mono text-white/90 font-bold">{label}</p>
        <p className="text-[10px] font-mono text-white/50 mt-0.5">{description}</p>
      </div>
    </label>
  );
}



