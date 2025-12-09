'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

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
    // Trigger download of the .exe file
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7fff00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#7fff00 1px, transparent 1px), linear-gradient(90deg, #7fff00 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        
        {/* Floating orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#7fff00]/5 rounded-full blur-[120px]"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#2d5a3d]/15 rounded-full blur-[100px]"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-[#b8d1b3]/8 rounded-full blur-[80px]"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          /* Password Gate */
          <motion.div
            key="gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex items-center justify-center p-4 relative z-10"
          >
            <div className="w-full max-w-md">
              {/* Logo */}
              <motion.div 
                className="text-center mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Image 
                  src="/logo3.svg" 
                  alt="noLimit" 
                  width={180} 
                  height={180}
                  className="mx-auto object-contain mb-6"
                  priority
                />
                <h1 className="text-2xl md:text-3xl font-mono text-white mb-2">
                  <span className="text-[#b8d1b3]">[</span>noLimit App<span className="text-[#b8d1b3]">]</span>
                </h1>
                <p className="text-white/50 font-mono text-sm">
                  Private Software Distribution
                </p>
              </motion.div>

              {/* Access Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/[0.02] backdrop-blur-xl border border-white/10 p-8 relative"
              >
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#7fff00]/50" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#7fff00]/50" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#7fff00]/50" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#7fff00]/50" />

                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#7fff00]/10 flex items-center justify-center border border-[#7fff00]/20">
                    <svg className="w-8 h-8 text-[#7fff00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-white/60 font-mono text-sm">
                    Enter access code to continue
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="relative group">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Access Code"
                      className="w-full bg-black/50 border border-white/10 px-5 py-4 font-mono text-white text-center tracking-[0.3em] placeholder:text-white/30 placeholder:tracking-normal focus:outline-none focus:border-[#7fff00]/50 focus:bg-black/70 transition-all uppercase"
                      autoFocus
                    />
                    <div className="absolute inset-0 border border-[#7fff00]/0 group-hover:border-[#7fff00]/20 pointer-events-none transition-colors" />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-red-400 font-mono text-sm text-center"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-[#7fff00] text-black font-mono font-bold py-4 hover:bg-[#6ee600] transition-all uppercase tracking-wider text-sm relative overflow-hidden group"
                  >
                    <span className="relative z-10">Authenticate</span>
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                  </motion.button>
                </form>
              </motion.div>

              {/* Footer */}
              <motion.p 
                className="text-center mt-8 text-white/30 font-mono text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Authorized distribution only
              </motion.p>
            </div>
          </motion.div>
        ) : (
          /* Download Page Content */
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen relative z-10"
          >
            {/* Header */}
            <header className="border-b border-white/10 px-6 py-6 backdrop-blur-xl bg-black/40">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <Image 
                  src="/logo3.svg" 
                  alt="noLimit" 
                  width={140} 
                  height={40}
                  className="object-contain"
                />
                <div className="flex items-center gap-2 text-[#7fff00] font-mono text-sm">
                  <div className="w-2 h-2 bg-[#7fff00] rounded-full animate-pulse" />
                  Access Granted
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-12 md:py-20">
              {/* Hero Section */}
              <div className="text-center mb-16">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-block mb-8"
                >
                  <div className="relative">
                    <div className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-2xl bg-gradient-to-br from-[#7fff00]/20 to-[#2d5a3d]/20 border border-[#7fff00]/30 flex items-center justify-center relative overflow-hidden">
                      {/* App Icon */}
                      <svg className="w-16 h-16 md:w-20 md:h-20 text-[#7fff00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-[#7fff00]/5 animate-pulse" />
                    </div>
                    {/* Decorative corners */}
                    <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#7fff00]" />
                    <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-[#7fff00]" />
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-[#7fff00]" />
                    <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#7fff00]" />
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl md:text-6xl font-mono text-white mb-4"
                >
                  <span className="text-[#b8d1b3]">[</span>noLimit App<span className="text-[#b8d1b3]">]</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg md:text-xl text-white/60 font-mono max-w-2xl mx-auto mb-2"
                >
                  Privacy-First Local LLM Software
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-white/40 font-mono"
                >
                  Windows Desktop Application
                </motion.p>
              </div>

              {/* Download Card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="max-w-2xl mx-auto mb-16"
              >
                <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 p-8 md:p-10 relative">
                  {/* Corner decorations */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#7fff00]/50" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#7fff00]/50" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#7fff00]/50" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#7fff00]/50" />

                  <div className="text-center">
                    <h2 className="text-xl md:text-2xl font-mono text-white mb-6">
                      Download for Windows
                    </h2>

                    <motion.button
                      onClick={handleDownload}
                      disabled={downloadStarted}
                      whileHover={{ scale: downloadStarted ? 1 : 1.02 }}
                      whileTap={{ scale: downloadStarted ? 1 : 0.98 }}
                      className={`w-full md:w-auto px-12 py-5 font-mono font-bold text-lg transition-all relative overflow-hidden group ${
                        downloadStarted
                          ? 'bg-[#7fff00]/50 text-black/70 cursor-wait'
                          : 'bg-[#7fff00] text-black hover:bg-[#6ee600]'
                      }`}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {downloadStarted ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download noLimitApp.exe
                          </>
                        )}
                      </span>
                      {!downloadStarted && (
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                      )}
                    </motion.button>

                    <p className="text-white/40 font-mono text-xs mt-4">
                      v1.0.0 • ~150 MB • Windows 10/11
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Features Grid */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid md:grid-cols-3 gap-6 mb-16"
              >
                <FeatureCard
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                  title="Complete Privacy"
                  description="All processing happens locally on your machine. No data ever leaves your device."
                />
                <FeatureCard
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  }
                  title="Offline Capable"
                  description="Run powerful AI models without an internet connection. Your data stays yours."
                />
                <FeatureCard
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                  title="High Performance"
                  description="Optimized for modern hardware. Fast inference with minimal resource usage."
                />
              </motion.div>

              {/* System Requirements */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="max-w-2xl mx-auto"
              >
                <div className="bg-white/[0.02] border border-white/10 p-6 md:p-8">
                  <h3 className="text-lg font-mono text-white mb-6 flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#b8d1b3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    System Requirements
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm font-mono">
                    <div className="space-y-3">
                      <RequirementRow label="OS" value="Windows 10/11 (64-bit)" />
                      <RequirementRow label="RAM" value="8 GB minimum, 16 GB recommended" />
                      <RequirementRow label="Storage" value="500 MB free space" />
                    </div>
                    <div className="space-y-3">
                      <RequirementRow label="CPU" value="Modern multi-core processor" />
                      <RequirementRow label="GPU" value="Optional (CUDA support)" />
                      <RequirementRow label="Network" value="Not required" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 px-6 py-8 mt-12">
              <div className="max-w-6xl mx-auto text-center">
                <p className="text-white/30 font-mono text-xs">
                  © 2024 noLimit Foundation • Private Distribution
                </p>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/10 p-6 hover:border-[#7fff00]/30 transition-colors group">
      <div className="w-12 h-12 rounded-lg bg-[#7fff00]/10 flex items-center justify-center text-[#7fff00] mb-4 group-hover:bg-[#7fff00]/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-white font-mono font-bold mb-2">{title}</h3>
      <p className="text-white/50 font-mono text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function RequirementRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/50">{label}</span>
      <span className="text-white/80">{value}</span>
    </div>
  );
}

