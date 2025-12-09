'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const HeroAurora = dynamic(() => import('@/components/HeroAurora'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-white" />,
});

const CORRECT_PASSWORD = '556B1DA9';
const STORAGE_KEY = 'nolimit-download-auth';

export default function DownloadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
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
      setError('Access denied');
      setPassword('');
    }
  };

  const handleDownload = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = '/downloads/noLimitApp.exe';
    link.download = 'noLimitApp.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => setDownloadStarted(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2d5a3d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden font-mono">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <HeroAurora />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {!isAuthenticated ? (
            /* Password Gate */
            <motion.div
              key="gate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md">
                <motion.div 
                  className="text-center mb-10"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Image 
                    src="/logoblack.svg" 
                    alt="noLimit" 
                    width={180} 
                    height={180}
                    className="mx-auto object-contain mb-8"
                    priority
                  />
                  <h1 className="text-2xl text-black mb-2 tracking-wide font-bold">
                    <span className="text-[#2d5a3d]">[</span>noLimit App<span className="text-[#2d5a3d]">]</span>
                  </h1>
                </motion.div>

                <motion.form 
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-6"
                >
                  <div className="relative group">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="ENTER ACCESS CODE"
                      className="w-full bg-white/40 backdrop-blur-md border border-black/10 px-6 py-4 text-black text-center tracking-[0.2em] placeholder:text-black/40 placeholder:tracking-normal focus:outline-none focus:border-[#2d5a3d]/50 transition-all uppercase rounded-sm"
                      autoFocus
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-red-600 text-sm text-center font-bold"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-[#2d5a3d] text-white font-bold py-4 hover:bg-[#234730] transition-colors uppercase tracking-wider text-sm rounded-sm"
                  >
                    Authenticate
                  </motion.button>
                </motion.form>
              </div>
            </motion.div>
          ) : (
            /* Download Page */
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col"
            >
              <header className="px-6 py-6 flex justify-between items-center backdrop-blur-sm bg-white/20 border-b border-black/5">
                <Image src="/logoblack.svg" alt="noLimit" width={120} height={34} className="object-contain" />
                <div className="flex items-center gap-2 text-[#2d5a3d] text-xs uppercase tracking-wider font-bold">
                  <span className="w-1.5 h-1.5 bg-[#2d5a3d] rounded-full animate-pulse" />
                  Connected
                </div>
              </header>

              <main className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-4xl w-full">
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h1 className="text-4xl md:text-5xl font-bold text-black mb-6 leading-tight">
                        Private AI <br />
                        <span className="text-[#2d5a3d]">On Your Device</span>
                      </h1>
                      <p className="text-black/70 text-lg mb-8 leading-relaxed font-medium">
                        Run advanced LLMs locally with complete privacy. No data leaves your machine. Optimized for Windows 10/11.
                      </p>
                      
                      <div className="space-y-4 mb-8 text-sm text-black/60 font-medium">
                        <div className="flex items-center gap-3">
                          <span className="w-1 h-1 bg-[#2d5a3d]" />
                          <span>Local Inference Engine</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="w-1 h-1 bg-[#2d5a3d]" />
                          <span>Zero Data Retention</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="w-1 h-1 bg-[#2d5a3d]" />
                          <span>Offline Capabilities</span>
                        </div>
                      </div>

                      <motion.button
                        onClick={handleDownload}
                        disabled={downloadStarted}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group relative px-8 py-4 bg-[#2d5a3d] text-white font-bold uppercase tracking-wider transition-all w-full md:w-auto rounded-sm shadow-lg shadow-[#2d5a3d]/20 ${
                          downloadStarted ? 'opacity-70 cursor-wait' : 'hover:bg-[#234730]'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-3">
                          {downloadStarted ? 'Downloading...' : 'Download for Windows'}
                          {!downloadStarted && (
                            <svg className="w-4 h-4 transition-transform group-hover:translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          )}
                        </span>
                      </motion.button>
                      <p className="mt-4 text-xs text-black/40 font-medium">
                        v1.0.0 • Windows 10/11 (64-bit)
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="relative hidden md:block"
                    >
                      <div className="relative z-10 bg-white/30 backdrop-blur-xl border border-white/40 rounded-lg p-1 shadow-2xl shadow-black/5">
                        <div className="aspect-[4/3] bg-white/50 rounded overflow-hidden relative">
                           {/* Abstract UI Representation - Light Mode */}
                           <div className="absolute inset-0 flex flex-col p-6">
                              <div className="flex gap-2 mb-8">
                                <div className="w-3 h-3 rounded-full bg-black/10" />
                                <div className="w-3 h-3 rounded-full bg-black/10" />
                                <div className="w-3 h-3 rounded-full bg-black/10" />
                              </div>
                              <div className="space-y-4">
                                <div className="w-3/4 h-2 bg-black/5 rounded" />
                                <div className="w-1/2 h-2 bg-black/5 rounded" />
                                <div className="w-full h-32 bg-white/40 rounded mt-8 border border-white/50 shadow-sm" />
                              </div>
                              <div className="mt-auto flex gap-2">
                                <div className="flex-1 h-10 bg-white/40 rounded border border-white/50 shadow-sm" />
                                <div className="w-10 h-10 bg-[#2d5a3d]/10 rounded border border-[#2d5a3d]/5" />
                              </div>
                           </div>
                           
                           {/* Glow */}
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#2d5a3d]/10 blur-[60px]" />
                        </div>
                      </div>
                      
                      {/* Decorative elements behind */}
                      <div className="absolute -top-4 -right-4 w-24 h-24 border-t border-r border-black/5 rounded-tr-3xl" />
                      <div className="absolute -bottom-4 -left-4 w-24 h-24 border-b border-l border-black/5 rounded-bl-3xl" />
                    </motion.div>
                  </div>
                </div>
              </main>

              <footer className="p-6 text-center">
                <p className="text-black/30 text-xs uppercase tracking-widest font-bold">
                  noLimit Foundation © 2024
                </p>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
