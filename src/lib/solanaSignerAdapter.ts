/**
 * Adapter to convert Reown's Solana provider to x402's TransactionSigner interface
 * 
 * x402-fetch expects a TransactionSigner from @solana/signers with:
 * - address: Address<string>
 * - signTransactions(transactions): Promise<SignatureDictionary[]>
 * 
 * Reown's provider has:
 * - publicKey: PublicKey
 * - signTransaction(transaction): Promise<Transaction>
 * - signMessage(message): Promise<Uint8Array>
 */

import type { Provider } from '@reown/appkit-utils/solana';

// Minimal interface that x402-fetch checks for
export interface X402SolanaSigner {
  address: string;
  signTransactions: (transactions: readonly any[]) => Promise<readonly Record<string, string>[]>;
}

/**
 * Creates an x402-compatible signer from Reown's Solana provider
 */
export function createX402SolanaSignerFromReown(
  provider: Provider,
  address: string
): X402SolanaSigner {
  return {
    address,
    signTransactions: async (transactions: readonly any[]) => {
      const results: Record<string, string>[] = [];
      
      for (const tx of transactions) {
        // Sign each transaction using Reown's provider
        const signedTx = await provider.signTransaction(tx);
        
        // Extract signature from the signed transaction
        // The signature is typically the first signature in the transaction
        const signature = signedTx.signatures?.[0];
        
        if (signature) {
          // Convert signature to base58 string if it's a Uint8Array
          const sigString = typeof signature === 'string' 
            ? signature 
            : Buffer.from(signature).toString('base64');
          
          results.push({ [address]: sigString });
        } else {
          results.push({});
        }
      }
      
      return results;
    },
  };
}


