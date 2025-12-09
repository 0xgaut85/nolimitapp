import { encodeAbiParameters, keccak256 } from 'viem';

const typeHash = keccak256(
  Buffer.from('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
);
const nameHash = keccak256(Buffer.from('USD Coin'));
const versionHash = keccak256(Buffer.from('2'));
const chainId = 8453n;
const verifyingContract = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

const encoded = encodeAbiParameters(
  [
    { type: 'bytes32' },
    { type: 'bytes32' },
    { type: 'bytes32' },
    { type: 'uint256' },
    { type: 'address' },
  ],
  [typeHash, nameHash, versionHash, chainId, verifyingContract]
);

console.log(keccak256(encoded));

