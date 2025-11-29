'use client';

import { useAccount, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { useAppKit, useAppKitNetwork, useAppKitAccount, useDisconnect as useAppKitDisconnect } from '@reown/appkit/react';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { disconnect: disconnectWagmi } = useWagmiDisconnect();
  const { disconnect: disconnectAppKit } = useAppKitDisconnect();
  const { caipNetwork } = useAppKitNetwork();
  const appKitAccount = useAppKitAccount();
  const solanaAccount = useAppKitAccount({ namespace: 'solana' });
  
  // Get the connected address (works for both EVM and Solana via Reown)
  const isSolanaActive = caipNetwork?.namespace === 'solana' || 
    (!isConnected && solanaAccount.isConnected);
  
  // Use Reown for both EVM and Solana
  const connectedAddress = isSolanaActive 
    ? solanaAccount.address
    : (appKitAccount.address || address);
  
  const isWalletConnected = Boolean(
    isSolanaActive ? solanaAccount.isConnected : (appKitAccount.isConnected || isConnected)
  );

  // Get network info
  const networkName = caipNetwork?.name || (isSolanaActive ? 'Solana' : 'Base');

  // Get chain logo
  const getChainLogo = () => {
    if (isSolanaActive) return '/logos/solana.jpg';
    if (networkName.toLowerCase().includes('base')) return '/logos/base.jpg';
    if (networkName.toLowerCase().includes('ethereum') || networkName.toLowerCase().includes('mainnet')) return '/logos/ethereum.jpg';
    if (networkName.toLowerCase().includes('arbitrum')) return '/logos/arbitrum.jpg';
    if (networkName.toLowerCase().includes('optimism')) return '/logos/optimism.jpg';
    if (networkName.toLowerCase().includes('polygon')) return '/logos/ethereum.jpg'; // Use ethereum for polygon
    return '/logos/base.jpg';
  };

  const handleDisconnect = async () => {
    // Disconnect Reown Solana
    try {
      await disconnectAppKit({ namespace: 'solana' });
    } catch {
      // ignore
    }
    // Disconnect Reown EVM
    try {
      await disconnectAppKit({ namespace: 'eip155' });
    } catch {
      // ignore
    }
    // Disconnect Wagmi
    try {
      await disconnectWagmi();
    } catch {
      // ignore
    }
  };

  if (isWalletConnected && connectedAddress) {
    return (
      <div className="flex items-center gap-2">
        {/* Network Selector Button */}
        <button
          onClick={() => open({ view: 'Networks' })}
          className="flex items-center gap-2 px-3 py-2 bg-black/40 rounded border border-white/10 hover:border-[#7fff00]/50 transition-colors"
        >
          <Image 
            src={getChainLogo()} 
            alt={networkName} 
            width={20} 
            height={20} 
            className="rounded-full"
          />
          <span className="font-mono text-xs text-white/70 hidden sm:inline">
            {networkName}
          </span>
          <svg className="w-3 h-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Address Display */}
        <button
          onClick={() => open({ view: 'Account' })}
          className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded border border-white/10 hover:border-[#7fff00]/50 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-[#7fff00] animate-pulse" />
          <span className="font-mono text-sm text-white/80">
            {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
          </span>
        </button>

        {/* Disconnect Button */}
        <Button
          variant="danger"
          onClick={handleDisconnect}
          className="px-3 py-2 text-xs"
        >
          ✕
        </Button>
      </div>
    );
  }

  // Single connect button - Reown handles both EVM and Solana
  return (
    <Button
      variant="primary"
      glow
      onClick={() => open()}
      className="text-xs sm:text-sm"
    >
      Connect Wallet
    </Button>
  );
}
