/**
 * LIVE x402 Activity Simulation Script - SOLANA ONLY
 * 
 * This script makes REAL x402 API calls that require USDC payment.
 * 
 * Distribution:
 * - 80% Chat (noLimitLLM) - $0.05 per transaction
 * - 15% Mixer (noLimitMixer) - $0.075 per transaction
 * - 5% Swap (noLimitSwap) - $0.10 per transaction
 * 
 * Mode: CONTINUOUS - runs until all wallets are out of USDC funds
 * Duration: 2 hours
 * 
 * USAGE: npx tsx scripts/simulate-solana-only.ts
 */

import { config } from 'dotenv';
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  getMint,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { createPaymentHeaderFromTransaction } from 'x402-solana/utils';
import bs58 from 'bs58';

config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  durationHours: 2,
  distribution: {
    chat: 0.80,
    mixer: 0.15,
    swap: 0.05,
  },
  fees: {
    chat: 0.05,
    mixer: 0.075,
    swap: 0.10,
  },
  serverUrl: process.env.X402_SERVER_URL || 'https://x402.nolimit.foundation',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
};

// ============================================================================
// 30 SOLANA WALLETS (hardcoded - not saved to disk)
// ============================================================================

// 30 Solana wallets hardcoded
const SOLANA_WALLETS = [
  { address: "21w6kxW1FGAUntTcn94Ckfu68TTCmWpYRzfmTCvY1vbH", privateKey: "2UTwR2JgrxiZJbTprRR4f6QJo6MtDpyRRdEUSo9Tt1BkGr4LyiEMpdmfSeMA5EGEVP2stTj5B5qh2VbSN8jnRj1H" },
  { address: "ENaQVD3SSR3j5peW6xovmZ7cVHM8FYAN9QxsLyhVLRjh", privateKey: "3PkUJtUQBrSoaMSuPVXqDXbNyXwTpQVpCjTgBWb9D5uufeChAgQeSptbmdnVdKrce8sF4yFr6H72xuJqwBwM2EyR" },
  { address: "58TwD7jraKDuDhovPjKxTQ3XMPBr3G4rRrZ15RkEyHSL", privateKey: "61PYGMnbmvasHYXBoCiVVv8P6RAZbzqP7hvPtkwXAzoMD1SBioh8y75JGDXUXstRsAQaegrWVSeEony5Xv8UF6C" },
  { address: "5z1FhUUiActc3Rk8GcZoK6f28Y5RVu5VU717oE3LyDtZ", privateKey: "g3VGnwQm6R7d3FDwyGdFCiFpJY3nvEWR64zaUT4fK8kVZTkoAMppenoQf4qbiPacfPDgwcq6AFyeXVgRKfTbLc5" },
  { address: "FwMCg2LYAroyFqs32KYED2J42S3HCRQ4wLzquKdVVUN1", privateKey: "2aKTwpW9SFJbFPkpGiJYxyCib4aiy8khF81JcLB9e8HxMuTbffewE9Kxdze9hJW8qAJ7NwW3Dyp12GjhBFfvZ9uw" },
  { address: "H8t87SjkUz6xKHULz89hVvEN9wmsB2nTxGuBM4ASZB3j", privateKey: "3CiYuyQUSjZ6iNh6MAwbFym445kh8d8EdMiDMPPPrCkuhAHWeBM1iXDZpMp8CzYTApkbfCAXZWbEek3yc4Jftzb7" },
  { address: "6tsr63PqKLSBH1s5BJAVn6fu1H8LrpLhEdYbsZMoeexG", privateKey: "5eA5iM3W4Azh94VBSSyZCQLWUzzFAj7KK6SvjHGjDC7gpjMrLdfkvQJTWGkjYaRZcaBet3fNFs2Y4QAx1VeQFMFe" },
  { address: "6y9AkyACSWqMQqrck8Vw5KjNEPE8U8UwZqSsyrBCn2Bp", privateKey: "675rFQyCcE1cbj1Phr7xMQBKDhqjScRt2WCJ5578ppPdE1MsuNGs6EFZ8gUjRBd2wog7rXJq3bCRESF8j5dWG9EN" },
  { address: "2XwiugxCYKBmA5THUCJwuTYaaMuKwLtZT5gnxy9xLxhV", privateKey: "zQrztZiwmeGrc2zPbj1ke9qRrP739ryJMB7EKiw6xTXSTrmsNHHQFnaGV4d8kKwGtZQ14A4Kc6YiYGeLzqQdzqV" },
  { address: "FhS3NcFvmaPSansLzaz9R8fQ3h5G5xyUR99GaVZ6WCFW", privateKey: "3Wi3LKfG2sj9wYXVZf4RzLQ1eusDMyNTaCUZ4FB6xqMef52cCXUjD4NfxGTNFz5oDFfdXW31tfWizXUuYTEvu9a4" },
  { address: "DjMZx7ZMLfEuyrxTNuyFAvKaAUmzA7zemUyCD5bsGuSC", privateKey: "62EBngMu13oaMEdA7VkFbgs6AEEFfk7ZHRf1LfNRq66Dm3RApdt2wMpG6p1xZLSmXCk1HNNx1yyb6RJYXkphRf5W" },
  { address: "8cSvfYdzLra8W1cs7W2ef3YiHhnESCo7JPJ4Jg4UYtc8", privateKey: "5UcwM5igr9myYx9hyzsFzpYN2kPUUPBfkhzQtZqHkrPWMm1AdBeBBP2NEx62HUhXYwormJFhKdMzYRazYd9hkA8x" },
  { address: "CmqDmPrrgj58B5EzoxFo5qZGsjTYVLAWiuJscDVCqgvg", privateKey: "27Mj8Psj7rM8KtN9RdpFp5HQHHkksAYHzpkFdkM6UAN8R9gC2X1f8iHtDKRoFxZdyFsqLxhZX8RkDxzn67D6kZNC" },
  { address: "4rXssHWuZ5uu9w1pFRCvtZ3qGxcHdChKch6aiBRms1HK", privateKey: "tAMfwCVRRcoF7yPa3LC9tYCnkiFYzMdz9qegMsHM56UuMBwAnX64MUcw4FsH4jYgcL2xfSa5gAcCSnj7SJwoDcu" },
  { address: "5ccM5DUvJoG6jkAbn4nD2mxgMg8UydtyNHxgquc8iU9s", privateKey: "2ZaTyLUo5gQGak7S2t5g2LXDL194624kZ4J4fPrZEHbkUucvhZdkvtwZbX4SZpUWE91UFN9jgDsE6dVV7ja5P46h" },
  { address: "AUTBiM2sQJAtnnN1AejDsVspWi6FbhUWcd1TxB4mFsoq", privateKey: "37JD6Eq9YEEaz4rBTPJrXa5sJwaNNqvZ15sDu5e46HtYbeeJ13sTc9gtXiCxkf5ezbjrJdqRnMuHxV6HfRGu3kZy" },
  { address: "7jt3w8PQuKUSmS6vCBG8DcCFbhqEidbpqR3KcANKhTS", privateKey: "24rTzDDE2hovXcR3bPfpUsywqgyhjGftWeNXSGZWh9ABiYDryqHJ4qWYhcVsuPhaqpWNkv54tEq2QddoaheiXxGU" },
  { address: "7PUrK5NHaJv73YC3qgEpz9NWNQD88ywdPaFyGRc4Bp2i", privateKey: "VQ9nkuG4BNsQx1M3keW7pS72r7jANFoDBBAym33GzTXx4KxZizPq6BxU2TeaEHWUnKHmntH4z7WKyvzNniRdmVQ" },
  { address: "8SGVjwEwTJu9kcTh8Exa7Z1uBHMKRckawRsixedveDeD", privateKey: "2cTvtzEPibCg74FYbXxLtPKW93RjXee3YqdXU1udGUzLS49hwdK9j8it6GSdpTj5F3P4RjhPbjWd8kfoF6y2a4Gm" },
  { address: "GvP6iGMbDR48rgJZbzemRgY55tfuvtHwZDYicFHxbZev", privateKey: "5to1NhuzLDv4sNnASVc4bnFJqHzvXnrddCRk1arRQezyvN5vHNjx5dtXFVTPwN4XiDbGrQR8j5cMhAU9UqRBT7DQ" },
  { address: "6GsrftFQHCGr3Scc9r3DkAnszFikhvTqe1hMKxfYa3UQ", privateKey: "4GooaL8o5apcCt3Pt7mn1pvRakJaJtrHvoxc27cUE1TCiwaH3jdoagCR6WJrJqn53YbGGb2Fk8saxE6s26q1NNma" },
  { address: "5wVGCHbzfHsoe9T2xSwJg9MVX9waBKDY3Ru6whVQkZ46", privateKey: "4NmUfKFcwmDXhrrTum6DZLmuTbVZ868wG5mEsaj9TfXoV4fMsucedux8fE7WdGMQnebkyVdCFxa2Ckgugwomunbt" },
  { address: "593KPPAvQE4PwgEwCrmkL3WHzbXAKGWxhZaHbpTH6Zgb", privateKey: "3UgfTaCNuyrepEdwqcV8WPSKVoDkvf2Cc6PCTrG9whb36uDs1ub6o3FtzgfxdGCcrpXWHk75zEa9pHHt3WGmjXqy" },
  { address: "4pGU4WCEyFeJeMFt1KE6359NUyhuRsowc4ubhPdt3cWQ", privateKey: "5vekx8Sm9vNfQsjy3q1Zdyz4tZbJBx2X6oNRiemfVxdkR8yoyqcAam7pbyw9QXdzVYQHYjUiUCKtZrmZo5FoKdaU" },
  { address: "AgMXQJsy5fcK1JnxdLkU11KWXUgzLbiXcUE11Nsezdyn", privateKey: "s9z2CEQZUE3se5CWADEtDs6MDg3REPuryFQYpdskDyvMaQ7mM2BvNBPBtNyneHZ7UADaWeYdeLxygx467CNjWbW" },
  { address: "FTWXp2SfVnMixyD4CBQRc7ZTcTDvzTXDkwpNiVb2k4L9", privateKey: "5Y6idDae3tXHMmyNJSUPdimmmAt1GvZJhTQEBc55r88Yeik5NnJjimardkS3AS3pMGrjwUbh6qUtaGiv9bzEzHn1" },
  { address: "4x9J2vmTVUnTnQuvqLRLoJivbU7Hx7gskoVpZxDrUVzY", privateKey: "4DxtLF1bW32Y84vMoRo8mMLef8ZyxiMtdAvr9YNQcbHw6vcYvzScdCb5TNPJjoiiaHeNBbWnEyXLZKSMmHuBfuPe" },
  { address: "45YKsXzng6p6QCB5eF5SJd7e39anPfCuwcexiXXRkb8h", privateKey: "2tuB5cRzwmSVhvuC4DZ7TR82Wer6pbPRTLY2HStA7zGWYDb5ZjtasEroWoAp6qGezazUb5XRjTJtK1oXJ7qLvKa5" },
  { address: "45RuX1qy9qMApbAEtSrfXYJgxQaZ6NRiiHANEB714QPU", privateKey: "ecFwuc5UEd133DDzTv1EGhEHFBBpkvr7tNb18iTe5T9u4gaF2xB9DgaTno4MdXPgC515Dhhp99hcCrqfE1ADyJa" },
  { address: "AfwFRwMCc1Z9JtfBE15YmnxfNxssCk7tB7pwcMTTfru2", privateKey: "5N3tja7hW92Bgk6cL9C3McCFJHFeFB8Yjab2hu2Rkos1iRsbcpurk6oVLYFGcd8LLxdWsEkjcyFe5WgoDjTGP7Xz" },
];

