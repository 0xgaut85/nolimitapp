'use client';

import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { base, solana } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { ReactNode } from 'react';

// Create query client
const queryClient = new QueryClient();

// Project ID from Reown Cloud
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '';

// Create Wagmi adapter for Base (EVM)
const wagmiAdapter = new WagmiAdapter({
  networks: [base],
  projectId,
});

// Create Solana adapter
const solanaAdapter = new SolanaAdapter();

// Only Base and Solana networks
const networks = [base, solana] as const;

// Create App Kit - simple setup with Base and Solana only
createAppKit({
  adapters: [wagmiAdapter, solanaAdapter],
  networks,
  defaultNetwork: base,
  projectId,
  metadata: {
    name: 'noLimit',
    description: 'Private Payment Infrastructure',
    url: 'https://app.nolimit.foundation',
    icons: ['https://nolimit.foundation/illustration/logox.jpg'],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  themeMode: 'dark',
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
