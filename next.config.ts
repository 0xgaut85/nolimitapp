import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce build time by skipping linting during build (handled by CI)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Experimental optimizations - tree-shake large packages
  experimental: {
    optimizePackageImports: [
      'framer-motion',
      'recharts',
      'lucide-react',
      '@solana/web3.js',
      'viem',
      'wagmi',
    ],
  },
};

export default nextConfig;
