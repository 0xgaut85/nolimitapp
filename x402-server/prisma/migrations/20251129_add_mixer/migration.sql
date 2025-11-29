-- CreateTable
CREATE TABLE "MixRequest" (
    "id" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "originalAmount" TEXT NOT NULL,
    "fee" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "depositTxHash" TEXT,
    "status" TEXT NOT NULL,
    "totalHops" INTEGER NOT NULL DEFAULT 5,
    "currentHop" INTEGER NOT NULL DEFAULT 0,
    "currentWallet" INTEGER,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "nextHopAt" TIMESTAMP(3),
    "hopHistory" TEXT NOT NULL DEFAULT '[]',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MixRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MixRequest_status_idx" ON "MixRequest"("status");

-- CreateIndex
CREATE INDEX "MixRequest_chain_idx" ON "MixRequest"("chain");

-- CreateIndex
CREATE INDEX "MixRequest_nextHopAt_idx" ON "MixRequest"("nextHopAt");

-- CreateIndex
CREATE INDEX "MixRequest_createdAt_idx" ON "MixRequest"("createdAt");

