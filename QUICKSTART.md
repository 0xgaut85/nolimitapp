# Quick Start Guide

## Prerequisites
- Node.js 20+
- npm 10+
- PostgreSQL (for local dev) or Railway account

## Local Development Setup

### 1. Backend Setup

```bash
cd nolimit-app/x402-server

# Install dependencies
npm install

# Create .env file
cat > .env << EOL
PORT=4000
DATABASE_URL="postgresql://user:password@localhost:5432/nolimit"
MERCHANT_ADDRESS="0xYourWalletAddress"
FACILITATOR_URL="https://facilitator.payai.network"
CDP_API_KEY_ID="your_cdp_key_id"
CDP_API_KEY_SECRET="your_cdp_secret"
ANTHROPIC_API_KEY="your_anthropic_key"
NODE_ENV="development"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
EOL

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Start server
npm run dev
```

### 2. Frontend Setup

```bash
cd nolimit-app

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOL
NEXT_PUBLIC_X402_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id
EOL

# Start development server
npm run dev
```

### 3. Access the App

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## Get API Keys

1. **Reown Project ID**: https://cloud.reown.com
2. **Coinbase CDP Keys**: https://portal.cdp.coinbase.com
3. **Anthropic API Key**: https://console.anthropic.com

## Production Deployment

See `RAILWAY.md` for detailed Railway deployment instructions.

## Testing

1. Connect your wallet on the frontend
2. Navigate to `/agent` and try sending a message (requires 0.05 USDC)
3. Check `/dashboard` for real-time stats
4. Try `/swap` for token swaps (requires 0.10 USDC)

## Troubleshooting

- **CORS errors**: Ensure `NEXT_PUBLIC_BASE_URL` is set correctly in backend `.env`
- **Database errors**: Check `DATABASE_URL` connection string
- **Payment errors**: Verify CDP API keys and merchant address
- **Build errors**: Run `npm install` in both root and `x402-server` directories








