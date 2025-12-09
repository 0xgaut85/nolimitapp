/**
 * Check USDC balance for Base wallets
 */

import { config } from 'dotenv';
import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { base } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

config();

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

const erc20Abi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

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
  const filepath = path.join(scriptsDir, files[0]);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

async function checkBalances() {
  console.log('\n🔍 Checking Base USDC Balances\n');
  
  const client = createPublicClient({
    chain: base,
    transport: http(RPC_URL),
  });
  
  const wallets = loadWallets();
  
  // Check first 5 wallets
  console.log('Checking first 5 Base wallets:\n');
  
  let walletsWithUsdc = 0;
  let walletsWithoutUsdc = 0;
  
  for (let i = 0; i < Math.min(5, wallets.base.length); i++) {
    const wallet = wallets.base[i];
    
    try {
      // Check ETH balance
      const ethBalance = await client.getBalance({
        address: wallet.address as `0x${string}`,
      });
      
      // Check USDC balance
      const usdcBalance = await client.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.address as `0x${string}`],
      });
      
      const ethFormatted = formatUnits(ethBalance, 18);
      const usdcFormatted = formatUnits(usdcBalance, 6);
      
      console.log(`Wallet ${i + 1}: ${wallet.address}`);
      console.log(`  ETH:  ${ethFormatted}`);
      console.log(`  USDC: ${usdcFormatted}`);
      
      if (usdcBalance > 0n) walletsWithUsdc++;
      else walletsWithoutUsdc++;
      
      console.log('');
    } catch (error) {
      console.error(`Error checking wallet ${i + 1}:`, error);
    }
  }
  
  console.log('---');
  console.log(`Wallets with USDC: ${walletsWithUsdc}`);
  console.log(`Wallets without USDC: ${walletsWithoutUsdc}`);
  
  // Check all wallets for total
  console.log('\nChecking all 70 Base wallets...');
  
  let totalUsdc = 0n;
  let totalEth = 0n;
  let fundedCount = 0;
  
  for (const wallet of wallets.base) {
    try {
      const ethBalance = await client.getBalance({
        address: wallet.address as `0x${string}`,
      });
      
      const usdcBalance = await client.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet.address as `0x${string}`],
      }) as bigint;
      
      totalEth += ethBalance;
      totalUsdc += usdcBalance;
      
      if (usdcBalance > 0n) fundedCount++;
    } catch (error) {
      // ignore
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Wallets with USDC: ${fundedCount}/${wallets.base.length}`);
  console.log(`  Total ETH: ${formatUnits(totalEth, 18)}`);
  console.log(`  Total USDC: ${formatUnits(totalUsdc, 6)}`);
}

checkBalances().catch(console.error);


