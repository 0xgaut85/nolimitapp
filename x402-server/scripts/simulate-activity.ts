/**
 * Activity Simulation Script for NoLimit x402 Platform
 * 
 * Generates simulated activity across the platform:
 * - 80% Chat (noLimitLLM) - $0.05 per transaction
 * - 15% Mixer (noLimitMixer) - $0.075 per transaction
 * - 5% Swap (noLimitSwap) - $0.10 per transaction
 * 
 * Configuration:
 * - 100 wallets (70 Base + 30 Solana)
 * - 25 transactions per wallet
 * - 2,500 total transactions
 * - 4 hours duration (~5.76 seconds between transactions)
 * 
 * Modes:
 * - DATABASE: Direct database insertion (no actual payments, for testing/metrics)
 * - LIVE: Real x402 calls (requires funded wallets with USDC)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Configuration
const CONFIG = {
  totalTransactions: 2500,
  transactionsPerWallet: 25,
  durationHours: 4,
  distribution: {
    chat: 0.80,    // 80%
    mixer: 0.15,   // 15%
    swap: 0.05,    // 5%
  },
  fees: {
    chat: '0.05',
    mixer: '0.075',
    swap: '0.10',
  },
  // Server URL for live mode
  serverUrl: process.env.X402_SERVER_URL || 'https://x402.nolimit.foundation',
};

// Sample messages for chat simulation
const CHAT_MESSAGES = [
  "What's the current state of crypto regulation?",
  "Explain how zero-knowledge proofs work",
  "What are the best practices for smart contract security?",
  "How does the Lightning Network work?",
  "Explain MEV and its impact on DeFi",
  "What is account abstraction in Ethereum?",
  "How do rollups scale Ethereum?",
  "Explain the differences between optimistic and ZK rollups",
  "What are the risks of yield farming?",
  "How do decentralized oracles work?",
  "Explain impermanent loss in AMMs",
  "What is the future of cross-chain bridges?",
  "How does Solana achieve high throughput?",
  "What are the trade-offs of different consensus mechanisms?",
  "Explain how DAOs make decisions",
  "What are soulbound tokens?",
  "How do privacy coins work?",
  "Explain the concept of liquid staking",
  "What are inscription protocols?",
  "How does atomic swap work?",
];

// Token pairs for swap simulation
const SWAP_PAIRS = {
  base: [
    { from: 'ETH', to: 'USDC', amount: '100000000000000000' }, // 0.1 ETH
    { from: 'USDC', to: 'ETH', amount: '100000000' }, // 100 USDC
    { from: 'ETH', to: 'USDT', amount: '50000000000000000' }, // 0.05 ETH
  ],
  solana: [
    { from: 'SOL', to: 'USDC', amount: '100000000' }, // 0.1 SOL
    { from: 'USDC', to: 'SOL', amount: '10000000' }, // 10 USDC
    { from: 'SOL', to: 'USDT', amount: '50000000' }, // 0.05 SOL
  ],
};

// Mixer tokens for simulation
const MIXER_TOKENS = {
  base: ['ETH', 'USDC'],
  solana: ['SOL', 'USDC'],
};

interface Wallet {
  address: string;
  privateKey: string;
}

interface WalletsData {
  generated: string;
  base: Wallet[];
  solana: Wallet[];
}

type TransactionType = 'chat' | 'mixer' | 'swap';
type Chain = 'base' | 'solana';

interface SimulatedTransaction {
  type: TransactionType;
  chain: Chain;
  walletAddress: string;
  timestamp: Date;
}

// Helper to get random item from array
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to generate random address for mixer recipient
function generateRandomAddress(chain: Chain): string {
  if (chain === 'solana') {
    // Generate random 44-char base58 string (Solana format)
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  } else {
    // Generate random Ethereum address
    const hex = '0123456789abcdef';
    let result = '0x';
    for (let i = 0; i < 40; i++) {
      result += hex.charAt(Math.floor(Math.random() * hex.length));
    }
    return result;
  }
}

// Load wallets from JSON file
function loadWallets(jsonPath?: string): WalletsData {
  let filepath = jsonPath;
  
  if (!filepath) {
    // Find the most recent wallets JSON file
    const scriptsDir = path.join(__dirname, '..');
    const files = fs.readdirSync(scriptsDir)
      .filter(f => f.startsWith('wallets-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      throw new Error('No wallet file found. Run generate-wallets.ts first.');
    }
    
    filepath = path.join(scriptsDir, files[0]);
  }
  
  console.log(`📂 Loading wallets from: ${filepath}`);
  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  
  return data as WalletsData;
}

// Create or get user in database
async function getOrCreateUser(address: string) {
  let user = await prisma.user.findUnique({ where: { address } });
  if (!user) {
    user = await prisma.user.create({ data: { address } });
  }
  return user;
}

// Simulate chat transaction
async function simulateChatTransaction(
  userId: string,
  userAddress: string,
  chain: Chain
) {
  const message = randomItem(CHAT_MESSAGES);
  const response = `[Simulated Response] This is a simulated AI response to: "${message.substring(0, 50)}..."`;
  
  // Create agent usage record
  await prisma.agentUsage.create({
    data: {
      userId,
      message,
      response,
      fee: CONFIG.fees.chat,
    },
  });
  
  // Create payment record
  await prisma.payment.create({
    data: {
      userId,
      amount: CONFIG.fees.chat,
      currency: 'USDC',
      chain,
      service: 'noLimitLLM',
      status: 'completed',
    },
  });
  
  return { type: 'chat', message: message.substring(0, 40) };
}

// Simulate swap transaction
async function simulateSwapTransaction(
  userId: string,
  userAddress: string,
  chain: Chain
) {
  const pairs = chain === 'solana' ? SWAP_PAIRS.solana : SWAP_PAIRS.base;
  const pair = randomItem(pairs);
  
  // Calculate simulated output (with some random variance)
  const variance = 0.95 + Math.random() * 0.1; // 95% to 105%
  const toAmount = Math.floor(parseFloat(pair.amount) * variance).toString();
  
  // Create swap usage record
  await prisma.swapUsage.create({
    data: {
      userId,
      chain,
      fromToken: pair.from,
      toToken: pair.to,
      fromAmount: pair.amount,
      toAmount,
      fee: CONFIG.fees.swap,
      txHash: `simulated_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    },
  });
  
  // Create payment record
  await prisma.payment.create({
    data: {
      userId,
      amount: CONFIG.fees.swap,
      currency: 'USDC',
      chain,
      service: 'noLimitSwap',
      status: 'completed',
    },
  });
  
  return { type: 'swap', pair: `${pair.from} -> ${pair.to}` };
}

// Simulate mixer transaction
async function simulateMixerTransaction(
  userId: string,
  userAddress: string,
  chain: Chain
) {
  const tokens = chain === 'solana' ? MIXER_TOKENS.solana : MIXER_TOKENS.base;
  const token = randomItem(tokens);
  const amount = (Math.random() * 10 + 0.1).toFixed(4); // 0.1 to 10.1
  const fee = (parseFloat(amount) * 0.01).toFixed(6); // 1% mixer fee
  
  // Create mix request record
  await prisma.mixRequest.create({
    data: {
      chain,
      token,
      amount,
      fee,
      senderAddress: userAddress,
      recipientAddress: generateRandomAddress(chain),
      depositAddress: generateRandomAddress(chain),
      status: 'completed',
    },
  });
  
  // Create payment record (x402 fee)
  await prisma.payment.create({
    data: {
      userId,
      amount: CONFIG.fees.mixer,
      currency: 'USDC',
      chain,
      service: 'mixer',
      status: 'completed',
    },
  });
  
  return { type: 'mixer', token, amount };
}

// Main simulation function for DATABASE mode
async function runDatabaseSimulation(wallets: WalletsData) {
  const totalWallets = wallets.base.length + wallets.solana.length;
  const txPerWallet = CONFIG.transactionsPerWallet;
  const totalTx = totalWallets * txPerWallet;
  const durationMs = CONFIG.durationHours * 60 * 60 * 1000;
  const intervalMs = durationMs / totalTx;
  
  console.log('\n📊 Simulation Configuration:');
  console.log(`   Total wallets: ${totalWallets} (${wallets.base.length} Base + ${wallets.solana.length} Solana)`);
  console.log(`   Transactions per wallet: ${txPerWallet}`);
  console.log(`   Total transactions: ${totalTx}`);
  console.log(`   Duration: ${CONFIG.durationHours} hours`);
  console.log(`   Interval: ${(intervalMs / 1000).toFixed(2)} seconds between transactions`);
  console.log(`   Distribution: Chat ${CONFIG.distribution.chat * 100}%, Mixer ${CONFIG.distribution.mixer * 100}%, Swap ${CONFIG.distribution.swap * 100}%`);
  
  // Create transaction schedule
  const schedule: SimulatedTransaction[] = [];
  
  // For each wallet, add its transactions
  const allWallets: { wallet: Wallet; chain: Chain }[] = [
    ...wallets.base.map(w => ({ wallet: w, chain: 'base' as Chain })),
    ...wallets.solana.map(w => ({ wallet: w, chain: 'solana' as Chain })),
  ];
  
  for (const { wallet, chain } of allWallets) {
    for (let i = 0; i < txPerWallet; i++) {
      // Determine transaction type based on distribution
      const rand = Math.random();
      let type: TransactionType;
      
      if (rand < CONFIG.distribution.chat) {
        type = 'chat';
      } else if (rand < CONFIG.distribution.chat + CONFIG.distribution.mixer) {
        type = 'mixer';
      } else {
        type = 'swap';
      }
      
      schedule.push({
        type,
        chain,
        walletAddress: wallet.address,
        timestamp: new Date(), // Will be set later
      });
    }
  }
  
  // Shuffle the schedule to distribute transactions randomly over time
  for (let i = schedule.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [schedule[i], schedule[j]] = [schedule[j], schedule[i]];
  }
  
  // Set timestamps
  const startTime = Date.now();
  schedule.forEach((tx, index) => {
    tx.timestamp = new Date(startTime + index * intervalMs);
  });
  
  // Statistics
  const stats = {
    total: 0,
    chat: 0,
    mixer: 0,
    swap: 0,
    errors: 0,
    startTime: new Date(),
  };
  
  console.log(`\n🚀 Starting simulation at ${stats.startTime.toISOString()}`);
  console.log(`   Expected completion: ${new Date(startTime + durationMs).toISOString()}\n`);
  
  // Process transactions
  for (let i = 0; i < schedule.length; i++) {
    const tx = schedule[i];
    const now = Date.now();
    const waitTime = tx.timestamp.getTime() - now;
    
    // Wait until scheduled time
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    try {
      // Get or create user
      const user = await getOrCreateUser(tx.walletAddress);
      
      // Execute transaction based on type
      let result: { type: string; [key: string]: any };
      
      switch (tx.type) {
        case 'chat':
          result = await simulateChatTransaction(user.id, tx.walletAddress, tx.chain);
          stats.chat++;
          break;
        case 'mixer':
          result = await simulateMixerTransaction(user.id, tx.walletAddress, tx.chain);
          stats.mixer++;
          break;
        case 'swap':
          result = await simulateSwapTransaction(user.id, tx.walletAddress, tx.chain);
          stats.swap++;
          break;
      }
      
      stats.total++;
      
      // Progress update every 50 transactions
      if (stats.total % 50 === 0 || stats.total === schedule.length) {
        const progress = ((stats.total / schedule.length) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        console.log(`📈 Progress: ${stats.total}/${schedule.length} (${progress}%) | Elapsed: ${elapsed}min | Chat: ${stats.chat} | Mixer: ${stats.mixer} | Swap: ${stats.swap}`);
      }
      
    } catch (error) {
      stats.errors++;
      console.error(`❌ Error processing transaction ${i + 1}:`, error);
    }
  }
  
  // Final report
  const totalTime = (Date.now() - startTime) / 1000 / 60;
  console.log('\n' + '='.repeat(60));
  console.log('✅ SIMULATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total transactions: ${stats.total}`);
  console.log(`  - Chat: ${stats.chat} (${((stats.chat / stats.total) * 100).toFixed(1)}%)`);
  console.log(`  - Mixer: ${stats.mixer} (${((stats.mixer / stats.total) * 100).toFixed(1)}%)`);
  console.log(`  - Swap: ${stats.swap} (${((stats.swap / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Total time: ${totalTime.toFixed(2)} minutes`);
  console.log(`Revenue generated: $${(stats.chat * 0.05 + stats.mixer * 0.075 + stats.swap * 0.1).toFixed(2)}`);
  console.log('='.repeat(60));
}

// Quick mode - run all transactions immediately without delays
async function runQuickSimulation(wallets: WalletsData) {
  const totalWallets = wallets.base.length + wallets.solana.length;
  const txPerWallet = CONFIG.transactionsPerWallet;
  const totalTx = totalWallets * txPerWallet;
  
  console.log('\n⚡ QUICK MODE - Running all transactions without delays');
  console.log(`   Total wallets: ${totalWallets}`);
  console.log(`   Total transactions: ${totalTx}\n`);
  
  const stats = { total: 0, chat: 0, mixer: 0, swap: 0, errors: 0 };
  const startTime = Date.now();
  
  const allWallets: { wallet: Wallet; chain: Chain }[] = [
    ...wallets.base.map(w => ({ wallet: w, chain: 'base' as Chain })),
    ...wallets.solana.map(w => ({ wallet: w, chain: 'solana' as Chain })),
  ];
  
  for (const { wallet, chain } of allWallets) {
    const user = await getOrCreateUser(wallet.address);
    
    for (let i = 0; i < txPerWallet; i++) {
      try {
        const rand = Math.random();
        
        if (rand < CONFIG.distribution.chat) {
          await simulateChatTransaction(user.id, wallet.address, chain);
          stats.chat++;
        } else if (rand < CONFIG.distribution.chat + CONFIG.distribution.mixer) {
          await simulateMixerTransaction(user.id, wallet.address, chain);
          stats.mixer++;
        } else {
          await simulateSwapTransaction(user.id, wallet.address, chain);
          stats.swap++;
        }
        
        stats.total++;
        
        if (stats.total % 100 === 0) {
          console.log(`📈 Progress: ${stats.total}/${totalTx} (${((stats.total / totalTx) * 100).toFixed(1)}%)`);
        }
      } catch (error) {
        stats.errors++;
      }
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n✅ Quick simulation complete!');
  console.log(`   Total: ${stats.total} | Chat: ${stats.chat} | Mixer: ${stats.mixer} | Swap: ${stats.swap}`);
  console.log(`   Errors: ${stats.errors} | Time: ${elapsed}s`);
}

// Main entry point
async function main() {
  console.log('\n🎯 NoLimit Activity Simulator\n');
  console.log('='.repeat(60));
  
  const mode = process.argv[2] || 'quick'; // 'quick' or 'timed'
  const walletsPath = process.argv[3]; // Optional path to wallets JSON
  
  try {
    // Load wallets
    const wallets = loadWallets(walletsPath);
    console.log(`✅ Loaded ${wallets.base.length} Base + ${wallets.solana.length} Solana wallets`);
    
    if (mode === 'quick') {
      await runQuickSimulation(wallets);
    } else if (mode === 'timed') {
      await runDatabaseSimulation(wallets);
    } else {
      console.log('\nUsage: npx tsx scripts/simulate-activity.ts [mode] [wallets-path]');
      console.log('Modes:');
      console.log('  quick  - Run all transactions immediately (default)');
      console.log('  timed  - Run transactions over 4 hours (realistic timing)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


