'use client';

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/40 backdrop-blur-sm mt-auto relative z-10">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-glow animate-pulse"></div>
            <p className="text-xs font-mono text-white/40">
              SYSTEM ONLINE // V1.0.0
            </p>
          </div>
          
          <div className="flex gap-6">
            <span className="text-xs font-mono text-white/20">GAS: 12 GWEI</span>
            <span className="text-xs font-mono text-white/20">BLOCK: 19248512</span>
          </div>

          <p className="text-xs font-mono text-white/40">
            © 2025 NOLIMIT FOUNDATION
          </p>
        </div>
      </div>
    </footer>
  );
}


