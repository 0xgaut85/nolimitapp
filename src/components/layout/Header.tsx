'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { WalletButton } from '@/components/WalletButton';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "Agent", href: "/agent" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Swap", href: "/swap" },
    { name: "Docs", href: "/integration" },
  ];

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 bg-black/60 border-b border-white/10 px-4 md:px-8 py-4 md:py-6 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
        <Link href="/">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3"
          >
            <Image 
              src="/logo3.svg" 
              alt="no limit Logo" 
              width={180} 
              height={40}
              className="object-contain w-[120px] md:w-[180px]"
            />
          </motion.div>
        </Link>
        
        <nav className="hidden md:flex gap-8 font-mono text-sm text-white">
          {navItems.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={item.href}
                className={`hover:text-[#b8d1b3] transition-colors bracket-text ${pathname === item.href ? 'text-[#b8d1b3]' : ''}`}
              >
                {item.name}
              </Link>
            </motion.div>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Beta Access Button - Hidden on small screens if needed */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const tweet = "Been waiting for an AI model that doesn't hold back. @nolimitFDN I want early access to the most powerful uncensored LLM, let me in!";
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank');
            }}
            className="hidden lg:block bg-white/10 backdrop-blur-sm text-white px-4 py-2 font-mono text-xs font-bold hover:bg-white/20 transition-colors whitespace-nowrap border border-white/20"
          >
            Request Beta Access
          </motion.button>

          <WalletButton />

          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden border-t border-white/10 mt-4 pt-4"
        >
          <nav className="flex flex-col gap-4 font-mono text-sm text-white">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`hover:text-[#b8d1b3] transition-colors bracket-text ${pathname === item.href ? 'text-[#b8d1b3]' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}
