/**
 * Script to generate fresh mixer pool wallets
 * Run with: npx ts-node scripts/generate-fresh-wallets.ts
 * 
 * Generates:
 * - 100 Base (EVM) wallets
 * - 30 Solana wallets
 */

import { Wallet } from 'ethers';
import { Keypair } from '@solana/web3.js';
import * as bs58 from 'bs58';
import * as fs from 'fs';

const NUM_BASE_WALLETS = 100;
const NUM_SOLANA_WALLETS = 30;

console.log('='.repeat(60));
console.log('FRESH WALLET GENERATOR');
console.log(`Base: ${NUM_BASE_WALLETS} wallets | Solana: ${NUM_SOLANA_WALLETS} wallets`);
console.log('='.repeat(60));
console.log('');

// Generate Base (EVM) wallets
console.log('📦 Generating BASE (EVM) WALLETS...');

const baseWallets: { address: string; privateKey: string }[] = [];

for (let i = 0; i < NUM_BASE_WALLETS; i++) {
  const wallet = Wallet.createRandom();
  baseWallets.push({
    address: wallet.address,
    privateKey: wallet.privateKey,
  });
}

console.log(`✅ Generated ${baseWallets.length} Base wallets`);

// Generate Solana wallets
console.log('🌞 Generating SOLANA WALLETS...');

const solanaWallets: { address: string; privateKey: string }[] = [];

for (let i = 0; i < NUM_SOLANA_WALLETS; i++) {
  const keypair = Keypair.generate();
  const privateKeyBase58 = bs58.default.encode(keypair.secretKey);
  solanaWallets.push({
    address: keypair.publicKey.toBase58(),
    privateKey: privateKeyBase58,
  });
}

console.log(`✅ Generated ${solanaWallets.length} Solana wallets`);

// Output for code integration
console.log('');
console.log('='.repeat(60));
console.log('BASE WALLETS ARRAY (for sweep-base-wallets.ts)');
console.log('='.repeat(60));
console.log('');
console.log('const BASE_WALLETS = [');
baseWallets.forEach((w, i) => {
  const comma = i < baseWallets.length - 1 ? ',' : '';
  console.log(`  { address: "${w.address}", privateKey: "${w.privateKey}" }${comma}`);
});
console.log('];');

console.log('');
console.log('='.repeat(60));
console.log('SOLANA WALLETS ARRAY (for sweep-solana-wallets.ts)');
console.log('='.repeat(60));
console.log('');
console.log('const SOLANA_WALLETS = [');
solanaWallets.forEach((w, i) => {
  const comma = i < solanaWallets.length - 1 ? ',' : '';
  console.log(`  { address: "${w.address}", privateKey: "${w.privateKey}" }${comma}`);
});
console.log('];');

console.log('');
console.log('='.repeat(60));
console.log('BASE WALLET ADDRESSES TO FUND');
console.log('='.repeat(60));
console.log('');
baseWallets.forEach((w, i) => {
  console.log(`${i + 1}. ${w.address}`);
});

console.log('');
console.log('='.repeat(60));
console.log('SOLANA WALLET ADDRESSES TO FUND');
console.log('='.repeat(60));
console.log('');
solanaWallets.forEach((w, i) => {
  console.log(`${i + 1}. ${w.address}`);
});

// Save to JSON file for backup (KEEP THIS SECURE!)
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = `wallets-fresh-${timestamp}.json`;

fs.writeFileSync(outputFile, JSON.stringify({
  generatedAt: new Date().toISOString(),
  baseWallets,
  solanaWallets,
}, null, 2));

console.log('');
console.log('='.repeat(60));
console.log(`⚠️  BACKUP SAVED TO: ${outputFile}`);
console.log('⚠️  KEEP THIS FILE SECURE! DO NOT COMMIT TO GIT!');
console.log('='.repeat(60));





