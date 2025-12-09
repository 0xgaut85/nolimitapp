/**
 * Verify EIP-712 domain separator calculation
 */
import { config } from 'dotenv';
import { createPublicClient, http, hashTypedData, keccak256, encodeAbiParameters, toHex } from 'viem';
import { base } from 'viem/chains';

config();

const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

async function verifyDomain() {
  console.log('=== DOMAIN SEPARATOR VERIFICATION ===\n');

  const publicClient = createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL),
  });

  // Get on-chain domain separator
  const onChainDomainSeparator = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: [{ name: 'DOMAIN_SEPARATOR', type: 'function', inputs: [], outputs: [{ type: 'bytes32' }], stateMutability: 'view' }],
    functionName: 'DOMAIN_SEPARATOR',
  });
  console.log('On-chain DOMAIN_SEPARATOR:', onChainDomainSeparator);

  // Calculate what it should be
  // EIP-712 domain separator = keccak256(abi.encode(
  //   keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
  //   keccak256(bytes(name)),
  //   keccak256(bytes(version)),
  //   chainId,
  //   verifyingContract
  // ))

  const EIP712_DOMAIN_TYPEHASH = keccak256(
    toHex('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)', { size: undefined })
  );
  console.log('\nEIP712Domain typehash:', EIP712_DOMAIN_TYPEHASH);

  const nameHash = keccak256(toHex('USD Coin', { size: undefined }));
  const versionHash = keccak256(toHex('2', { size: undefined }));
  const chainId = BigInt(8453); // Base mainnet
  const verifyingContract = USDC_ADDRESS;

  console.log('Name hash (USD Coin):', nameHash);
  console.log('Version hash (2):', versionHash);
  console.log('Chain ID:', chainId);
  console.log('Verifying contract:', verifyingContract);

  const calculatedDomainSeparator = keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'uint256' },
        { type: 'address' },
      ],
      [EIP712_DOMAIN_TYPEHASH, nameHash, versionHash, chainId, verifyingContract]
    )
  );
  console.log('\nCalculated DOMAIN_SEPARATOR:', calculatedDomainSeparator);
  console.log('Match:', calculatedDomainSeparator === onChainDomainSeparator ? '✅ YES' : '❌ NO');

  // Now let's see what x402 is using
  console.log('\n=== x402 Configuration ===');
  
  // From x402/client, the domain is constructed with extra.name and extra.version
  // The payment requirements show: extra: { name: "USD Coin", version: "2" }
  // This should match!
  
  // Let's verify viem's hashTypedData uses the same approach
  const testMessage = {
    from: '0x69e8A4484de2F3DdEF3Da73F3980175CB18E366F' as const,
    to: '0x3417828C83e8C1E787dC6DbeFD79F93E0C13f694' as const,
    value: BigInt(50000),
    validAfter: BigInt(0),
    validBefore: BigInt(Math.floor(Date.now() / 1000) + 60),
    nonce: '0x1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`,
  };

  const domain = {
    name: 'USD Coin',
    version: '2',
    chainId: 8453,
    verifyingContract: USDC_ADDRESS as `0x${string}`,
  };

  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };

  const hash = hashTypedData({
    domain,
    types,
    primaryType: 'TransferWithAuthorization',
    message: testMessage,
  });
  console.log('\nTest message hash:', hash);
  console.log('(This hash would be signed by the wallet)');
}

verifyDomain().catch(console.error);


