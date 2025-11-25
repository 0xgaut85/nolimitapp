'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-black/20 rounded-lg border border-white/10">
          <span className="text-sm font-mono text-white/80">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg border border-red-500/30 text-red-300 transition-all"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
      className="px-6 py-3 bg-accent-glow/20 hover:bg-accent-glow/30 rounded-lg border border-accent-glow/30 text-accent-glow font-mono transition-all glow-text"
    >
      Connect Wallet
    </button>
  );
}

