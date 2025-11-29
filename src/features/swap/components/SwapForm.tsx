'use client';

import { useState, useEffect, useRef, useCallback, RefObject, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAccount, useBalance, useDisconnect, useReadContract, useSendTransaction, useWalletClient } from 'wagmi';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Address, erc20Abi, formatUnits, parseUnits } from 'viem';
import { Connection, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { wrapFetchWithPayment } from 'x402-fetch';
import { createX402Client, X402Client } from 'x402-solana/client';
import { config } from '@/config';
import type { Provider } from '@reown/appkit-adapter-solana/react';

type PhantomProvider = {
  publicKey?: PublicKey;
  isPhantom?: boolean;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: 'accountChanged' | 'disconnect', handler: (publicKey: PublicKey | null) => void) => void;
  off?: (event: 'accountChanged' | 'disconnect', handler: (publicKey: PublicKey | null) => void) => void;
  signAndSendTransaction: (transaction: VersionedTransaction) => Promise<{ signature: string }>;
};

declare global {
  interface Window {
    phantom?: { solana?: PhantomProvider };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    solana?: any;
  }
}

type ChainName = 'Base' | 'Solana';
type TokenSymbol = 'ETH' | 'SOL' | 'USDT' | 'USDC';
type DropdownType = 'fromChain' | 'toChain' | 'fromToken' | 'toToken';

interface TokenPrice {
  usd: number;
  change: number;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const HELIUS_ENDPOINT =
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL ??
  'https://mainnet.helius-rpc.com/?api-key=112de5d5-6530-46c2-b382-527e71c48e68';
const BASE_CHAIN_ID = 8453;

// USDC mint address on Solana mainnet (needed for x402 payments)
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Helper to ensure user has a USDC ATA (needed for x402 payments)
async function ensureUsdcAta(
  connection: Connection,
  userPublicKey: PublicKey,
  sendTransaction: (tx: Transaction, connection: Connection) => Promise<string>
): Promise<boolean> {
  try {
    const ata = await getAssociatedTokenAddress(USDC_MINT, userPublicKey);
    
    // Check if ATA exists
    try {
      await getAccount(connection, ata);
      console.log('[Swap] USDC ATA exists:', ata.toBase58());
      return true;
    } catch {
      // ATA doesn't exist, create it
      console.log('[Swap] Creating USDC ATA for user...');
      
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          userPublicKey, // payer
          ata, // associated token account
          userPublicKey, // owner
          USDC_MINT // mint
        )
      );
      
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = userPublicKey;
      
      const signature = await sendTransaction(transaction, connection);
      console.log('[Swap] USDC ATA created:', signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      return true;
    }
  } catch (error) {
    console.error('[Swap] Failed to ensure USDC ATA:', error);
    return false;
  }
}

const chainOptions: { name: ChainName; logo: string }[] = [
  { name: 'Base', logo: '/logos/base.jpg' },
  { name: 'Solana', logo: '/logos/solana.jpg' },
];

const tokenOptions: { symbol: TokenSymbol; name: string }[] = [
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'USDC', name: 'USD Coin' },
];

// Tokens available per chain
const chainTokens: Record<ChainName, TokenSymbol[]> = {
  Base: ['ETH', 'USDC', 'USDT'],
  Solana: ['SOL', 'USDC', 'USDT'],
};

const tokenLogos: Record<TokenSymbol, string> = {
  ETH: '/logos/ethereum.jpg',
  SOL: '/logos/solana.jpg',
  USDT: '/logos/usdt.png',
  USDC: '/logos/usdc.png',
};

const chainToNativeToken: Record<ChainName, TokenSymbol> = {
  Base: 'ETH',
  Solana: 'SOL',
};

const tokenAddresses: Record<ChainName, Partial<Record<TokenSymbol, string>>> = {
  Base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', // USDT on Base
  },
  Solana: {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  },
};

const getChainLogo = (chain: ChainName) =>
  chainOptions.find((option) => option.name === chain)?.logo ?? '/logos/base.jpg';

