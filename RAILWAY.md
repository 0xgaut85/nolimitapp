# Railway Deployment Configuration for NoLimit App

This monorepo contains two services:

## 1. Frontend (app.nolimit.foundation)
- **Root Directory**: `.` (project root)
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Port**: 3000

### Environment Variables:
```
NEXT_PUBLIC_X402_SERVER_URL=https://x402.nolimit.foundation
NEXT_PUBLIC_REOWN_PROJECT_ID=<your-reown-project-id>
```

## 2. Backend (x402.nolimit.foundation)
- **Root Directory**: `x402-server`
- **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
- **Start Command**: `npm start`
- **Port**: 4000

### Environment Variables:
```
DATABASE_URL=<railway-postgres-url>
MERCHANT_ADDRESS=<your-wallet-address>
FACILITATOR_URL=https://facilitator.payai.network
CDP_API_KEY_ID=<coinbase-api-key-id>
CDP_API_KEY_SECRET=<coinbase-api-secret>
ANTHROPIC_API_KEY=<anthropic-api-key>
PORT=4000
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://app.nolimit.foundation
```

## Setup Steps:

1. **Create Railway Project**
   - Create a new project on Railway
   - Add a PostgreSQL database

2. **Deploy Backend Service**
   - Create a new service from the monorepo
   - Set root directory to `x402-server`
   - Configure environment variables
   - Set custom domain: `x402.nolimit.foundation`

3. **Deploy Frontend Service**
   - Create another service from the same repo
   - Set root directory to `.` (root)
   - Configure environment variables
   - Set custom domain: `app.nolimit.foundation`

4. **Database Migration**
   - The backend build command will automatically run Prisma migrations
   - Ensure `DATABASE_URL` is set correctly

## Custom Domains:
- Frontend: `app.nolimit.foundation`
- Backend: `x402.nolimit.foundation`

Configure DNS records:
- CNAME `app` → Railway frontend service URL
- CNAME `x402` → Railway backend service URL




