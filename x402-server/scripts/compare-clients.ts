/**
 * Compare wallet client properties to understand the difference
 */
import { config } from 'dotenv';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

config();

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

async function compareClients() {
  const wallets = loadWallets();
  const testWallet = wallets.base[0];

  console.log('=== WALLET CLIENT COMPARISON ===\n');

  const pk = testWallet.privateKey.startsWith('0x') 
    ? testWallet.privateKey as `0x${string}`
    : `0x${testWallet.privateKey}` as `0x${string}`;
  const account = privateKeyToAccount(pk);

  // Create wallet client the way we do in the script
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  console.log('Wallet Client Properties:');
  console.log('- type:', (walletClient as any).type);
  console.log('- key:', (walletClient as any).key);
  console.log('- name:', (walletClient as any).name);
  console.log('- uid:', (walletClient as any).uid);
  
  console.log('\nChain:');
  console.log('- id:', walletClient.chain?.id);
  console.log('- name:', walletClient.chain?.name);
  console.log('- network:', (walletClient.chain as any)?.network);
  
  console.log('\nAccount:');
  console.log('- address:', walletClient.account?.address);
  console.log('- type:', walletClient.account?.type);
  console.log('- has signMessage:', typeof walletClient.account?.signMessage);
  console.log('- has signTransaction:', typeof walletClient.account?.signTransaction);
  console.log('- has signTypedData:', typeof walletClient.account?.signTypedData);
  
  console.log('\nTransport:');
  console.log('- type:', walletClient.transport?.type);
  console.log('- name:', walletClient.transport?.name);
  console.log('- key:', walletClient.transport?.key);

  // Check what x402 sees
  console.log('\n=== What x402 checks ===');
  
  // From x402 source: isSignerWallet checks for chain and transport
  const hasChain = 'chain' in walletClient;
  const hasTransport = 'transport' in walletClient;
  console.log('- has chain:', hasChain);
  console.log('- has transport:', hasTransport);
  console.log('- isSignerWallet would return:', hasChain && hasTransport);

  // Check account properties
  const acc = walletClient.account;
  const isAccount = typeof acc === 'object' && acc !== null &&
    typeof (acc as any).address === 'string' &&
    typeof (acc as any).type === 'string' &&
    typeof (acc as any).sign === 'function' &&
    typeof (acc as any).signMessage === 'function' &&
    typeof (acc as any).signTypedData === 'function' &&
    typeof (acc as any).signTransaction === 'function';
  console.log('- isAccount would return:', isAccount);

  // Test signTypedData
  console.log('\n=== Test signTypedData ===');
  
  const testDomain = {
    name: 'USD Coin',
    version: '2',
    chainId: 8453,
    verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  };
  
  const testTypes = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };
  
  const testMessage = {
    from: account.address,
    to: '0x3417828C83e8C1E787dC6DbeFD79F93E0C13f694' as `0x${string}`,
    value: BigInt(50000),
    validAfter: BigInt(0),
    validBefore: BigInt(Math.floor(Date.now() / 1000) + 60),
    nonce: '0x1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`,
  };

  try {
    const signature = await walletClient.signTypedData({
      domain: testDomain,
      types: testTypes,
      primaryType: 'TransferWithAuthorization',
      message: testMessage,
    });
    console.log('Signature:', signature);
    console.log('Signature length:', signature.length);
    
    // Check signature format
    const v = parseInt(signature.slice(-2), 16);
    console.log('Signature v value:', v, '(should be 27 or 28, or 0/1 for EIP-155)');
  } catch (e: any) {
    console.error('signTypedData failed:', e.message);
  }
}

compareClients().catch(console.error);


