'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useBalance, useReadContract, useWalletClient } from 'wagmi';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { parseUnits, formatUnits, parseEther, erc20Abi, Address } from 'viem';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { wrapFetchWithPayment } from 'x402-fetch';
import { createX402Client, X402Client } from 'x402-solana/client';
import type { Provider } from '@reown/appkit-adapter-solana/react';
import { config } from '@/config';

type ChainName = 'Base' | 'Solana';
type TokenSymbol = 'ETH' | 'SOL' | 'USDC' | 'USDT';
type MixStatus = 'idle' | 'creating' | 'awaiting_deposit' | 'depositing' | 'mixing' | 'completed' | 'failed';

const TOKEN_ADDRESSES = {
  Base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  },
  Solana: {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  },
};

const HELIUS_ENDPOINT = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=112de5d5-6530-46c2-b382-527e71c48e68';
const API_BASE = config.x402ServerUrl;

interface MixResponse {
  success: boolean;
  mixId: string;
  depositAddress: string;
  depositAmount: string;
  fee: string;
  outputAmount: string;
  message: string;
}

interface MixStatusResponse {
  status: string;
  progress: number;
  currentHop: number;
  totalHops: number;
  completedAt?: string;
  error?: string;
}

const BASE_CHAIN_ID = 8453;

