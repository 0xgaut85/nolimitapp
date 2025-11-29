/**
 * Mixer Engine
 * Handles the ping-pong transfer logic between pool wallets
 */

import { PrismaClient } from '@prisma/client';
import { Wallet, JsonRpcProvider, parseEther, formatEther, Contract, parseUnits } from 'ethers';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction, 
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token';
import { walletPool, generateHopPath, getRandomHopDelay } from './wallets';

// ERC20 ABI for token transfers
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

// Token addresses
const TOKEN_ADDRESSES = {
  base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  },
  solana: {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  },
};

const prisma = new PrismaClient();

// RPC connections
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';

const baseProvider = new JsonRpcProvider(BASE_RPC_URL);
const solanaConnection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Fee percentage
const MIXER_FEE_PERCENT = 1;

// Fee recipient addresses (same as merchant addresses for x402 payments)
const BASE_FEE_RECIPIENT = process.env.MERCHANT_ADDRESS || '0x3417828c83e8c1e787dc6dbefd79f93e0c13f694';
const SOLANA_FEE_RECIPIENT = process.env.SOLANA_MERCHANT_ADDRESS || 'CVF8ApyzZHCKw1xCm8Fyywej2XSGasjnPuXKvwCd55z8';

// Calculate fee
export function calculateFee(amount: string): { fee: string; netAmount: string } {
  const amountNum = parseFloat(amount);
  const fee = amountNum * (MIXER_FEE_PERCENT / 100);
  const netAmount = amountNum - fee;
  return {
    fee: fee.toFixed(8),
    netAmount: netAmount.toFixed(8),
  };
}

// Create a new mix request
export async function createMixRequest(params: {
  chain: 'base' | 'solana';
  token: string;
  amount: string;
  senderAddress: string;
  recipientAddress: string;
  delayMinutes: number;
}): Promise<{ id: string; depositAddress: string; depositAmount: string }> {
  const { fee, netAmount } = calculateFee(params.amount);
  const { address: depositAddress, walletIndex } = walletPool.getDepositAddress(params.chain);

  // Generate hop path (5-8 random hops)
  const numHops = 5 + Math.floor(Math.random() * 4);
  const hopPath = generateHopPath(numHops, walletIndex);

  const mixRequest = await prisma.mixRequest.create({
    data: {
      chain: params.chain,
      token: params.token,
      amount: netAmount,
      originalAmount: params.amount,
      fee,
      senderAddress: params.senderAddress,
      recipientAddress: params.recipientAddress,
      status: 'pending_deposit',
      totalHops: numHops,
      currentHop: 0,
      currentWallet: walletIndex,
      delayMinutes: params.delayMinutes,
      hopHistory: JSON.stringify([{ wallet: walletIndex, action: 'entry', timestamp: new Date().toISOString() }]),
    },
  });

  console.log(`[Mixer] Created mix request ${mixRequest.id} - ${params.chain}/${params.token} ${params.amount} -> ${depositAddress}`);

  return {
    id: mixRequest.id,
    depositAddress,
    depositAmount: params.amount,
  };
}

// Mark deposit as received and start mixing
export async function confirmDeposit(mixId: string, txHash: string): Promise<void> {
  const mixRequest = await prisma.mixRequest.findUnique({ where: { id: mixId } });
  if (!mixRequest) throw new Error('Mix request not found');

  // Calculate first hop delay
  const baseDelay = mixRequest.delayMinutes > 0 ? mixRequest.delayMinutes / mixRequest.totalHops : 0;
  const nextHopDelay = getRandomHopDelay(baseDelay);
  const nextHopAt = new Date(Date.now() + nextHopDelay);

  await prisma.mixRequest.update({
    where: { id: mixId },
    data: {
      status: 'deposited',
      depositTxHash: txHash,
      nextHopAt,
    },
  });

  console.log(`[Mixer] Deposit confirmed for ${mixId}, first hop at ${nextHopAt.toISOString()}`);
}

