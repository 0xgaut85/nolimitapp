/**
 * Test facilitator directly - using the exact format x402-express uses
 */
import { config } from 'dotenv';
import { createWalletClient, http, toHex, getAddress } from 'viem';
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

  console.log('=== FACILITATOR TEST V2 ===\n');
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
  const validAfter = now - 600;
  const validBefore = now + 60;
  const nonce = createNonce();
  const value = '50000';

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
      from: getAddress(account.address),
      to: getAddress(PAY_TO),
      value: BigInt(value),
      validAfter: BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce,
    },
  });

  console.log('Signature:', signature);

  // Create payment payload - matching exact format from x402 library
  const paymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: 'base',
    payload: {
      signature,
      authorization: {
        from: getAddress(account.address),
        to: getAddress(PAY_TO),
        value,
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };

  // Create payment requirements - matching exact format from x402-express
  const paymentRequirements = {
    scheme: 'exact' as const,
    network: 'base' as const,
    maxAmountRequired: value,
    resource: 'https://x402.nolimit.foundation/noLimitLLM',
    description: 'Uncensored AI conversations with complete privacy and zero data retention',
    mimeType: 'application/json',
    payTo: getAddress(PAY_TO),
    maxTimeoutSeconds: 60,
    asset: getAddress(USDC_ADDRESS),
    outputSchema: {
      input: {
        type: 'http',
        method: 'POST',
        discoverable: true,
      },
    },
    extra: {
      name: 'USD Coin',
      version: '2',
    },
  };

  // Encode payment header (base64)
  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  
  console.log('\nDecoded payment payload:');
  console.log(JSON.stringify(paymentPayload, null, 2));

  // Test verify endpoint
  console.log('\n--- Testing /verify ---');
  
  const verifyBody = {
    paymentHeader,
    paymentRequirements,
  };
  
  console.log('Request body:');
  console.log(JSON.stringify(verifyBody, null, 2));
  
  try {
    const verifyResponse = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyBody),
    });

    console.log('\nStatus:', verifyResponse.status);
    const verifyText = await verifyResponse.text();
    console.log('Raw response:', verifyText);
    
    try {
      const verifyData = JSON.parse(verifyText);
      console.log('Parsed response:', JSON.stringify(verifyData, null, 2));
      
      if (verifyData.isValid) {
        console.log('\n✅ Verification passed!');
        
        // Try settle
        console.log('\n--- Testing /settle ---');
        const settleResponse = await fetch(`${FACILITATOR_URL}/settle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(verifyBody),
        });
        
        console.log('Status:', settleResponse.status);
        const settleText = await settleResponse.text();
        console.log('Raw response:', settleText);
      } else {
        console.log('\n❌ Verification failed:', verifyData.invalidReason);
      }
    } catch (e) {
      console.log('Could not parse as JSON');
    }
  } catch (e: any) {
    console.error('Fetch error:', e.message);
  }
}

testFacilitator().catch(console.error);


