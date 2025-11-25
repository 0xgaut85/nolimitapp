'use client';

import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { base } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { ReactNode } from 'react';

// Create query client
const queryClient = new QueryClient();

// Project ID from Reown Cloud
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '';

// Create Wagmi adapter
const wagmiAdapter = new WagmiAdapter({
  networks: [base],
  projectId,
});

// Create App Kit
createAppKit({
  adapters: [wagmiAdapter],
  networks: [base],
  projectId,
  metadata: {
    name: 'NoLimit',
    description: 'Private Payment Infrastructure for DeFi',
    url: 'https://nolimit.foundation',
    icons: ['https://nolimit.foundation/logo.svg'],
  },
  features: {
    analytics: false,
  },
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

