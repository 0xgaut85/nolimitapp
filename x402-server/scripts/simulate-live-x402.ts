/**
 * LIVE x402 Activity Simulation Script for NoLimit Platform
 * 
 * This script makes REAL x402 API calls that require USDC payment.
 * 
 * Distribution:
 * - 80% Chat (noLimitLLM) - $0.05 per transaction
 * - 15% Mixer (noLimitMixer) - $0.075 per transaction
 * - 5% Swap (noLimitSwap) - $0.10 per transaction
 * 
 * Mode: CONTINUOUS - runs until all wallets are out of USDC funds
 * Duration: 4 hours (transactions spread across this time)
 * 
 * USAGE: Pass wallet file path as argument
 *   npx tsx scripts/simulate-live-x402.ts ./my-wallets.json
 */

import { config } from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  getMint,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { createPaymentHeaderFromTransaction } from 'x402-solana/utils';
import { createPaymentHeader, selectPaymentRequirements } from 'x402/client';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';

config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  durationHours: 4,
  distribution: {
    chat: 0.80,
    mixer: 0.15,
    swap: 0.05,
  },
  fees: {
    chat: 0.05,
    mixer: 0.075,
    swap: 0.10,
  },
  serverUrl: process.env.X402_SERVER_URL || 'https://x402.nolimit.foundation',
  baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  maxPaymentUsdc: BigInt(1 * 10 ** 6),
  // Continue until out of funds - no fixed transaction limit
  continueUntilEmpty: true,
};

// ============================================================================
// SAMPLE DATA
// ============================================================================

const CHAT_MESSAGES = [
  "What's the current state of crypto regulation?",
  "Explain how zero-knowledge proofs work",
  "What are the best practices for smart contract security?",
  "How does the Lightning Network work?",
  "Explain MEV and its impact on DeFi",
  "What is account abstraction in Ethereum?",
  "How do rollups scale Ethereum?",
  "What are the risks of yield farming?",
  "How do decentralized oracles work?",
  "Explain impermanent loss in AMMs",
  "What is the future of cross-chain bridges?",
  "How does Solana achieve high throughput?",
  "Explain how DAOs make decisions",
  "What are soulbound tokens?",
  "How do privacy coins work?",
  "Explain the concept of liquid staking",
  "What are inscription protocols?",
  "How does atomic swap work?",
  "What is a flash loan attack?",
  "How do NFT marketplaces work?",
];

const SWAP_PAIRS = {
  base: [
    { from: 'ETH', to: 'USDC', amount: '10000000000000000' },
    { from: 'USDC', to: 'ETH', amount: '10000000' },
  ],
  solana: [
    { from: 'SOL', to: 'USDC', amount: '10000000' },
    { from: 'USDC', to: 'SOL', amount: '1000000' },
  ],
};

const MIXER_CONFIG = {
  base: { tokens: ['ETH', 'USDC'], amounts: ['0.001', '1'] },
  solana: { tokens: ['SOL', 'USDC'], amounts: ['0.01', '1'] },
};

// ============================================================================
// TYPES
// ============================================================================

interface WalletData {
  address: string;
  privateKey: string;
}

interface WalletsFile {
  generated: string;
  base: WalletData[];
  solana: WalletData[];
}

type TransactionType = 'chat' | 'mixer' | 'swap';
type Chain = 'base' | 'solana';

interface ScheduledTransaction {
  type: TransactionType;
  chain: Chain;
  walletIndex: number;
  scheduledTime: number;
}

