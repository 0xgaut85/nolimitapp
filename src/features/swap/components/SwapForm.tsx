'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';

// Token interface
interface Token {
  symbol: string;
  name: string;
  logo: string;
}

// Chain interface
interface Chain {
  name: string;
  logo: string;
}

export function SwapForm() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  
  // State
  const [fromChain, setFromChain] = useState("Ethereum");
  const [toChain, setToChain] = useState("Ethereum");
  const [fromToken, setFromToken] = useState("ETH");
  const [toToken, setToToken] = useState("USDT");
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [gasSpeed, setGasSpeed] = useState<'slow' | 'fast' | 'instant'>('fast');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mevProtection, setMevProtection] = useState(true);

  // Dropdown states
  const [showFromChain, setShowFromChain] = useState(false);
  const [showToChain, setShowToChain] = useState(false);
  const [showFromToken, setShowFromToken] = useState(false);
  const [showToToken, setShowToToken] = useState(false);

  // Refs for click outside
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFromChain(false);
        setShowToChain(false);
        setShowFromToken(false);
        setShowToToken(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const chains: Chain[] = [
    { name: "Ethereum", logo: "/logos/ethereum.jpg" },
    { name: "Arbitrum", logo: "/logos/arbitrum.jpg" },
    { name: "Optimism", logo: "/logos/optimism.jpg" },
    { name: "BSC", logo: "/logos/BSC.jpg" },
    { name: "Avalanche", logo: "/logos/avalanche.jpg" },
    { name: "Solana", logo: "/logos/solana.jpg" },
    { name: "Base", logo: "/logos/base.jpg" },
  ];

  const tokens: Token[] = [
    { symbol: "ETH", name: "Ethereum", logo: "/logos/ethereum.jpg" },
    { symbol: "SOL", name: "Solana", logo: "/logos/solana.jpg" },
    { symbol: "USDT", name: "Tether", logo: "/logos/usdt.png" },
    { symbol: "USDC", name: "USD Coin", logo: "/logos/usdc.png" },
    { symbol: "WBTC", name: "Wrapped Bitcoin", logo: "/logos/wbtc.jpeg" },
  ];

  const getTokenLogo = (symbol: string) => tokens.find(t => t.symbol === symbol)?.logo || '/illustration/logox.jpg';
  const getChainLogo = (name: string) => chains.find(c => c.name === name)?.logo || '/logos/ethereum.jpg';

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative rounded-3xl overflow-visible"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.005) 100%)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)'
      }}
      ref={dropdownRef}
    >
      {/* Settings Bar */}
      <div className="bg-white/5 backdrop-blur-xl px-6 py-4 border-b border-white/10 rounded-t-3xl">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-mono text-base md:text-lg font-bold uppercase tracking-wider">Exchange Tokens</h2>
            {!isConnected ? (
              <button
                onClick={() => open()}
                className="bg-[#b8d1b3] text-black px-5 py-2 font-mono text-xs md:text-sm font-bold hover:bg-[#a8c1a3] transition-colors whitespace-nowrap rounded-lg"
              >
                Connect Wallet
              </button>
            ) : (
              <button
                onClick={() => disconnect()}
                className="bg-white/10 backdrop-blur-sm text-white px-5 py-2 font-mono text-xs md:text-sm font-bold hover:bg-white/20 transition-colors border border-white/20 whitespace-nowrap rounded-lg"
              >
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </button>
            )}
          </div>

          {/* Settings Row */}
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-white/70 font-mono text-xs uppercase tracking-wider">Slippage</span>
              <div className="flex items-center gap-1.5">
                {['0.1', '0.5', '1.0'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setSlippage(preset)}
                    className={`px-2 py-1 font-mono text-xs rounded-lg transition-colors ${
                      slippage === preset ? 'bg-[#b8d1b3] text-black' : 'bg-black border border-white/20 text-white hover:border-[#b8d1b3]'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
            <div className="h-6 w-px bg-white/10 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-white/70 font-mono text-xs uppercase tracking-wider">Gas</span>
              <div className="flex items-center gap-1.5">
                {(['slow', 'fast', 'instant'] as const).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setGasSpeed(speed)}
                    className={`px-2.5 py-1 font-mono text-xs rounded-lg transition-colors capitalize ${
                      gasSpeed === speed ? 'bg-[#b8d1b3] text-black' : 'bg-black border border-white/20 text-white hover:border-[#b8d1b3]'
                    }`}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-2">
        {/* From Section */}
        <div className="space-y-3 relative z-30">
          <div className="flex justify-between items-center">
            <label className="text-xs font-mono text-white/70 uppercase tracking-wider font-bold">You Pay</label>
            <span className="text-xs font-mono text-white/50">Balance: 0.0000</span>
          </div>

          {/* From Chain Selector */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl relative">
            <label className="text-xs font-mono text-white/50 uppercase tracking-wider block mb-2">From Chain</label>
            <button
              onClick={() => { setShowFromChain(!showFromChain); setShowToChain(false); }}
              className="w-full bg-black border border-white/20 text-white pl-10 pr-8 py-2 font-mono text-sm flex items-center rounded-lg hover:border-white/30 transition-colors"
            >
              <span className="truncate">{fromChain}</span>
              <div className="absolute left-3 top-[38px] w-5 h-5">
                <Image src={getChainLogo(fromChain)} alt={fromChain} width={20} height={20} className="rounded-full" />
              </div>
              <div className="absolute right-3 top-[38px] text-white/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </button>
            
            <AnimatePresence>
              {showFromChain && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-black border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto scrollbar-hide"
                >
                  {chains.map((chain) => (
                    <button
                      key={chain.name}
                      onClick={() => { setFromChain(chain.name); setShowFromChain(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
                    >
                      <Image src={chain.logo} alt={chain.name} width={24} height={24} className="rounded-full" />
                      <span className="font-mono text-sm text-white">{chain.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* From Token Input */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 md:p-6 hover:border-[#b8d1b3]/50 transition-colors rounded-xl relative">
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => { setShowFromToken(!showFromToken); setShowToToken(false); }}
                  className="bg-black border border-white/20 text-white pl-12 pr-8 py-2.5 font-mono font-bold text-base rounded-lg hover:border-[#b8d1b3]/50 transition-colors min-w-[140px] flex items-center"
                >
                  {fromToken}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6">
                    <Image src={getTokenLogo(fromToken)} alt={fromToken} width={24} height={24} className="rounded-full" />
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>

                <AnimatePresence>
                  {showFromToken && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full left-0 mt-2 w-64 bg-black border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto scrollbar-hide"
                    >
                      {tokens.map((token) => (
                        <button
                          key={token.symbol}
                          onClick={() => { setFromToken(token.symbol); setShowFromToken(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
                        >
                          <Image src={token.logo} alt={token.symbol} width={24} height={24} className="rounded-full" />
                          <div>
                            <div className="font-mono text-sm font-bold text-white">{token.symbol}</div>
                            <div className="font-mono text-xs text-white/50">{token.name}</div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <input
                type="text"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-right text-2xl md:text-3xl font-bold focus:outline-none font-mono text-white placeholder:text-white/20"
              />
            </div>
          </div>
        </div>

        {/* Swap Divider */}
        <div className="flex justify-center py-1 relative z-20">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const tempChain = fromChain; setFromChain(toChain); setToChain(tempChain);
              const tempToken = fromToken; setFromToken(toToken); setToToken(tempToken);
            }}
            className="bg-[#b8d1b3] p-2.5 border-4 border-white/10 shadow-lg hover:bg-[#a8c1a3] transition-all duration-300 rounded-xl text-black"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </motion.button>
        </div>

        {/* To Section */}
        <div className="space-y-3 relative z-10">
          <div className="flex justify-between items-center">
            <label className="text-xs font-mono text-white/70 uppercase tracking-wider font-bold">You Receive</label>
            <span className="text-xs font-mono text-white/50">Balance: 0.0000</span>
          </div>

          {/* To Chain Selector */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl relative">
            <label className="text-xs font-mono text-white/50 uppercase tracking-wider block mb-2">To Chain</label>
            <button
              onClick={() => { setShowToChain(!showToChain); setShowFromChain(false); }}
              className="w-full bg-black border border-white/20 text-white pl-10 pr-8 py-2 font-mono text-sm flex items-center rounded-lg hover:border-white/30 transition-colors"
            >
              <span className="truncate">{toChain}</span>
              <div className="absolute left-3 top-[38px] w-5 h-5">
                <Image src={getChainLogo(toChain)} alt={toChain} width={20} height={20} className="rounded-full" />
              </div>
              <div className="absolute right-3 top-[38px] text-white/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </button>
            
            <AnimatePresence>
              {showToChain && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-black border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto scrollbar-hide"
                >
                  {chains.map((chain) => (
                    <button
                      key={chain.name}
                      onClick={() => { setToChain(chain.name); setShowToChain(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
                    >
                      <Image src={chain.logo} alt={chain.name} width={24} height={24} className="rounded-full" />
                      <span className="font-mono text-sm text-white">{chain.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* To Token Input */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 md:p-6 hover:border-[#b8d1b3]/50 transition-colors rounded-xl relative">
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => { setShowToToken(!showToToken); setShowFromToken(false); }}
                  className="bg-black border border-white/20 text-white pl-12 pr-8 py-2.5 font-mono font-bold text-base rounded-lg hover:border-[#b8d1b3]/50 transition-colors min-w-[140px] flex items-center"
                >
                  {toToken}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6">
                    <Image src={getTokenLogo(toToken)} alt={toToken} width={24} height={24} className="rounded-full" />
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>

                <AnimatePresence>
                  {showToToken && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full left-0 mt-2 w-64 bg-black border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto scrollbar-hide"
                    >
                      {tokens.map((token) => (
                        <button
                          key={token.symbol}
                          onClick={() => { setToToken(token.symbol); setShowToToken(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
                        >
                          <Image src={token.logo} alt={token.symbol} width={24} height={24} className="rounded-full" />
                          <div>
                            <div className="font-mono text-sm font-bold text-white">{token.symbol}</div>
                            <div className="font-mono text-xs text-white/50">{token.name}</div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <input
                type="text"
                value={fromAmount ? (parseFloat(fromAmount) * 0.99).toFixed(4) : ''}
                readOnly
                placeholder="0.00"
                className="flex-1 bg-transparent text-right text-2xl md:text-3xl font-bold focus:outline-none font-mono text-white placeholder:text-white/20"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-[#b8d1b3] text-black py-4 md:py-5 font-mono text-base md:text-lg font-bold hover:bg-[#a8c1a3] hover:shadow-lg hover:shadow-[#b8d1b3]/20 transition-all duration-300 uppercase tracking-wider mt-6 rounded-xl"
        >
          {isConnected ? "Execute Swap" : "Connect Wallet"}
        </motion.button>
      </div>
    </motion.div>
  );
}
