/**
 * Sweep all USDC and SOL from Solana wallets to a single address
 */

import { config } from 'dotenv';
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
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';

config();

const DESTINATION = '7nD7WXExu6eM6ZiehNTeX3yQUGiCg1evQudKETrMzqF4';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const SOLANA_WALLETS = [
  { address: "Aafdn6KaBTwaiM6qwcDsNH3CHoaNonFQWWW3bsnjRicP", privateKey: "4xs8FSSwxUWVoDB8X4T9LET7cTGPBZ57SJ7terW4xxr9UtkbUaCLYoqvREhupNDWddapqNxFwxXHPAYgdvsmEnKR" },
  { address: "8pwJ87HfN9twPqG2j1uUxB1kkwpWyCkjbEwnsxKiiTKQ", privateKey: "4nBHc2QHap7ufvKzvMFY8hLbbn5zrc8BdAz3uoE3tt5rxXNmczfc6EiLLKSL7RWNRpKSeWxPU63WoPrg5hV6gTra" },
  { address: "EhT47hR8fe7g7mjA4W6cfYn6uV1kVYVxgmdmqewpZKJU", privateKey: "2nLazPNVUp5rkpKNg1oDW2z7k45Fm4d5dhMECsPpDwK3qCEz3hKd9jmLq9iS1unAjmxss3Y1QCdXjNFVsRVe2yxY" },
  { address: "7rQrWhrunZJwXhKL1mUDanrhyjavEMMxqRRyxaUJAFsR", privateKey: "789Uhnp8QzR4rg1UwNzpU1v8oxfsvMuiNgvSMkfyWJrjdkUcQwmWQjLX6v6QM8Agx8G8HUZrEgzB6oC4sG64gNP" },
  { address: "BYnXTNoJ9NPYFY4pNv4aAjUJS5sfDV34eEoLyw3CCmQj", privateKey: "2pay1x8wYiAjKNNTK6uYnGToCffCn13DP4QheDSLM6utYczF15RvCBxExWyq1CBbZYsST83PWBMzaNHoTsDrBkgw" },
  { address: "BPCegpj4GUWz4XDovC6LdihwN8fbwMKAvWMa2yoPySs", privateKey: "5SG293JGQa4fggetA3nnjJR21XZ5QbRFtChgiR3hE1WdQXG6JewkDgYWv84RfgkQvz2rB4C1o7v6AvvTs7AbJZ79" },
  { address: "7j6N1y2xicx8bUDTffhh72E7XiFkZ5DBwn8jSvvG3K15", privateKey: "4nVuma6VxjpmdWdk3bVZgMe3dT7dkHkQJFiZsH7Sj728zZi9xuCUNMLc8H3gXFdwNimKwVfqSewRYxqXV9rQDDET" },
  { address: "2PxbnRJKncVcqYR1PEHvF5XZnCGm9k2RQp38nbwax3NG", privateKey: "3KFvpdb8DuY7wbv1647jZTm59jDe2Ly7LCpSfknEcXUtFezY1AdASW6UNU9dJG2fAg3qm9BnKrRbHjZXmiQDyAYQ" },
  { address: "48qZWXiMuFt2XMnt6H43LEhoaCxAWgNCD5WYMR8QseEU", privateKey: "5qsKy9o2QRmdLzrCCCy54cPfAyyYaZShwNfJhpWoyau9epwuBW8VuioDraA9MZ5LP3eSvNjRgSq23jxiiSkKcMg4" },
  { address: "252Pfkj6aUdYqcZxAYEqDgrRmqxtLLYC23fePe7LSYxq", privateKey: "ogo6DWLU3Ds2rsPYhhJJYkwboLMBTmFd6iX8mcwJkqnLggW9GwKEgx5pbuPujdXgrbEMAY5DafRtrCsPvRmW5v1" },
  { address: "G9SXJt66KWcJUXnYBBv9PSnLzsgaZkQLAHZ3kFSpK8E7", privateKey: "2SPgLASFWWBxwqek2d1WCevSt7fUz2v89v614aU2y1jCQQx3g94kvmZ2Eo9D65nuthPx2ThvmYftDU2TZkt9RQYs" },
  { address: "7kUBPHuATmcABqkTVtQdCZ6NKDUToSbHwuCmaCFvNyaQ", privateKey: "3B6JS5xMUFm2sCYjGwxzXi1Aq19tikuR5LGbhb8koFiUUDkjMnmJnEBea2MGtNybsZzhnnrAP8dPM8JCUMrD5A2C" },
  { address: "5hnYVp5T11Zx4fX3ASbccjrvM7o6PGH2D27tfriDBTLe", privateKey: "5ExbcMCdcPeBAdqjVdjjUm5dxesLUefFbSmDTRzRf4K5kZWRFf7bUGm41nce2que5BayWiK1vNTCQoNd3jSjXFuU" },
  { address: "3V3ppZ2xqh5LAK1Su5MsTSbUVxSorEAEhY9r6fJ2PYiy", privateKey: "2v2DPhzKorCsbb7G71CNUUdptpZDDWAx7HfuHK4NV8zXi6sQF1Y1Uzs9dEYqufpYr6936MB5yU9F3mtJzrrk7a2Z" },
  { address: "8FetTTP5y6u5WsA7Y4xrfM1PJi69ySApLEa68qXuLGmT", privateKey: "5YS5yMSrHn1nTgrH1ZidMA8gr3orpBMQFc7dEGTsaFCwYXUMCPRhYRaZXsJ4oKNvNrE4ZdstYWd8GuuxVaUJB94R" },
  { address: "3VR12GsgCZxvvRjMQ3t7WaLcBwMXMYw1fYiYwd62bsko", privateKey: "378y3Q3Bz6bQ3MXq8GNRttVe72P54de82LH6iUDos6JmyNRX4U6b1RqqZaW4hDGMG5SWbXRRh5maxFRucCeMBfJK" },
  { address: "866f4jjUKQ6sriKomYyaQ1oo9xRLDRegpq5eMpqrKKF7", privateKey: "gDTCCwqdSPv5FQst5VBaCgJ8dYxCRnXgDDeBGZFG6UHVjV3BcUHZoKFxjgcWfE7FWemW4AtPreCwhtFQHpurh5B" },
  { address: "5WJPSkqFnNBsfN1Fh96DZvQAefZ9DF3bqyvRBk9xvj4E", privateKey: "VrGuG4ByFWBpuYDrQadMHyRnEHBZw2VfLPYSocX71HG31yyF2NxCQewBtsJAZzejrBTQcNFsZC2c1pdjGTVLdrz" },
  { address: "3LDkvnrnuV8xTLBTZEEL7JWcE5pz8bBnMQKkSzcgpm8u", privateKey: "mtdCJktUaGww9D3w9hJQeDbjn6sk5T16eLT2Bwi4te9csr7wHTno3ZMVeF5pm47NAKc1mfgTRt9qs9ru5LtQJZP" },
  { address: "3ChwJ9VPD7sZqB15EfDsGNHSnPMScmuozqGXmgvnJt2r", privateKey: "58J68PczNho7un2svx5gcABJATMDiYJGfjqSaKnTvFPisUt1o3kLFD1e1ZpdDs2L56TWcoHFB8pJXquZSR8C5HeW" },
  { address: "Dx6u3EcL16mh1rS24g5MWCNiR2Cdc7h52nmE7w23whLB", privateKey: "5SR8yw6dHU88fpbh92ji66RVAa2yE5DBtpYNS82tn3Kq6jeAaNvTtPckZpp3LW1Pn1qAWDrD3Spr65mPUJXsTLKy" },
  { address: "6S8gE9QuN4a4Gg4wt5F3oCdXuWpfVJ8SZpxev9U3XfC1", privateKey: "5NgvCuDBLxaxGKjSeoZL9scxoLWGM3r7Pm1PwYM4Ni64oGYe1DRBFZVFXBCt5Vu285qHKS4QiCmnhMKQbVahVvTo" },
  { address: "987S2KRx5VhZaErt6wpsuDWmAXGQGzyDGpvL8TnisYzy", privateKey: "4ZAQvKpEVA9cNW5Ry1yTpeixcuN5Df8psrd5Hz96g5ucqk4XJA9MbsctSdUg3rqfu2XGri4GjoYzWEdv5tbNz6A9" },
  { address: "AdMXi68h8CFunKxSPfxeoB28ta5eSqWBpqXidLrgxPS", privateKey: "4yzhVX3EkTa14MEFbFBiCpfH4YSw1QejEzLTLhFWWEgqNiVzoPA2vKK2i8g1Vi8D4VP4gdMhHgSG6QCZJBa843aG" },
  { address: "9tSNp82eyZpba2jf5CcQo7rUtzzTptW8BE3SUXfEppxL", privateKey: "5PScYG3a5REbnfRtX7KZKg3oXSJWyvvwjeR3K31AQBrepvEq3SpyKpyiPyGm6M9HWkLw52xNzBcy8N2c13N2kjSL" },
  { address: "BcLTjv4qqayNucwDw3HXZTEeTfbQQivLEjVYpbCrpSf9", privateKey: "4iZRseEWwUCekmEnJmuZcsBe2bMG9hgkUwgPSs6oiFDqJX4isxCoz7jUYsYLApXQbVK3kk68KG5NQWRCv8FCD89M" },
  { address: "6z8GGmyUyW8GqCpCvSG3eDemMavdD2nLLKexZ5JKiyQK", privateKey: "5ez5Cavif4GP55KLkjBgS6UZ837V3bDijW1CJVpRs2S1c2MKaXnGBaas8MC2aExaYQXihQtG2JimRMUSmhMCGMJX" },
  { address: "nZ6YiWzvwfZDojhmKBX1hG4b33kXGSewzao2CDuCJxW", privateKey: "2JsPXSboktncEDXADSKMB3KBGaXbtCp577tg1gTaCx4vLj5Vinwkf7vcqNBSjb1Yzy6VUzUUHYxyGWUH6JNmfnDL" },
  { address: "9q3nDo9ez6RUopSytN4qvoxy6m98wYd5UEGTstbqSDpB", privateKey: "36WDzuQDLHsNu8ucbtR9KuNWh4La6Xs3uvXti8DyGuNweJ5B5RXAK8sYX2mekPFnGrjBoj6LFwhUj2kAT8vmhS4w" },
  { address: "6XWS9jAZui7bCegwu8Q43EKarZrZgVPBqMFZwR7GrRFb", privateKey: "2ez9fHAMTkf25TD6uuTbad34TujCoEJ62qfXEEae53hVGUgYgxPUihqN3n1iuQLQaJ7jENMnESfmADcdjvnK4zzZ" },
];

