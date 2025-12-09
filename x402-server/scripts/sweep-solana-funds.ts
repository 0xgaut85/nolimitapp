/**
 * Sweep all remaining USDC and SOL from Solana simulation wallets
 * Target: 7nD7WXExu6eM6ZiehNTeX3yQUGiCg1evQudKETrMzqF4
 */

import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';

const TARGET_ADDRESS = new PublicKey('7nD7WXExu6eM6ZiehNTeX3yQUGiCg1evQudKETrMzqF4');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

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

const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sweepWallet(wallet: typeof SOLANA_WALLETS[0], index: number) {
  const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
  const walletPubkey = keypair.publicKey;

  console.log(`\n[${index + 1}/${SOLANA_WALLETS.length}] Sweeping ${wallet.address.slice(0, 10)}...`);

  // Check SOL balance
  const solBalance = await connection.getBalance(walletPubkey);
  console.log(`   SOL: ${solBalance / LAMPORTS_PER_SOL}`);

  // Check USDC balance
  let usdcBalance = 0n;
  try {
    const sourceAta = await getAssociatedTokenAddress(USDC_MINT, walletPubkey);
    const account = await getAccount(connection, sourceAta);
    usdcBalance = account.amount;
    console.log(`   USDC: ${Number(usdcBalance) / 1e6}`);
  } catch {
    console.log(`   USDC: 0 (no ATA)`);
  }

  // Transfer USDC if > 0
  if (usdcBalance > 0n) {
    try {
      const sourceAta = await getAssociatedTokenAddress(USDC_MINT, walletPubkey);
      const destAta = await getAssociatedTokenAddress(USDC_MINT, TARGET_ADDRESS);
      
      const tx = new Transaction().add(
        createTransferCheckedInstruction(
          sourceAta,
          USDC_MINT,
          destAta,
          walletPubkey,
          usdcBalance,
          6, // USDC decimals
        )
      );

      const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
      console.log(`   ✅ USDC sent: ${sig.slice(0, 20)}...`);
      await sleep(2000);
    } catch (e: any) {
      console.log(`   ❌ USDC transfer failed: ${e.message?.slice(0, 60)}`);
    }
  }

  // Transfer SOL (leave 0.002 SOL for rent/fees)
  const minReserve = 0.002 * LAMPORTS_PER_SOL;
  if (solBalance > minReserve) {
    try {
      const solToSend = solBalance - minReserve;
      
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: walletPubkey,
          toPubkey: TARGET_ADDRESS,
          lamports: solToSend,
        })
      );

      const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
      console.log(`   ✅ SOL sent: ${sig.slice(0, 20)}...`);
    } catch (e: any) {
      console.log(`   ❌ SOL transfer failed: ${e.message?.slice(0, 60)}`);
    }
  }

  await sleep(1500);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SOLANA SWEEP - Transfer all USDC & SOL to target');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Target: ${TARGET_ADDRESS.toBase58()}`);
  console.log(`Wallets: ${SOLANA_WALLETS.length}`);

  let totalUsdc = 0n;
  let totalSol = 0;

  // First pass: check balances
  console.log('\n📊 Checking balances...');
  for (const wallet of SOLANA_WALLETS) {
    const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
    const sol = await connection.getBalance(keypair.publicKey);
    totalSol += sol;
    
    try {
      const ata = await getAssociatedTokenAddress(USDC_MINT, keypair.publicKey);
      const account = await getAccount(connection, ata);
      totalUsdc += account.amount;
    } catch {}
    
    await sleep(200);
  }

  console.log(`\n💰 Total to sweep:`);
  console.log(`   USDC: ${Number(totalUsdc) / 1e6}`);
  console.log(`   SOL:  ${totalSol / LAMPORTS_PER_SOL}`);

  // Second pass: sweep
  console.log('\n🧹 Starting sweep...');
  for (let i = 0; i < SOLANA_WALLETS.length; i++) {
    await sweepWallet(SOLANA_WALLETS[i], i);
  }

  console.log('\n✅ Sweep complete!');
}

main().catch(console.error);

