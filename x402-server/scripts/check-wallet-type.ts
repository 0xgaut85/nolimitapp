/**
 * Check if wallet is EOA or contract
 */
import { config } from 'dotenv';
import { createPublicClient, http, getAddress } from 'viem';
import { base } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

config();

const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

interface WalletData {
  address: string;
  privateKey: string;
}

interface WalletsFile {
  generated: string;
  base: WalletData[];
  solana: WalletData[];
}

function loadWallets(): WalletsFile {
  const scriptsDir = path.join(__dirname, '..');
  const files = fs.readdirSync(scriptsDir)
    .filter(f => f.startsWith('wallets-') && f.endsWith('.json'))
    .sort().reverse();
  if (files.length === 0) throw new Error('No wallet file found');
  return JSON.parse(fs.readFileSync(path.join(scriptsDir, files[0]), 'utf-8'));
}

async function checkWalletType() {
  const wallets = loadWallets();
  
  console.log('=== WALLET TYPE CHECK ===\n');

  const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  // Check first 5 Base wallets
  for (let i = 0; i < 5; i++) {
    const wallet = wallets.base[i];
    const code = await publicClient.getCode({ address: getAddress(wallet.address) });
    const isContract = code && code !== '0x';
    console.log(`Wallet ${i}: ${wallet.address} - ${isContract ? 'CONTRACT' : 'EOA'}`);
  }

  // Also check the payTo address
  const payTo = '0x3417828C83e8C1E787dC6DbeFD79F93E0C13f694';
  const payToCode = await publicClient.getCode({ address: getAddress(payTo) });
  const payToIsContract = payToCode && payToCode !== '0x';
  console.log(`\nPayTo: ${payTo} - ${payToIsContract ? 'CONTRACT' : 'EOA'}`);
}

checkWalletType().catch(console.error);


