/**
 * Script to generate mixer pool wallets
 * Run with: npx tsx scripts/generate-mixer-wallets.ts
 * 
 * This will output:
 * 1. Wallet addresses (to fund with gas)
 * 2. Environment variable commands for Railway
 */

import { Wallet } from 'ethers';
import { Keypair } from '@solana/web3.js';
import * as bs58 from 'bs58';

const NUM_WALLETS = 20;

console.log('='.repeat(60));
console.log('MIXER POOL WALLET GENERATOR');
console.log('='.repeat(60));
console.log('');

// Generate Base (EVM) wallets
console.log('📦 BASE (EVM) WALLETS');
console.log('-'.repeat(60));

const baseWallets: { index: number; address: string; privateKey: string }[] = [];

for (let i = 1; i <= NUM_WALLETS; i++) {
  const wallet = Wallet.createRandom();
  baseWallets.push({
    index: i,
    address: wallet.address,
    privateKey: wallet.privateKey,
  });
  console.log(`Wallet ${i}: ${wallet.address}`);
}

console.log('');

// Generate Solana wallets
console.log('🌞 SOLANA WALLETS');
console.log('-'.repeat(60));

const solanaWallets: { index: number; address: string; privateKey: string }[] = [];

for (let i = 1; i <= NUM_WALLETS; i++) {
  const keypair = Keypair.generate();
  const privateKeyBase58 = bs58.default.encode(keypair.secretKey);
  solanaWallets.push({
    index: i,
    address: keypair.publicKey.toBase58(),
    privateKey: privateKeyBase58,
  });
  console.log(`Wallet ${i}: ${keypair.publicKey.toBase58()}`);
}

console.log('');
console.log('='.repeat(60));
console.log('RAILWAY CLI COMMANDS');
console.log('='.repeat(60));
console.log('');
console.log('Run these commands to set environment variables on Railway:');
console.log('');

// Output Railway CLI commands for Base wallets
console.log('# Base Wallets');
baseWallets.forEach((w) => {
  console.log(`railway variables set MIXER_BASE_WALLET_${w.index}_KEY="${w.privateKey}"`);
});

console.log('');
console.log('# Solana Wallets');
solanaWallets.forEach((w) => {
  console.log(`railway variables set MIXER_SOL_WALLET_${w.index}_KEY="${w.privateKey}"`);
});

console.log('');
console.log('='.repeat(60));
console.log('WALLET ADDRESSES TO FUND');
console.log('='.repeat(60));
console.log('');
console.log('Fund these addresses with gas fees:');
console.log('');

console.log('# Base Wallets (fund each with ~0.01 ETH for gas)');
baseWallets.forEach((w) => {
  console.log(`${w.index}. ${w.address}`);
});

console.log('');
console.log('# Solana Wallets (fund each with ~0.01 SOL for fees)');
solanaWallets.forEach((w) => {
  console.log(`${w.index}. ${w.address}`);
});

console.log('');
console.log('='.repeat(60));
console.log('JSON OUTPUT (for backup)');
console.log('='.repeat(60));
console.log('');

const output = {
  base: baseWallets,
  solana: solanaWallets,
  generated: new Date().toISOString(),
};

console.log(JSON.stringify(output, null, 2));

