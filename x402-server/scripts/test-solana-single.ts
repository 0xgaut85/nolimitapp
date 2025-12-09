/**
 * Test single Solana wallet x402 transaction
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

const CONFIG = {
  serverUrl: process.env.X402_SERVER_URL || 'https://x402.nolimit.foundation',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
};

// Single test wallet
const TEST_WALLET = {
  address: "Aafdn6KaBTwaiM6qwcDsNH3CHoaNonFQWWW3bsnjRicP",
  privateKey: "4xs8FSSwxUWVoDB8X4T9LET7cTGPBZ57SJ7terW4xxr9UtkbUaCLYoqvREhupNDWddapqNxFwxXHPAYgdvsmEnKR"
};

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
    throw new Error('Missing facilitator feePayer');
  }
  const feePayerPubkey = new PublicKey(feePayer);
  const userPubkey = wallet.keypair.publicKey;
  
  if (!paymentRequirements?.payTo) {
    throw new Error('Missing payTo');
  }
  const destination = new PublicKey(paymentRequirements.payTo);
  
  const instructions: any[] = [];
  instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 7000 }));
  instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }));
  
  if (!paymentRequirements.asset) {
    throw new Error('Missing token mint');
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
    throw new Error(`No ATA for user`);
  }
  
  const destAtaInfo = await connection.getAccountInfo(destinationAta, 'confirmed');
  if (!destAtaInfo) {
    throw new Error(`No ATA for destination`);
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

async function testSolanaX402() {
  console.log('\n🧪 Testing Solana x402 with single wallet...\n');
  console.log(`Wallet: ${TEST_WALLET.address}`);
  console.log(`Server: ${CONFIG.serverUrl}`);
  console.log(`RPC: ${CONFIG.solanaRpcUrl}\n`);
  
  const wallet = createSolanaWalletClient(TEST_WALLET.privateKey);
  console.log(`✅ Wallet initialized: ${wallet.address}`);
  
  // Test chat endpoint
  const url = `${CONFIG.serverUrl}/noLimitLLM/solana`;
  console.log(`\n📡 Making request to: ${url}`);
  
  const body = {
    message: "What is blockchain?",
    userAddress: wallet.address,
  };
  
  console.log(`📤 Request body:`, JSON.stringify(body, null, 2));
  
  // Step 1: Initial request to get 402
  console.log('\n--- Step 1: Initial request ---');
  const initialResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  console.log(`Status: ${initialResponse.status}`);
  
  if (initialResponse.status !== 402) {
    const text = await initialResponse.text();
    console.log(`Response: ${text}`);
    console.log('\n❌ Expected 402, got different status');
    return;
  }
  
  const rawResponse = await initialResponse.json();
  console.log(`402 Response:`, JSON.stringify(rawResponse, null, 2));
  
  const x402Version = rawResponse.x402Version;
  const parsedPaymentRequirements = rawResponse.accepts || [];
  
  // Find Solana payment option
  const selectedRequirements = parsedPaymentRequirements.find(
    (req: any) => req.scheme === 'exact' && (req.network === 'solana-devnet' || req.network === 'solana')
  );
  
  if (!selectedRequirements) {
    console.log('\n❌ No Solana payment requirements found');
    return;
  }
  
  console.log(`\n✅ Found Solana payment requirements`);
  console.log(`   Network: ${selectedRequirements.network}`);
  console.log(`   Amount: ${selectedRequirements.maxAmountRequired}`);
  console.log(`   PayTo: ${selectedRequirements.payTo}`);
  
  // Step 2: Create payment header
  console.log('\n--- Step 2: Creating payment header ---');
  const paymentHeader = await createSolanaPaymentHeader(
    wallet,
    x402Version,
    selectedRequirements,
    CONFIG.solanaRpcUrl
  );
  console.log(`✅ Payment header created (length: ${paymentHeader.length})`);
  
  // Step 3: Retry with payment header
  console.log('\n--- Step 3: Retrying with payment ---');
  const secondResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PAYMENT': paymentHeader,
      'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
    },
    body: JSON.stringify(body),
  });
  
  console.log(`Status: ${secondResponse.status}`);
  
  const responseData = await secondResponse.json().catch(() => ({}));
  console.log(`Response:`, JSON.stringify(responseData, null, 2));
  
  if (secondResponse.ok) {
    console.log('\n✅ SUCCESS! Solana x402 transaction worked!');
  } else {
    console.log('\n❌ FAILED - see error above');
  }
}

testSolanaX402().catch(console.error);


