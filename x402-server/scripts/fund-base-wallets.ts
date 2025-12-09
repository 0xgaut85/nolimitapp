/**
 * Base Wallet Funding Script
 * 
 * Distributes ETH (for gas) and USDC from the funder wallet to all Base wallets.
 * 
 * Requirements:
 * - Send ETH and USDC to the funder wallet first
 * - ETH needed: ~0.0005 ETH per wallet for gas (0.035 ETH total for 70 wallets)
 * - USDC needed: ~1.45 USDC per wallet ($101.50 total for 70 wallets)
 */

import { config } from 'dotenv';
import { Wallet, JsonRpcProvider, parseEther, parseUnits, formatEther, formatUnits, Contract } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Base chain RPC
  rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  
  // USDC contract on Base
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  
  // Amount to send per wallet
  ethPerWallet: '0.0005',   // 0.0005 ETH for gas fees
  usdcPerWallet: '1.45',    // 1.45 USDC for x402 fees
  
  // Delay between transactions (ms)
  txDelay: 2000,
};

// ERC20 ABI (minimal for transfer)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// ============================================================================
// FUNDER WALLET
// ============================================================================

// FUNDER WALLET - Send ETH and USDC here first!
const FUNDER_WALLET = {
  address: '0x9D3f5b8C8E4d2A1F7c6B0E9a8D7C6B5A4F3E2D1C',
  privateKey: '0x0000000000000000000000000000000000000000000000000000000000000000', // Will be generated
};

// ============================================================================
// HELPERS
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

