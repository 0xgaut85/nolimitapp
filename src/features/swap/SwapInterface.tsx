'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { config } from '@/config';

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
    <div className="max-w-md mx-auto bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-6">
      <h2 className="text-2xl font-mono text-white glow-text mb-6">
        [NoLimit Swap]
      </h2>

      {/* Chain Selector */}
      <div className="mb-6">
        <label className="text-sm text-white/60 font-mono mb-2 block">Network</label>
        <div className="flex gap-2">
          <button
            onClick={() => setFormData({ ...formData, chain: 'base' })}
            className={`flex-1 px-4 py-2 rounded-lg border font-mono transition-all ${
              formData.chain === 'base'
                ? 'bg-accent-glow/20 border-accent-glow/30 text-accent-glow'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            Base
          </button>
          <button
            onClick={() => setFormData({ ...formData, chain: 'solana' })}
            className={`flex-1 px-4 py-2 rounded-lg border font-mono transition-all ${
              formData.chain === 'solana'
                ? 'bg-accent-glow/20 border-accent-glow/30 text-accent-glow'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            Solana
          </button>
        </div>
      </div>

      {/* From Token */}
      <div className="mb-4">
        <label className="text-sm text-white/60 font-mono mb-2 block">From</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.0"
            className="flex-1 px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-accent-glow/50"
          />
          <select
            value={formData.fromToken}
            onChange={(e) => setFormData({ ...formData, fromToken: e.target.value })}
            className="px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-accent-glow/50"
          >
            <option value="USDC">USDC</option>
            <option value="ETH">ETH</option>
            <option value="WETH">WETH</option>
          </select>
        </div>
      </div>

      {/* Swap Icon */}
      <div className="flex justify-center my-4">
        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-accent-glow"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </div>
      </div>

      {/* To Token */}
      <div className="mb-6">
        <label className="text-sm text-white/60 font-mono mb-2 block">To</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={quote || '~0.0'}
            readOnly
            placeholder="~0.0"
            className="flex-1 px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white/60 font-mono"
          />
          <select
            value={formData.toToken}
            onChange={(e) => setFormData({ ...formData, toToken: e.target.value })}
            className="px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-accent-glow/50"
          >
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>
            <option value="WETH">WETH</option>
          </select>
        </div>
      </div>

      {/* Fee Info */}
      <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
        <p className="text-xs text-white/60 font-mono">
          Swap Fee: {config.fees.swap} USDC
        </p>
        <p className="text-xs text-white/40 font-mono mt-1">
          Powered by {formData.chain === 'base' ? 'CowSwap' : 'Jupiter'}
        </p>
      </div>

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={isLoading || !isConnected || !formData.amount}
        className="w-full px-6 py-4 bg-accent-glow/20 hover:bg-accent-glow/30 rounded-lg border border-accent-glow/30 text-accent-glow font-mono transition-all disabled:opacity-50 disabled:cursor-not-allowed glow-text"
      >
        {isLoading ? 'Processing...' : isConnected ? 'Swap' : 'Connect Wallet'}
      </button>
    </div>
  );
}

