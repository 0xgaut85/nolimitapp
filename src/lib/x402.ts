/**
 * x402 Payment Protocol Implementation
 * Handles payment-required requests with wallet signing
 */

import { type WalletClient } from 'viem';

// PayAI Facilitator URL
const FACILITATOR_URL = 'https://facilitator.payai.network';

// Payment scheme for x402
type PaymentScheme = 'exact' | 'upto';

// Payment requirement from 402 response
interface PaymentRequirement {
  scheme: PaymentScheme;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description?: string;
  mimeType?: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: Record<string, unknown>;
}

// Payment payload to sign
interface PaymentPayload {
  scheme: PaymentScheme;
  network: string;
  maxAmountRequired: string;
  resource: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  nonce: string;
  expiry: number;
}

// Signed payment header
interface SignedPayment {
  payload: PaymentPayload;
  signature: string;
}

/**
 * Parse the X-Payment header from 402 response
 */
function parsePaymentHeader(header: string): PaymentRequirement | null {
  try {
    // The header is base64 encoded JSON
    const decoded = atob(header);
    return JSON.parse(decoded);
  } catch {
    // Try parsing as plain JSON
    try {
      return JSON.parse(header);
    } catch {
      console.error('Failed to parse X-Payment header:', header);
      return null;
    }
  }
}

/**
 * Create a payment payload with nonce and expiry
 */
function createPaymentPayload(requirement: PaymentRequirement): PaymentPayload {
  const now = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  
  return {
    scheme: requirement.scheme,
    network: requirement.network,
    maxAmountRequired: requirement.maxAmountRequired,
    resource: requirement.resource,
    payTo: requirement.payTo,
    maxTimeoutSeconds: requirement.maxTimeoutSeconds,
    asset: requirement.asset,
    nonce,
    expiry: now + requirement.maxTimeoutSeconds,
  };
}

/**
 * Sign the payment payload using EIP-712 typed data
 */
async function signPayment(
  walletClient: WalletClient,
  payload: PaymentPayload,
  account: `0x${string}`
): Promise<string> {
  // EIP-712 domain for x402 payments
  const domain = {
    name: 'x402',
    version: '1',
    chainId: payload.network === 'base' ? 8453 : 1, // Base or Ethereum
  };

  // EIP-712 types
  const types = {
    Payment: [
      { name: 'scheme', type: 'string' },
      { name: 'network', type: 'string' },
      { name: 'maxAmountRequired', type: 'string' },
      { name: 'resource', type: 'string' },
      { name: 'payTo', type: 'address' },
      { name: 'maxTimeoutSeconds', type: 'uint256' },
      { name: 'asset', type: 'address' },
      { name: 'nonce', type: 'string' },
      { name: 'expiry', type: 'uint256' },
    ],
  };

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: 'Payment',
    message: {
      scheme: payload.scheme,
      network: payload.network,
      maxAmountRequired: payload.maxAmountRequired,
      resource: payload.resource,
      payTo: payload.payTo as `0x${string}`,
      maxTimeoutSeconds: BigInt(payload.maxTimeoutSeconds),
      asset: payload.asset as `0x${string}`,
      nonce: payload.nonce,
      expiry: BigInt(payload.expiry),
    },
  });

  return signature;
}

/**
 * Encode the signed payment for the X-Payment header
 */
function encodePaymentHeader(signedPayment: SignedPayment): string {
  return btoa(JSON.stringify(signedPayment));
}

/**
 * Verify payment with the facilitator (optional, for debugging)
 */
async function verifyPaymentWithFacilitator(
  signedPayment: SignedPayment
): Promise<boolean> {
  try {
    const response = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signedPayment),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Main x402 fetch function with payment flow
 */
export async function x402Fetch(
  url: string,
  options: RequestInit,
  walletClient: WalletClient | null,
  account: `0x${string}` | undefined
): Promise<Response> {
  // Step 1: Make initial request
  const initialResponse = await fetch(url, options);

  // If not 402, return the response as-is
  if (initialResponse.status !== 402) {
    return initialResponse;
  }

  // Step 2: Get payment requirement from 402 response
  const paymentHeader = initialResponse.headers.get('X-Payment');
  if (!paymentHeader) {
    throw new Error('402 response missing X-Payment header');
  }

  const requirement = parsePaymentHeader(paymentHeader);
  if (!requirement) {
    throw new Error('Failed to parse payment requirement');
  }

  // Step 3: Check if wallet is connected
  if (!walletClient || !account) {
    throw new Error('Wallet not connected. Please connect your wallet to make payments.');
  }

  // Step 4: Create and sign payment
  const payload = createPaymentPayload(requirement);
  const signature = await signPayment(walletClient, payload, account);

  const signedPayment: SignedPayment = {
    payload,
    signature,
  };

  // Step 5: Retry request with payment header
  const paymentHeaderValue = encodePaymentHeader(signedPayment);
  
  const retryOptions: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      'X-Payment': paymentHeaderValue,
    },
  };

  const retryResponse = await fetch(url, retryOptions);

  // Check if payment was accepted
  if (retryResponse.status === 402) {
    const errorData = await retryResponse.json().catch(() => ({}));
    throw new Error(errorData.error || 'Payment was not accepted');
  }

  return retryResponse;
}

/**
 * Simplified x402 fetch for use with wagmi hooks
 */
export function createX402Fetcher(
  walletClient: WalletClient | null,
  account: `0x${string}` | undefined
) {
  return async (url: string, options: RequestInit = {}) => {
    return x402Fetch(url, options, walletClient, account);
  };
}

export type { PaymentRequirement, PaymentPayload, SignedPayment };