function loadWallets(jsonPath?: string): WalletsFile {
  let filepath = jsonPath;
  
  if (!filepath) {
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
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function loadFunderWallet(): { address: string; privateKey: string } {
  const funderPath = path.join(__dirname, '..', 'funder-wallet.json');
  
  if (!fs.existsSync(funderPath)) {
    throw new Error('Funder wallet not found. Run this script with "generate" argument first.');
  }
  
  return JSON.parse(fs.readFileSync(funderPath, 'utf-8'));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// GENERATE FUNDER WALLET
// ============================================================================

async function generateFunderWallet() {
  console.log('\n🔐 Generating Funder Wallet for Base...\n');
  
  const wallet = Wallet.createRandom();
  
  const funderData = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    generated: new Date().toISOString(),
    network: 'Base (Chain ID: 8453)',
  };
  
  // Save to JSON file
  const jsonPath = path.join(__dirname, '..', 'funder-wallet.json');
  fs.writeFileSync(jsonPath, JSON.stringify(funderData, null, 2));
  
  // Save to text file in Documents
  const documentsPath = process.env.USERPROFILE 
    ? path.join(process.env.USERPROFILE, 'Documents')
    : path.join(__dirname, '..');
  const txtPath = path.join(documentsPath, 'funder-wallet-base.txt');
  
  const txtContent = `
===========================================
NOLIMIT - BASE FUNDER WALLET
===========================================

⚠️  KEEP THIS SECURE - CONTAINS PRIVATE KEY  ⚠️

Network: Base Mainnet (Chain ID: 8453)
Generated: ${funderData.generated}

ADDRESS (send ETH and USDC here):
${wallet.address}

PRIVATE KEY:
${wallet.privateKey}

===========================================
FUNDING REQUIREMENTS FOR 70 BASE WALLETS
===========================================

ETH for gas:  0.035 ETH (0.0005 ETH × 70 wallets)
USDC:         101.50 USDC (1.45 USDC × 70 wallets)

After funding, run:
  npm run fund-base

===========================================
`;

  fs.writeFileSync(txtPath, txtContent);
  
  console.log('='.repeat(60));
  console.log('✅ FUNDER WALLET GENERATED');
  console.log('='.repeat(60));
  console.log(`\n📍 Address: ${wallet.address}`);
  console.log(`\n💰 Send to this address on BASE CHAIN:`);
  console.log(`   • ETH:  0.035 ETH (for gas fees)`);
  console.log(`   • USDC: 101.50 USDC (for x402 fees)`);
  console.log(`\n📄 Saved to:`);
  console.log(`   • ${jsonPath}`);
  console.log(`   • ${txtPath}`);
  console.log('\n⚡ After funding, run: npm run fund-base');
  console.log('='.repeat(60));
  
  return funderData;
}

// ============================================================================
// CHECK BALANCES
// ============================================================================

async function checkBalances() {
  const funder = loadFunderWallet();
  const provider = new JsonRpcProvider(CONFIG.rpcUrl);
  
  console.log('\n💰 Checking Funder Wallet Balances...\n');
  console.log(`   Address: ${funder.address}`);
  
  // Check ETH balance
  const ethBalance = await provider.getBalance(funder.address);
  console.log(`   ETH Balance: ${formatEther(ethBalance)} ETH`);
  
  // Check USDC balance
  const usdc = new Contract(CONFIG.usdcAddress, ERC20_ABI, provider);
  const usdcBalance = await usdc.balanceOf(funder.address);
  const usdcDecimals = await usdc.decimals();
  console.log(`   USDC Balance: ${formatUnits(usdcBalance, usdcDecimals)} USDC`);
  
  // Calculate requirements
  const wallets = loadWallets();
  const numWallets = wallets.base.length;
  const ethNeeded = parseFloat(CONFIG.ethPerWallet) * numWallets;
  const usdcNeeded = parseFloat(CONFIG.usdcPerWallet) * numWallets;
  
  console.log(`\n📊 Requirements for ${numWallets} wallets:`);
  console.log(`   ETH needed:  ${ethNeeded.toFixed(4)} ETH`);
  console.log(`   USDC needed: ${usdcNeeded.toFixed(2)} USDC`);
  
  const ethSufficient = parseFloat(formatEther(ethBalance)) >= ethNeeded;
  const usdcSufficient = parseFloat(formatUnits(usdcBalance, usdcDecimals)) >= usdcNeeded;
  
  console.log(`\n${ethSufficient ? '✅' : '❌'} ETH: ${ethSufficient ? 'Sufficient' : 'INSUFFICIENT'}`);
  console.log(`${usdcSufficient ? '✅' : '❌'} USDC: ${usdcSufficient ? 'Sufficient' : 'INSUFFICIENT'}`);
  
  return { ethSufficient, usdcSufficient, ethBalance, usdcBalance };
}

// ============================================================================
// FUND WALLETS
// ============================================================================

async function fundWallets() {
  const funder = loadFunderWallet();
  const wallets = loadWallets();
  const provider = new JsonRpcProvider(CONFIG.rpcUrl);
  const funderWallet = new Wallet(funder.privateKey, provider);
  
  console.log('\n🚀 Starting Base Wallet Funding...\n');
  console.log(`   Funder: ${funder.address}`);
  console.log(`   Wallets to fund: ${wallets.base.length}`);
  console.log(`   ETH per wallet: ${CONFIG.ethPerWallet} ETH`);
  console.log(`   USDC per wallet: ${CONFIG.usdcPerWallet} USDC`);
  
  // Check balances first
  const balances = await checkBalances();
  
  if (!balances.ethSufficient || !balances.usdcSufficient) {
    console.log('\n❌ Insufficient funds. Please add more funds to the funder wallet.');
    return;
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log('Starting distribution in 5 seconds... (Ctrl+C to cancel)');
  console.log('-'.repeat(60));
  await sleep(5000);
  
  const usdc = new Contract(CONFIG.usdcAddress, ERC20_ABI, funderWallet);
  const usdcDecimals = await usdc.decimals();
  const usdcAmount = parseUnits(CONFIG.usdcPerWallet, usdcDecimals);
  const ethAmount = parseEther(CONFIG.ethPerWallet);
  
  const stats = {
    ethSuccess: 0,
    ethFailed: 0,
    usdcSuccess: 0,
    usdcFailed: 0,
  };
  
  for (let i = 0; i < wallets.base.length; i++) {
    const wallet = wallets.base[i];
    console.log(`\n[${i + 1}/${wallets.base.length}] Funding ${wallet.address.slice(0, 10)}...`);
    
    // Send ETH
    try {
      const ethTx = await funderWallet.sendTransaction({
        to: wallet.address,
        value: ethAmount,
      });
      await ethTx.wait();
      console.log(`   ✅ ETH sent: ${ethTx.hash.slice(0, 20)}...`);
      stats.ethSuccess++;
    } catch (error) {
      console.log(`   ❌ ETH failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      stats.ethFailed++;
    }
    
    await sleep(CONFIG.txDelay);
    
    // Send USDC
    try {
      const usdcTx = await usdc.transfer(wallet.address, usdcAmount);
      await usdcTx.wait();
      console.log(`   ✅ USDC sent: ${usdcTx.hash.slice(0, 20)}...`);
      stats.usdcSuccess++;
    } catch (error) {
      console.log(`   ❌ USDC failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      stats.usdcFailed++;
    }
    
    await sleep(CONFIG.txDelay);
  }
  
  // Final report
  console.log('\n' + '='.repeat(60));
  console.log('✅ FUNDING COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nETH transfers:  ${stats.ethSuccess} success, ${stats.ethFailed} failed`);
  console.log(`USDC transfers: ${stats.usdcSuccess} success, ${stats.usdcFailed} failed`);
  console.log(`\nTotal ETH sent:  ${(stats.ethSuccess * parseFloat(CONFIG.ethPerWallet)).toFixed(4)} ETH`);
  console.log(`Total USDC sent: ${(stats.usdcSuccess * parseFloat(CONFIG.usdcPerWallet)).toFixed(2)} USDC`);
  console.log('='.repeat(60));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const command = process.argv[2] || 'help';
  
  console.log('\n🏦 NoLimit Base Wallet Funder\n');
  
  switch (command) {
    case 'generate':
      await generateFunderWallet();
      break;
    
    case 'check':
      await checkBalances();
      break;
    
    case 'fund':
      await fundWallets();
      break;
    
    default:
      console.log('Usage:');
      console.log('  npx tsx scripts/fund-base-wallets.ts generate  - Create funder wallet');
      console.log('  npx tsx scripts/fund-base-wallets.ts check     - Check funder balance');
      console.log('  npx tsx scripts/fund-base-wallets.ts fund      - Distribute to all wallets');
      break;
  }
}

main().catch(console.error);


