import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';
import Link from 'next/link';
import { WalletButton } from '@/components/WalletButton';

export const metadata: Metadata = {
  title: 'NoLimit - Private Payment Infrastructure',
  description: 'AI Agent and Swap platform with x402 payments',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen bg-bg-primary">
            {/* Navigation */}
            <nav className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
              <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <Link href="/" className="text-2xl font-mono text-white glow-text">
                      [NoLimit]
                    </Link>
                    <div className="flex gap-4">
                      <Link
                        href="/agent"
                        className="px-4 py-2 text-sm font-mono text-white/80 hover:text-white transition-colors"
                      >
                        AI Agent
                      </Link>
                      <Link
                        href="/dashboard"
                        className="px-4 py-2 text-sm font-mono text-white/80 hover:text-white transition-colors"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/swap"
                        className="px-4 py-2 text-sm font-mono text-white/80 hover:text-white transition-colors"
                      >
                        Swap
                      </Link>
                      <Link
                        href="/integration"
                        className="px-4 py-2 text-sm font-mono text-white/80 hover:text-white transition-colors"
                      >
                        Integration
                      </Link>
                    </div>
                  </div>
                  <WalletButton />
                </div>
              </div>
            </nav>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-12">{children}</main>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm mt-12">
              <div className="container mx-auto px-6 py-8">
                <p className="text-center text-sm text-white/40 font-mono">
                  © 2025 NoLimit. Private Payment Infrastructure for DeFi.
                </p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
