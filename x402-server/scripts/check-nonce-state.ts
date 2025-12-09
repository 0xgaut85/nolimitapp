/**
 * Check the authorization state for nonces on the USDC contract
 */
import { config } from 'dotenv';
import { createPublicClient, http, getAddress, toHex, keccak256, encodeAbiParameters } from 'viem';
import { base } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

config();

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

async function checkNonceState() {
  const wallets = loadWallets();
  const testWallet = wallets.base[0];

  console.log('=== NONCE STATE CHECK ===\n');
  console.log('Wallet:', testWallet.address);

  const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  // Generate a test nonce
  const testNonce = toHex(crypto.getRandomValues(new Uint8Array(32)));
  console.log('Test nonce:', testNonce);

  // Check authorizationState for this nonce
  // authorizationState(address authorizer, bytes32 nonce) returns (bool)
  const USDC_ABI = [
    {
      name: 'authorizationState',
      type: 'function',
      inputs: [
        { name: 'authorizer', type: 'address' },
        { name: 'nonce', type: 'bytes32' }
      ],
      outputs: [{ type: 'bool' }],
      stateMutability: 'view'
    },
    {
      name: 'balanceOf',
      type: 'function',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view'
    }
  ] as const;

  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [getAddress(testWallet.address)],
    });
    console.log('USDC Balance:', Number(balance) / 1e6, 'USDC');

    const authState = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'authorizationState',
      args: [getAddress(testWallet.address), testNonce as `0x${string}`],
    });
    console.log('Authorization state for test nonce:', authState, '(false = unused, true = used)');
  } catch (e: any) {
    console.error('Error:', e.message);
  }

  // Check a few random nonces
  console.log('\nChecking multiple random nonces...');
  for (let i = 0; i < 3; i++) {
    const randomNonce = toHex(crypto.getRandomValues(new Uint8Array(32)));
    try {
      const authState = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: [{
          name: 'authorizationState',
          type: 'function',
          inputs: [
            { name: 'authorizer', type: 'address' },
            { name: 'nonce', type: 'bytes32' }
          ],
          outputs: [{ type: 'bool' }],
          stateMutability: 'view'
        }] as const,
        functionName: 'authorizationState',
        args: [getAddress(testWallet.address), randomNonce as `0x${string}`],
      });
      console.log(`Nonce ${i + 1}: ${authState ? 'USED' : 'unused'}`);
    } catch (e: any) {
      console.error(`Nonce ${i + 1} check failed:`, e.shortMessage || e.message);
    }
  }
}

checkNonceState().catch(console.error);