// Execute a single hop (internal transfer between pool wallets)
async function executeHop(mixRequest: {
  id: string;
  chain: string;
  token: string;
  amount: string;
  fee: string;
  currentWallet: number | null;
  currentHop: number;
  totalHops: number;
  recipientAddress: string;
  delayMinutes: number;
  hopHistory: string;
}): Promise<void> {
  const fromWalletIndex = mixRequest.currentWallet || 1;
  const isLastHop = mixRequest.currentHop >= mixRequest.totalHops - 1;
  
  // Determine destination
  let toAddress: string;
  let toWalletIndex: number | null = null;
  
  if (isLastHop) {
    // Final hop - send to recipient
    toAddress = mixRequest.recipientAddress;
  } else {
    // Intermediate hop - send to another pool wallet (max 10 wallets now)
    toWalletIndex = Math.floor(Math.random() * 10) + 1;
    // Avoid sending to same wallet
    while (toWalletIndex === fromWalletIndex) {
      toWalletIndex = Math.floor(Math.random() * 10) + 1;
    }
    
    if (mixRequest.chain === 'base') {
      const wallet = walletPool.getBaseWallet(toWalletIndex);
      toAddress = wallet?.address || '';
    } else {
      const wallet = walletPool.getSolanaWallet(toWalletIndex);
      toAddress = wallet?.address || '';
    }
  }

  console.log(`[Mixer] Executing hop ${mixRequest.currentHop + 1}/${mixRequest.totalHops} for ${mixRequest.id}`);
  console.log(`[Mixer] From wallet ${fromWalletIndex} to ${isLastHop ? 'recipient' : `wallet ${toWalletIndex}`}`);

  let txHash: string;
  let feeTxHash: string | null = null;

  try {
    if (mixRequest.chain === 'base') {
      txHash = await executeBaseTransfer(fromWalletIndex, toAddress, mixRequest.amount, mixRequest.token);
      
      // On last hop, also send the fee to the fee recipient
      if (isLastHop && parseFloat(mixRequest.fee) > 0) {
        try {
          feeTxHash = await executeBaseTransfer(fromWalletIndex, BASE_FEE_RECIPIENT, mixRequest.fee, mixRequest.token);
          console.log(`[Mixer] Fee sent to Base recipient: ${feeTxHash}`);
        } catch (feeError) {
          console.error(`[Mixer] Failed to send fee:`, feeError);
        }
      }
    } else {
      txHash = await executeSolanaTransfer(fromWalletIndex, toAddress, mixRequest.amount, mixRequest.token);
      
      // On last hop, also send the fee to the fee recipient
      if (isLastHop && parseFloat(mixRequest.fee) > 0) {
        try {
          feeTxHash = await executeSolanaTransfer(fromWalletIndex, SOLANA_FEE_RECIPIENT, mixRequest.fee, mixRequest.token);
          console.log(`[Mixer] Fee sent to Solana recipient: ${feeTxHash}`);
        } catch (feeError) {
          console.error(`[Mixer] Failed to send fee:`, feeError);
        }
      }
    }

    // Update hop history
    const history = JSON.parse(mixRequest.hopHistory || '[]');
    history.push({
      hop: mixRequest.currentHop + 1,
      from: fromWalletIndex,
      to: isLastHop ? 'recipient' : toWalletIndex,
      txHash,
      timestamp: new Date().toISOString(),
    });

    // Calculate next hop timing
    const baseDelay = mixRequest.delayMinutes > 0 ? mixRequest.delayMinutes / mixRequest.totalHops : 0;
    const nextHopDelay = getRandomHopDelay(baseDelay);
    const nextHopAt = isLastHop ? null : new Date(Date.now() + nextHopDelay);

    await prisma.mixRequest.update({
      where: { id: mixRequest.id },
      data: {
        status: isLastHop ? 'completed' : 'mixing',
        currentHop: mixRequest.currentHop + 1,
        currentWallet: toWalletIndex,
        nextHopAt,
        hopHistory: JSON.stringify(history),
        completedAt: isLastHop ? new Date() : null,
      },
    });

    console.log(`[Mixer] Hop completed: ${txHash}`);
  } catch (error) {
    console.error(`[Mixer] Hop failed:`, error);
    await prisma.mixRequest.update({
      where: { id: mixRequest.id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    throw error;
  }
}

// Execute Base (EVM) transfer
async function executeBaseTransfer(
  fromWalletIndex: number,
  toAddress: string,
  amount: string,
  token: string
): Promise<string> {
  const wallet = walletPool.getBaseWallet(fromWalletIndex);
  if (!wallet) throw new Error(`Base wallet ${fromWalletIndex} not found`);

  if (token === 'ETH') {
    // Native ETH transfer
    const tx = await wallet.wallet.sendTransaction({
      to: toAddress,
      value: parseEther(amount),
    });
    await tx.wait();
    return tx.hash;
  } else if (token === 'USDC' || token === 'USDT') {
    // ERC20 token transfer
    const tokenAddress = token === 'USDC' ? TOKEN_ADDRESSES.base.USDC : TOKEN_ADDRESSES.base.USDT;
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, wallet.wallet);
    
    // USDC and USDT have 6 decimals
    const tokenAmount = parseUnits(amount, 6);
    
    const tx = await tokenContract.transfer(toAddress, tokenAmount);
    await tx.wait();
    return tx.hash;
  } else {
    throw new Error(`Unsupported token for Base mixer: ${token}`);
  }
}

// Execute Solana transfer
async function executeSolanaTransfer(
  fromWalletIndex: number,
  toAddress: string,
  amount: string,
  token: string
): Promise<string> {
  const wallet = walletPool.getSolanaWallet(fromWalletIndex);
  if (!wallet) throw new Error(`Solana wallet ${fromWalletIndex} not found`);

  const toPubkey = new PublicKey(toAddress);

  if (token === 'SOL') {
    // Native SOL transfer
    const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.keypair.publicKey,
        toPubkey,
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(
      solanaConnection,
      transaction,
      [wallet.keypair]
    );
    
    return signature;
  } else if (token === 'USDC' || token === 'USDT') {
    // SPL token transfer
    const mintAddress = token === 'USDC' 
      ? new PublicKey(TOKEN_ADDRESSES.solana.USDC) 
      : new PublicKey(TOKEN_ADDRESSES.solana.USDT);
    
    // Get associated token accounts
    const fromAta = await getAssociatedTokenAddress(mintAddress, wallet.keypair.publicKey);
    const toAta = await getAssociatedTokenAddress(mintAddress, toPubkey);
    
    // USDC and USDT have 6 decimals
    const tokenAmount = Math.floor(parseFloat(amount) * 1_000_000);
    
    const transaction = new Transaction();
    
    // Check if destination ATA exists, if not create it
    try {
      await getAccount(solanaConnection, toAta);
    } catch {
      // ATA doesn't exist, create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          wallet.keypair.publicKey, // payer
          toAta, // associated token account
          toPubkey, // owner
          mintAddress // mint
        )
      );
    }
    
    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        fromAta,
        toAta,
        wallet.keypair.publicKey,
        tokenAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const signature = await sendAndConfirmTransaction(
      solanaConnection,
      transaction,
      [wallet.keypair]
    );
    
    return signature;
  } else {
    throw new Error(`Unsupported token for Solana mixer: ${token}`);
  }
}

