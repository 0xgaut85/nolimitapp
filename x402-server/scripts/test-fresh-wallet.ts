/**
 * Test with a completely fresh wallet - generate new, fund it, test immediately
 */
import { config } from 'dotenv';
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { base } from 'viem/chains';
import { wrapFetchWithPayment } from 'x402-fetch';
import * as fs from 'fs';
import * as path from 'path';

config();

const SERVER_URL = process.env.X402_SERVER_URL || 'https://x402.nolimit.foundation';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

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

async function testWithWallet(walletIndex: number) {
  const wallets = loadWallets();
  
  if (walletIndex >= wallets.base.length) {
    console.log(`Wallet index ${walletIndex} out of range (max: ${wallets.base.length - 1})`);
    return;
  }
  
  const testWallet = wallets.base[walletIndex];
  console.log(`\n=== Testing wallet #${walletIndex}: ${testWallet.address} ===`);

  const pk = testWallet.privateKey.startsWith('0x') 
    ? testWallet.privateKey as `0x${string}`
    : `0x${testWallet.privateKey}` as `0x${string}`;
  const account = privateKeyToAccount(pk);

  const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  // Check balances
  const usdcBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
    functionName: 'balanceOf',
    args: [account.address],
  });
  
  const ethBalance = await publicClient.getBalance({ address: account.address });
  
  console.log(`USDC: ${Number(usdcBalance) / 1e6}, ETH: ${Number(ethBalance) / 1e18}`);

  if (Number(usdcBalance) < 50000) {
    console.log('❌ Insufficient USDC');
    return false;
  }

  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  const fetchWithPayment = wrapFetchWithPayment(
    fetch,
    walletClient as any,
    BigInt(1 * 10 ** 6),
  );

  try {
    const response = await fetchWithPayment(`${SERVER_URL}/noLimitLLM`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: `Test from wallet ${walletIndex}`, 
        userAddress: account.address 
      }),
    });

    const data = await response.json().catch(() => ({}));
    
    if (response.ok) {
      console.log('✅ SUCCESS!');
      return true;
    } else {
      console.log(`❌ FAILED: ${data.error || 'Unknown'}`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Exception: ${error.message}`);
    return false;
  }
}

async function main() {
  // Test multiple wallets to see if it's a wallet-specific issue
  const indicesToTest = [0, 1, 2, 5, 10, 20, 30, 40, 50, 60, 69];
  
  console.log('Testing multiple wallets to find pattern...\n');
  
  for (const idx of indicesToTest) {
    await testWithWallet(idx);
    // Small delay between tests
    await new Promise(r => setTimeout(r, 1000));
  }
}

// Allow testing specific wallet via command line
const specificIndex = process.argv[2] ? parseInt(process.argv[2]) : null;
if (specificIndex !== null) {
  testWithWallet(specificIndex).catch(console.error);
} else {
  main().catch(console.error);
}


