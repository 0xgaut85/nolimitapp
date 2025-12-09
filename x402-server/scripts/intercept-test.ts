/**
 * Intercept and log exactly what x402-fetch sends
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
  return JSON.parse(fs.readFileSync(path.join(scriptsDir, files[0]), 'utf-8'));
}

// Create an intercepting fetch that logs everything
function createInterceptingFetch() {
  let callCount = 0;
  
  return async function interceptingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    callCount++;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    
    console.log(`\n=== FETCH CALL #${callCount} ===`);
    console.log('URL:', url);
    console.log('Method:', init?.method || 'GET');
    console.log('Headers:', JSON.stringify(init?.headers || {}, null, 2));
    
    if (init?.headers && typeof init.headers === 'object') {
      const headers = init.headers as Record<string, string>;
      if (headers['X-PAYMENT']) {
        console.log('\n--- X-PAYMENT Header Decoded ---');
        try {
          const decoded = JSON.parse(Buffer.from(headers['X-PAYMENT'], 'base64').toString());
          console.log(JSON.stringify(decoded, null, 2));
        } catch (e) {
          console.log('Could not decode:', e);
        }
      }
    }
    
    // Make the actual request
    const response = await fetch(input, init);
    
    console.log(`\n--- Response #${callCount} ---`);
    console.log('Status:', response.status);
    
    // Clone response to read body without consuming it
    const cloned = response.clone();
    try {
      const body = await cloned.text();
      console.log('Body:', body.substring(0, 500));
    } catch (e) {
      console.log('Could not read body');
    }
    
    return response;
  };
}

async function interceptTest() {
  const wallets = loadWallets();
  const testWallet = wallets.base[0];

  console.log('=== INTERCEPT TEST ===');
  console.log(`Wallet: ${testWallet.address}`);

  const pk = testWallet.privateKey.startsWith('0x') 
    ? testWallet.privateKey as `0x${string}`
    : `0x${testWallet.privateKey}` as `0x${string}`;
  const account = privateKeyToAccount(pk);

  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  // Use our intercepting fetch
  const interceptingFetch = createInterceptingFetch();
  
  const fetchWithPayment = wrapFetchWithPayment(
    interceptingFetch as typeof fetch,
    walletClient as any,
    BigInt(1 * 10 ** 6),
  );

  console.log('\nMaking x402 request...\n');
  
  try {
    const response = await fetchWithPayment(`${SERVER_URL}/noLimitLLM`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Hello from intercept test', 
        userAddress: account.address 
      }),
    });

    console.log('\n=== FINAL RESULT ===');
    console.log('Status:', response.status);
    const data = await response.json().catch(() => ({}));
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.error('Exception:', error.message);
  }
}

interceptTest().catch(console.error);


