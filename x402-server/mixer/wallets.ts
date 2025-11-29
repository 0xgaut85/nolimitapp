/**
 * Mixer Pool Wallet Management
 * Handles loading and accessing the 40 pool wallets (20 Base + 20 Solana)
 */

import { Wallet, JsonRpcProvider } from 'ethers';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import * as bs58 from 'bs58';

const NUM_WALLETS = 20;

// Base RPC
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// Solana RPC
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export interface PoolWallet {
  index: number;
  address: string;
  privateKey: string;
}

export interface BasePoolWallet extends PoolWallet {
  wallet: Wallet;
}

export interface SolanaPoolWallet extends PoolWallet {
  keypair: Keypair;
}

// Load Base wallets from environment
export function loadBaseWallets(): BasePoolWallet[] {
  const provider = new JsonRpcProvider(BASE_RPC_URL);
  const wallets: BasePoolWallet[] = [];

  for (let i = 1; i <= NUM_WALLETS; i++) {
    const privateKey = process.env[`MIXER_BASE_WALLET_${i}_KEY`];
    if (!privateKey) {
      console.warn(`[Mixer] Missing MIXER_BASE_WALLET_${i}_KEY`);
      continue;
    }

    const wallet = new Wallet(privateKey, provider);
    wallets.push({
      index: i,
      address: wallet.address,
      privateKey,
      wallet,
    });
  }

  console.log(`[Mixer] Loaded ${wallets.length} Base pool wallets`);
  return wallets;
}

// Load Solana wallets from environment
export function loadSolanaWallets(): SolanaPoolWallet[] {
  const wallets: SolanaPoolWallet[] = [];

  for (let i = 1; i <= NUM_WALLETS; i++) {
    const privateKey = process.env[`MIXER_SOL_WALLET_${i}_KEY`];
    if (!privateKey) {
      console.warn(`[Mixer] Missing MIXER_SOL_WALLET_${i}_KEY`);
      continue;
    }

    try {
      const secretKey = bs58.default.decode(privateKey);
      const keypair = Keypair.fromSecretKey(secretKey);
      wallets.push({
        index: i,
        address: keypair.publicKey.toBase58(),
        privateKey,
        keypair,
      });
    } catch (error) {
      console.error(`[Mixer] Invalid Solana wallet ${i}:`, error);
    }
  }

  console.log(`[Mixer] Loaded ${wallets.length} Solana pool wallets`);
  return wallets;
}

// Get a random wallet index (excluding current)
export function getRandomWalletIndex(exclude?: number): number {
  let index: number;
  do {
    index = Math.floor(Math.random() * NUM_WALLETS) + 1;
  } while (index === exclude);
  return index;
}

// Generate a random hop path
export function generateHopPath(numHops: number, startWallet?: number): number[] {
  const path: number[] = [];
  let current = startWallet;

  for (let i = 0; i < numHops; i++) {
    const next = getRandomWalletIndex(current);
    path.push(next);
    current = next;
  }

  return path;
}

// Calculate random delay between hops (in ms)
export function getRandomHopDelay(baseDelayMinutes: number): number {
  // Add 0-60 seconds of randomness to the base delay
  const randomSeconds = Math.floor(Math.random() * 60);
  return (baseDelayMinutes * 60 + randomSeconds) * 1000;
}

// Get entry wallet (first wallet to receive deposit)
export function getEntryWalletIndex(): number {
  // Randomly select one of the first 5 wallets as entry point
  return Math.floor(Math.random() * 5) + 1;
}

// Wallet pool singleton
class WalletPool {
  private baseWallets: BasePoolWallet[] = [];
  private solanaWallets: SolanaPoolWallet[] = [];
  private initialized = false;

  initialize() {
    if (this.initialized) return;

    this.baseWallets = loadBaseWallets();
    this.solanaWallets = loadSolanaWallets();
    this.initialized = true;
  }

  getBaseWallet(index: number): BasePoolWallet | undefined {
    return this.baseWallets.find(w => w.index === index);
  }

  getSolanaWallet(index: number): SolanaPoolWallet | undefined {
    return this.solanaWallets.find(w => w.index === index);
  }

  getBaseWallets(): BasePoolWallet[] {
    return this.baseWallets;
  }

  getSolanaWallets(): SolanaPoolWallet[] {
    return this.solanaWallets;
  }

  // Get the first deposit address for a chain
  getDepositAddress(chain: 'base' | 'solana'): { address: string; walletIndex: number } {
    const walletIndex = getEntryWalletIndex();
    
    if (chain === 'base') {
      const wallet = this.baseWallets.find(w => w.index === walletIndex);
      return {
        address: wallet?.address || this.baseWallets[0]?.address || '',
        walletIndex: wallet?.index || 1,
      };
    } else {
      const wallet = this.solanaWallets.find(w => w.index === walletIndex);
      return {
        address: wallet?.address || this.solanaWallets[0]?.address || '',
        walletIndex: wallet?.index || 1,
      };
    }
  }
}

export const walletPool = new WalletPool();

