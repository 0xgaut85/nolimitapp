/**
 * Quick test script for Base x402 payments
 * Uses wrapFetchWithPayment exactly like the app does
 */

import { config } from 'dotenv';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { wrapFetchWithPayment } from 'x402-fetch';
import * as fs from 'fs';
import * as path from 'path';

config();

const SERVER_URL = process.env.X402_SERVER_URL || 'https://x402.nolimit.foundation';
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
  const filepath = path.join(scriptsDir, files[0]);
  console.log(`📂 Loading wallets from: ${filepath}`);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

// Intercept fetch to log what's being sent
function createLoggingFetch(originalFetch: typeof fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    console.log(`\n📤 Fetch: ${init?.method || 'GET'} ${url}`);
    
    if (init?.headers) {
      const headers = init.headers as Record<string, string>;
      console.log('📤 Headers:', Object.keys(headers));
      if (headers['X-PAYMENT']) {
        console.log('📤 X-PAYMENT present, length:', headers['X-PAYMENT'].length);
        // Decode and show first part
        try {
          const decoded = JSON.parse(Buffer.from(headers['X-PAYMENT'], 'base64').toString());
          console.log('📤 X-PAYMENT decoded:', JSON.stringify(decoded, null, 2));
        } catch (e) {
          console.log('📤 Could not decode X-PAYMENT');
        }
      }
    }
    
    return originalFetch(input, init);
  };
}

async function testBaseX402() {
  console.log('\n🧪 Testing Base x402 Payment (using wrapFetchWithPayment)\n');
  
  const wallets = loadWallets();
  const testWallet = wallets.base[0]; // Use wallet 0 which has USDC
  
  console.log(`📍 Wallet address: ${testWallet.address}`);
  
  // Create account and wallet client (matching app's wagmi wallet client)
  const pk = testWallet.privateKey.startsWith('0x') 
    ? testWallet.privateKey 
    : `0x${testWallet.privateKey}`;
  const account = privateKeyToAccount(pk as `0x${string}`);
  
  // Create wallet client like wagmi does (with chain and transport)
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC_URL),
  });
  
  console.log(`📍 Account address: ${account.address}`);
  console.log(`📍 Wallet client chain: ${walletClient.chain?.name} (ID: ${walletClient.chain?.id})`);
  
  // Use logging fetch
  const loggingFetch = createLoggingFetch(fetch);
  
  // Create wrapped fetch exactly like the app does
  const fetchWithPayment = wrapFetchWithPayment(
    loggingFetch,
    walletClient as any,
    BigInt(1 * 10 ** 6), // max 1 USDC (same as app)
  );
  
  console.log('✅ wrapFetchWithPayment initialized');
  
  // Make request using wrapped fetch
  console.log('\n--- Making Request with wrapFetchWithPayment ---');
  
  try {
    // Try mixer endpoint instead of LLM
    const response = await fetchWithPayment(`${SERVER_URL}/noLimitMixer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: "ETH",
        amount: "0.001",
        recipientAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0Ab11",
        userAddress: account.address 
      }),
    });
    
    console.log(`\n📥 Response status: ${response.status}`);
    
    const data = await response.json().catch(() => ({}));
    console.log('📥 Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! Base x402 payment worked!');
    } else {
      console.log('\n❌ FAILED! Check the response above for details.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testBaseX402().catch(console.error);

