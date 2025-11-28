import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import { AppLayout } from '@/components/layout/AppLayout';
import { PasswordGate } from '@/components/PasswordGate';
import './globals.css';

export const metadata: Metadata = {
  title: 'noLimit App',
  description: 'A privacy-first AI ecosystem, redefining what AI can and should be.',
  icons: {
    icon: '/illustration/logox.jpg',
    apple: '/illustration/logox.jpg',
  },
  openGraph: {
    title: 'noLimit App',
    description: 'A privacy-first AI ecosystem, redefining what AI can and should be.',
    images: ['/illustration/logox.jpg'],
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
