import { NextRequest } from 'next/server';
import { x402Proxy } from '@/lib/server/x402Proxy';

export async function POST(request: NextRequest) {
  return x402Proxy(request, '/noLimitLLM/solana');
}

