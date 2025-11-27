/**
 * NoLimit x402 Express Server
 * Payment gateway for AI Agent and Swap services
 */

import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import { paymentMiddleware, Resource } from 'x402-express';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';

config();

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const facilitatorUrl = (process.env.FACILITATOR_URL || 'https://facilitator.payai.network') as Resource;
const payTo = process.env.MERCHANT_ADDRESS as `0x${string}`;
const cdpApiKeyId = process.env.CDP_API_KEY_ID;
const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET;
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

// 1inch API Key
const ONEINCH_API_KEY = process.env.ONEINCH_API_KEY;

if (!facilitatorUrl || !payTo) {
  console.error('Missing required environment variables: FACILITATOR_URL or MERCHANT_ADDRESS');
  process.exit(1);
}

const app = express();

// Trust proxy for Railway
app.set('trust proxy', true);

// CORS configuration
const allowedOrigins = [
  process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://app.nolimit.foundation',
  'https://nolimit.foundation',
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  const isAllowed = !origin || 
    allowedOrigins.includes(origin) || 
    origin.includes('railway.app') ||
    origin.includes('nolimit.foundation') ||
    origin.includes('vercel.app');
  
  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  const requestedHeaders = req.headers['access-control-request-headers'] as string | undefined;
  if (requestedHeaders) {
    res.setHeader('Access-Control-Allow-Headers', requestedHeaders);
  } else {
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Payment, X-Payment-Response, X-Payment-Required, X-Payment-Quote, WWW-Authenticate, Authorization'
    );
  }
  
  res.setHeader(
    'Access-Control-Expose-Headers',
    'X-Payment, X-Payment-Response, X-Payment-Required, X-Payment-Quote, WWW-Authenticate'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Facilitator config
const facilitatorConfig: Parameters<typeof paymentMiddleware>[2] = {
  url: facilitatorUrl,
};

if (cdpApiKeyId && cdpApiKeySecret) {
  facilitatorConfig.createAuthHeaders = async () => {
    const basicAuth = Buffer.from(`${cdpApiKeyId}:${cdpApiKeySecret}`).toString('base64');
    const header = { Authorization: `Basic ${basicAuth}` };
    return {
      verify: header,
      settle: header,
      supported: header,
      list: header,
    };
  };
}

// Payment middleware configuration
app.use(paymentMiddleware(
  payTo,
  {
    'POST /api/agent/chat': {
      price: '$0.05',
      network: 'base',
    },
    'POST /api/swap/transaction': {
      price: '$0.10',
      network: 'base',
    },
  },
  facilitatorConfig,
));

// Helper: Get or create user
async function getOrCreateUser(address: string) {
  let user = await prisma.user.findUnique({ where: { address } });
  if (!user) {
    user = await prisma.user.create({ data: { address } });
  }
  return user;
}

// Helper: Save payment record
async function savePayment(userId: string, service: string, amount: string, chain: string) {
  await prisma.payment.create({
    data: {
      userId,
      amount,
      currency: 'USDC',
      chain,
      service,
      status: 'completed',
    },
  });
}

// --- SWAP INTEGRATIONS ---

// Jupiter (Solana) Integration
async function getJupiterSwapTransaction(userPublicKey: string, inputMint: string, outputMint: string, amount: string, slippageBps: number = 50) {
  // 1. Get Quote
  const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
  const quoteResponse = await fetch(quoteUrl);
  const quoteData = await quoteResponse.json();

  if (!quoteData || quoteData.error) {
    throw new Error(`Jupiter Quote Error: ${quoteData.error || 'Unknown error'}`);
  }

  // 2. Get Swap Transaction
  const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quoteData,
      userPublicKey,
      wrapAndUnwrapSol: true,
    })
  });

  const swapData = await swapResponse.json();
  
  if (!swapData || !swapData.swapTransaction) {
    throw new Error('Failed to generate Jupiter swap transaction');
  }

  return {
    chain: 'solana',
    tx: swapData.swapTransaction, // Base64 encoded transaction
    quote: quoteData
  };
}