// Process pending hops (called by background job)
export async function processPendingHops(): Promise<number> {
  const now = new Date();
  
  // Find mix requests ready for next hop
  const pendingMixes = await prisma.mixRequest.findMany({
    where: {
      status: { in: ['deposited', 'mixing'] },
      nextHopAt: { lte: now },
    },
    take: 10, // Process 10 at a time
  });

  console.log(`[Mixer] Processing ${pendingMixes.length} pending hops`);

  let processed = 0;
  for (const mix of pendingMixes) {
    try {
      await executeHop(mix);
      processed++;
    } catch (error) {
      console.error(`[Mixer] Failed to process mix ${mix.id}:`, error);
    }
  }

  return processed;
}

// Get mix status
export async function getMixStatus(mixId: string): Promise<{
  status: string;
  progress: number;
  currentHop: number;
  totalHops: number;
  completedAt?: Date;
  error?: string;
} | null> {
  const mix = await prisma.mixRequest.findUnique({ where: { id: mixId } });
  if (!mix) return null;

  return {
    status: mix.status,
    progress: Math.round((mix.currentHop / mix.totalHops) * 100),
    currentHop: mix.currentHop,
    totalHops: mix.totalHops,
    completedAt: mix.completedAt || undefined,
    error: mix.errorMessage || undefined,
  };
}

// Start background processor
let processorInterval: NodeJS.Timeout | null = null;

export function startMixerProcessor(intervalMs = 10000): void {
  if (processorInterval) return;

  console.log('[Mixer] Starting background processor');
  walletPool.initialize();

  processorInterval = setInterval(async () => {
    try {
      await processPendingHops();
    } catch (error) {
      console.error('[Mixer] Processor error:', error);
    }
  }, intervalMs);
}

export function stopMixerProcessor(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    console.log('[Mixer] Stopped background processor');
  }
}