export function SwapForm() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  
  // Native Solana wallet adapter (best x402 compatibility)
  const { publicKey: solanaPublicKey, signTransaction: signSolanaTransaction, sendTransaction: sendSolanaTransaction, connected: solanaAdapterConnected } = useWallet();
  
  // Reown hooks for Solana wallet (fallback)
  const solanaAccount = useAppKitAccount({ namespace: 'solana' });
  const { walletProvider: reownSolanaProvider } = useAppKitProvider<Provider>('solana');

  const [fromChain, setFromChain] = useState<ChainName>('Base');
  const [fromToken, setFromToken] = useState<TokenSymbol>('ETH');
  const [toToken, setToToken] = useState<TokenSymbol>('USDT');
  
  // toChain is always locked to fromChain (no crosschain)
  const toChain = fromChain;
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [gasSpeed, setGasSpeed] = useState<'slow' | 'fast' | 'instant'>('fast');
  const [mevProtection, setMevProtection] = useState(true);
  const [sendToDifferentWallet, setSendToDifferentWallet] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokenPrices, setTokenPrices] = useState<Partial<Record<TokenSymbol, TokenPrice>>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [nlEarned, setNlEarned] = useState<string | null>(null);

  const [phantomProvider, setPhantomProvider] = useState<PhantomProvider | null>(null);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [solanaBalance, setSolanaBalance] = useState('0.0000');
  const [solanaUsdcBalance, setSolanaUsdcBalance] = useState('0.0000');
  const [solanaUsdtBalance, setSolanaUsdtBalance] = useState('0.0000');

  const [showFromChainDropdown, setShowFromChainDropdown] = useState(false);
  const [showToChainDropdown, setShowToChainDropdown] = useState(false);
  const [showFromTokenDropdown, setShowFromTokenDropdown] = useState(false);
  const [showToTokenDropdown, setShowToTokenDropdown] = useState(false);
  const [dropdownPositions, setDropdownPositions] = useState<Partial<Record<DropdownType, DropdownPosition>>>({});
  const [mounted, setMounted] = useState(false);

  const fromChainButtonRef = useRef<HTMLButtonElement>(null);
  const toChainButtonRef = useRef<HTMLButtonElement>(null);
  const fromTokenButtonRef = useRef<HTMLButtonElement>(null);
  const toTokenButtonRef = useRef<HTMLButtonElement>(null);

  const { data: baseNativeBalance } = useBalance({
    address,
    chainId: BASE_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const { data: baseUsdcRaw } = useReadContract({
    abi: erc20Abi,
    address: tokenAddresses.Base.USDC as Address,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: BASE_CHAIN_ID,
    query: { enabled: Boolean(address && tokenAddresses.Base.USDC) },
  });

  const getPhantom = useCallback((): PhantomProvider | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    if (window.phantom?.solana?.isPhantom) {
      return window.phantom.solana;
    }
    if (window.solana?.isPhantom) {
      return window.solana;
    }
    return null;
  }, []);

  const fetchSolanaBalances = useCallback(async (publicKey: PublicKey) => {
    try {
      const connection = new Connection(HELIUS_ENDPOINT, 'confirmed');
      const lamports = await connection.getBalance(publicKey);
      setSolanaBalance((lamports / LAMPORTS_PER_SOL).toFixed(4));

      type ParsedTokenAccount = {
        account: {
          data: {
            parsed: {
              info: {
                mint: string;
                tokenAmount: { uiAmount: number | null };
              };
            };
          };
        };
      };

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      let usdc = '0.0000';
      let usdt = '0.0000';
      (tokenAccounts.value as ParsedTokenAccount[]).forEach((account) => {
        const mint = account.account.data.parsed.info.mint;
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
        if (mint === tokenAddresses.Solana.USDC) {
          usdc = amount.toFixed(4);
        }
        if (mint === tokenAddresses.Solana.USDT) {
          usdt = amount.toFixed(4);
        }
      });

      setSolanaUsdcBalance(usdc);
      setSolanaUsdtBalance(usdt);
    } catch (error) {
      console.error('[Swap] Failed to fetch Solana balances', error);
      setSolanaBalance('0.0000');
      setSolanaUsdcBalance('0.0000');
      setSolanaUsdtBalance('0.0000');
    }
  }, []);

  const connectPhantom = useCallback(async () => {
    const provider = phantomProvider ?? getPhantom();
    if (!provider) {
      return;
    }
    try {
      const response = await provider.connect();
      const walletAddress = response.publicKey.toString();
      setPhantomProvider(provider);
      setSolanaAddress(walletAddress);
      // Auto-select Solana chain when Phantom connects
      setFromChain('Solana');
      // toChain is automatically locked to fromChain
      setFromToken('SOL');
      setToToken('USDC');
      await fetchSolanaBalances(response.publicKey);
    } catch (error) {
      console.error('[Swap] Phantom connection failed', error);
    }
  }, [fetchSolanaBalances, getPhantom, phantomProvider]);

  useEffect(() => {
    setMounted(true);
    setPhantomProvider(getPhantom());
  }, [getPhantom]);

  useEffect(() => {
    if (!phantomProvider) {
      return;
    }
    const handleAccountChanged = (publicKey: PublicKey | null) => {
      if (publicKey) {
        setSolanaAddress(publicKey.toString());
        fetchSolanaBalances(publicKey);
      } else {
        setSolanaAddress(null);
        setSolanaBalance('0.0000');
        setSolanaUsdcBalance('0.0000');
        setSolanaUsdtBalance('0.0000');
      }
    };
    const handleDisconnect = () => {
      setSolanaAddress(null);
      setSolanaBalance('0.0000');
      setSolanaUsdcBalance('0.0000');
      setSolanaUsdtBalance('0.0000');
    };

    phantomProvider.on('accountChanged', handleAccountChanged);
    phantomProvider.on('disconnect', handleDisconnect);

    phantomProvider
      .connect({ onlyIfTrusted: true })
      .then(({ publicKey }) => {
        if (publicKey) {
          setSolanaAddress(publicKey.toString());
          fetchSolanaBalances(publicKey);
        }
      })
      .catch(() => undefined);

    return () => {
      phantomProvider.off?.('accountChanged', handleAccountChanged);
      phantomProvider.off?.('disconnect', handleDisconnect);
    };
  }, [fetchSolanaBalances, phantomProvider]);

  // Fetch balances when native Solana wallet adapter connects
  useEffect(() => {
    if (solanaAdapterConnected && solanaPublicKey) {
      console.log('[Swap] Native Solana wallet connected:', solanaPublicKey.toBase58());
      fetchSolanaBalances(solanaPublicKey);
      // Auto-select Solana chain
      setFromChain('Solana');
      setFromToken('SOL');
      setToToken('USDC');
    }
  }, [solanaAdapterConnected, solanaPublicKey, fetchSolanaBalances]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setPricesLoading(true);
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,solana,usd-coin,tether&vs_currencies=usd&include_24hr_change=true',
        );
        const data = await response.json();
        setTokenPrices({
          ETH: { usd: data.ethereum?.usd ?? 0, change: data.ethereum?.usd_24h_change ?? 0 },
          SOL: { usd: data.solana?.usd ?? 0, change: data.solana?.usd_24h_change ?? 0 },
          USDT: { usd: data.tether?.usd ?? 0, change: data.tether?.usd_24h_change ?? 0 },
          USDC: { usd: data['usd-coin']?.usd ?? 1, change: data['usd-coin']?.usd_24h_change ?? 0 },
        });
      } catch (error) {
        console.error('[Swap] Failed to fetch prices', error);
      } finally {
        setPricesLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!fromAmount) {
      setToAmount('');
      return;
    }
    const fromPrice = tokenPrices[fromToken]?.usd;
    const toPrice = tokenPrices[toToken]?.usd;
    if (fromPrice && toPrice) {
      const rate = fromPrice / toPrice;
      setToAmount((Number(fromAmount) * rate).toFixed(6));
    } else {
      setToAmount('');
    }
  }, [fromAmount, fromToken, toToken, tokenPrices]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown-trigger]') && !target.closest('[data-dropdown-panel]')) {
        setShowFromChainDropdown(false);
        setShowToChainDropdown(false);
        setShowFromTokenDropdown(false);
        setShowToTokenDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const updatePositions = () => {
      const positions: Partial<Record<DropdownType, DropdownPosition>> = {};
      const buildPosition = (ref: RefObject<HTMLButtonElement | null>, type: DropdownType) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        positions[type] = {
          top: rect.bottom + 8,
          left: rect.left,
          width: type.includes('Token') ? 256 : rect.width,
        };
      };
      if (showFromChainDropdown) buildPosition(fromChainButtonRef, 'fromChain');
      if (showToChainDropdown) buildPosition(toChainButtonRef, 'toChain');
      if (showFromTokenDropdown) buildPosition(fromTokenButtonRef, 'fromToken');
      if (showToTokenDropdown) buildPosition(toTokenButtonRef, 'toToken');
      setDropdownPositions(positions);
    };

    updatePositions();
    window.addEventListener('scroll', updatePositions, true);
    window.addEventListener('resize', updatePositions);
    return () => {
      window.removeEventListener('scroll', updatePositions, true);
      window.removeEventListener('resize', updatePositions);
    };
  }, [showFromChainDropdown, showToChainDropdown, showFromTokenDropdown, showToTokenDropdown]);

  const handleConnectWallet = async () => {
    if (!isConnected) {
      open();
    }
    if (!solanaAddress) {
      await connectPhantom();
    }
  };

  const handleDisconnectWallet = async () => {
    if (isConnected) {
      await disconnect();
    }
    if (solanaAddress && phantomProvider) {
      await phantomProvider.disconnect();
    }
  };

  const handleSwapTokens = () => {
    // Only swap tokens, not chains (chains are locked)
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const { sendTransaction } = useSendTransaction();
  const { data: walletClient } = useWalletClient();

  // x402-fetch for Base (EVM) payments - UNCHANGED
  const fetchWithPayment = useMemo(() => {
    if (!walletClient) return null;
    try {
      return wrapFetchWithPayment(
        fetch,
        walletClient as any,
        BigInt(2 * 10 ** 6), // Allow up to 2 USDC per swap call
      );
    } catch (error) {
      console.error('[Swap] Failed to initialize x402 payment client', error);
      return null;
    }
  }, [walletClient]);

  // x402-solana client for Solana payments (official PayAI x402-solana package)
  // Reference: https://github.com/PayAINetwork/x402-solana
  // Priority: 1. Native wallet adapter, 2. Reown, 3. Direct Phantom
  const solanaX402Client = useMemo((): X402Client | null => {
    // PRIORITY 1: Native Solana wallet adapter (best compatibility with x402-solana)
    if (solanaAdapterConnected && solanaPublicKey && signSolanaTransaction) {
      try {
        console.log('[Swap] Using native Solana wallet adapter for x402');
        const walletAdapter = {
          address: solanaPublicKey.toBase58(),
          publicKey: solanaPublicKey,
          signTransaction: async (tx: VersionedTransaction): Promise<VersionedTransaction> => {
            const signedTx = await signSolanaTransaction(tx);
            return signedTx as VersionedTransaction;
          },
        };
        
        return createX402Client({
          wallet: walletAdapter,
          network: 'solana',
          rpcUrl: config.networks.solana.rpcUrl,
          maxPaymentAmount: BigInt(2 * 10 ** 6), // max 2 USDC per swap
        });
      } catch (error) {
        console.error('[Swap] Failed to initialize x402-solana with native adapter:', error);
      }
    }
    
    // PRIORITY 2: Reown's Solana provider (fallback)
    if (solanaAccount.isConnected && solanaAccount.address && reownSolanaProvider) {
      try {
        console.log('[Swap] Using Reown Solana provider for x402 (fallback)');
        const walletAdapter = {
          address: solanaAccount.address,
          publicKey: new PublicKey(solanaAccount.address),
          signTransaction: async (tx: VersionedTransaction): Promise<VersionedTransaction> => {
            const signedTx = await reownSolanaProvider.signTransaction(tx);
            return signedTx as VersionedTransaction;
          },
        };
        
        return createX402Client({
          wallet: walletAdapter,
          network: 'solana',
          rpcUrl: config.networks.solana.rpcUrl,
          maxPaymentAmount: BigInt(2 * 10 ** 6), // max 2 USDC per swap
        });
      } catch (error) {
        console.error('[Swap] Failed to initialize x402-solana with Reown:', error);
      }
    }
    
    // PRIORITY 3: Direct Phantom connection (legacy fallback)
    if (phantomProvider?.publicKey) {
      try {
        console.log('[Swap] Using direct Phantom for x402 (legacy fallback)');
        const walletAdapter = {
          address: phantomProvider.publicKey.toBase58(),
          publicKey: phantomProvider.publicKey,
          signTransaction: async (tx: VersionedTransaction): Promise<VersionedTransaction> => {
            if (!phantomProvider) {
              throw new Error('Phantom wallet not connected');
            }
            
            const signMethod = (phantomProvider as any).signTransaction;
            if (typeof signMethod === 'function') {
              return await signMethod.call(phantomProvider, tx);
            }
            
            if (typeof window !== 'undefined' && window.phantom?.solana) {
              const phantom = window.phantom.solana;
              if (typeof (phantom as any).signTransaction === 'function') {
                return await (phantom as any).signTransaction(tx);
              }
            }
            
            throw new Error('Phantom wallet does not support signTransaction');
          },
        };
        
        return createX402Client({
          wallet: walletAdapter,
          network: 'solana',
          rpcUrl: config.networks.solana.rpcUrl,
          maxPaymentAmount: BigInt(2 * 10 ** 6), // max 2 USDC per swap
        });
      } catch (error) {
        console.error('[Swap] Failed to initialize x402-solana with Phantom:', error);
      }
    }
    
    return null;
  }, [solanaAdapterConnected, solanaPublicKey, signSolanaTransaction, solanaAccount.isConnected, solanaAccount.address, reownSolanaProvider, phantomProvider]);

  // Get effective Solana address (priority: native adapter > Reown > direct Phantom)
  const effectiveSolanaAddress = solanaPublicKey?.toBase58() || solanaAccount.address || solanaAddress;
  
  const executeSwap = async () => {
    if (!fromAmount || !toAmount) return;
    
    // Validate wallet connection based on chain
    if (fromChain === 'Solana') {
      if (!solanaX402Client || !effectiveSolanaAddress) {
        setSwapError('Connect your Solana wallet to swap on Solana.');
        return;
      }
    } else {
      if (!fetchWithPayment) {
        setSwapError('Connect your Base wallet to authorize swap payments.');
        return;
      }
    }
    
    setIsSwapping(true);
    setSwapError(null);
    setSwapSuccess(false);
    setNlEarned(null);

    try {
      const userAddress = fromChain === 'Solana' ? effectiveSolanaAddress : address;
      if (!userAddress) {
        throw new Error('Please connect your wallet');
      }

      // Convert amount to smallest unit
      const decimals = fromToken === 'SOL' ? 9 : fromToken === 'ETH' ? 18 : 6;
      const amountInSmallestUnit = parseUnits(fromAmount, decimals).toString();

      // Determine API endpoint and payment client based on chain
      const baseUrl = config.x402ServerUrl;
      const apiPath = fromChain === 'Solana' 
        ? `${baseUrl}/noLimitSwap/solana`
        : `${baseUrl}/noLimitSwap`;

      const requestBody = JSON.stringify({
        chain: fromChain.toLowerCase(),
        fromToken,
        toToken,
        amount: amountInSmallestUnit,
        userAddress,
        slippage: parseFloat(slippage),
      });

      let response: Response;
      
      if (fromChain === 'Solana' && solanaX402Client) {
        // Ensure user has USDC ATA before x402 payment
        if (solanaAdapterConnected && solanaPublicKey && sendSolanaTransaction) {
          const connection = new Connection(HELIUS_ENDPOINT, 'confirmed');
          const hasAta = await ensureUsdcAta(connection, solanaPublicKey, sendSolanaTransaction);
          if (!hasAta) {
            throw new Error('Failed to create USDC token account. Please ensure you have some SOL for transaction fees.');
          }
        }
        
        // Use x402-solana for Solana payments
        response = await solanaX402Client.fetch(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });
      } else if (fetchWithPayment) {
        // Use x402-fetch for Base payments
        response = await fetchWithPayment(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });
      } else {
        throw new Error('No payment client available');
      }

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to get swap transaction');
      }

      if (fromChain === 'Solana') {
        // Execute Solana swap via Reown or Phantom
        const txBuffer = Buffer.from(data.tx, 'base64');
        const transaction = VersionedTransaction.deserialize(txBuffer);
        
        if (reownSolanaProvider && solanaAccount.isConnected) {
          // Use Reown's Solana provider
          const signedTx = await reownSolanaProvider.signAndSendTransaction(transaction);
          console.log('[Swap] Solana transaction sent via Reown:', signedTx);
        } else if (phantomProvider) {
          // Fallback to direct Phantom
          const signedTx = await phantomProvider.signAndSendTransaction(transaction);
          console.log('[Swap] Solana transaction sent via Phantom:', signedTx);
        } else {
          throw new Error('No Solana wallet provider available');
        }
      } else if (fromChain === 'Base' && data.tx) {
        // Execute Base swap via wagmi
        sendTransaction({
          to: data.tx.to as Address,
          data: data.tx.data as `0x${string}`,
          value: BigInt(data.tx.value || '0'),
        });
      }

      setSwapSuccess(true);
      setNlEarned(data.nlEarned || null);
      setFromAmount('');
      setToAmount('');
      
      // Refresh balances after successful swap (with delay to allow chain to update)
      setTimeout(async () => {
        if (fromChain === 'Solana') {
          const solAddress = effectiveSolanaAddress || solanaAddress;
          if (solAddress) {
            try {
              await fetchSolanaBalances(new PublicKey(solAddress));
            } catch (e) {
              console.error('[Swap] Failed to refresh Solana balances:', e);
            }
          }
        }
        // Base balances are automatically refreshed by wagmi hooks
      }, 3000);
    } catch (error) {
      console.error('[Swap] Error:', error);
      setSwapError(error instanceof Error ? error.message : 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  const formatBalance = (balance?: { value: bigint; decimals: number }) => {
    if (!balance) return '0.0000';
    return Number(formatUnits(balance.value, balance.decimals)).toFixed(4);
  };

  const getChainBalance = (chain: ChainName) => {
    if (chain === 'Base') {
      return formatBalance(baseNativeBalance);
    }
    return solanaBalance;
  };

  const formatErc20Balance = (value?: bigint, decimals = 6) => {
    if (!value) return '0.0000';
    return Number(formatUnits(value, decimals)).toFixed(4);
  };

  const getTokenBalance = (token: TokenSymbol) => {
    if (token === 'SOL') {
      return solanaBalance;
    }
    if (token === 'USDC') {
      return solanaAddress ? solanaUsdcBalance : formatErc20Balance(baseUsdcRaw as bigint | undefined, 6);
    }
    if (token === 'USDT') {
      return solanaAddress ? solanaUsdtBalance : '0.0000';
    }
    return formatBalance(baseNativeBalance);
  };

  const renderDropdownPortal = (
    isVisible: boolean,
    type: DropdownType,
    content: React.ReactNode,
  ): React.ReactPortal | null => {
    if (!mounted || !isVisible) return null;
    const position = dropdownPositions[type];
    if (!position) return null;
    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          width: position.width,
          zIndex: 1000,
        }}
        data-dropdown-panel
      >
        {content}
      </div>,
      document.body,
    );
  };

  const dropdownClass =
    'bg-black border border-white/20 rounded-lg shadow-2xl overflow-hidden backdrop-blur-lg';

  // Filter tokens based on current chain
  const availableFromTokens = tokenOptions
    .filter((token) => chainTokens[fromChain].includes(token.symbol))
    .map((token) => ({
      ...token,
      balance: getTokenBalance(token.symbol),
    }));
  
  const availableToTokens = tokenOptions
    .filter((token) => chainTokens[toChain].includes(token.symbol))
    .map((token) => ({
      ...token,
      balance: getTokenBalance(token.symbol),
    }));

  const displayAddress =
    address && isConnected ? `${address.slice(0, 6)}...${address.slice(-4)}` : solanaAddress ? `${solanaAddress.slice(0, 6)}...${solanaAddress.slice(-4)}` : '';

  const actionDisabled =
    (!isConnected && !solanaAddress) ||
    !fromAmount ||
    !toAmount ||
    (sendToDifferentWallet && !recipientAddress);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative rounded-3xl overflow-visible"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.005) 100%)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="bg-white/5 backdrop-blur-xl px-6 py-4 border-b border-white/10 rounded-t-3xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-mono text-base md:text-lg font-bold uppercase tracking-wider">
                Exchange Tokens
              </h2>
              {displayAddress ? (
                <button
                  onClick={handleDisconnectWallet}
                  className="bg-white/10 backdrop-blur-sm text-white px-5 py-2 font-mono text-xs md:text-sm font-bold hover:bg-white/20 transition-colors border border-white/20 whitespace-nowrap rounded-lg"
                >
                  {displayAddress}
                </button>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  className="bg-[#b8d1b3] text-black px-5 py-2 font-mono text-xs md:text-sm font-bold hover:bg-[#a8c1a3] transition-colors whitespace-nowrap rounded-lg"
                >
                  Connect Wallet
                </button>
              )}
            </div>
            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-white/70 font-mono text-xs uppercase tracking-wider">Slippage</span>
                <div className="flex items-center gap-1.5">
                  {['0.1', '0.5', '1.0'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setSlippage(preset)}
                      className={`px-2 py-1 font-mono text-xs rounded-lg transition-colors ${
                        slippage === preset
                          ? 'bg-[#b8d1b3] text-black'
                          : 'bg-black border border-white/20 text-white hover:border-[#b8d1b3]'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                  <div className="relative">
                    <input
                      type="number"
                      value={slippage}
                      onChange={(event) => setSlippage(event.target.value)}
                      min="0.1"
                      max="49"
                      step="0.1"
                      className="w-16 bg-black border border-white/20 text-white px-2 py-1 font-mono text-xs rounded-lg text-right focus:border-[#b8d1b3] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 text-xs">%</span>
                  </div>
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
                        gasSpeed === speed
                          ? 'bg-[#b8d1b3] text-black'
                          : 'bg-black border border-white/20 text-white hover:border-[#b8d1b3]'
                      }`}
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-6 w-px bg-white/10 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-white/70 font-mono text-xs uppercase tracking-wider">MEV</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setMevProtection(true)}
                    className={`px-3 py-1 font-mono text-xs rounded-lg transition-colors ${
                      mevProtection
                        ? 'bg-[#b8d1b3] text-black'
                        : 'bg-black border border-white/20 text-white hover:border-[#b8d1b3]'
                    }`}
                  >
                    On
                  </button>
                  <button
                    onClick={() => setMevProtection(false)}
                    className={`px-3 py-1 font-mono text-xs rounded-lg transition-colors ${
                      !mevProtection
                        ? 'bg-[#b8d1b3] text-black'
                        : 'bg-black border border-white/20 text-white hover:border-[#b8d1b3]'
                    }`}
                  >
                    Off
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-2">
          <div className="space-y-3 relative z-30 overflow-visible">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono text-white/70 uppercase tracking-wider font-bold">
                You Pay
              </label>
              <span className="text-xs font-mono text-white/50">
                Balance: {getChainBalance(fromChain)}
              </span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl relative z-30">
              <label className="text-xs font-mono text-white/50 uppercase tracking-wider block mb-2">
                From Chain
              </label>
              <button
                ref={fromChainButtonRef}
                data-dropdown-trigger
                onClick={() => {
                  setShowFromChainDropdown((prev) => !prev);
                  setShowToChainDropdown(false);
                  setShowFromTokenDropdown(false);
                  setShowToTokenDropdown(false);
                }}
                className="w-full bg-black border border-white/20 text-white px-3 py-2 font-mono text-sm flex items-center gap-2 rounded-lg hover:border-white/30 transition-colors text-left relative"
              >
                <Image src={getChainLogo(fromChain)} alt={fromChain} width={20} height={20} className="rounded-full flex-shrink-0" />
                <span className="flex-1">{fromChain}</span>
                <svg className="w-4 h-4 text-white/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 md:p-6 hover:border-[#b8d1b3]/50 transition-colors rounded-xl relative z-30 overflow-visible">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    ref={fromTokenButtonRef}
                    data-dropdown-trigger
                    onClick={() => {
                      setShowFromTokenDropdown((prev) => !prev);
                      setShowToTokenDropdown(false);
                      setShowFromChainDropdown(false);
                      setShowToChainDropdown(false);
                    }}
                    className="bg-black border border-white/20 text-white pl-12 pr-4 py-2.5 font-mono font-bold text-base md:text-lg focus:outline-none hover:border-[#b8d1b3]/50 transition-colors rounded-lg min-w-[140px] text-left"
                  >
                    {fromToken}
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6">
                      <Image src={tokenLogos[fromToken]} alt={fromToken} width={24} height={24} className="rounded-full" />
                    </div>
                  </button>
                </div>
                <input
                  type="text"
                  value={fromAmount}
                  onChange={(event) => setFromAmount(event.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-right text-2xl md:text-3xl font-bold focus:outline-none font-mono text-white"
                />
              </div>
              <div className="mt-2 text-right">
                <span className="text-xs font-mono text-white/50">
                  {tokenOptions.find((token) => token.symbol === fromToken)?.name}
                </span>
                {tokenPrices[fromToken] && (
                  <div className="mt-1">
                    <span className="text-xs font-mono text-white/60 font-bold">
                      ${tokenPrices[fromToken]?.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`text-xs font-mono ml-2 ${
                        (tokenPrices[fromToken]?.change ?? 0) >= 0 ? 'text-[#b8d1b3]' : 'text-red-400'
                      }`}
                    >
                      {(tokenPrices[fromToken]?.change ?? 0) >= 0 ? '▲' : '▼'}
                      {Math.abs(tokenPrices[fromToken]?.change ?? 0).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center py-1 relative z-20">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSwapTokens}
              className="bg-[#b8d1b3] p-2.5 border-4 border-white/10 shadow-lg hover:bg-[#a8c1a3] transition-all duration-300 rounded-xl text-black"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </motion.button>
          </div>

          <div className="space-y-3 relative z-10 overflow-visible">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono text-white/70 uppercase tracking-wider font-bold">
                You Receive
              </label>
              <span className="text-xs font-mono text-white/50">
                Balance: {getChainBalance(toChain)}
              </span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 rounded-xl relative z-30">
              <label className="text-xs font-mono text-white/50 uppercase tracking-wider block mb-2">
                To Chain <span className="text-white/30">(same as from)</span>
              </label>
              <div
                className="w-full bg-black/50 border border-white/10 text-white/70 px-3 py-2 font-mono text-sm flex items-center gap-2 rounded-lg cursor-not-allowed text-left relative"
              >
                <Image src={getChainLogo(toChain)} alt={toChain} width={20} height={20} className="rounded-full flex-shrink-0" />
                <span className="flex-1">{toChain}</span>
                <svg className="w-4 h-4 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 md:p-6 hover:border-[#b8d1b3]/50 transition-colors rounded-xl relative z-20 overflow-visible">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    ref={toTokenButtonRef}
                    data-dropdown-trigger
                    onClick={() => {
                      setShowToTokenDropdown((prev) => !prev);
                      setShowFromTokenDropdown(false);
                      setShowFromChainDropdown(false);
                      setShowToChainDropdown(false);
                    }}
                    className="bg-black border border-white/20 text-white pl-12 pr-4 py-2.5 font-mono font-bold text-base md:text-lg focus:outline-none hover:border-[#b8d1b3]/50 transition-colors rounded-lg min-w-[140px] text-left"
                  >
                    {toToken}
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6">
                      <Image src={tokenLogos[toToken]} alt={toToken} width={24} height={24} className="rounded-full" />
                    </div>
                  </button>
                </div>
                <input
                  type="text"
                  value={toAmount}
                  readOnly
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-right text-2xl md:text-3xl font-bold focus:outline-none font-mono text-white/80"
                />
              </div>
              <div className="mt-2 text-right">
                <span className="text-xs font-mono text-white/50">
                  {tokenOptions.find((token) => token.symbol === toToken)?.name}
                </span>
                {tokenPrices[toToken] && (
                  <div className="mt-1">
                    <span className="text-xs font-mono text-white/60 font-bold">
                      ${tokenPrices[toToken]?.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`text-xs font-mono ml-2 ${
                        (tokenPrices[toToken]?.change ?? 0) >= 0 ? 'text-[#b8d1b3]' : 'text-red-400'
                      }`}
                    >
                      {(tokenPrices[toToken]?.change ?? 0) >= 0 ? '▲' : '▼'}
                      {Math.abs(tokenPrices[toToken]?.change ?? 0).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {fromAmount && toAmount && !pricesLoading && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 space-y-3 mt-4 rounded-xl">
              <div className="flex justify-between items-center text-sm font-mono">
                <span className="text-white/50 uppercase tracking-wider text-xs">Exchange Rate</span>
                <span className="font-bold text-white">
                  1 {fromToken} ≈ {(Number(toAmount) / Number(fromAmount)).toFixed(6)} {toToken}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-mono border-t border-white/10 pt-3">
                <span className="text-white/50 uppercase tracking-wider text-xs">Network Fee</span>
                <span className="font-bold text-white">
                  {(Number(fromAmount) * 0.003).toFixed(6)} {fromToken}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-mono border-t border-white/10 pt-3">
                <span className="text-white/50 uppercase tracking-wider text-xs">Max Slippage</span>
                <span className="font-bold text-[#b8d1b3]">{slippage}%</span>
              </div>
              <div className="flex justify-between items-center text-sm font-mono border-t border-white/10 pt-3">
                <span className="text-white/50 uppercase tracking-wider text-xs">Minimum Received</span>
                <span className="font-bold text-[#b8d1b3]">
                  {(Number(toAmount) * (1 - Number(slippage) / 100)).toFixed(6)} {toToken}
                </span>
              </div>
            </div>
          )}

          {swapError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg font-mono text-sm mt-4">
              {swapError}
            </div>
          )}

          {swapSuccess && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-lg font-mono text-sm mt-4">
              <div className="flex items-center justify-between">
                <span>Swap executed successfully!</span>
                {nlEarned && parseFloat(nlEarned) > 0 && (
                  <span className="bg-[#b8d1b3]/20 text-[#b8d1b3] px-2 py-1 rounded-md text-xs font-bold">
                    +{parseFloat(nlEarned).toFixed(2)} $NL
                  </span>
                )}
              </div>
              {nlEarned && parseFloat(nlEarned) > 0 && (
                <p className="text-xs text-white/50 mt-1">
                  You earned $NL rewards! Check your balance in the Dashboard.
                </p>
              )}
            </div>
          )}

          <motion.button
            whileHover={{ scale: actionDisabled || isSwapping ? 1 : 1.02 }}
            whileTap={{ scale: actionDisabled || isSwapping ? 1 : 0.98 }}
            disabled={actionDisabled || isSwapping}
            onClick={executeSwap}
            className="w-full bg-[#b8d1b3] text-black py-4 md:py-5 font-mono text-base md:text-lg font-bold hover:bg-[#a8c1a3] hover:shadow-lg hover:shadow-[#b8d1b3]/20 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider mt-6 rounded-xl flex items-center justify-center gap-2"
          >
            {isSwapping ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : !displayAddress ? (
              'Connect Wallet to Swap'
            ) : !fromAmount || !toAmount ? (
              'Enter Amount'
            ) : sendToDifferentWallet && !recipientAddress ? (
              'Enter Recipient Address'
            ) : (
              'Execute Swap'
            )}
          </motion.button>
        </div>
      </motion.div>

      {renderDropdownPortal(
        showFromChainDropdown,
        'fromChain',
        <div className={`${dropdownClass}`}>
          {chainOptions.map((chain) => (
            <button
              key={chain.name}
              onClick={() => {
                setFromChain(chain.name);
                setShowFromChainDropdown(false);
                setFromToken(chainToNativeToken[chain.name]);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
            >
              <Image src={chain.logo} alt={chain.name} width={28} height={28} className="rounded-full" />
              <span className="font-mono text-sm text-white">{chain.name}</span>
            </button>
          ))}
        </div>,
      )}

      {/* toChain dropdown removed - chain is locked to fromChain */}

      {renderDropdownPortal(
        showFromTokenDropdown,
        'fromToken',
        <div className={`${dropdownClass} max-h-64 overflow-y-auto`}>
          {availableFromTokens.map((token) => (
            <button
              key={`${token.symbol}-from`}
              onClick={() => {
                setFromToken(token.symbol);
                setShowFromTokenDropdown(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
            >
              <Image src={tokenLogos[token.symbol]} alt={token.symbol} width={32} height={32} className="rounded-full" />
              <div className="flex-1">
                <div className="font-mono text-sm font-bold text-white">{token.symbol}</div>
                <div className="font-mono text-xs text-white/50">{token.name}</div>
              </div>
              <div className="font-mono text-xs text-white/60">{token.balance}</div>
            </button>
          ))}
        </div>,
      )}

      {renderDropdownPortal(
        showToTokenDropdown,
        'toToken',
        <div className={`${dropdownClass} max-h-64 overflow-y-auto`}>
          {availableToTokens.map((token) => (
            <button
              key={`${token.symbol}-to`}
              onClick={() => {
                setToToken(token.symbol);
                setShowToTokenDropdown(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
            >
              <Image src={tokenLogos[token.symbol]} alt={token.symbol} width={32} height={32} className="rounded-full" />
              <div className="flex-1">
                <div className="font-mono text-sm font-bold text-white">{token.symbol}</div>
                <div className="font-mono text-xs text-white/50">{token.name}</div>
              </div>
              <div className="font-mono text-xs text-white/60">{token.balance}</div>
            </button>
          ))}
        </div>,
      )}

    </>
  );
}


