/**
 * Test facilitator directly
 */
import { config } from 'dotenv';
import { createWalletClient, http, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

config();

const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const FACILITATOR_URL = 'https://facilitator.payai.network';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PAY_TO = '0x3417828C83e8C1E787dC6DbeFD79F93E0C13f694';

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

function createNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

async function testFacilitator() {
  const wallets = loadWallets();
  const testWallet = wallets.base[0];

  console.log('=== FACILITATOR DIRECT TEST ===\n');
  console.log('Wallet:', testWallet.address);

  const pk = testWallet.privateKey.startsWith('0x') 
    ? testWallet.privateKey as `0x${string}`
    : `0x${testWallet.privateKey}` as `0x${string}`;
  const account = privateKeyToAccount(pk);

  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  // Create payment parameters
  const now = Math.floor(Date.now() / 1000);
  const validAfter = now - 600; // 10 minutes ago
  const validBefore = now + 60; // 1 minute from now
  const nonce = createNonce();
  const value = '50000'; // 0.05 USDC

  console.log('\nPayment parameters:');
  console.log('- from:', account.address);
  console.log('- to:', PAY_TO);
  console.log('- value:', value);
  console.log('- validAfter:', validAfter);
  console.log('- validBefore:', validBefore);
  console.log('- nonce:', nonce);

  // Sign the authorization
  const signature = await walletClient.signTypedData({
    domain: {
      name: 'USD Coin',
      version: '2',
      chainId: 8453,
      verifyingContract: USDC_ADDRESS,
    },
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from: account.address,
      to: PAY_TO,
      value: BigInt(value),
      validAfter: BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce,
    },
  });

  console.log('\nSignature:', signature);

  // Create payment payload
  const paymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: 'base',
    payload: {
      signature,
      authorization: {
        from: account.address,
        to: PAY_TO,
        value,
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };

  // Create payment requirements
  const paymentRequirements = {
    scheme: 'exact',
    network: 'base',
    maxAmountRequired: value,
    resource: 'https://x402.nolimit.foundation/noLimitLLM',
    description: 'Test',
    mimeType: 'application/json',
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    asset: USDC_ADDRESS,
    extra: {
      name: 'USD Coin',
      version: '2',
    },
  };

  // Encode payment header
  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  console.log('\nPayment header (base64):', paymentHeader.substring(0, 50) + '...');

  // Step 1: Call facilitator verify endpoint
  console.log('\n--- Testing /verify ---');
  try {
    const verifyResponse = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentHeader,
        paymentRequirements,
      }),
    });

    console.log('Status:', verifyResponse.status);
    const verifyData = await verifyResponse.json();
    console.log('Response:', JSON.stringify(verifyData, null, 2));

    if (!verifyData.isValid) {
      console.log('\n❌ Verification failed, not proceeding to settle');
      return;
    }
  } catch (e: any) {
    console.error('Verify error:', e.message);
    return;
  }

  // Step 2: Call facilitator settle endpoint
  console.log('\n--- Testing /settle ---');
  try {
    const settleResponse = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentHeader,
        paymentRequirements,
      }),
    });

    console.log('Status:', settleResponse.status);
    const settleData = await settleResponse.json();
    console.log('Response:', JSON.stringify(settleData, null, 2));
  } catch (e: any) {
    console.error('Settle error:', e.message);
  }
}

testFacilitator().catch(console.error);


