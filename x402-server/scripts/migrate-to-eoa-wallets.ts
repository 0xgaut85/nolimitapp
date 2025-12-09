/**
 * Migrate funds from EIP-7702 delegated wallets to fresh EOA wallets
 * 
 * This script:
 * 1. Generates 70 new pure EOA wallets
 * 2. Transfers USDC from each old wallet to the corresponding new wallet
 * 3. Saves the new wallet file
 */

import { config } from 'dotenv';
import { 
  createWalletClient, 
  createPublicClient, 
  http, 
  parseUnits,
  formatUnits,
  getAddress 
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { base } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

config();

const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Minimal ERC20 ABI
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  }
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
  const filepath = path.join(scriptsDir, files[0]);
  console.log(`Loading old wallets from: ${filepath}`);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrateWallets() {
  console.log('='.repeat(60));
  console.log('MIGRATE TO FRESH EOA WALLETS');
  console.log('='.repeat(60));
  
  const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  // Load old wallets
  const oldWallets = loadWallets();
  console.log(`\nFound ${oldWallets.base.length} Base wallets to migrate`);
  console.log(`Found ${oldWallets.solana.length} Solana wallets (will keep as-is)`);

  // Step 1: Generate new EOA wallets
  console.log('\n--- Step 1: Generating new EOA wallets ---');
  const newBaseWallets: WalletData[] = [];
  
  for (let i = 0; i < oldWallets.base.length; i++) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    newBaseWallets.push({
      address: account.address,
      privateKey: privateKey,
    });
  }
  console.log(`Generated ${newBaseWallets.length} new EOA wallets`);

  // Verify they are EOAs (no bytecode)
  console.log('\nVerifying new wallets are EOAs...');
  for (let i = 0; i < 3; i++) {
    const code = await publicClient.getBytecode({ address: getAddress(newBaseWallets[i].address) });
    const isEOA = !code || code === '0x';
    console.log(`  Wallet ${i}: ${newBaseWallets[i].address.slice(0, 10)}... - ${isEOA ? 'EOA ✅' : 'CONTRACT ❌'}`);
  }

  // Step 2: Check balances on old wallets
  console.log('\n--- Step 2: Checking USDC balances on old wallets ---');
  let totalUsdcToMigrate = BigInt(0);
  const walletsWithBalance: { index: number; balance: bigint; oldWallet: WalletData; newWallet: WalletData }[] = [];

  for (let i = 0; i < oldWallets.base.length; i++) {
    let balance: bigint;
    let retries = 3;
    
    while (retries > 0) {
      try {
        balance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [getAddress(oldWallets.base[i].address)],
        });
        break;
      } catch (error: any) {
        retries--;
        if (retries === 0) {
          console.log(`  ⚠️ Failed to check wallet ${i}, assuming 1.45 USDC`);
          balance = BigInt(1450000); // Assume 1.45 USDC
          break;
        }
        await sleep(2000); // Wait 2 seconds before retry
      }
    }
    
    if (balance! > BigInt(0)) {
      totalUsdcToMigrate += balance!;
      walletsWithBalance.push({
        index: i,
        balance: balance!,
        oldWallet: oldWallets.base[i],
        newWallet: newBaseWallets[i],
      });
    }
    
    if ((i + 1) % 10 === 0) {
      console.log(`  Checked ${i + 1}/${oldWallets.base.length} wallets...`);
    }
    
    // Add delay between checks to avoid rate limiting
    await sleep(500);
  }

  console.log(`\nTotal USDC to migrate: ${formatUnits(totalUsdcToMigrate, 6)} USDC`);
  console.log(`Wallets with balance: ${walletsWithBalance.length}`);

  if (walletsWithBalance.length === 0) {
    console.log('\n⚠️ No wallets have USDC balance. Nothing to migrate.');
    
    // Still save the new wallets
    const newWalletsFile: WalletsFile = {
      generated: new Date().toISOString(),
      base: newBaseWallets,
      solana: oldWallets.solana, // Keep Solana wallets unchanged
    };
    
    const newFilePath = path.join(__dirname, '..', `wallets-eoa-${Date.now()}.json`);
    fs.writeFileSync(newFilePath, JSON.stringify(newWalletsFile, null, 2));
    console.log(`\nNew wallet file saved to: ${newFilePath}`);
    return;
  }

  // Step 3: Transfer USDC from old to new wallets
  console.log('\n--- Step 3: Transferring USDC to new wallets ---');
  console.log('Starting in 5 seconds... (Ctrl+C to cancel)');
  await sleep(5000);

  let successCount = 0;
  let failCount = 0;

  for (const { index, balance, oldWallet, newWallet } of walletsWithBalance) {
    const pk = oldWallet.privateKey.startsWith('0x') 
      ? oldWallet.privateKey as `0x${string}`
      : `0x${oldWallet.privateKey}` as `0x${string}`;
    
    const account = privateKeyToAccount(pk);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(BASE_RPC_URL),
    });

    console.log(`\n[${index + 1}/${walletsWithBalance.length}] ${oldWallet.address.slice(0, 10)}... -> ${newWallet.address.slice(0, 10)}...`);
    console.log(`   Amount: ${formatUnits(balance, 6)} USDC`);

    try {
      // Check ETH balance for gas
      const ethBalance = await publicClient.getBalance({ address: account.address });
      if (ethBalance < BigInt(100000000000000)) { // 0.0001 ETH minimum
        console.log(`   ⚠️ Low ETH balance: ${formatUnits(ethBalance, 18)} ETH - may fail`);
      }

      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [getAddress(newWallet.address), balance],
      });

      console.log(`   📤 Tx: ${hash.slice(0, 20)}...`);
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        console.log(`   ✅ Success!`);
        successCount++;
      } else {
        console.log(`   ❌ Transaction reverted`);
        failCount++;
      }
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.shortMessage || error.message}`);
      failCount++;
    }

    // Small delay between transactions
    await sleep(1500);
  }

  // Step 4: Save new wallet file
  console.log('\n--- Step 4: Saving new wallet file ---');
  
  const newWalletsFile: WalletsFile = {
    generated: new Date().toISOString(),
    base: newBaseWallets,
    solana: oldWallets.solana, // Keep Solana wallets unchanged
  };

  const newFilePath = path.join(__dirname, '..', `wallets-eoa-${Date.now()}.json`);
  fs.writeFileSync(newFilePath, JSON.stringify(newWalletsFile, null, 2));

  // Also save private keys to text file
  const documentsPath = process.env.USERPROFILE 
    ? path.join(process.env.USERPROFILE, 'Documents')
    : path.join(__dirname, '..');
  const txtPath = path.join(documentsPath, `nolimit-eoa-wallets-${Date.now()}.txt`);
  
  let txtContent = `
