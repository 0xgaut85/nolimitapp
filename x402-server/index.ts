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

// Route: AI Agent Chat
app.post('/api/agent/chat', async (req, res) => {
  if (res.headersSent) return;
  
  try {
    const { message, userAddress } = req.body;
    
    if (!message || !userAddress) {
      return res.status(400).json({ error: 'Missing message or userAddress' });
    }

    // Get or create user
    const user = await getOrCreateUser(userAddress);
    
    // Save payment
    await savePayment(user.id, 'agent', '0.05', 'base');
    
    // Call LLM (Anthropic as placeholder for "NoLimit LLM")
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: message }],
    });
    
    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Save usage
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

// Route: Swap Transaction (generates swap calldata)
app.post('/api/swap/transaction', async (req, res) => {
  if (res.headersSent) return;
  
  try {
    const { chain, fromToken, toToken, amount, userAddress } = req.body;
    
    if (!chain || !fromToken || !toToken || !amount || !userAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get or create user
    const user = await getOrCreateUser(userAddress);
    
    // Save payment
    await savePayment(user.id, 'swap', '0.10', chain);
    
    // TODO: Integrate with Jupiter (Solana) or CowSwap (Base) APIs
    // For now, return a placeholder response
    const swapData = {
      success: true,
      message: 'Swap transaction generation coming soon',
      chain,
      fromToken,
      toToken,
      amount,
    };
    
    // Save swap usage
    await prisma.swapUsage.create({
      data: {
        userId: user.id,
        chain,
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: '0', // TODO: Calculate from swap API
        fee: '0.10',
      },
    });
    
    res.json(swapData);
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
    
    // Calculate total revenue (sum of all payment amounts)
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
