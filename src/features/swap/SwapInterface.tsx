'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { config } from '@/config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion } from 'framer-motion';

type SwapFormData = {
  chain: 'base' | 'solana';
  fromToken: string;
  toToken: string;
  amount: string;
};

export function SwapInterface() {
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState<SwapFormData>({
    chain: 'base',
    fromToken: 'USDC',
    toToken: 'ETH',
    amount: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [quote, setQuote] = useState<string | null>(null);

  const handleSwap = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsLoading(true);

    try {
      // Using x402-fetch to handle payment flow
      const x402Module = await import('x402-fetch');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const x402Fetch = (x402Module as any).x402Fetch || (x402Module as any).default;
      
      const response = await x402Fetch(`${config.x402ServerUrl}/api/swap/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userAddress: address,
        }),
      });

      const data = await response.json();
      
      alert(`Swap initiated successfully! ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('Swap error:', error);
      alert(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative max-w-lg mx-auto">
      {/* Reactor Core Glow */}
      <div className="absolute inset-0 bg-accent-glow/5 blur-[100px] -z-10" />
      
      <Card glow className="p-8 border-t-4 border-t-accent-glow/50">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-mono text-white glow-text flex items-center gap-2">
            <span className="text-accent-glow">[</span>REACTOR_SWAP<span className="text-accent-glow">]</span>
          </h2>
          <div className="flex gap-2 bg-black/40 p-1 rounded-lg border border-white/10">
            {['base', 'solana'].map((chain) => (
              <button
                key={chain}
                onClick={() => setFormData({ ...formData, chain: chain as 'base' | 'solana' })}
                className={`
                  px-4 py-1 text-xs font-mono rounded transition-all uppercase
                  ${formData.chain === chain 
                    ? 'bg-accent-glow/20 text-accent-glow shadow-[0_0_10px_rgba(127,255,0,0.2)]' 
                    : 'text-white/40 hover:text-white/80'}
                `}
              >
                {chain}
              </button>
            ))}
          </div>
        </div>

        {/* From Section */}
        <div className="space-y-4 mb-2 relative">
          <div className="bg-black/40 p-4 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-mono text-white/40">INPUT_ASSET</span>
              <span className="text-xs font-mono text-accent-glow">BALANCE: 0.00</span>
            </div>
            <div className="flex gap-4 items-center">
              <Input
                type="text"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="border-none bg-transparent text-2xl p-0 focus:bg-transparent h-auto placeholder:text-white/10"
              />
              <div className="shrink-0">
                <select
                  value={formData.fromToken}
                  onChange={(e) => setFormData({ ...formData, fromToken: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-accent-glow/50"
                >
                  <option value="USDC">USDC</option>
                  <option value="ETH">ETH</option>
                  <option value="WETH">WETH</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Swap Divider */}
        <div className="relative h-8 flex items-center justify-center my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-[1px] bg-white/5" />
          </div>
          <motion.button
            whileHover={{ rotate: 180, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative z-10 w-8 h-8 bg-black border border-accent-glow/30 rounded-full flex items-center justify-center text-accent-glow hover:bg-accent-glow/10 hover:border-accent-glow transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 10L12 15L17 10" />
              <path d="M17 14L12 9L7 14" />
            </svg>
          </motion.button>
        </div>

        {/* To Section */}
        <div className="space-y-4 mb-8">
          <div className="bg-black/40 p-4 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-mono text-white/40">OUTPUT_ASSET</span>
              <span className="text-xs font-mono text-white/40">ESTIMATED</span>
            </div>
            <div className="flex gap-4 items-center">
              <Input
                type="text"
                value={quote || ''}
                readOnly
                placeholder="0.00"
                className="border-none bg-transparent text-2xl p-0 focus:bg-transparent h-auto placeholder:text-white/10 text-white/60"
              />
              <div className="shrink-0">
                <select
                  value={formData.toToken}
                  onChange={(e) => setFormData({ ...formData, toToken: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-accent-glow/50"
                >
                  <option value="ETH">ETH</option>
                  <option value="USDC">USDC</option>
                  <option value="WETH">WETH</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="mb-8 p-4 bg-accent-glow/5 rounded-lg border border-accent-glow/10 space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-white/40">PROTOCOL_FEE</span>
            <span className="text-accent-glow">{config.fees.swap} USDC</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-white/40">ROUTER</span>
            <span className="text-white/60">{formData.chain === 'base' ? 'COWSWAP_AGGREGATOR' : 'JUPITER_TERMINAL'}</span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleSwap}
          disabled={isLoading || !isConnected || !formData.amount}
          variant="primary"
          glow
          className="w-full h-14 text-lg tracking-widest"
        >
          {isLoading ? 'INITIATING_SWAP...' : isConnected ? 'EXECUTE_SWAP' : 'CONNECT_WALLET'}
        </Button>
      </Card>
    </div>
  );
}
