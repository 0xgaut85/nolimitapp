'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletButton } from '@/components/WalletButton';
import { motion } from 'framer-motion';

export function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-bg-secondary/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-accent-glow/10 rounded-lg border border-accent-glow/20 flex items-center justify-center group-hover:border-accent-glow/50 transition-all">
            <span className="font-mono text-xl text-accent-glow font-bold">N</span>
          </div>
          <span className="text-2xl font-mono text-white glow-text tracking-tighter">
            NO<span className="text-accent-glow">LIMIT</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <NavLink href="/agent" active={pathname === '/agent'}>AI AGENT</NavLink>
          <NavLink href="/dashboard" active={pathname === '/dashboard'}>DASHBOARD</NavLink>
          <NavLink href="/swap" active={pathname === '/swap'}>SWAP</NavLink>
          <NavLink href="/integration" active={pathname === '/integration'}>DOCS</NavLink>
        </nav>

        <div className="flex items-center gap-4">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
  return (
    <Link 
      href={href} 
      className={`relative font-mono text-sm tracking-wider transition-colors ${
        active ? 'text-accent-glow' : 'text-white/60 hover:text-white'
      }`}
    >
      {active && <span className="mr-1 text-accent-glow/50">[</span>}
      {children}
      {active && <span className="ml-1 text-accent-glow/50">]</span>}
      {active && (
        <motion.div
          layoutId="nav-glow"
          className="absolute -bottom-8 left-0 right-0 h-[1px] bg-accent-glow box-shadow-glow"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </Link>
  );
}

