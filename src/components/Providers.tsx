'use client';

import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { base, mainnet, arbitrum, optimism, polygon, solana } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { ReactNode } from 'react';

// Create query client
const queryClient = new QueryClient();

// Project ID from Reown Cloud
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '';

// Create Wagmi adapter for EVM chains
const wagmiAdapter = new WagmiAdapter({
  networks: [base, mainnet, arbitrum, optimism, polygon],
  projectId,
});

// All supported networks including Solana
const networks = [base, solana, mainnet, arbitrum, optimism, polygon];

// Create App Kit with multi-chain support
// Solana is supported natively by Reown without needing @solana/wallet-adapter-wallets
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: base,
  projectId,
  metadata: {
    name: 'NoLimit',
    description: 'Private Payment Infrastructure for DeFi',
    url: 'https://app.nolimit.foundation',
    icons: ['https://nolimit.foundation/logo3.svg'],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
    swaps: false,
    onramp: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#7fff00',
    '--w3m-color-mix': '#7fff00',
    '--w3m-color-mix-strength': 20,
    '--w3m-border-radius-master': '8px',
  },
  allowUnsupportedChain: false,
  enableWalletConnect: true,
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
