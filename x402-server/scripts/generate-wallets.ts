/**
 * Wallet Generation Script
 * Creates 70 Base (EVM) wallets and 30 Solana wallets
 * Saves all private keys to a text file
 */

import { Wallet } from 'ethers';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';

const BASE_WALLET_COUNT = 70;
const SOLANA_WALLET_COUNT = 30;

interface WalletInfo {
  type: 'base' | 'solana';
  index: number;
  address: string;
  privateKey: string;
}

function generateBaseWallets(count: number): WalletInfo[] {
  const wallets: WalletInfo[] = [];
  
  console.log(`Generating ${count} Base (EVM) wallets...`);
  
  for (let i = 0; i < count; i++) {
    const wallet = Wallet.createRandom();
    wallets.push({
      type: 'base',
      index: i + 1,
      address: wallet.address,
      privateKey: wallet.privateKey,
    });
  }
  
  return wallets;
}

function generateSolanaWallets(count: number): WalletInfo[] {
  const wallets: WalletInfo[] = [];
  
  console.log(`Generating ${count} Solana wallets...`);
  
  for (let i = 0; i < count; i++) {
    const keypair = Keypair.generate();
    wallets.push({
      type: 'solana',
      index: i + 1,
      address: keypair.publicKey.toBase58(),
      privateKey: bs58.encode(keypair.secretKey),
    });
  }
  
  return wallets;
}

function saveWalletsToFile(baseWallets: WalletInfo[], solanaWallets: WalletInfo[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `wallets-${timestamp}.txt`;
  
  // Save to user's Documents folder on Windows
  const documentsPath = process.env.USERPROFILE 
    ? path.join(process.env.USERPROFILE, 'Documents')
    : path.join(__dirname, '..');
  
  const filepath = path.join(documentsPath, filename);
  
  let content = `===========================================
NOLIMIT FOUNDATION - GENERATED WALLETS
Generated: ${new Date().toISOString()}
Total: ${baseWallets.length + solanaWallets.length} wallets
===========================================

⚠️  KEEP THIS FILE SECURE - CONTAINS PRIVATE KEYS  ⚠️

`;

  // Base wallets section
  content += `
=============================================
BASE (EVM) WALLETS (${baseWallets.length} wallets)
=============================================

`;

  for (const wallet of baseWallets) {
    content += `[Base Wallet #${wallet.index}]
Address: ${wallet.address}
Private Key: ${wallet.privateKey}

`;
  }

  // Solana wallets section
  content += `
=============================================
SOLANA WALLETS (${solanaWallets.length} wallets)
=============================================

`;

  for (const wallet of solanaWallets) {
    content += `[Solana Wallet #${wallet.index}]
Address: ${wallet.address}
Private Key: ${wallet.privateKey}

`;
  }

  // Summary
  content += `
=============================================
SUMMARY
=============================================
Base Wallets: ${baseWallets.length}
Solana Wallets: ${solanaWallets.length}
Total: ${baseWallets.length + solanaWallets.length}

File saved to: ${filepath}
`;

  fs.writeFileSync(filepath, content, 'utf-8');
  
  return filepath;
}

function saveWalletsJson(baseWallets: WalletInfo[], solanaWallets: WalletInfo[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `wallets-${timestamp}.json`;
  const filepath = path.join(__dirname, '..', filename);
  
  const data = {
    generated: new Date().toISOString(),
    base: baseWallets.map(w => ({ address: w.address, privateKey: w.privateKey })),
    solana: solanaWallets.map(w => ({ address: w.address, privateKey: w.privateKey })),
  };
  
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  
  return filepath;
}

async function main() {
  console.log('\n🔐 NoLimit Wallet Generator\n');
  console.log('='.repeat(50));
  
  // Generate wallets
  const baseWallets = generateBaseWallets(BASE_WALLET_COUNT);
  const solanaWallets = generateSolanaWallets(SOLANA_WALLET_COUNT);
  
  console.log('\n✅ Wallets generated successfully!\n');
  
  // Save to text file (human-readable)
  const txtPath = saveWalletsToFile(baseWallets, solanaWallets);
  console.log(`📄 Text file saved: ${txtPath}`);
  
  // Save to JSON file (for script consumption)
  const jsonPath = saveWalletsJson(baseWallets, solanaWallets);
  console.log(`📋 JSON file saved: ${jsonPath}`);
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Base (EVM) wallets: ${baseWallets.length}`);
  console.log(`Solana wallets: ${solanaWallets.length}`);
  console.log(`Total wallets: ${baseWallets.length + solanaWallets.length}`);
  
  // Print first few addresses as sample
  console.log('\n📍 Sample Base addresses:');
  baseWallets.slice(0, 3).forEach(w => console.log(`   ${w.address}`));
  console.log('   ...');
  
  console.log('\n📍 Sample Solana addresses:');
  solanaWallets.slice(0, 3).forEach(w => console.log(`   ${w.address}`));
  console.log('   ...');
  
  console.log('\n✨ Done!\n');
}

main().catch(console.error);