// 1inch (Base) Integration
async function get1inchSwapTransaction(userAddress: string, srcToken: string, dstToken: string, amount: string, slippage: number = 1) {
  if (!ONEINCH_API_KEY) {
    throw new Error('1inch API Key not configured on server');
  }

  const chainId = 8453; // Base
  const url = `https://api.1inch.dev/swap/v6.0/${chainId}/swap?src=${srcToken}&dst=${dstToken}&amount=${amount}&from=${userAddress}&slippage=${slippage}&disableEstimate=true`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${ONEINCH_API_KEY}`
    }
  });

  const data = await response.json();

  if (data.error || data.statusCode) {
    throw new Error(`1inch Error: ${data.description || data.error}`);
  }

  return {
    chain: 'base',
    tx: data.tx, // { to, data, value, gasPrice, ... }
    quote: {
      toAmount: data.dstAmount
    }
  };
}

// --- ENDPOINTS ---

// Route: AI Agent Chat
app.post('/api/agent/chat', async (req, res) => {
  if (res.headersSent) return;
  
  try {
    const { message, userAddress } = req.body;
    
    if (!message || !userAddress) {
      return res.status(400).json({ error: 'Missing message or userAddress' });
    }

    const user = await getOrCreateUser(userAddress);
    await savePayment(user.id, 'agent', '0.05', 'base');
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: message }],
    });
    
    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';
    
    await prisma.agentUsage.create({
      data: {
        userId: user.id,
        message,
        response: assistantMessage,
        fee: '0.05',
      },
    });
    
    res.json({ response: assistantMessage });
  } catch (error: any) {
    console.error('[Agent] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route: Swap Transaction
app.post('/api/swap/transaction', async (req, res) => {
  if (res.headersSent) return;
  
  try {
    const { chain, fromToken, toToken, amount, userAddress, slippage } = req.body;
    
    if (!chain || !fromToken || !toToken || !amount || !userAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await getOrCreateUser(userAddress);
    await savePayment(user.id, 'swap', '0.10', chain);
    
    let swapResult;

    // Token Mapping (simplified for demo)
    // Real app would use a robust token list or pass raw addresses
    const TOKENS: any = {
      base: {
        ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        // Add more...
      },
      solana: {
        SOL: 'So11111111111111111111111111111111111111112',
        USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        // Add more...
      }
    };

    if (chain === 'solana') {
      // Map symbols to mint addresses
      const inputMint = TOKENS.solana[fromToken] || fromToken;
      const outputMint = TOKENS.solana[toToken] || toToken;
      
      // Convert amount to atomic units (assuming frontend sends raw amount or handling decimals here)
      // For now, assuming frontend sends atomic units or handling standard 6/9 decimals
      // Better: Frontend sends raw amount.
      // Note: Jupiter requires atomic units (integer).
      
      swapResult = await getJupiterSwapTransaction(userAddress, inputMint, outputMint, amount);
    } else if (chain === 'base') {
      const srcToken = TOKENS.base[fromToken] || fromToken;
      const dstToken = TOKENS.base[toToken] || toToken;
      
      swapResult = await get1inchSwapTransaction(userAddress, srcToken, dstToken, amount);
    } else {
      throw new Error('Unsupported chain');
    }
    
    // Save swap usage
    await prisma.swapUsage.create({
      data: {
        userId: user.id,
        chain,
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: swapResult.quote?.toAmount || '0', 
        fee: '0.10',
        txHash: '', // Will be filled later if we track on-chain
      },
    });
    
    res.json({
      success: true,
      ...swapResult
    });
  } catch (error: any) {
    console.error('[Swap] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route: Stats (public, no payment required)
app.get('/api/stats', async (req, res) => {
  try {
    const [totalUsers, totalPayments, agentMessages, swapCount] = await Promise.all([
      prisma.user.count(),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.agentUsage.count(),
      prisma.swapUsage.count(),
    ]);
    
    const payments = await prisma.payment.findMany();
    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    
    res.json({
      totalUsers,
      totalRevenue: totalRevenue.toFixed(2),
      agentMessages,
      swapCount,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Stats] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'NoLimit x402 Server' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return;
  
  console.error('[Error]:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

app.listen(PORT, () => {
  console.log(`[x402-server] NoLimit server running on port ${PORT}`);
});
