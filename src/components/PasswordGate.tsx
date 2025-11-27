'use client';

import { useState, useEffect, ReactNode } from 'react';
import { motion } from 'framer-motion';

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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-mono font-bold text-white mb-2">
            <span className="text-[#7fff00]">no</span>limit
          </h1>
          <p className="text-white/60 font-mono text-sm">Private Beta Access</p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-[#7fff00]/50 focus:ring-1 focus:ring-[#7fff00]/50 transition-all"
              autoFocus
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 font-mono text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-[#7fff00] text-black font-mono font-bold py-3 rounded-lg hover:bg-[#6ee600] transition-colors"
          >
            Access App
          </motion.button>
        </form>

        {/* Footer */}
        <p className="text-center text-white/40 font-mono text-xs mt-8">
          This app is currently in private beta.
        </p>
      </motion.div>
    </div>
  );
}

