import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import { AppLayout } from '@/components/layout/AppLayout';
import { PasswordGate } from '@/components/PasswordGate';
import './globals.css';

export const metadata: Metadata = {
  title: 'noLimit Foundation',
  description: 'Enterprise-grade language models with complete freedom. No guardrails, no restrictions. Reliable, uncensored intelligence for developers and enterprises.',
  icons: {
    icon: '/illustration/logox.jpg',
  },
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