===========================================
NOLIMIT - FRESH EOA WALLETS
===========================================
Generated: ${new Date().toISOString()}

⚠️ KEEP THIS SECURE - CONTAINS PRIVATE KEYS ⚠️

===========================================
BASE WALLETS (${newBaseWallets.length})
===========================================
`;

  for (let i = 0; i < newBaseWallets.length; i++) {
    txtContent += `\n[${i + 1}] ${newBaseWallets[i].address}\n    ${newBaseWallets[i].privateKey}\n`;
  }

  txtContent += `
===========================================
SOLANA WALLETS (${oldWallets.solana.length}) - UNCHANGED
===========================================
`;

  for (let i = 0; i < oldWallets.solana.length; i++) {
    txtContent += `\n[${i + 1}] ${oldWallets.solana[i].address}\n    ${oldWallets.solana[i].privateKey}\n`;
  }

  fs.writeFileSync(txtPath, txtContent);

  // Final report
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nTransfers: ${successCount} success, ${failCount} failed`);
  console.log(`\nNew wallet files saved to:`);
  console.log(`  JSON: ${newFilePath}`);
  console.log(`  TXT:  ${txtPath}`);
  console.log('\n⚡ The new wallets are pure EOAs and should work with x402!');
  console.log('='.repeat(60));
}

migrateWallets().catch(console.error);

