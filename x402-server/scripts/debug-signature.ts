/**
 * Debug script to verify EIP-712 signature for x402 payments
 */

import { config } from 'dotenv';
import { 
  createWalletClient, 
  http, 
  verifyTypedData,
  recoverTypedDataAddress,
  hashTypedData,
  getAddress
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

config();

const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// EIP-3009 TransferWithAuthorization types
const authorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }
  ]
} as const;

function loadWallets() {
  const scriptsDir = path.join(__dirname, '..');
  const files = fs.readdirSync(scriptsDir)
    .filter(f => f.startsWith('wallets-') && f.endsWith('.json'))
    .sort().reverse();
  if (files.length === 0) throw new Error('No wallet file found');
  const filepath = path.join(scriptsDir, files[0]);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

async function debugSignature() {
  console.log('\n🔍 Debug EIP-712 Signature for x402\n');
  
  const wallets = loadWallets();
  const testWallet = wallets.base[0];
  
  const pk = testWallet.privateKey.startsWith('0x') 
    ? testWallet.privateKey 
    : `0x${testWallet.privateKey}`;
  const account = privateKeyToAccount(pk as `0x${string}`);
  
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC_URL),
  });
  
  console.log('Wallet address:', account.address);
  
  // Create test authorization data (matching what x402 would send)
  const domain = {
    name: 'USD Coin',
    version: '2',
    chainId: 8453n,  // Base mainnet
    verifyingContract: getAddress(USDC_ADDRESS),
  } as const;
  
  const authorization = {
    from: getAddress(account.address),
    to: getAddress('0x3417828C83e8C1E787dC6DbeFD79F93E0C13f694'), // payTo from server
    value: 50000n, // 0.05 USDC
    validAfter: BigInt(Math.floor(Date.now() / 1000) - 600),
    validBefore: BigInt(Math.floor(Date.now() / 1000) + 60),
    nonce: '0x' + Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex') as `0x${string}`,
  };
  
  console.log('\n📋 Domain:', JSON.stringify({
    ...domain,
    chainId: domain.chainId.toString()
  }, null, 2));
  
  console.log('\n📋 Message:', JSON.stringify({
    ...authorization,
    value: authorization.value.toString(),
    validAfter: authorization.validAfter.toString(),
    validBefore: authorization.validBefore.toString(),
  }, null, 2));
  
  // Hash the typed data
  const typedDataHash = hashTypedData({
    domain,
    types: authorizationTypes,
    primaryType: 'TransferWithAuthorization',
    message: authorization,
  });
  console.log('\n🔑 Typed data hash:', typedDataHash);
  
  // Sign using wallet client (like wagmi does)
  console.log('\n--- Signing with wallet client ---');
  const signatureWC = await walletClient.signTypedData({
    domain,
    types: authorizationTypes,
    primaryType: 'TransferWithAuthorization',
    message: authorization,
  });
  console.log('Signature (wallet client):', signatureWC);
  console.log('Signature length:', signatureWC.length);
  console.log('v value (hex):', signatureWC.slice(-2));
  console.log('v value (dec):', parseInt(signatureWC.slice(-2), 16));
  
  // Sign using account directly
  console.log('\n--- Signing with account directly ---');
  const signatureAcc = await account.signTypedData({
    domain,
    types: authorizationTypes,
    primaryType: 'TransferWithAuthorization',
    message: authorization,
  });
  console.log('Signature (account):', signatureAcc);
  console.log('Signatures match:', signatureWC === signatureAcc);
  
  // Verify signature
  console.log('\n--- Verifying signature ---');
  const isValid = await verifyTypedData({
    address: account.address,
    domain,
    types: authorizationTypes,
    primaryType: 'TransferWithAuthorization',
    message: authorization,
    signature: signatureWC,
  });
  console.log('Signature valid:', isValid);
  
  // Recover address from signature
  const recoveredAddress = await recoverTypedDataAddress({
    domain,
    types: authorizationTypes,
    primaryType: 'TransferWithAuthorization',
    message: authorization,
    signature: signatureWC,
  });
  console.log('Recovered address:', recoveredAddress);
  console.log('Matches wallet:', recoveredAddress.toLowerCase() === account.address.toLowerCase());
  
  // Test what happens with different chainId formats
  console.log('\n--- Testing chainId formats ---');
  
  // As number
  const domainWithNumber = { ...domain, chainId: 8453 };
  const signatureNum = await account.signTypedData({
    domain: domainWithNumber,
    types: authorizationTypes,
    primaryType: 'TransferWithAuthorization',
    message: authorization,
  });
  console.log('Signature with chainId as number:', signatureNum);
  console.log('Same as bigint version:', signatureNum === signatureWC);
}

debugSignature().catch(console.error);


