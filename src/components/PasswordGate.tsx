'use client';

import { useState, useEffect, ReactNode } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const CORRECT_PASSWORD = 'test';
const STORAGE_KEY = 'nolimit-app-auth';

interface PasswordGateProps {
  children: ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7fff00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradients - matching main site */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7fff00]/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#2d5a3d]/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo - matching main site nav */}
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Image 
            src="/logo3.svg" 
            alt="NoLimit Logo" 
            width={200} 
            height={200}
            className="mx-auto object-contain"
            priority
          />
        </motion.div>

        {/* Subtitle */}
        <motion.p 
          className="text-white/60 font-mono text-sm text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          [ Private Beta Access ]
        </motion.p>

        {/* Password Form - glass morphism style */}
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-none px-5 py-4 font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-[#7fff00] focus:bg-white/10 transition-all"
              autoFocus
            />
            <div className="absolute inset-0 pointer-events-none border border-transparent hover:border-[#7fff00]/20 transition-colors" />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 font-mono text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02, backgroundColor: '#6ee600' }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-[#7fff00] text-black font-mono font-bold py-4 rounded-none hover:bg-[#6ee600] transition-colors uppercase tracking-wider text-sm"
          >
            Access App
          </motion.button>
        </motion.form>

        {/* Footer */}
        <motion.div 
          className="text-center mt-10 space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-white/40 font-mono text-xs">
            This app is currently in private beta.
          </p>
          
          {/* Social links */}
          <div className="flex justify-center gap-4">
            <a
              href="https://x.com/nolimitFDN"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-[#7fff00] transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
