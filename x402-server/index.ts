/**
 * NoLimit x402 Express Server
 * Payment gateway for AI Agent and Swap services
 */

import { config } from 'dotenv';
import express from 'express';
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
type OneInchSwapTx = {
  to: string;
  data: string;
  value: string;
  gasPrice?: string;
  gas?: string;
};

type SwapResult =
  | {
      chain: 'solana';
      tx: string;
      quote: { toAmount?: string };
    }
  | {
      chain: 'base';
      tx: OneInchSwapTx;
      quote: { toAmount?: string };
    };

async function getJupiterSwapTransaction(
  userPublicKey: string,
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps = 50,
): Promise<SwapResult> {
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
    tx: swapData.swapTransaction,
    quote: {
      toAmount: quoteData.outAmount,
    },
  };
}

// 1inch (Base) Integration
async function get1inchSwapTransaction(
  userAddress: string,
  srcToken: string,
  dstToken: string,
  amount: string,
  slippage = 1,
): Promise<SwapResult> {
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
    tx: data.tx as OneInchSwapTx,
    quote: {
      toAmount: data.dstAmount,
    },
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to complete agent request';
    console.error('[Agent] Error:', error);
    res.status(500).json({ error: message });
  }
});

// Route: Swap Transaction
app.post('/api/swap/transaction', async (req, res) => {
  if (res.headersSent) return;
  
  try {
    const { chain, fromToken, toToken, amount, userAddress } = req.body;
    
    if (!chain || !fromToken || !toToken || !amount || !userAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await getOrCreateUser(userAddress);
    await savePayment(user.id, 'swap', '0.10', chain);
    
    let swapResult: SwapResult;

    const tokens: Record<'base' | 'solana', Record<string, string>> = {
      base: {
        ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      },
      solana: {
        SOL: 'So11111111111111111111111111111111111111112',
        USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      },
    };

    if (chain === 'solana') {
      const inputMint = tokens.solana[fromToken] || fromToken;
      const outputMint = tokens.solana[toToken] || toToken;
      swapResult = await getJupiterSwapTransaction(userAddress, inputMint, outputMint, amount);
    } else if (chain === 'base') {
      const srcToken = tokens.base[fromToken] || fromToken;
      const dstToken = tokens.base[toToken] || toToken;
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
      ...swapResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to execute swap';
    console.error('[Swap] Error:', error);
    res.status(500).json({ error: message });
  }
});

// Route: Stats (public, no payment required)
app.get('/api/stats', async (req, res) => {
  try {
    const [totalUsers, agentMessages, swapCount, payments] = await Promise.all([
      prisma.user.count(),
      prisma.agentUsage.count(),
      prisma.swapUsage.count(),
      prisma.payment.findMany(),
    ]);
    
    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    
    res.json({
      totalUsers,
      totalRevenue: totalRevenue.toFixed(2),
      agentMessages,
      swapCount,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load stats';
    console.error('[Stats] Error:', error);
    res.status(500).json({ error: message });
  }
});

// Route: Detailed Stats for Dashboard (public)
app.get('/api/stats/detailed', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get all data
    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      agentMessages,
      swapCount,
      payments,
      recentPayments,
      agentUsages,
      swapUsages,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.agentUsage.count(),
      prisma.swapUsage.count(),
      prisma.payment.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.payment.findMany({ 
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.agentUsage.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.swapUsage.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Calculate revenue
    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const agentRevenue = payments.filter(p => p.service === 'agent').reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const swapRevenue = payments.filter(p => p.service === 'swap').reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

    // Revenue by chain
    const baseRevenue = payments.filter(p => p.chain === 'base').reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const solanaRevenue = payments.filter(p => p.chain === 'solana').reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

    // Daily revenue for chart (last 30 days)
    const dailyRevenue: Record<string, number> = {};
    const dailyAgentUsage: Record<string, number> = {};
    const dailySwapUsage: Record<string, number> = {};

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyRevenue[dateKey] = 0;
      dailyAgentUsage[dateKey] = 0;
      dailySwapUsage[dateKey] = 0;
    }

    recentPayments.forEach(p => {
      const dateKey = p.createdAt.toISOString().split('T')[0];
      if (dailyRevenue[dateKey] !== undefined) {
        dailyRevenue[dateKey] += parseFloat(p.amount || '0');
      }
    });

    agentUsages.forEach(a => {
      const dateKey = a.createdAt.toISOString().split('T')[0];
      if (dailyAgentUsage[dateKey] !== undefined) {
        dailyAgentUsage[dateKey]++;
      }
    });

    swapUsages.forEach(s => {
      const dateKey = s.createdAt.toISOString().split('T')[0];
      if (dailySwapUsage[dateKey] !== undefined) {
        dailySwapUsage[dateKey]++;
      }
    });

    // Format chart data
    const revenueChartData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: parseFloat(revenue.toFixed(2)),
    }));

    const usageChartData = Object.entries(dailyAgentUsage).map(([date, agent]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      agent,
      swap: dailySwapUsage[date] || 0,
    }));

    // Recent transactions (last 20)
    const recentTransactions = payments.slice(0, 20).map(p => ({
      id: p.id,
      type: p.service,
      amount: p.amount,
      chain: p.chain,
      status: p.status,
      createdAt: p.createdAt,
    }));

    res.json({
      overview: {
        totalUsers,
        newUsersToday,
        newUsersWeek,
        totalRevenue: totalRevenue.toFixed(2),
        agentRevenue: agentRevenue.toFixed(2),
        swapRevenue: swapRevenue.toFixed(2),
        baseRevenue: baseRevenue.toFixed(2),
        solanaRevenue: solanaRevenue.toFixed(2),
        agentMessages,
        swapCount,
      },
      charts: {
        revenue: revenueChartData,
        usage: usageChartData,
      },
      recentTransactions,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load detailed stats';
    console.error('[DetailedStats] Error:', error);
    res.status(500).json({ error: message });
  }
});

// Route: User-specific stats (requires wallet address)
app.get('/api/stats/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ error: 'Missing wallet address' });
    }

    const user = await prisma.user.findUnique({
      where: { address },
      include: {
        payments: { orderBy: { createdAt: 'desc' }, take: 50 },
        agentUsages: { orderBy: { createdAt: 'desc' }, take: 50 },
        swapUsages: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    if (!user) {
      return res.json({
        exists: false,
        totalSpent: '0.00',
        agentMessages: 0,
        swapCount: 0,
        payments: [],
        agentHistory: [],
        swapHistory: [],
      });
    }

    const totalSpent = user.payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

    res.json({
      exists: true,
      userId: user.id,
      address: user.address,
      joinedAt: user.createdAt,
      totalSpent: totalSpent.toFixed(2),
      agentMessages: user.agentUsages.length,
      swapCount: user.swapUsages.length,
      payments: user.payments.map(p => ({
        id: p.id,
        type: p.service,
        amount: p.amount,
        chain: p.chain,
        status: p.status,
        txHash: p.txHash,
        createdAt: p.createdAt,
      })),
      agentHistory: user.agentUsages.map(a => ({
        id: a.id,
        message: a.message.substring(0, 100) + (a.message.length > 100 ? '...' : ''),
        fee: a.fee,
        createdAt: a.createdAt,
      })),
      swapHistory: user.swapUsages.map(s => ({
        id: s.id,
        chain: s.chain,
        fromToken: s.fromToken,
        toToken: s.toToken,
        fromAmount: s.fromAmount,
        toAmount: s.toAmount,
        fee: s.fee,
        txHash: s.txHash,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load user stats';
    console.error('[UserStats] Error:', error);
    res.status(500).json({ error: message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'NoLimit x402 Server' });
});

// Error handler
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (res.headersSent) return;
  void _next;
  
  console.error('[Error]:', err);
  const message = err instanceof Error ? err.message : 'An error occurred';
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? message : 'An error occurred',
  });
});

app.listen(PORT, () => {
  console.log(`[x402-server] NoLimit server running on port ${PORT}`);
});
