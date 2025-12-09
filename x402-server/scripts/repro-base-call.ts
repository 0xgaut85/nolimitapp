import { createWalletClient, http, encodeFunctionData, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { createPaymentHeader, selectPaymentRequirements } from 'x402/client';
import * as fs from 'fs';
import * as path from 'path';

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const SERVER_URL = process.env.X402_SERVER_URL || 'https://x402.nolimit.foundation';

async function main() {
  const walletsPath = path.join(__dirname, '..', 'wallets-2025-11-29T17-53-54-231Z.json');
  const wallets = JSON.parse(fs.readFileSync(walletsPath, 'utf8'));
  const wallet = wallets.base[0];
  const pk = (wallet.privateKey.startsWith('0x') ? wallet.privateKey : `0x${wallet.privateKey}`) as `0x${string}`;
  const account = privateKeyToAccount(pk);

  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  });

  const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  });

  console.log('Requesting payment requirements...');
  const resp = await fetch(`${SERVER_URL}/noLimitLLM`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'debug', userAddress: account.address }),
  });

  const data = await resp.json();
  console.log('Got status:', resp.status, 'accepts:', data.accepts?.length);

  if (resp.status !== 402) {
    console.log('No 402, exiting');
    return;
  }

  const req = selectPaymentRequirements(data.accepts, 'base', 'exact');
  console.log('Selected requirement value:', req?.maxAmountRequired);

  const paymentHeader = await createPaymentHeader(walletClient as any, data.x402Version, req);
  const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'));

  const { signature, authorization } = decoded.payload;
  const sig = signature.slice(2);
  const r = (`0x${sig.slice(0, 64)}`) as const;
  const s = (`0x${sig.slice(64, 128)}`) as const;
  const v = parseInt(sig.slice(128, 130), 16);

  console.log('Authorization:', authorization);
  console.log('v:', v);

  const calldata = encodeFunctionData({
    abi: [{
      name: 'transferWithAuthorization',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
        { name: 'v', type: 'uint8' },
        { name: 'r', type: 'bytes32' },
        { name: 's', type: 'bytes32' },
      ],
      outputs: [],
    }],
    functionName: 'transferWithAuthorization',
    args: [
      authorization.from,
      authorization.to,
      BigInt(authorization.value),
      BigInt(authorization.validAfter),
      BigInt(authorization.validBefore),
      authorization.nonce,
      v,
      r,
      s,
    ],
  });

  console.log('Simulating transferWithAuthorization via eth_call...');
  try {
    const result = await publicClient.call({
      to: USDC,
      data: calldata,
      account: authorization.to as `0x${string}`,
    });
    console.log('call success:', result);
  } catch (err: any) {
    console.error('call failed:', err.shortMessage || err.message || err);
    if (err.cause?.data) {
      console.error('revert data:', err.cause.data);
    }

    if (v === 28) {
      console.log('Retrying with v=27 to test parity...');
      const retryCalldata = encodeFunctionData({
        abi: [{
          name: 'transferWithAuthorization',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
            { name: 'v', type: 'uint8' },
            { name: 'r', type: 'bytes32' },
            { name: 's', type: 'bytes32' },
          ],
          outputs: [],
        }],
        functionName: 'transferWithAuthorization',
        args: [
          authorization.from,
          authorization.to,
          BigInt(authorization.value),
          BigInt(authorization.validAfter),
          BigInt(authorization.validBefore),
          authorization.nonce,
          27,
          r,
          s,
        ],
      });

      try {
        const retryResult = await publicClient.call({
          to: USDC,
          data: retryCalldata,
          account: authorization.to as `0x${string}`,
        });
        console.log('retry call success:', retryResult);
      } catch (e: any) {
        console.error('retry failed:', e.shortMessage || e.message || e);
      }
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
});