const connection = new Connection(SOLANA_RPC, 'confirmed');

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sweepWallet(wallet: { address: string; privateKey: string }, index: number, destUsdcAta: PublicKey) {
  const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
  const mintPubkey = new PublicKey(USDC_MINT);
  const destPubkey = new PublicKey(DESTINATION);

  console.log(`\n[${index + 1}/30] ${wallet.address}`);

  // Check SOL balance
  const solBalance = await connection.getBalance(keypair.publicKey);
  console.log(`   SOL: ${(solBalance / LAMPORTS_PER_SOL).toFixed(6)}`);

  // Check USDC balance
  let usdcBalance = 0n;
  let sourceAta: PublicKey | null = null;
  try {
    sourceAta = await getAssociatedTokenAddress(mintPubkey, keypair.publicKey, false, TOKEN_PROGRAM_ID);
    const accountInfo = await getAccount(connection, sourceAta, 'confirmed', TOKEN_PROGRAM_ID);
    usdcBalance = accountInfo.amount;
    console.log(`   USDC: ${Number(usdcBalance) / 1_000_000}`);
  } catch (e) {
    console.log(`   USDC: 0 (no ATA)`);
  }

  // Transfer USDC if any
  if (usdcBalance > 0n && sourceAta) {
    try {
      const tx = new Transaction().add(
        createTransferInstruction(
          sourceAta,
          destUsdcAta,
          keypair.publicKey,
          usdcBalance,
          [],
          TOKEN_PROGRAM_ID
        )
      );
      const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
      console.log(`   ✅ USDC sent: ${sig}`);
      await sleep(1000);
    } catch (e) {
      console.log(`   ❌ USDC transfer failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Transfer SOL (leave some for rent ~0.002 SOL)
  const rentBuffer = 0.002 * LAMPORTS_PER_SOL;
  const fee = 5000; // ~0.000005 SOL
  const solToSend = solBalance - rentBuffer - fee;
  
  if (solToSend > 0) {
    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: destPubkey,
          lamports: Math.floor(solToSend),
        })
      );
      const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
      console.log(`   ✅ SOL sent: ${sig}`);
    } catch (e) {
      console.log(`   ❌ SOL transfer failed: ${e instanceof Error ? e.message : e}`);
    }
  }
}

async function main() {
  console.log('🧹 Sweeping all Solana wallets to:', DESTINATION);
  console.log('='.repeat(60));

  const mintPubkey = new PublicKey(USDC_MINT);
  const destPubkey = new PublicKey(DESTINATION);
  
  // Get destination USDC ATA
  const destUsdcAta = await getAssociatedTokenAddress(mintPubkey, destPubkey, false, TOKEN_PROGRAM_ID);
  console.log(`\nDestination USDC ATA: ${destUsdcAta.toBase58()}`);

  let totalUsdc = 0n;
  let totalSol = 0;

  // First, check all balances
  console.log('\n📊 Checking balances...\n');
  for (let i = 0; i < SOLANA_WALLETS.length; i++) {
    const wallet = SOLANA_WALLETS[i];
    try {
      const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
      const solBalance = await connection.getBalance(keypair.publicKey);
      totalSol += solBalance;

      try {
        const sourceAta = await getAssociatedTokenAddress(mintPubkey, keypair.publicKey, false, TOKEN_PROGRAM_ID);
        const accountInfo = await getAccount(connection, sourceAta, 'confirmed', TOKEN_PROGRAM_ID);
        totalUsdc += accountInfo.amount;
      } catch (e) {
        // No USDC ATA
      }
    } catch (e) {
      // ignore
    }
    await sleep(100); // Rate limit
  }

  console.log(`\n💰 Total to sweep:`);
  console.log(`   USDC: ${Number(totalUsdc) / 1_000_000}`);
  console.log(`   SOL: ${(totalSol / LAMPORTS_PER_SOL).toFixed(6)}`);
  console.log(`\n⏳ Starting sweep in 5 seconds... (Ctrl+C to cancel)\n`);
  await sleep(5000);

  // Sweep each wallet
  for (let i = 0; i < SOLANA_WALLETS.length; i++) {
    try {
      await sweepWallet(SOLANA_WALLETS[i], i, destUsdcAta);
      await sleep(500); // Rate limit between wallets
    } catch (e) {
      console.log(`   ❌ Error: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Sweep complete!');
}

main().catch(console.error);


