# NoLimit App

Full-stack application for AI Agent and Swap services with x402 payment integration.

## Structure

- `/` - Next.js frontend (app.nolimit.foundation)
- `/x402-server` - Express backend (x402.nolimit.foundation)

## Development

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
cd x402-server
npm install
npm run db:generate
npm run dev
```

## Deployment

See [RAILWAY.md](./RAILWAY.md) for deployment instructions.

## Features

- **AI Agent**: Chat interface with 0.05 USDC fee per message
- **Dashboard**: Real-time analytics and stats
- **Swap**: Token swaps on Base and Solana with 0.10 USDC fee
- **Integration Guide**: API documentation for developers

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, Reown AppKit
- **Backend**: Express, Prisma, x402-express, Anthropic AI
- **Payments**: x402 protocol via PayAI facilitator
- **Networks**: Base (Ethereum L2), Solana