export function MixerForm() {
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { open } = useAppKit();
  const solanaAccount = useAppKitAccount({ namespace: 'solana' });
  const { walletProvider: reownSolanaProvider } = useAppKitProvider<Provider>('solana');
  const { sendTransaction, data: txData, isPending: isSending } = useSendTransaction();
  const { isSuccess: txConfirmed, data: txReceipt } = useWaitForTransactionReceipt({ hash: txData });

  const [chain, setChain] = useState<ChainName>('Base');
  const [token, setToken] = useState<TokenSymbol>('ETH');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [delay, setDelay] = useState<'instant' | '1h' | '6h' | '24h'>('instant');
  const [error, setError] = useState<string | null>(null);

  // Balance states
  const [solanaBalance, setSolanaBalance] = useState('0.0000');
  const [solanaUsdcBalance, setSolanaUsdcBalance] = useState('0.0000');
  const [solanaUsdtBalance, setSolanaUsdtBalance] = useState('0.0000');

  // Base balances
  const { data: baseEthBalance } = useBalance({
    address: evmAddress,
    chainId: BASE_CHAIN_ID,
    query: { enabled: Boolean(evmAddress) },
  });

  const { data: baseUsdcRaw } = useReadContract({
    abi: erc20Abi,
    address: TOKEN_ADDRESSES.Base.USDC as Address,
    functionName: 'balanceOf',
    args: evmAddress ? [evmAddress] : undefined,
    chainId: BASE_CHAIN_ID,
    query: { enabled: Boolean(evmAddress && TOKEN_ADDRESSES.Base.USDC) },
  });

  const { data: baseUsdtRaw } = useReadContract({
    abi: erc20Abi,
    address: TOKEN_ADDRESSES.Base.USDT as Address,
    functionName: 'balanceOf',
    args: evmAddress ? [evmAddress] : undefined,
    chainId: BASE_CHAIN_ID,
    query: { enabled: Boolean(evmAddress && TOKEN_ADDRESSES.Base.USDT) },
  });

  // Fetch Solana balances
  const fetchSolanaBalances = useCallback(async (publicKey: PublicKey) => {
    try {
      const connection = new Connection(HELIUS_ENDPOINT, 'confirmed');
      const lamports = await connection.getBalance(publicKey);
      setSolanaBalance((lamports / LAMPORTS_PER_SOL).toFixed(4));

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      });

      let usdc = '0.0000';
      let usdt = '0.0000';
      tokenAccounts.value.forEach((account: any) => {
        const mint = account.account.data.parsed.info.mint;
        const uiAmount = account.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
        if (mint === TOKEN_ADDRESSES.Solana.USDC) {
          usdc = uiAmount.toFixed(4);
        }
        if (mint === TOKEN_ADDRESSES.Solana.USDT) {
          usdt = uiAmount.toFixed(4);
        }
      });
      setSolanaUsdcBalance(usdc);
      setSolanaUsdtBalance(usdt);
    } catch (err) {
      console.error('[Mixer] Failed to fetch Solana balances:', err);
    }
  }, []);

  // Fetch Solana balances on connect
  useEffect(() => {
    if (solanaAccount.isConnected && solanaAccount.address) {
      fetchSolanaBalances(new PublicKey(solanaAccount.address));
    }
  }, [solanaAccount.isConnected, solanaAccount.address, fetchSolanaBalances]);

  // Get current balance for selected token
  const getCurrentBalance = useCallback(() => {
    if (chain === 'Base') {
      if (token === 'ETH') {
        return baseEthBalance ? formatUnits(baseEthBalance.value, 18) : '0.0000';
      } else if (token === 'USDC') {
        return baseUsdcRaw ? formatUnits(baseUsdcRaw as bigint, 6) : '0.0000';
      } else if (token === 'USDT') {
        return baseUsdtRaw ? formatUnits(baseUsdtRaw as bigint, 6) : '0.0000';
      }
    } else {
      if (token === 'SOL') {
        return solanaBalance;
      } else if (token === 'USDC') {
        return solanaUsdcBalance;
      } else if (token === 'USDT') {
        return solanaUsdtBalance;
      }
    }
    return '0.0000';
  }, [chain, token, baseEthBalance, baseUsdcRaw, baseUsdtRaw, solanaBalance, solanaUsdcBalance, solanaUsdtBalance]);

  // x402 wallet client for Base
  const { data: walletClient } = useWalletClient();

  // x402-fetch for Base (EVM) payments
  const fetchWithPayment = useMemo(() => {
    if (!walletClient) return null;
    try {
      return wrapFetchWithPayment(
        fetch,
        walletClient as any,
        BigInt(1 * 10 ** 6), // Allow up to 1 USDC per mixer call
      );
    } catch (error) {
      console.error('[Mixer] Failed to initialize x402 payment client', error);
      return null;
    }
  }, [walletClient]);

  // x402-solana client for Solana payments
  const solanaX402Client = useMemo((): X402Client | null => {
    if (solanaAccount.isConnected && solanaAccount.address && reownSolanaProvider) {
      try {
        const walletAdapter = {
          address: solanaAccount.address,
          signTransaction: async (tx: VersionedTransaction): Promise<VersionedTransaction> => {
            const signedTx = await reownSolanaProvider.signTransaction(tx);
            return signedTx as VersionedTransaction;
          },
        };
        
        return createX402Client({
          wallet: walletAdapter,
          network: 'solana',
          rpcUrl: HELIUS_ENDPOINT,
          maxPaymentAmount: BigInt(1 * 10 ** 6), // max 1 USDC per mixer
        });
      } catch (error) {
        console.error('[Mixer] Failed to initialize x402-solana:', error);
      }
    }
    return null;
  }, [solanaAccount.isConnected, solanaAccount.address, reownSolanaProvider]);
  
  // Mix state
  const [mixStatus, setMixStatus] = useState<MixStatus>('idle');
  const [mixId, setMixId] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mixProgress, setMixProgress] = useState(0);

  // Determine connected address based on chain
  const connectedAddress = chain === 'Base' ? evmAddress : solanaAccount.address;
  const isConnected = chain === 'Base' ? evmConnected : solanaAccount.isConnected;

  // Available tokens per chain
  const availableTokens: TokenSymbol[] = chain === 'Base' ? ['ETH', 'USDC', 'USDT'] : ['SOL', 'USDC', 'USDT'];

  // Convert delay to minutes
  const delayMinutes = {
    'instant': 0,
    '1h': 60,
    '6h': 360,
    '24h': 1440,
  }[delay];

  // Update token when chain changes
  useEffect(() => {
    setToken(chain === 'Base' ? 'ETH' : 'SOL');
  }, [chain]);

  // Confirm deposit when Base tx is confirmed
  useEffect(() => {
    if (txConfirmed && mixId && txData && mixStatus === 'depositing') {
      confirmMixDeposit(mixId, txData);
    }
  }, [txConfirmed, mixId, txData, mixStatus]);

  // Poll for mix status
  useEffect(() => {
    if (!mixId || mixStatus === 'idle' || mixStatus === 'completed' || mixStatus === 'failed') {
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/mixer/status/${mixId}`);
        if (response.ok) {
          const data: MixStatusResponse = await response.json();
          setMixProgress(data.progress);
          
          if (data.status === 'completed') {
            setMixStatus('completed');
          } else if (data.status === 'failed') {
            setMixStatus('failed');
            setError(data.error || 'Mixing failed');
          } else if (data.status === 'deposited' || data.status === 'mixing') {
            setMixStatus('mixing');
          }
        }
      } catch (err) {
        console.error('[Mixer] Status poll error:', err);
      }
    };

    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [mixId, mixStatus]);

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

  const confirmMixDeposit = async (id: string, hash: string) => {
    try {
      const response = await fetch(`${API_BASE}/mixer/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mixId: id, txHash: hash }),
      });

      if (response.ok) {
        setMixStatus('mixing');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to confirm deposit');
        setMixStatus('failed');
      }
    } catch (err) {
      console.error('[Mixer] Confirm error:', err);
      setError('Failed to confirm deposit');
      setMixStatus('failed');
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

    // Validate x402 payment client
    if (chain === 'Base' && !fetchWithPayment) {
      setError('Connect your Base wallet to pay the mixer fee');
      return;
    }
    if (chain === 'Solana' && !solanaX402Client) {
      setError('Connect your Solana wallet to pay the mixer fee');
      return;
    }

    setError(null);
    setMixStatus('creating');
    setMixId(null);
    setDepositAddress(null);
    setTxHash(null);
    setMixProgress(0);

    try {
      // Step 1: Create mix request via x402 endpoint (pays $0.075 fee)
      const apiPath = chain === 'Solana' 
        ? `${API_BASE}/noLimitMixer/solana`
        : `${API_BASE}/noLimitMixer`;
      
      const requestBody = JSON.stringify({
        token,
        amount,
        recipientAddress,
        userAddress: connectedAddress,
      });

      let createResponse: Response;
      
      if (chain === 'Solana' && solanaX402Client) {
        createResponse = await solanaX402Client.fetch(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });
      } else if (fetchWithPayment) {
        createResponse = await fetchWithPayment(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });
      } else {
        throw new Error('No payment client available');
      }

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || 'Failed to create mix request');
      }

      const mixData: MixResponse = await createResponse.json();
      setMixId(mixData.mixId);
      setDepositAddress(mixData.depositAddress);
      setMixStatus('awaiting_deposit');

      // Step 2: Send deposit transaction
      setMixStatus('depositing');

      if (chain === 'Base') {
        // EVM transfer to pool
        if (token === 'ETH') {
          sendTransaction({
            to: mixData.depositAddress as `0x${string}`,
            value: parseEther(amount),
          });
        } else {
          // ERC20 transfer (simplified)
          setError('USDC mixing coming soon for Base');
          setMixStatus('failed');
          return;
        }
      } else {
        // Solana transfer to pool
        if (!reownSolanaProvider) {
          setError('Solana wallet not connected');
          setMixStatus('failed');
          return;
        }

        const connection = new Connection(HELIUS_ENDPOINT, 'confirmed');
        const poolPubkey = new PublicKey(mixData.depositAddress);
        const senderPubkey = new PublicKey(connectedAddress);

        if (token === 'SOL') {
          const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
          
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: senderPubkey,
              toPubkey: poolPubkey,
              lamports,
            })
          );

          transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          transaction.feePayer = senderPubkey;

          const signedTx = await reownSolanaProvider.signAndSendTransaction(transaction);
          const solTxHash = typeof signedTx === 'string' ? signedTx : signedTx.signature;
          setTxHash(solTxHash);

          // Confirm deposit for Solana
          await confirmMixDeposit(mixData.mixId, solTxHash);
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
          const solTxHash = typeof signedTx === 'string' ? signedTx : signedTx.signature;
          setTxHash(solTxHash);

          // Confirm deposit for Solana
          await confirmMixDeposit(mixData.mixId, solTxHash);
        }
      }
    } catch (err) {
      console.error('[Mixer] Error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setMixStatus('failed');
    }
  };

  const resetForm = () => {
    setMixStatus('idle');
    setMixId(null);
    setDepositAddress(null);
    setTxHash(null);
    setMixProgress(0);
    setError(null);
    setAmount('');
    setRecipientAddress('');
  };

  const isFormValid = amount && recipientAddress && isConnected && validateRecipient(recipientAddress);
  const isLoading = mixStatus !== 'idle' && mixStatus !== 'completed' && mixStatus !== 'failed';

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
        {/* Mixing Progress */}
        {mixStatus !== 'idle' && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-mono text-sm font-bold">
                {mixStatus === 'creating' && '🔄 Creating mix request...'}
                {mixStatus === 'awaiting_deposit' && '⏳ Waiting for deposit...'}
                {mixStatus === 'depositing' && '📤 Sending deposit...'}
                {mixStatus === 'mixing' && '🔀 Mixing in progress...'}
                {mixStatus === 'completed' && '✅ Complete!'}
                {mixStatus === 'failed' && '❌ Failed'}
              </span>
              {mixStatus === 'completed' || mixStatus === 'failed' ? (
                <button
                  onClick={resetForm}
                  className="text-[#b8d1b3] font-mono text-xs hover:underline"
                >
                  New Mix
                </button>
              ) : null}
            </div>
            
            {mixStatus === 'mixing' && (
              <>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${mixProgress}%` }}
                    className="bg-[#b8d1b3] h-2 rounded-full"
                  />
                </div>
                <p className="text-white/50 font-mono text-xs">
                  {mixProgress}% - Funds are being routed through multiple wallets...
                </p>
              </>
            )}

            {mixStatus === 'completed' && (
              <p className="text-[#b8d1b3] font-mono text-sm">
                ✓ Funds have been anonymously sent to the recipient!
              </p>
            )}

            {txHash && (
              <p className="text-white/40 font-mono text-xs break-all">
                Deposit TX: {txHash}
              </p>
            )}
          </div>
        )}

        {/* Form Fields - only show when idle */}
        {mixStatus === 'idle' && (
          <>
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
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-mono text-white/60 uppercase tracking-wider">
                  Amount
                </label>
                <span className="text-xs font-mono text-white/50">
                  Balance: {parseFloat(getCurrentBalance()).toFixed(4)} {token}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 font-mono text-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#b8d1b3]/50"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    onClick={() => setAmount(getCurrentBalance())}
                    className="text-[#b8d1b3] text-xs font-mono font-bold hover:underline"
                  >
                    MAX
                  </button>
                  <span className="text-white/50 font-mono">
                    {token}
                  </span>
                </div>
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
          </>
        )}

        {/* Error Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 font-mono text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        {mixStatus === 'idle' && (
          <motion.button
            whileHover={{ scale: isFormValid ? 1.02 : 1 }}
            whileTap={{ scale: isFormValid ? 0.98 : 1 }}
            onClick={handleMix}
            disabled={!isFormValid || isLoading}
            className="w-full bg-[#b8d1b3] text-black py-4 font-mono text-lg font-bold uppercase tracking-wider rounded-xl hover:bg-[#a8c1a3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {!isConnected ? 'Connect Wallet' : 'Mix & Send Anonymously'}
          </motion.button>
        )}

        {/* How it works */}
        <div className="text-white/40 font-mono text-xs space-y-1 border-t border-white/10 pt-4">
          <p className="text-white/60 font-bold mb-2">Privacy guaranteed:</p>
          <p>• Funds are processed through our privacy layer</p>
          <p>• On-chain trail is broken between sender and recipient</p>
          <p>• No logs, no tracking, complete anonymity</p>
        </div>
      </div>
    </motion.div>
  );
}
