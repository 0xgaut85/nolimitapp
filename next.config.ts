import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip linting during build (faster builds, lint in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Skip type checking during build (faster builds, check in CI)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Tree-shake large packages for faster builds
  experimental: {
    optimizePackageImports: [
      'framer-motion',
      'recharts', 
      'lucide-react',
      '@solana/web3.js',
      'viem',
      'wagmi',
      'three',
      '@react-three/fiber',
      '@react-three/postprocessing',
    ],
  },
};

export default nextConfig;
