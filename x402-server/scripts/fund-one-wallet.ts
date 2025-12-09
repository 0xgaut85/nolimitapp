/**
 * Fund single wallet that was missed
 */

import { config } from 'dotenv';
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction, TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';

config();

const WALLET_TO_FUND = 'BLH4YUt7VmoKxH1EfiqXmxrt2HnJbyz6TCTwS3wLd8qM';
const USDC_AMOUNT = 1.45;

async function main() {
  console.log(`\n💸 Funding ${WALLET_TO_FUND.slice(0, 12)}... with ${USDC_AMOUNT} USDC\n`);
  
  const funderPath = path.join(__dirname, '..', 'funder-wallet-solana.json');
  const funder = JSON.parse(fs.readFileSync(funderPath, 'utf-8'));
  
  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
  const funderKeypair = Keypair.fromSecretKey(bs58.decode(funder.privateKey));
  const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  const recipientPubkey = new PublicKey(WALLET_TO_FUND);
  
  const funderUsdcAta = await getAssociatedTokenAddress(usdcMint, funderKeypair.publicKey);
  const usdcAmount = USDC_AMOUNT * 1_000_000; // 6 decimals
  
  try {
    const recipientUsdcAta = await getOrCreateAssociatedTokenAccount(
      connection,
      funderKeypair,
      usdcMint,
      recipientPubkey
    );
    
    const usdcTx = new Transaction().add(
      createTransferInstruction(
        funderUsdcAta,
        recipientUsdcAta.address,
        funderKeypair.publicKey,
        usdcAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    const sig = await sendAndConfirmTransaction(connection, usdcTx, [funderKeypair]);
    console.log(`✅ USDC sent! Tx: ${sig}`);
  } catch (error) {
    console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

main().catch(console.error);


