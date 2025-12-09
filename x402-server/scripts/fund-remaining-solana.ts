/**
 * Fund Remaining Solana Wallets
 * Quick script to fund the 8 wallets that didn't get funded
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

const CONFIG = {
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  solPerWallet: 0.005,
  usdcPerWallet: 1.45,
  txDelay: 1500,
};

// Wallets that need funding
const WALLETS_NEEDING_FUNDS = [
  { address: '35kqPoP4eHS6XbZcZVCyCd5McvzA3mse7ZcQB3nwyr6j', needsSol: true, needsUsdc: false },
  { address: 'BLH4YUt7VmoKxH1EfiqXmxrt2HnJbyz6TCTwS3wLd8qM', needsSol: true, needsUsdc: true },
  { address: 'VNLb1ECVYHFAYGFGmCHCejEcUCBWQTsZMPMToJcUpw6', needsSol: true, needsUsdc: true },
  { address: '93SYgbL6qTx5JuWVdWqoTF2QgYwS8hGYQUmNQkBgEK2d', needsSol: true, needsUsdc: true },
  { address: 'HdrsD4gPVzk2HpDnbmD2W7cgTVnuaYzoiwKYLLMTnqqx', needsSol: true, needsUsdc: true },
  { address: '8m19UnnuqZAA8814xMtnpK6TxvBXQuL3bLQXHyRAGSzn', needsSol: true, needsUsdc: true },
  { address: 'F7MjRKdebhWnRfYJuXSJvHNbeuXT7BuHgQ3M9vkuUq5F', needsSol: true, needsUsdc: true },
  { address: 'Eve9SrBTfQ169XLMKXoBjk8h9kRHz43U5iH21DNSwN4', needsSol: true, needsUsdc: true },
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n🔧 Funding Remaining Solana Wallets\n');
  
  // Load funder wallet
  const funderPath = path.join(__dirname, '..', 'funder-wallet-solana.json');
  if (!fs.existsSync(funderPath)) {
    throw new Error('Funder wallet not found');
  }
  const funder = JSON.parse(fs.readFileSync(funderPath, 'utf-8'));
  
  const connection = new Connection(CONFIG.rpcUrl, 'confirmed');
  const funderKeypair = Keypair.fromSecretKey(bs58.decode(funder.privateKey));
  const usdcMint = new PublicKey(CONFIG.usdcMint);
  
  // Check funder balance
  const solBalance = await connection.getBalance(funderKeypair.publicKey);
  console.log(`Funder SOL balance: ${(solBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  let usdcBalance = 0;
  try {
    const usdcAta = await getAssociatedTokenAddress(usdcMint, funderKeypair.publicKey);
    const accountInfo = await connection.getTokenAccountBalance(usdcAta);
    usdcBalance = parseFloat(accountInfo.value.uiAmountString || '0');
  } catch (e) {}
  console.log(`Funder USDC balance: ${usdcBalance.toFixed(2)} USDC`);
  
  const solNeeded = WALLETS_NEEDING_FUNDS.filter(w => w.needsSol).length * CONFIG.solPerWallet;
  const usdcNeeded = WALLETS_NEEDING_FUNDS.filter(w => w.needsUsdc).length * CONFIG.usdcPerWallet;
  
  console.log(`\nNeeded: ${solNeeded.toFixed(4)} SOL, ${usdcNeeded.toFixed(2)} USDC`);
  console.log(`Wallets to fund: ${WALLETS_NEEDING_FUNDS.length}\n`);
  
  if (solBalance / LAMPORTS_PER_SOL < solNeeded) {
    console.log('❌ Not enough SOL in funder wallet!');
    return;
  }
  
  if (usdcBalance < usdcNeeded) {
    console.log('❌ Not enough USDC in funder wallet!');
    return;
  }
  
  console.log('Starting in 3 seconds...\n');
  await sleep(3000);
  
  const funderUsdcAta = await getAssociatedTokenAddress(usdcMint, funderKeypair.publicKey);
  const solAmount = CONFIG.solPerWallet * LAMPORTS_PER_SOL;
  const usdcAmount = CONFIG.usdcPerWallet * 1_000_000;
  
  const stats = { solSuccess: 0, solFailed: 0, usdcSuccess: 0, usdcFailed: 0 };
  
  for (let i = 0; i < WALLETS_NEEDING_FUNDS.length; i++) {
    const wallet = WALLETS_NEEDING_FUNDS[i];
    const recipientPubkey = new PublicKey(wallet.address);
    
    console.log(`[${i + 1}/${WALLETS_NEEDING_FUNDS.length}] ${wallet.address.slice(0, 12)}...`);
    
    // Send SOL if needed
    if (wallet.needsSol) {
      try {
        const solTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: funderKeypair.publicKey,
            toPubkey: recipientPubkey,
            lamports: solAmount,
          })
        );
        const solSig = await sendAndConfirmTransaction(connection, solTx, [funderKeypair]);
        console.log(`   ✅ SOL: ${solSig.slice(0, 20)}...`);
        stats.solSuccess++;
      } catch (error) {
        console.log(`   ❌ SOL: ${error instanceof Error ? error.message.slice(0, 50) : 'Failed'}`);
        stats.solFailed++;
      }
      await sleep(CONFIG.txDelay);
    }
    
    // Send USDC if needed
    if (wallet.needsUsdc) {
      try {
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
        console.log(`   ✅ USDC: ${usdcSig.slice(0, 20)}...`);
        stats.usdcSuccess++;
      } catch (error) {
        console.log(`   ❌ USDC: ${error instanceof Error ? error.message.slice(0, 50) : 'Failed'}`);
        stats.usdcFailed++;
      }
      await sleep(CONFIG.txDelay);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ DONE');
  console.log('='.repeat(50));
  console.log(`SOL:  ${stats.solSuccess} success, ${stats.solFailed} failed`);
  console.log(`USDC: ${stats.usdcSuccess} success, ${stats.usdcFailed} failed`);
}

main().catch(console.error);


