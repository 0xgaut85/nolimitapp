/**
 * Check USDC contract state for the wallet
 */
import { config } from 'dotenv';
import { createPublicClient, http, getAddress } from 'viem';
import { base } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

config();

const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PAYTO_ADDRESS = '0x3417828C83e8C1E787dC6DbeFD79F93E0C13f694';

// USDC ABI for relevant functions
const USDC_ABI = [
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'allowance', type: 'function', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'nonces', type: 'function', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'DOMAIN_SEPARATOR', type: 'function', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' },
  { name: 'name', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
  { name: 'version', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
  { name: 'authorizationState', type: 'function', inputs: [{ name: 'authorizer', type: 'address' }, { name: 'nonce', type: 'bytes32' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
] as const;

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

async function checkUsdcState() {
  const wallets = loadWallets();
  const testWallet = wallets.base[0];

  console.log('=== USDC CONTRACT STATE CHECK ===');
  console.log(`Wallet: ${testWallet.address}`);

  const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  // Check balance
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [getAddress(testWallet.address)],
  });
  console.log(`\nUSDC Balance: ${Number(balance) / 1e6} USDC`);

  // Check allowance to payTo address
  const allowance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [getAddress(testWallet.address), getAddress(PAYTO_ADDRESS)],
  });
  console.log(`Allowance to ${PAYTO_ADDRESS}: ${Number(allowance) / 1e6} USDC`);

  // Check contract name and version
  const name = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'name',
  });
  console.log(`\nContract Name: "${name}"`);

  const version = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'version',
  });
  console.log(`Contract Version: "${version}"`);

  // Check domain separator
  const domainSeparator = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'DOMAIN_SEPARATOR',
  });
  console.log(`Domain Separator: ${domainSeparator}`);

  // Check EIP-2612 nonce (for permit)
  try {
    const nonce = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'nonces',
      args: [getAddress(testWallet.address)],
    });
    console.log(`\nEIP-2612 Nonce: ${nonce}`);
  } catch (e) {
    console.log('\nEIP-2612 nonces not available');
  }

  // Check a sample authorization state (random nonce)
  const sampleNonce = '0x0000000000000000000000000000000000000000000000000000000000000001' as `0x${string}`;
  try {
    const authState = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'authorizationState',
      args: [getAddress(testWallet.address), sampleNonce],
    });
    console.log(`\nAuthorization state for sample nonce: ${authState}`);
  } catch (e: any) {
    console.log('\nauthorizationState check failed:', e.message);
  }

  // Get ETH balance for gas
  const ethBalance = await publicClient.getBalance({
    address: getAddress(testWallet.address),
  });
  console.log(`\nETH Balance: ${Number(ethBalance) / 1e18} ETH`);
}

checkUsdcState().catch(console.error);


