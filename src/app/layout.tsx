import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import { AppLayout } from '@/components/layout/AppLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'noLimit App',
  description: 'A privacy-first AI ecosystem, redefining what AI can and should be.',
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
      <head>
        {/* Force favicon - bypasses Next.js icon conventions */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/illustration/logox.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/illustration/logox.jpg" />
      </head>
      <body className="dark">
        <Providers>
          <AppLayout>
            {children}
          </AppLayout>
        </Providers>
      </body>
    </html>
  );
}