interface Stats {
  total: number;
  success: number;
  failed: number;
  chat: number;
  mixer: number;
  swap: number;
  chatFailed: number;
  mixerFailed: number;
  swapFailed: number;
  usdcSpent: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomAddress(chain: Chain): string {
  if (chain === 'solana') {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    return Array.from({ length: 44 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } else {
    const hex = '0123456789abcdef';
    return '0x' + Array.from({ length: 40 }, () => hex[Math.floor(Math.random() * hex.length)]).join('');
  }
}

function loadWallets(jsonPath?: string): WalletsFile {
  let filepath = jsonPath;
  if (!filepath) {
    const scriptsDir = path.join(__dirname, '..');
    const files = fs.readdirSync(scriptsDir)
      .filter(f => f.startsWith('wallets-') && f.endsWith('.json'))
      .sort().reverse();
    if (files.length === 0) throw new Error('No wallet file found. Pass wallet file path as argument.');
    filepath = path.join(scriptsDir, files[0]);
  }
  console.log(`📂 Loading wallets from: ${filepath}`);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

// ============================================================================
// BASE (EVM) x402 CLIENT
// ============================================================================

interface BaseWalletClient {
  account: ReturnType<typeof privateKeyToAccount>;
  address: string;
}

function createBaseWalletClient(privateKey: string): BaseWalletClient {
  const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(pk as `0x${string}`);
  return { account, address: account.address };
}

// Base fetch with x402 payment using x402/client directly
async function baseX402Fetch(
  wallet: BaseWalletClient,
  url: string,
  options: RequestInit,
  debug: boolean = false
): Promise<Response> {
  // Step 1: Make initial request
  const initialResponse = await fetch(url, options);
  
  // If not 402, return as-is
  if (initialResponse.status !== 402) {
    return initialResponse;
  }
  
  // Step 2: Parse payment requirements
  const rawResponse = await initialResponse.json();
  const x402Version = rawResponse.x402Version;
  const parsedPaymentRequirements = rawResponse.accepts || [];
  
  if (debug) {
    console.log('🔍 Base 402 Response:', JSON.stringify(rawResponse, null, 2));
  }
  
  // Find Base payment option
  const selectedRequirements = selectPaymentRequirements(
    parsedPaymentRequirements,
    'base',
    'exact'
  );
  
  if (!selectedRequirements) {
    throw new Error('No suitable Base payment requirements found');
  }
  
  if (debug) {
    console.log('🔍 Selected requirements:', JSON.stringify(selectedRequirements, null, 2));
    console.log('🔍 Wallet address:', wallet.address);
  }
  
  // Step 3: Create payment header using x402/client (account-based signing)
  const paymentHeader = await createPaymentHeader(
    wallet.account,
    x402Version,
    selectedRequirements
  );
  
  if (debug) {
    const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
    console.log('🔍 Payment header (decoded):', JSON.stringify(decoded, null, 2));
  }
  
  // Step 4: Retry with payment header
  const newInit = {
    ...options,
    headers: {
      ...(options.headers as Record<string, string>) || {},
      'X-PAYMENT': paymentHeader,
      'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
    },
  };
  
  const secondResponse = await fetch(url, newInit);
  
  if (debug && !secondResponse.ok) {
    const errorData = await secondResponse.clone().json().catch(() => ({}));
    console.log('🔍 Second response error:', JSON.stringify(errorData, null, 2));
  }
  
  return secondResponse;
}

// ============================================================================
// SOLANA x402 IMPLEMENTATION (Node.js compatible)
// ============================================================================

interface SolanaWalletClient {
  keypair: Keypair;
  address: string;
  connection: Connection;
}

function createSolanaWalletClient(privateKey: string): SolanaWalletClient {
  const secretKey = bs58.decode(privateKey);
  const keypair = Keypair.fromSecretKey(secretKey);
  const connection = new Connection(CONFIG.solanaRpcUrl, 'confirmed');
  return {
    keypair,
    address: keypair.publicKey.toBase58(),
    connection,
  };
}

// Create Solana payment header
async function createSolanaPaymentHeader(
  wallet: SolanaWalletClient,
  x402Version: number,
  paymentRequirements: any,
  rpcUrl: string
): Promise<string> {
  const connection = new Connection(rpcUrl, 'confirmed');
  
  const feePayer = paymentRequirements?.extra?.feePayer;
  if (typeof feePayer !== 'string' || !feePayer) {
    throw new Error('Missing facilitator feePayer in payment requirements');
  }
  const feePayerPubkey = new PublicKey(feePayer);
  const userPubkey = wallet.keypair.publicKey;
  
  if (!paymentRequirements?.payTo) {
    throw new Error('Missing payTo in payment requirements');
  }
  const destination = new PublicKey(paymentRequirements.payTo);
  
  const instructions: any[] = [];
  
  instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 7000 }));
  instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
  
  if (!paymentRequirements.asset) {
    throw new Error('Missing token mint for SPL transfer');
  }
  const mintPubkey = new PublicKey(paymentRequirements.asset);
  
  const mintInfo = await connection.getAccountInfo(mintPubkey, 'confirmed');
  const programId = mintInfo?.owner?.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58() 
    ? TOKEN_2022_PROGRAM_ID 
    : TOKEN_PROGRAM_ID;
  
  const mint = await getMint(connection, mintPubkey, undefined, programId);
  
  const sourceAta = await getAssociatedTokenAddress(mintPubkey, userPubkey, false, programId);
  const destinationAta = await getAssociatedTokenAddress(mintPubkey, destination, false, programId);
  
  const sourceAtaInfo = await connection.getAccountInfo(sourceAta, 'confirmed');
  if (!sourceAtaInfo) {
    throw new Error(`User does not have an Associated Token Account for ${paymentRequirements.asset}`);
  }
  
  const destAtaInfo = await connection.getAccountInfo(destinationAta, 'confirmed');
  if (!destAtaInfo) {
    throw new Error(`Destination does not have an Associated Token Account for ${paymentRequirements.asset}`);
  }
  
  const amount = BigInt(paymentRequirements.maxAmountRequired);
  
  instructions.push(
    createTransferCheckedInstruction(
      sourceAta,
      mintPubkey,
      destinationAta,
      userPubkey,
      amount,
      mint.decimals,
      [],
      programId
    )
  );
  
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({
    payerKey: feePayerPubkey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();
  
  const transaction = new VersionedTransaction(message);
  transaction.sign([wallet.keypair]);
  
  return createPaymentHeaderFromTransaction(
    transaction,
    paymentRequirements,
    x402Version
  );
}

// Solana fetch with x402 payment
async function solanaX402Fetch(
  wallet: SolanaWalletClient,
  url: string,
  options: RequestInit
): Promise<Response> {
  const initialResponse = await fetch(url, options);
  
  if (initialResponse.status !== 402) {
    return initialResponse;
  }
  
  const rawResponse = await initialResponse.json();
  const x402Version = rawResponse.x402Version;
  const parsedPaymentRequirements = rawResponse.accepts || [];
  
  const selectedRequirements = parsedPaymentRequirements.find(
    (req: any) => req.scheme === 'exact' && (req.network === 'solana-devnet' || req.network === 'solana')
  );
  
  if (!selectedRequirements) {
    throw new Error('No suitable Solana payment requirements found');
  }
  
  const paymentHeader = await createSolanaPaymentHeader(
    wallet,
    x402Version,
    selectedRequirements,
    CONFIG.solanaRpcUrl
  );
  
  const newInit = {
    ...options,
    headers: {
      ...(options.headers as Record<string, string>) || {},
      'X-PAYMENT': paymentHeader,
      'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
    },
  };
  
  return await fetch(url, newInit);
}

// ============================================================================
// TRANSACTION EXECUTORS - BASE
// ============================================================================

async function executeChatBase(wallet: BaseWalletClient, debug: boolean = false): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await baseX402Fetch(wallet, `${CONFIG.serverUrl}/noLimitLLM`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: randomItem(CHAT_MESSAGES), userAddress: wallet.address }),
    }, debug);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

