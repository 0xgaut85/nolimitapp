/**
 * Fresh start - replicate EXACTLY what the dApp does
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

async function test() {
  // Load ONE wallet
  const wallets = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'wallets-2025-11-29T17-53-54-231Z.json'), 'utf8'));
  const w = wallets.base[15]; // Try a different wallet
  
  console.log('Testing wallet:', w.address);
  
  // Create wallet client EXACTLY like wagmi does
  const pk = (w.privateKey.startsWith('0x') ? w.privateKey : `0x${w.privateKey}`) as `0x${string}`;
  const account = privateKeyToAccount(pk);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http('https://mainnet.base.org'),
  });
  
  console.log('Wallet client created');
  
  // Wrap fetch EXACTLY like the dApp does
  const fetchWithPayment = wrapFetchWithPayment(
    fetch,
    walletClient as any,
    BigInt(1 * 10 ** 6), // max 1 USDC
  );
  
  console.log('Fetch wrapped');
  
  // Make request EXACTLY like the dApp does
  try {
    console.log('Making request...');
    const response = await fetchWithPayment(`${SERVER_URL}/noLimitLLM`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Test from Node.js script',
        userAddress: account.address,
      }),
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS!');
      console.log('Response:', data.response?.substring(0, 100));
    } else {
      const data = await response.json();
      console.log('❌ FAILED');
      console.log('Error:', data.error || data);
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

test();


