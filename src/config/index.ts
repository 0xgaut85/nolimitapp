// Application configuration constants

export const config = {
  // x402 Server
  x402ServerUrl: process.env.NEXT_PUBLIC_X402_SERVER_URL || 'http://localhost:4000',
  
  // Fees
  fees: {
    agent: '0.05', // USDC
    swap: '0.10', // USDC
  },
  
  // Networks
  networks: {
    base: {
      id: 8453,
      name: 'Base',
      rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
    },
    solana: {
      name: 'Solana',
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    },
  },
  
  // Features
  features: {
    agentEnabled: true,
    swapEnabled: true,
    dashboardEnabled: true,
  },
} as const;



