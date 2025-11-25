'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Button } from '@/components/ui/Button';

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-black/40 rounded border border-white/10 font-mono text-sm text-white/80 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <Button
          variant="danger"
          onClick={() => disconnect()}
          className="px-4 py-2"
        >
          [DISCONNECT]
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="primary"
      glow
      onClick={() => open()}
    >
      [CONNECT_WALLET]
    </Button>
  );
}
