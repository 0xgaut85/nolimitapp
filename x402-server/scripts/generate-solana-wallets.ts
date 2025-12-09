/**
 * Generate 30 fresh Solana wallets
 * 
 * SECURITY: Private keys are ONLY printed to console, NOT saved anywhere
 * Copy them manually to a secure location
 */

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const WALLET_COUNT = 30;

console.log('\n🔐 Generating 30 fresh Solana wallets...\n');
console.log('⚠️  SECURITY: Copy these manually - NOT saved to any file!\n');
console.log('='.repeat(120));

const wallets: { address: string; privateKey: string }[] = [];

for (let i = 0; i < WALLET_COUNT; i++) {
  const keypair = Keypair.generate();
  const address = keypair.publicKey.toBase58();
  const privateKey = bs58.encode(keypair.secretKey);
  wallets.push({ address, privateKey });
}

// Print addresses only (for funding)
console.log('\n📋 ADDRESSES ONLY (for funding):');
console.log('-'.repeat(50));
wallets.forEach((w, i) => console.log(`${i + 1}. ${w.address}`));

// Print with ,0.005 for SOL funding
console.log('\n\n📋 FOR SOL FUNDING (paste in disperse):');
console.log('-'.repeat(50));
wallets.forEach(w => console.log(`${w.address},0.005`));

// Print with ,1.4 for USDC funding
console.log('\n\n📋 FOR USDC FUNDING (paste in disperse):');
console.log('-'.repeat(50));
wallets.forEach(w => console.log(`${w.address},1.4`));

// Print full wallet data (address + private key) for manual copy
console.log('\n\n🔑 FULL WALLET DATA (copy to secure location):');
console.log('='.repeat(120));
console.log('FORMAT: { "address": "...", "privateKey": "..." }');
console.log('-'.repeat(120));

wallets.forEach((w, i) => {
  console.log(`\n[${i + 1}]`);
  console.log(`Address: ${w.address}`);
  console.log(`Private: ${w.privateKey}`);
});

// Print as JSON array for wallet file (without saving)
console.log('\n\n📄 JSON FORMAT (for simulation wallet file):');
console.log('='.repeat(120));
console.log('Copy this into your wallet JSON file under "solana" key:\n');
console.log(JSON.stringify(wallets, null, 2));

console.log('\n\n✅ Done! Copy the data above manually.');
console.log('⚠️  Nothing was saved to disk.');


