import axios from 'axios';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { createPaymentHeader, selectPaymentRequirements } from 'x402/client';
import * as fs from 'fs';
import * as path from 'path';

const wallets = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'wallets-2025-11-29T17-53-54-231Z.json'), 'utf8'));
const w = wallets.base[0];
const pk = (w.privateKey.startsWith('0x') ? w.privateKey : '0x' + w.privateKey) as `0x${string}`;
const account = privateKeyToAccount(pk);
const client = createWalletClient({ account, chain: base, transport: http() });

async function test() {
  console.log('Testing wallet:', account.address);
  
  // Get 402 response
  const r1 = await axios.post('https://x402.nolimit.foundation/noLimitLLM', 
    { message: 'test', userAddress: account.address },
    { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
  );
  console.log('Initial status:', r1.status);
  
  if (r1.status !== 402) {
    console.log('Not 402, exiting');
    return;
  }
  
  const { x402Version, accepts } = r1.data;
  const req = selectPaymentRequirements(accepts, 'base', 'exact');
  console.log('Selected:', req?.network, req?.maxAmountRequired);
  
  if (!req) {
    console.log('No requirements found');
    return;
  }
  
  // Create payment header
  const header = await createPaymentHeader(client as any, x402Version, req);
  console.log('Header length:', header.length);
  
  // Retry with payment
  const r2 = await axios.post('https://x402.nolimit.foundation/noLimitLLM',
    { message: 'test', userAddress: account.address },
    { 
      headers: { 'Content-Type': 'application/json', 'X-PAYMENT': header },
      validateStatus: () => true
    }
  );
  console.log('Retry status:', r2.status);
  console.log('Response:', r2.data);
}

test().catch(e => console.error('Error:', e));


