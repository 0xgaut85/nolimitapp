import { SwapInterface } from '@/features/swap/SwapInterface';

export default function SwapPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-mono text-white glow-text mb-4">
          [NoLimit Swap]
        </h1>
        <p className="text-white/60 font-mono">
          Private token swaps on Base and Solana. Powered by CowSwap and Jupiter.
        </p>
      </div>
      <SwapInterface />
    </div>
  );
}