// ============================================================================
// SAMPLE DATA
// ============================================================================

const CHAT_MESSAGES = [
  "What's the current state of crypto regulation?",
  "Explain how zero-knowledge proofs work",
  "What are the best practices for smart contract security?",
  "How does the Lightning Network work?",
  "Explain MEV and its impact on DeFi",
  "What is account abstraction in Ethereum?",
  "How do rollups scale Ethereum?",
  "What are the risks of yield farming?",
  "How do decentralized oracles work?",
  "Explain impermanent loss in AMMs",
  "What is the future of cross-chain bridges?",
  "How does Solana achieve high throughput?",
  "Explain how DAOs make decisions",
  "What are soulbound tokens?",
  "How do privacy coins work?",
  "Explain the concept of liquid staking",
  "What are inscription protocols?",
  "How does atomic swap work?",
  "What is a flash loan attack?",
  "How do NFT marketplaces work?",
];

const SWAP_PAIRS = [
  { from: 'SOL', to: 'USDC', amount: '10000000' },
  { from: 'USDC', to: 'SOL', amount: '1000000' },
];

const MIXER_CONFIG = { tokens: ['SOL', 'USDC'], amounts: ['0.01', '1'] };

// ============================================================================
// TYPES
// ============================================================================

type TransactionType = 'chat' | 'mixer' | 'swap';

