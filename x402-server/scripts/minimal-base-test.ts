/**
 * Minimal Base x402 test - as close to browser behavior as possible
 */
import { config } from 'dotenv';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
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

async function minimalTest() {
  const wallets = loadWallets();
  const testWallet = wallets.base[0];

  console.log('=== MINIMAL BASE X402 TEST ===');
  console.log(`Wallet: ${testWallet.address}`);

  // Create account from private key
  const pk = testWallet.privateKey.startsWith('0x') 
    ? testWallet.privateKey as `0x${string}`
    : `0x${testWallet.privateKey}` as `0x${string}`;
  const account = privateKeyToAccount(pk);

  // Check USDC balance first
  const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  const usdcBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
    functionName: 'balanceOf',
    args: [account.address],
  });
  console.log(`USDC Balance: ${Number(usdcBalance) / 1e6} USDC`);

  if (Number(usdcBalance) < 50000) { // 0.05 USDC
    console.log('❌ Insufficient USDC balance');
    return;
  }

  // Create wallet client exactly like wagmi does
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  console.log('\nWallet client properties:');
  console.log('- chain:', walletClient.chain?.name, '(id:', walletClient.chain?.id, ')');
  console.log('- account:', walletClient.account?.address);
  console.log('- has transport:', !!walletClient.transport);

  // Step 1: Make initial request to get 402 response
  console.log('\n--- Step 1: Initial request ---');
  const initialResponse = await fetch(`${SERVER_URL}/noLimitLLM`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message: 'Hello', 
      userAddress: account.address 
    }),
  });

  console.log('Status:', initialResponse.status);
  
  if (initialResponse.status !== 402) {
    console.log('Expected 402, got:', initialResponse.status);
    const text = await initialResponse.text();
    console.log('Response:', text);
    return;
  }

  const paymentInfo = await initialResponse.json();
  console.log('Payment info:', JSON.stringify(paymentInfo, null, 2));

  // Step 2: Use x402-fetch's wrapFetchWithPayment
  console.log('\n--- Step 2: Using x402-fetch ---');
  
  // Import dynamically to ensure fresh state
  const { wrapFetchWithPayment } = await import('x402-fetch');
  
  const fetchWithPayment = wrapFetchWithPayment(
    fetch,
    walletClient as any,
    BigInt(1 * 10 ** 6), // 1 USDC max
  );

  console.log('Making payment request...');
  
  try {
    const response = await fetchWithPayment(`${SERVER_URL}/noLimitLLM`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Hello from minimal test', 
        userAddress: account.address 
      }),
    });

    console.log('Response status:', response.status);
    const data = await response.json().catch(() => ({}));
    
    if (response.ok) {
      console.log('✅ SUCCESS!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ FAILED');
      console.log('Error:', JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.error('❌ Exception:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

minimalTest().catch(console.error);


