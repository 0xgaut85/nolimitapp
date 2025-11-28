import { NextRequest, NextResponse } from 'next/server';

const FORWARDED_HEADERS = [
  'x-payment',
  'x-payment-response',
  'x-payment-required',
  'x-payment-quote',
  'www-authenticate',
  'content-type',
];

function normalizeUrl(url: string) {
  if (!url) return '';
  const trimmed = url.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

function getExpressServerUrl() {
  if (process.env.X402_SERVER_URL) {
    return normalizeUrl(process.env.X402_SERVER_URL);
  }
  if (process.env.NEXT_PUBLIC_X402_SERVER_URL) {
    return normalizeUrl(process.env.NEXT_PUBLIC_X402_SERVER_URL);
  }
  return process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '';
}

export async function POST(request: NextRequest) {
  const serverUrl = getExpressServerUrl();

  if (!serverUrl) {
    return NextResponse.json(
      {
        error: 'x402 server URL not configured',
        fix: 'Set X402_SERVER_URL in Railway to https://x402.nolimit.foundation (or your custom domain).',
      },
      { status: 500 },
    );
  }

  let requestBody = '';
  try {
    requestBody = await request.text();
  } catch {
    requestBody = '';
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const xPayment = request.headers.get('x-payment');
  if (xPayment) {
    headers['X-Payment'] = xPayment;
  }

  const targetUrl = `${serverUrl}/api/agent/chat`;

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: requestBody || undefined,
      cache: 'no-store',
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to reach x402 server';
    return NextResponse.json(
      {
        error: 'Failed to reach x402 server',
        message,
        serverUrl,
        targetUrl,
      },
      { status: 502 },
    );
  }

  const responseText = await response.text();
  const proxyHeaders = new Headers();
  FORWARDED_HEADERS.forEach((header) => {
    const value = response.headers.get(header);
    if (value) {
      proxyHeaders.set(header, value);
    }
  });

  return new NextResponse(responseText, {
    status: response.status,
    headers: proxyHeaders,
  });
}