interface Stats {
  total: number;
  success: number;
  failed: number;
  chat: number;
  mixer: number;
  swap: number;
  chatFailed: number;
  mixerFailed: number;
  swapFailed: number;
  usdcSpent: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomAddress(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  return Array.from({ length: 44 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

// ============================================================================
// SOLANA x402 CLIENT
// ============================================================================

interface SolanaWalletClient {
  keypair: Keypair;
  address: string;
  connection: Connection;
}

function createSolanaWalletClient(privateKey: string): SolanaWalletClient {
  const secretKey = bs58.decode(privateKey);
  const keypair = Keypair.fromSecretKey(secretKey);
  const connection = new Connection(CONFIG.solanaRpcUrl, 'confirmed');
  return {
    keypair,
    address: keypair.publicKey.toBase58(),
    connection,
  };
}

async function createSolanaPaymentHeader(
  wallet: SolanaWalletClient,
  x402Version: number,
  paymentRequirements: any,
  rpcUrl: string
): Promise<string> {
  const connection = new Connection(rpcUrl, 'confirmed');
  
  const feePayer = paymentRequirements?.extra?.feePayer;
  if (typeof feePayer !== 'string' || !feePayer) {
    throw new Error('Missing facilitator feePayer in payment requirements');
  }
  const feePayerPubkey = new PublicKey(feePayer);
  const userPubkey = wallet.keypair.publicKey;
  
  if (!paymentRequirements?.payTo) {
    throw new Error('Missing payTo in payment requirements');
  }
  const destination = new PublicKey(paymentRequirements.payTo);
  
  const instructions: any[] = [];
  
  instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 7000 }));
  instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
  
  if (!paymentRequirements.asset) {
    throw new Error('Missing token mint for SPL transfer');
  }
  const mintPubkey = new PublicKey(paymentRequirements.asset);
  
  const mintInfo = await connection.getAccountInfo(mintPubkey, 'confirmed');
  const programId = mintInfo?.owner?.toBase58() === TOKEN_2022_PROGRAM_ID.toBase58() 
    ? TOKEN_2022_PROGRAM_ID 
    : TOKEN_PROGRAM_ID;
  
  const mint = await getMint(connection, mintPubkey, undefined, programId);
  
  const sourceAta = await getAssociatedTokenAddress(mintPubkey, userPubkey, false, programId);
  const destinationAta = await getAssociatedTokenAddress(mintPubkey, destination, false, programId);
  
  const sourceAtaInfo = await connection.getAccountInfo(sourceAta, 'confirmed');
  if (!sourceAtaInfo) {
    throw new Error(`User does not have an Associated Token Account for ${paymentRequirements.asset}`);
  }
  
  const destAtaInfo = await connection.getAccountInfo(destinationAta, 'confirmed');
  if (!destAtaInfo) {
    throw new Error(`Destination does not have an Associated Token Account for ${paymentRequirements.asset}`);
  }
  
  const amount = BigInt(paymentRequirements.maxAmountRequired);
  
  instructions.push(
    createTransferCheckedInstruction(
      sourceAta,
      mintPubkey,
      destinationAta,
      userPubkey,
      amount,
      mint.decimals,
      [],
      programId
    )
  );
  
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({
    payerKey: feePayerPubkey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();
  
  const transaction = new VersionedTransaction(message);
  transaction.sign([wallet.keypair]);
  
  return createPaymentHeaderFromTransaction(
    transaction,
    paymentRequirements,
    x402Version
  );
}

async function solanaX402Fetch(
  wallet: SolanaWalletClient,
  url: string,
  options: RequestInit
): Promise<Response> {
  const initialResponse = await fetch(url, options);
  
  if (initialResponse.status !== 402) {
    return initialResponse;
  }
  
  const rawResponse = await initialResponse.json();
  const x402Version = rawResponse.x402Version;
  const parsedPaymentRequirements = rawResponse.accepts || [];
  
  const selectedRequirements = parsedPaymentRequirements.find(
    (req: any) => req.scheme === 'exact' && (req.network === 'solana-devnet' || req.network === 'solana')
  );
  
  if (!selectedRequirements) {
    throw new Error('No suitable Solana payment requirements found');
  }
  
  const paymentHeader = await createSolanaPaymentHeader(
    wallet,
    x402Version,
    selectedRequirements,
    CONFIG.solanaRpcUrl
  );
  
  const newInit = {
    ...options,
    headers: {
      ...(options.headers as Record<string, string>) || {},
      'X-PAYMENT': paymentHeader,
      'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
    },
  };
  
  return await fetch(url, newInit);
}

// ============================================================================
// TRANSACTION EXECUTORS
// ============================================================================

async function executeChat(wallet: SolanaWalletClient): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await solanaX402Fetch(wallet, `${CONFIG.serverUrl}/noLimitLLM/solana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: randomItem(CHAT_MESSAGES), userAddress: wallet.address }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

async function executeMixer(wallet: SolanaWalletClient): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await solanaX402Fetch(wallet, `${CONFIG.serverUrl}/noLimitMixer/solana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: randomItem(MIXER_CONFIG.tokens),
        amount: randomItem(MIXER_CONFIG.amounts),
        recipientAddress: generateRandomAddress(),
        userAddress: wallet.address,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

async function executeSwap(wallet: SolanaWalletClient): Promise<{ success: boolean; error?: string }> {
  try {
    const pair = randomItem(SWAP_PAIRS);
    const response = await solanaX402Fetch(wallet, `${CONFIG.serverUrl}/noLimitSwap/solana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chain: 'solana',
        fromToken: pair.from,
        toToken: pair.to,
        amount: pair.amount,
        userAddress: wallet.address,
        slippage: 1,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
  }
}

// ============================================================================
// MAIN SIMULATION
// ============================================================================

function isOutOfFundsError(error: string): boolean {
  const outOfFundsPatterns = [
    'insufficient',
    'not enough',
    'exceeds balance',
    'insufficient funds',
    'insufficient_balance',
    'transfer amount exceeds',
  ];
  const lowerError = error.toLowerCase();
  return outOfFundsPatterns.some(p => lowerError.includes(p));
}

async function runSimulation() {
  const TOTAL_DURATION_MS = CONFIG.durationHours * 60 * 60 * 1000;
  
  console.log('\n' + '='.repeat(70));
  console.log('🚀 LIVE x402 ACTIVITY SIMULATION - SOLANA ONLY');
  console.log('='.repeat(70));
  console.log(`\n📊 Configuration:`);
  console.log(`   Server URL: ${CONFIG.serverUrl}`);
  console.log(`   Solana wallets: ${SOLANA_WALLETS.length}`);
  console.log(`   Mode: CONTINUOUS (until out of funds)`);
  console.log(`   Duration: ${CONFIG.durationHours} hours`);
  
  console.log('\n🔐 Initializing wallet clients...');
  
  const clients: SolanaWalletClient[] = [];
  const activeWallets = new Set<number>();
  
  for (let i = 0; i < SOLANA_WALLETS.length; i++) {
    try {
      clients.push(createSolanaWalletClient(SOLANA_WALLETS[i].privateKey));
      activeWallets.add(i);
    } catch (e) {
      console.error(`❌ Wallet init failed: ${SOLANA_WALLETS[i].address.slice(0, 10)}`);
    }
  }
  console.log(`   ✅ Wallets ready: ${clients.length}/${SOLANA_WALLETS.length}`);
  
  const stats: Stats = {
    total: 0, success: 0, failed: 0,
    chat: 0, mixer: 0, swap: 0,
    chatFailed: 0, mixerFailed: 0, swapFailed: 0,
    usdcSpent: 0,
  };
  
  const startTime = Date.now();
  const endTime = startTime + TOTAL_DURATION_MS;
  
  const estimatedTotalTx = activeWallets.size * 25;
  let intervalMs = TOTAL_DURATION_MS / estimatedTotalTx;
  
  console.log(`\n📅 Estimated ~${estimatedTotalTx} transactions`);
  console.log(`   Interval: ${(intervalMs / 1000).toFixed(2)} seconds`);
  console.log(`🚀 Starting at ${new Date(startTime).toISOString()}`);
  console.log(`   End time: ${new Date(endTime).toISOString()}`);
  console.log(`\n⏳ Running until all wallets are empty or time runs out...\n`);
  
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 20;
  
  while (Date.now() < endTime && activeWallets.size > 0) {
    const activeArray = Array.from(activeWallets);
    const walletIndex = activeArray[Math.floor(Math.random() * activeArray.length)];
    
    const rand = Math.random();
    const type: TransactionType = rand < CONFIG.distribution.chat ? 'chat' 
      : rand < CONFIG.distribution.chat + CONFIG.distribution.mixer ? 'mixer' : 'swap';
    
    let result: { success: boolean; error?: string };
    
    try {
      if (type === 'chat') {
        result = await executeChat(clients[walletIndex]);
        if (result.success) { stats.chat++; stats.usdcSpent += CONFIG.fees.chat; }
        else stats.chatFailed++;
      } else if (type === 'mixer') {
        result = await executeMixer(clients[walletIndex]);
        if (result.success) { stats.mixer++; stats.usdcSpent += CONFIG.fees.mixer; }
        else stats.mixerFailed++;
      } else {
        result = await executeSwap(clients[walletIndex]);
        if (result.success) { stats.swap++; stats.usdcSpent += CONFIG.fees.swap; }
        else stats.swapFailed++;
      }
      
      if (!result.success && result.error && isOutOfFundsError(result.error)) {
        activeWallets.delete(walletIndex);
        console.log(`💸 Wallet ${walletIndex} out of funds (${activeWallets.size} remaining)`);
      }
      
      if (result.success) {
        stats.success++;
        consecutiveFailures = 0;
      } else {
        stats.failed++;
        consecutiveFailures++;
      }
      stats.total++;
      
      if (stats.total <= 10 || stats.total % 25 === 0) {
        const elapsed = Date.now() - startTime;
        const remaining = endTime - Date.now();
        const pct = ((elapsed / TOTAL_DURATION_MS) * 100).toFixed(1);
        if (!result.success) {
          console.log(`❌ Tx ${stats.total} failed (${type}): ${result.error}`);
        }
        console.log(`📊 [${pct}% time] Tx: ${stats.total} | ✅ ${stats.success} ❌ ${stats.failed} | Active: ${activeWallets.size} | ETA: ${formatTime(remaining)}`);
      }
      
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.log(`\n⚠️  ${MAX_CONSECUTIVE_FAILURES} consecutive failures - stopping.`);
        break;
      }
      
    } catch (error) {
      stats.failed++;
      stats.total++;
      consecutiveFailures++;
      console.error(`❌ Tx ${stats.total} exception:`, error instanceof Error ? error.message : error);
    }
    
    const jitter = intervalMs * (0.5 + Math.random());
    await sleep(jitter);
    
    const newTotalActive = activeWallets.size;
    if (newTotalActive > 0 && newTotalActive < clients.length * 0.8) {
      const remainingTime = endTime - Date.now();
      const estimatedRemainingTx = newTotalActive * 25;
      intervalMs = remainingTime / estimatedRemainingTx;
    }
  }
  
  const totalDuration = Date.now() - startTime;
  console.log('\n' + '='.repeat(70));
  console.log('✅ SIMULATION COMPLETE');
  console.log('='.repeat(70));
  console.log(`Duration: ${formatTime(totalDuration)}`);
  console.log(`Total: ${stats.total} | Success: ${stats.success} | Failed: ${stats.failed}`);
  console.log(`Chat: ${stats.chat}/${stats.chat + stats.chatFailed}`);
  console.log(`Mixer: ${stats.mixer}/${stats.mixer + stats.mixerFailed}`);
  console.log(`Swap: ${stats.swap}/${stats.swap + stats.swapFailed}`);
  console.log(`💰 USDC Spent: $${stats.usdcSpent.toFixed(2)}`);
  console.log(`\nRemaining active wallets: ${activeWallets.size}`);
  
  if (activeWallets.size === 0) {
    console.log('\n🏁 All wallets exhausted!');
  } else if (Date.now() >= endTime) {
    console.log('\n⏰ Time limit reached');
  }
}

async function main() {
  console.log('\n🎯 NoLimit LIVE x402 Simulator - SOLANA ONLY\n');
  console.log(`✅ Using ${SOLANA_WALLETS.length} hardcoded Solana wallets`);
  
  console.log('\n⚠️  WARNING: Real x402 calls - costs USDC!');
  console.log('   Starting in 5 seconds... (Ctrl+C to cancel)\n');
  await sleep(5000);
  
  await runSimulation();
}

main().catch(console.error);