async function executeMixerBase(wallet: BaseWalletClient): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await baseX402Fetch(wallet, `${CONFIG.serverUrl}/noLimitMixer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: randomItem(MIXER_CONFIG.base.tokens),
        amount: randomItem(MIXER_CONFIG.base.amounts),
        recipientAddress: generateRandomAddress('base'),
        userAddress: wallet.address,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

async function executeSwapBase(wallet: BaseWalletClient): Promise<{ success: boolean; error?: string }> {
  try {
    const pair = randomItem(SWAP_PAIRS.base);
    const response = await baseX402Fetch(wallet, `${CONFIG.serverUrl}/noLimitSwap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chain: 'base',
        fromToken: pair.from,
        toToken: pair.to,
        amount: pair.amount,
        userAddress: wallet.address,
        slippage: 1,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

// ============================================================================
// TRANSACTION EXECUTORS - SOLANA
// ============================================================================

async function executeChatSolana(wallet: SolanaWalletClient): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await solanaX402Fetch(wallet, `${CONFIG.serverUrl}/noLimitLLM/solana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: randomItem(CHAT_MESSAGES), userAddress: wallet.address }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

async function executeMixerSolana(wallet: SolanaWalletClient): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await solanaX402Fetch(wallet, `${CONFIG.serverUrl}/noLimitMixer/solana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: randomItem(MIXER_CONFIG.solana.tokens),
        amount: randomItem(MIXER_CONFIG.solana.amounts),
        recipientAddress: generateRandomAddress('solana'),
        userAddress: wallet.address,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

async function executeSwapSolana(wallet: SolanaWalletClient): Promise<{ success: boolean; error?: string }> {
  try {
    const pair = randomItem(SWAP_PAIRS.solana);
    const response = await solanaX402Fetch(wallet, `${CONFIG.serverUrl}/noLimitSwap/solana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chain: 'solana',
        fromToken: pair.from,
        toToken: pair.to,
        amount: pair.amount,
        userAddress: wallet.address,
        slippage: 1,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

// ============================================================================
// MAIN SIMULATION
// ============================================================================

function isOutOfFundsError(error: string): boolean {
  const outOfFundsPatterns = [
    'insufficient',
    'not enough',
    'exceeds balance',
    'insufficient funds',
    'insufficient_balance',
    'invalid_transaction_state', // Often means can't pay
    'transfer amount exceeds',
  ];
  const lowerError = error.toLowerCase();
  return outOfFundsPatterns.some(p => lowerError.includes(p));
}

async function runLiveSimulation(wallets: WalletsFile) {
  const TOTAL_DURATION_MS = CONFIG.durationHours * 60 * 60 * 1000;
  
  console.log('\n' + '='.repeat(70));
  console.log('🚀 LIVE x402 ACTIVITY SIMULATION (CONTINUOUS MODE)');
  console.log('='.repeat(70));
  console.log(`\n📊 Configuration:`);
  console.log(`   Server URL: ${CONFIG.serverUrl}`);
  console.log(`   Base wallets: ${wallets.base.length}`);
  console.log(`   Solana wallets: ${wallets.solana.length}`);
  console.log(`   Mode: CONTINUOUS (until out of funds)`);
  console.log(`   Duration: ${CONFIG.durationHours} hours`);
  
  // Initialize wallet clients
  console.log('\n🔐 Initializing wallet clients...');
  
  const baseClients: BaseWalletClient[] = [];
  const solanaClients: SolanaWalletClient[] = [];
  
  // Track which wallets are still active (have funds)
  const activeBaseWallets = new Set<number>();
  const activeSolanaWallets = new Set<number>();
  
  for (let i = 0; i < wallets.base.length; i++) {
    try {
      baseClients.push(createBaseWalletClient(wallets.base[i].privateKey));
      activeBaseWallets.add(i);
    } catch (e) {
      console.error(`❌ Base wallet init failed: ${wallets.base[i].address?.slice(0, 10)}`);
    }
  }
  console.log(`   ✅ Base wallets: ${baseClients.length}/${wallets.base.length}`);
  
  for (let i = 0; i < wallets.solana.length; i++) {
    try {
      solanaClients.push(createSolanaWalletClient(wallets.solana[i].privateKey));
      activeSolanaWallets.add(i);
    } catch (e) {
      console.error(`❌ Solana wallet init failed`);
    }
  }
  console.log(`   ✅ Solana wallets: ${solanaClients.length}/${wallets.solana.length}`);
  
  const stats: Stats = {
    total: 0, success: 0, failed: 0,
    chat: 0, mixer: 0, swap: 0,
    chatFailed: 0, mixerFailed: 0, swapFailed: 0,
    usdcSpent: 0,
  };
  
  const startTime = Date.now();
  const endTime = startTime + TOTAL_DURATION_MS;
  
  // Calculate interval based on total active wallets
  // Aim for ~25 tx per wallet over 4 hours as baseline
  const estimatedTotalTx = (activeBaseWallets.size + activeSolanaWallets.size) * 25;
  let intervalMs = TOTAL_DURATION_MS / estimatedTotalTx;
  
  console.log(`\n📅 Estimated ~${estimatedTotalTx} transactions`);
  console.log(`   Base interval: ${(intervalMs / 1000).toFixed(2)} seconds`);
  console.log(`🚀 Starting at ${new Date(startTime).toISOString()}`);
  console.log(`   End time: ${new Date(endTime).toISOString()}`);
  console.log(`\n⏳ Running until all wallets are empty or time runs out...\n`);
  
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 20; // Stop if 20 failures in a row (likely all wallets empty)
  
  // Main loop - continue until out of time or all wallets empty
  while (Date.now() < endTime && (activeBaseWallets.size > 0 || activeSolanaWallets.size > 0)) {
    // Pick a random active wallet
    const totalActive = activeBaseWallets.size + activeSolanaWallets.size;
    if (totalActive === 0) break;
    
    // Decide chain based on available wallets
    let chain: Chain;
    if (activeBaseWallets.size === 0) {
      chain = 'solana';
    } else if (activeSolanaWallets.size === 0) {
      chain = 'base';
    } else {
      // Random chain weighted by active wallet count
      chain = Math.random() < (activeBaseWallets.size / totalActive) ? 'base' : 'solana';
    }
    
    // Pick random wallet from active set
    let walletIndex: number;
    if (chain === 'base') {
      const activeArray = Array.from(activeBaseWallets);
      walletIndex = activeArray[Math.floor(Math.random() * activeArray.length)];
    } else {
      const activeArray = Array.from(activeSolanaWallets);
      walletIndex = activeArray[Math.floor(Math.random() * activeArray.length)];
    }
    
    // Pick transaction type based on distribution
    const rand = Math.random();
    const type: TransactionType = rand < CONFIG.distribution.chat ? 'chat' 
      : rand < CONFIG.distribution.chat + CONFIG.distribution.mixer ? 'mixer' : 'swap';
    
    let result: { success: boolean; error?: string };
    const isDebugBase = chain === 'base' && stats.total < 3;
    
    try {
      if (chain === 'base') {
        const client = baseClients[walletIndex];
        if (type === 'chat') {
          result = await executeChatBase(client, isDebugBase);
          if (result.success) { stats.chat++; stats.usdcSpent += CONFIG.fees.chat; }
          else stats.chatFailed++;
        } else if (type === 'mixer') {
          result = await executeMixerBase(client);
          if (result.success) { stats.mixer++; stats.usdcSpent += CONFIG.fees.mixer; }
          else stats.mixerFailed++;
        } else {
          result = await executeSwapBase(client);
          if (result.success) { stats.swap++; stats.usdcSpent += CONFIG.fees.swap; }
          else stats.swapFailed++;
        }
        
        // Check if wallet is out of funds
        if (!result.success && result.error && isOutOfFundsError(result.error)) {
          activeBaseWallets.delete(walletIndex);
          console.log(`💸 Base wallet ${walletIndex} out of funds (${activeBaseWallets.size} remaining)`);
        }
      } else {
        const client = solanaClients[walletIndex];
        if (type === 'chat') {
          result = await executeChatSolana(client);
          if (result.success) { stats.chat++; stats.usdcSpent += CONFIG.fees.chat; }
          else stats.chatFailed++;
        } else if (type === 'mixer') {
          result = await executeMixerSolana(client);
          if (result.success) { stats.mixer++; stats.usdcSpent += CONFIG.fees.mixer; }
          else stats.mixerFailed++;
        } else {
          result = await executeSwapSolana(client);
          if (result.success) { stats.swap++; stats.usdcSpent += CONFIG.fees.swap; }
          else stats.swapFailed++;
        }
        
        // Check if wallet is out of funds
        if (!result.success && result.error && isOutOfFundsError(result.error)) {
          activeSolanaWallets.delete(walletIndex);
          console.log(`💸 Solana wallet ${walletIndex} out of funds (${activeSolanaWallets.size} remaining)`);
        }
      }
      
      if (result.success) {
        stats.success++;
        consecutiveFailures = 0;
      } else {
        stats.failed++;
        consecutiveFailures++;
      }
      stats.total++;
      
      // Log progress
      if (stats.total <= 10 || stats.total % 25 === 0) {
        const elapsed = Date.now() - startTime;
        const remaining = endTime - Date.now();
        const pct = ((elapsed / TOTAL_DURATION_MS) * 100).toFixed(1);
        if (!result.success) {
          console.log(`❌ Tx ${stats.total} failed (${chain}/${type}): ${result.error}`);
        }
        console.log(`📊 [${pct}% time] Tx: ${stats.total} | ✅ ${stats.success} ❌ ${stats.failed} | Active: Base ${activeBaseWallets.size} Sol ${activeSolanaWallets.size} | ETA: ${formatTime(remaining)}`);
      }
      
      // Check for too many consecutive failures
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.log(`\n⚠️  ${MAX_CONSECUTIVE_FAILURES} consecutive failures - likely all wallets empty. Stopping.`);
        break;
      }
      
    } catch (error) {
      stats.failed++;
      stats.total++;
      consecutiveFailures++;
      console.error(`❌ Tx ${stats.total} exception:`, error instanceof Error ? error.message : error);
    }
    
    // Wait for next transaction (with some randomness)
    const jitter = intervalMs * (0.5 + Math.random()); // 50-150% of interval
    await sleep(jitter);
    
    // Recalculate interval if wallets dropped significantly
    const newTotalActive = activeBaseWallets.size + activeSolanaWallets.size;
    if (newTotalActive > 0 && newTotalActive < totalActive * 0.8) {
      // Fewer wallets, adjust interval to spread remaining transactions
      const remainingTime = endTime - Date.now();
      const estimatedRemainingTx = newTotalActive * 25;
      intervalMs = remainingTime / estimatedRemainingTx;
      console.log(`📏 Adjusted interval to ${(intervalMs / 1000).toFixed(2)}s (${newTotalActive} active wallets)`);
    }
  }
  
  // Report
  const totalDuration = Date.now() - startTime;
  console.log('\n' + '='.repeat(70));
  console.log('✅ SIMULATION COMPLETE');
  console.log('='.repeat(70));
  console.log(`Duration: ${formatTime(totalDuration)}`);
  console.log(`Total: ${stats.total} | Success: ${stats.success} | Failed: ${stats.failed}`);
  console.log(`Chat: ${stats.chat}/${stats.chat + stats.chatFailed}`);
  console.log(`Mixer: ${stats.mixer}/${stats.mixer + stats.mixerFailed}`);
  console.log(`Swap: ${stats.swap}/${stats.swap + stats.swapFailed}`);
  console.log(`💰 USDC Spent: $${stats.usdcSpent.toFixed(2)}`);
  console.log(`\nRemaining active wallets: Base ${activeBaseWallets.size}, Solana ${activeSolanaWallets.size}`);
  
  if (activeBaseWallets.size === 0 && activeSolanaWallets.size === 0) {
    console.log('\n🏁 All wallets exhausted - mission accomplished!');
  } else if (Date.now() >= endTime) {
    console.log('\n⏰ Time limit reached');
  }
}

async function main() {
  console.log('\n🎯 NoLimit LIVE x402 Activity Simulator\n');
  
  const walletFilePath = process.argv[2];
  if (!walletFilePath) {
    console.log('Usage: npx tsx scripts/simulate-live-x402.ts <wallet-file.json>');
    console.log('\nWallet file format:');
    console.log(JSON.stringify({
      base: [{ address: "0x...", privateKey: "0x..." }],
      solana: [{ address: "...", privateKey: "..." }]
    }, null, 2));
    process.exit(1);
  }
  
  const wallets = loadWallets(walletFilePath);
  console.log(`✅ Loaded ${wallets.base.length} Base + ${wallets.solana.length} Solana wallets`);
  
  console.log('\n⚠️  WARNING: Real x402 calls - costs USDC!');
  console.log('   Starting in 5 seconds... (Ctrl+C to cancel)\n');
  await sleep(5000);
  
  await runLiveSimulation(wallets);
}

main().catch(console.error);
