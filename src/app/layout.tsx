import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import { AppLayout } from '@/components/layout/AppLayout';
import { PasswordGate } from '@/components/PasswordGate';
import './globals.css';

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
      <body className="dark">
        <Providers>
          <PasswordGate>
            <AppLayout>
              {children}
            </AppLayout>
          </PasswordGate>
        </Providers>
      </body>
    </html>
  );
}
