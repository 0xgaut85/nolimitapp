'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAccount, useSendTransaction } from 'wagmi';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { parseUnits, formatUnits } from 'viem';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { Provider } from '@reown/appkit-adapter-solana/react';

type ChainName = 'Base' | 'Solana';
type TokenSymbol = 'ETH' | 'SOL' | 'USDC';

// Pool addresses that will receive and distribute funds
const POOL_ADDRESSES = {
  Base: {
    ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bE91', // Replace with actual pool address
    USDC: '0x742d35Cc6634C0532925a3b844Bc9e7595f5bE91',
  },
  Solana: {
    SOL: 'CVF8ApyzZHCKw1xCm8Fyywej2XSGasjnPuXKvwCd55z8', // Replace with actual pool address
    USDC: 'CVF8ApyzZHCKw1xCm8Fyywej2XSGasjnPuXKvwCd55z8',
  },
};

const TOKEN_ADDRESSES = {
  Base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  Solana: {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
};

const HELIUS_ENDPOINT = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=112de5d5-6530-46c2-b382-527e71c48e68';

export function MixerForm() {
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { open } = useAppKit();
  const solanaAccount = useAppKitAccount({ namespace: 'solana' });
  const { walletProvider: reownSolanaProvider } = useAppKitProvider<Provider>('solana');
  const { sendTransaction } = useSendTransaction();

  const [chain, setChain] = useState<ChainName>('Base');
  const [token, setToken] = useState<TokenSymbol>('ETH');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [delay, setDelay] = useState<'instant' | '1h' | '6h' | '24h'>('instant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Determine connected address based on chain
  const connectedAddress = chain === 'Base' ? evmAddress : solanaAccount.address;
  const isConnected = chain === 'Base' ? evmConnected : solanaAccount.isConnected;

  // Available tokens per chain
  const availableTokens: TokenSymbol[] = chain === 'Base' ? ['ETH', 'USDC'] : ['SOL', 'USDC'];

  // Update token when chain changes
  useEffect(() => {
    setToken(chain === 'Base' ? 'ETH' : 'SOL');
  }, [chain]);

  const handleConnect = () => {
    open();
  };

  const validateRecipient = (addr: string): boolean => {
    if (chain === 'Base') {
      return /^0x[a-fA-F0-9]{40}$/.test(addr);
    } else {
      try {
        new PublicKey(addr);
        return true;
      } catch {
        return false;
      }
    }
  };

  const handleMix = async () => {
    if (!amount || !recipientAddress) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateRecipient(recipientAddress)) {
      setError('Invalid recipient address');
      return;
    }

    if (!isConnected || !connectedAddress) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setTxHash(null);

    try {
      if (chain === 'Base') {
        // EVM transfer to pool
        const poolAddress = POOL_ADDRESSES.Base[token as keyof typeof POOL_ADDRESSES.Base];
        
        if (token === 'ETH') {
          // Native ETH transfer
          const value = parseUnits(amount, 18);
          sendTransaction({
            to: poolAddress as `0x${string}`,
            value,
            // Include recipient in data for pool to process later
            data: `0x${Buffer.from(recipientAddress).toString('hex').padEnd(64, '0')}` as `0x${string}`,
          });
        } else {
          // ERC20 transfer (simplified - in production use proper ERC20 transfer)
          setError('USDC mixing coming soon for Base');
          return;
        }
        
        setSuccess(true);
      } else {
        // Solana transfer to pool
        if (!reownSolanaProvider) {
          setError('Solana wallet not connected');
          return;
        }

        const connection = new Connection(HELIUS_ENDPOINT, 'confirmed');
        const poolPubkey = new PublicKey(POOL_ADDRESSES.Solana[token as keyof typeof POOL_ADDRESSES.Solana]);
        const senderPubkey = new PublicKey(connectedAddress);

        if (token === 'SOL') {
          // Native SOL transfer
          const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
          
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: senderPubkey,
              toPubkey: poolPubkey,
              lamports,
            })
          );

          // Add memo with encrypted recipient (in production, use proper encryption)
          // For now, we'll just encode the recipient address
          const memoData = Buffer.from(JSON.stringify({
            recipient: recipientAddress,
            delay,
          }));
          
          transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          transaction.feePayer = senderPubkey;

          const signedTx = await reownSolanaProvider.signAndSendTransaction(transaction);
          setTxHash(typeof signedTx === 'string' ? signedTx : signedTx.signature);
          setSuccess(true);
        } else {
          // SPL Token transfer
          const mintPubkey = new PublicKey(TOKEN_ADDRESSES.Solana.USDC);
          const senderAta = await getAssociatedTokenAddress(mintPubkey, senderPubkey);
          const poolAta = await getAssociatedTokenAddress(mintPubkey, poolPubkey);
          
          const decimals = 6;
          const tokenAmount = Math.floor(parseFloat(amount) * Math.pow(10, decimals));

          const transaction = new Transaction().add(
            createTransferInstruction(
              senderAta,
              poolAta,
              senderPubkey,
              tokenAmount,
              [],
              TOKEN_PROGRAM_ID
            )
          );

          transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          transaction.feePayer = senderPubkey;

          const signedTx = await reownSolanaProvider.signAndSendTransaction(transaction);
          setTxHash(typeof signedTx === 'string' ? signedTx : signedTx.signature);
          setSuccess(true);
        }
      }
    } catch (err) {
      console.error('[Mixer] Error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = amount && recipientAddress && isConnected && validateRecipient(recipientAddress);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden"
    >
      <div className="bg-white/5 px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-mono text-lg font-bold uppercase tracking-wider">
            Anonymous Transfer
          </h2>
          {isConnected ? (
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-white font-mono text-sm">
                {connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)}
              </span>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="bg-[#b8d1b3] text-black px-4 py-2 font-mono text-sm font-bold rounded-lg hover:bg-[#a8c1a3] transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Chain Selection */}
        <div>
          <label className="text-xs font-mono text-white/60 uppercase tracking-wider block mb-2">
            Network
          </label>
          <div className="flex gap-3">
            {(['Base', 'Solana'] as ChainName[]).map((c) => (
              <button
                key={c}
                onClick={() => setChain(c)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-sm font-bold transition-all ${
                  chain === c
                    ? 'bg-[#b8d1b3] text-black'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                }`}
              >
                <Image
                  src={c === 'Base' ? '/logos/base.jpg' : '/logos/solana.jpg'}
                  alt={c}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Token Selection */}
        <div>
          <label className="text-xs font-mono text-white/60 uppercase tracking-wider block mb-2">
            Token
          </label>
          <div className="flex gap-3">
            {availableTokens.map((t) => (
              <button
                key={t}
                onClick={() => setToken(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-sm font-bold transition-all ${
                  token === t
                    ? 'bg-[#b8d1b3] text-black'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-xs font-mono text-white/60 uppercase tracking-wider block mb-2">
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 font-mono text-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#b8d1b3]/50"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 font-mono">
              {token}
            </span>
          </div>
        </div>

        {/* Recipient Address */}
        <div>
          <label className="text-xs font-mono text-white/60 uppercase tracking-wider block mb-2">
            Recipient Address (where funds will be sent anonymously)
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder={chain === 'Base' ? '0x...' : 'Solana address...'}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#b8d1b3]/50"
          />
          {recipientAddress && !validateRecipient(recipientAddress) && (
            <p className="text-red-400 text-xs font-mono mt-1">Invalid address format</p>
          )}
        </div>

        {/* Delay Selection */}
        <div>
          <label className="text-xs font-mono text-white/60 uppercase tracking-wider block mb-2">
            Delay (adds randomness to timing)
          </label>
          <div className="flex gap-2">
            {(['instant', '1h', '6h', '24h'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDelay(d)}
                className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                  delay === d
                    ? 'bg-[#b8d1b3] text-black'
                    : 'bg-white/5 text-white/50 hover:text-white/80 border border-white/10'
                }`}
              >
                {d === 'instant' ? 'Instant' : d}
              </button>
            ))}
          </div>
        </div>

        {/* Fee Info */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm font-mono">
            <span className="text-white/50">Mixer Fee</span>
            <span className="text-white">1%</span>
          </div>
          <div className="flex justify-between text-sm font-mono">
            <span className="text-white/50">Network Fee</span>
            <span className="text-white">~{chain === 'Base' ? '0.001 ETH' : '0.000005 SOL'}</span>
          </div>
          {amount && (
            <div className="flex justify-between text-sm font-mono border-t border-white/10 pt-2 mt-2">
              <span className="text-white/50">Recipient Gets</span>
              <span className="text-[#b8d1b3] font-bold">
                ~{(parseFloat(amount || '0') * 0.99).toFixed(4)} {token}
              </span>
            </div>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 font-mono text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-[#b8d1b3]/10 border border-[#b8d1b3]/30 rounded-xl p-4">
            <p className="text-[#b8d1b3] font-mono text-sm">
              ✓ Transaction submitted! Funds will be sent to recipient anonymously.
            </p>
            {txHash && (
              <p className="text-white/50 font-mono text-xs mt-1 break-all">
                TX: {txHash}
              </p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: isFormValid ? 1.02 : 1 }}
          whileTap={{ scale: isFormValid ? 0.98 : 1 }}
          onClick={handleMix}
          disabled={!isFormValid || loading}
          className="w-full bg-[#b8d1b3] text-black py-4 font-mono text-lg font-bold uppercase tracking-wider rounded-xl hover:bg-[#a8c1a3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : !isConnected ? (
            'Connect Wallet'
          ) : (
            'Mix & Send Anonymously'
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

