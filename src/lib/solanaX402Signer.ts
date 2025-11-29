/**
 * Solana x402 Signer Adapter
 * 
 * Bridges @solana/wallet-adapter to x402's TransactionSigner interface.
 * 
 * x402 expects a signer with:
 * - address: string (base58)
 * - signTransactions(transactions[]): Promise<SignatureDictionary[]>
 * 
 * Where SignatureDictionary is { [address]: base64EncodedSignature }
 */

import { WalletContextState } from '@solana/wallet-adapter-react';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

export interface X402SolanaSigner {
  address: string;
  signTransactions: <T extends Transaction | VersionedTransaction>(
    transactions: readonly T[]
  ) => Promise<readonly Record<string, string>[]>;
}

/**
 * Creates an x402-compatible signer from Solana Wallet Adapter
 */
export function createX402SolanaSignerFromWalletAdapter(
  wallet: WalletContextState
): X402SolanaSigner | null {
  if (!wallet.publicKey || !wallet.signTransaction) {
    return null;
  }

  const address = wallet.publicKey.toBase58();

  return {
    address,
    signTransactions: async <T extends Transaction | VersionedTransaction>(
      transactions: readonly T[]
    ): Promise<readonly Record<string, string>[]> => {
      const results: Record<string, string>[] = [];

      for (const tx of transactions) {
        try {
          // Sign the transaction using wallet adapter
          const signedTx = await wallet.signTransaction!(tx);

          // Extract signature based on transaction type
          let signature: Uint8Array | null = null;

          if ('signature' in signedTx && signedTx.signature) {
            // Legacy Transaction
            signature = signedTx.signature;
          } else if ('signatures' in signedTx && signedTx.signatures.length > 0) {
            // VersionedTransaction - first signature is typically the fee payer's
            signature = signedTx.signatures[0];
          }

          if (signature) {
            // x402 expects base64 encoded signature
            const sigBase64 = Buffer.from(signature).toString('base64');
            results.push({ [address]: sigBase64 });
          } else {
            console.error('[x402-solana] No signature found in signed transaction');
            results.push({});
          }
        } catch (err) {
          console.error('[x402-solana] Failed to sign transaction:', err);
          throw err;
        }
      }

      return results;
    },
  };
}

/**
 * Hook-friendly version that can be used in React components
 */
export function useSolanaX402Signer(wallet: WalletContextState): X402SolanaSigner | null {
  if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction) {
    return null;
  }
  return createX402SolanaSignerFromWalletAdapter(wallet);
}

