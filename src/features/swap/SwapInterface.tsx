'use client';

import { SwapForm } from './components/SwapForm';
import { SwapRewards } from './components/SwapRewards';

export function SwapInterface() {
  return (
    <div className="relative min-h-[800px]">
      {/* Vault Background Decoration */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'url(/illustration/vault.png)',
          backgroundSize: 'auto 56%',
          backgroundPosition: '0% 0%',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      <div className="grid lg:grid-cols-[1fr_400px] gap-6 relative z-10 lg:pl-28 xl:pl-32">
        <SwapForm />
        <SwapRewards />
      </div>
    </div>
  );
}
