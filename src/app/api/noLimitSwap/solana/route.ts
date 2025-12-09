import { NextRequest } from 'next/server';
import { proxyX402Request } from '@/lib/server/x402Proxy';

export async function POST(request: NextRequest) {
  return proxyX402Request(request, '/noLimitSwap/solana');
}







