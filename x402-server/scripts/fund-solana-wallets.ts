/**
 * Solana Wallet Funding Script
 * 
 * Distributes SOL (for gas) and USDC from the funder wallet to all Solana wallets.
 * 
 * Requirements:
 * - Send SOL and USDC to the funder wallet first
 * - SOL needed: ~0.005 SOL per wallet for rent + fees (0.15 SOL total for 30 wallets)
 * - USDC needed: ~1.45 USDC per wallet ($43.50 total for 30 wallets)
 */

import { config } from 'dotenv';
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';

config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Solana RPC
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  
  // USDC mint on Solana mainnet
  usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  
  // Amount to send per wallet
  solPerWallet: 0.005,    // 0.005 SOL for rent + fees
  usdcPerWallet: 1.45,    // 1.45 USDC for x402 fees
  
  // Delay between transactions (ms)
  txDelay: 1000,
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

interface FunderWallet {
  address: string;
  privateKey: string;
  generated: string;
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

function loadFunderWallet(): FunderWallet {
  const funderPath = path.join(__dirname, '..', 'funder-wallet-solana.json');
  
  if (!fs.existsSync(funderPath)) {
    throw new Error('Solana funder wallet not found. Run this script with "generate" argument first.');
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
  console.log('\n🔐 Generating Funder Wallet for Solana...\n');
  
  const keypair = Keypair.generate();
  
  const funderData: FunderWallet = {
    address: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey),
    generated: new Date().toISOString(),
  };
  
  // Save to JSON file
  const jsonPath = path.join(__dirname, '..', 'funder-wallet-solana.json');
  fs.writeFileSync(jsonPath, JSON.stringify(funderData, null, 2));
  
  // Save to text file in Documents
  const documentsPath = process.env.USERPROFILE 
    ? path.join(process.env.USERPROFILE, 'Documents')
    : path.join(__dirname, '..');
  const txtPath = path.join(documentsPath, 'funder-wallet-solana.txt');
  
  const txtContent = `
===========================================
NOLIMIT - SOLANA FUNDER WALLET
===========================================

⚠️  KEEP THIS SECURE - CONTAINS PRIVATE KEY  ⚠️

Network: Solana Mainnet
Generated: ${funderData.generated}

ADDRESS (send SOL and USDC here):
${funderData.address}

PRIVATE KEY:
${funderData.privateKey}

===========================================
FUNDING REQUIREMENTS FOR 30 SOLANA WALLETS
===========================================

SOL for rent + fees:  0.15 SOL (0.005 SOL × 30 wallets)
USDC:                 43.50 USDC (1.45 USDC × 30 wallets)

After funding, run:
  npm run fund-solana

===========================================
`;

  fs.writeFileSync(txtPath, txtContent);
  
  console.log('='.repeat(60));
  console.log('✅ SOLANA FUNDER WALLET GENERATED');
  console.log('='.repeat(60));
  console.log(`\n📍 Address: ${funderData.address}`);
  console.log(`\n💰 Send to this address on SOLANA:`);
  console.log(`   • SOL:  0.15 SOL (for rent + fees)`);
  console.log(`   • USDC: 43.50 USDC (for x402 fees)`);
  console.log(`\n📄 Saved to:`);
  console.log(`   • ${jsonPath}`);
  console.log(`   • ${txtPath}`);
  console.log('\n⚡ After funding, run: npm run fund-solana');
  console.log('='.repeat(60));
  
  return funderData;
}

// ============================================================================
// CHECK BALANCES
// ============================================================================

async function checkBalances() {
  const funder = loadFunderWallet();
  const connection = new Connection(CONFIG.rpcUrl, 'confirmed');
  const funderPubkey = new PublicKey(funder.address);
  
  console.log('\n💰 Checking Solana Funder Wallet Balances...\n');
  console.log(`   Address: ${funder.address}`);
  
  // Check SOL balance
  const solBalance = await connection.getBalance(funderPubkey);
  console.log(`   SOL Balance: ${(solBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  // Check USDC balance
  const usdcMint = new PublicKey(CONFIG.usdcMint);
  let usdcBalance = 0;
  
  try {
    const usdcAta = await getAssociatedTokenAddress(usdcMint, funderPubkey);
    const accountInfo = await connection.getTokenAccountBalance(usdcAta);
    usdcBalance = parseFloat(accountInfo.value.uiAmountString || '0');
  } catch (e) {
    // ATA doesn't exist yet
  }
  
  console.log(`   USDC Balance: ${usdcBalance.toFixed(2)} USDC`);
  
  // Calculate requirements
  const wallets = loadWallets();
  const numWallets = wallets.solana.length;
  const solNeeded = CONFIG.solPerWallet * numWallets;
  const usdcNeeded = CONFIG.usdcPerWallet * numWallets;
  
  console.log(`\n📊 Requirements for ${numWallets} wallets:`);
  console.log(`   SOL needed:  ${solNeeded.toFixed(4)} SOL`);
  console.log(`   USDC needed: ${usdcNeeded.toFixed(2)} USDC`);
  
  const solSufficient = (solBalance / LAMPORTS_PER_SOL) >= solNeeded;
  const usdcSufficient = usdcBalance >= usdcNeeded;
  
  console.log(`\n${solSufficient ? '✅' : '❌'} SOL: ${solSufficient ? 'Sufficient' : 'INSUFFICIENT'}`);
  console.log(`${usdcSufficient ? '✅' : '❌'} USDC: ${usdcSufficient ? 'Sufficient' : 'INSUFFICIENT'}`);
  
  return { solSufficient, usdcSufficient, solBalance, usdcBalance };
}

// ============================================================================
// FUND WALLETS
// ============================================================================

async function fundWallets() {
  const funder = loadFunderWallet();
  const wallets = loadWallets();
  const connection = new Connection(CONFIG.rpcUrl, 'confirmed');
  const funderKeypair = Keypair.fromSecretKey(bs58.decode(funder.privateKey));
  const usdcMint = new PublicKey(CONFIG.usdcMint);
  
  console.log('\n🚀 Starting Solana Wallet Funding...\n');
  console.log(`   Funder: ${funder.address}`);
  console.log(`   Wallets to fund: ${wallets.solana.length}`);
  console.log(`   SOL per wallet: ${CONFIG.solPerWallet} SOL`);
  console.log(`   USDC per wallet: ${CONFIG.usdcPerWallet} USDC`);
  
  // Check balances first
  const balances = await checkBalances();
  
  if (!balances.solSufficient || !balances.usdcSufficient) {
    console.log('\n❌ Insufficient funds. Please add more funds to the funder wallet.');
    return;
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log('Starting distribution in 5 seconds... (Ctrl+C to cancel)');
  console.log('-'.repeat(60));
  await sleep(5000);
  
  // Get funder's USDC ATA
  const funderUsdcAta = await getAssociatedTokenAddress(usdcMint, funderKeypair.publicKey);
  
  const stats = {
    solSuccess: 0,
    solFailed: 0,
    usdcSuccess: 0,
    usdcFailed: 0,
  };
  
  const solAmount = CONFIG.solPerWallet * LAMPORTS_PER_SOL;
  const usdcAmount = CONFIG.usdcPerWallet * 1_000_000; // 6 decimals
  
  for (let i = 0; i < wallets.solana.length; i++) {
    const wallet = wallets.solana[i];
    const recipientPubkey = new PublicKey(wallet.address);
    
    console.log(`\n[${i + 1}/${wallets.solana.length}] Funding ${wallet.address.slice(0, 10)}...`);
    
    // Send SOL
    try {
      const solTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: funderKeypair.publicKey,
          toPubkey: recipientPubkey,
          lamports: solAmount,
        })
      );
      
      const solSig = await sendAndConfirmTransaction(connection, solTx, [funderKeypair]);
      console.log(`   ✅ SOL sent: ${solSig.slice(0, 20)}...`);
      stats.solSuccess++;
    } catch (error) {
      console.log(`   ❌ SOL failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      stats.solFailed++;
    }
    
    await sleep(CONFIG.txDelay);
    
    // Send USDC
    try {
      // Get or create recipient's USDC ATA
      const recipientUsdcAta = await getOrCreateAssociatedTokenAccount(
        connection,
        funderKeypair,
        usdcMint,
        recipientPubkey
      );
      
      const usdcTx = new Transaction().add(
        createTransferInstruction(
          funderUsdcAta,
          recipientUsdcAta.address,
          funderKeypair.publicKey,
          usdcAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );
      
      const usdcSig = await sendAndConfirmTransaction(connection, usdcTx, [funderKeypair]);
      console.log(`   ✅ USDC sent: ${usdcSig.slice(0, 20)}...`);
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
  console.log(`\nSOL transfers:  ${stats.solSuccess} success, ${stats.solFailed} failed`);
  console.log(`USDC transfers: ${stats.usdcSuccess} success, ${stats.usdcFailed} failed`);
  console.log(`\nTotal SOL sent:  ${(stats.solSuccess * CONFIG.solPerWallet).toFixed(4)} SOL`);
  console.log(`Total USDC sent: ${(stats.usdcSuccess * CONFIG.usdcPerWallet).toFixed(2)} USDC`);
  console.log('='.repeat(60));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const command = process.argv[2] || 'help';
  
  console.log('\n🌞 NoLimit Solana Wallet Funder\n');
  
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
      console.log('  npx tsx scripts/fund-solana-wallets.ts generate  - Create funder wallet');
      console.log('  npx tsx scripts/fund-solana-wallets.ts check     - Check funder balance');
      console.log('  npx tsx scripts/fund-solana-wallets.ts fund      - Distribute to all wallets');
      break;
  }
}

main().catch(console.error);


