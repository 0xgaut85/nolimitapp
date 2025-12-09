import { Header } from './Header';
import { Footer } from './Footer';
import { Background } from './Background';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Background />
      <Header />
      <main className="flex-1 container mx-auto px-6 pt-32 pb-12 relative z-10">
        {children}
      </main>
      <Footer />
    </div>
  );
}








