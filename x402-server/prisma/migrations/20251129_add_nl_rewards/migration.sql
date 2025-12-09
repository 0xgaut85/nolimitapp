-- Add NL balance to User
ALTER TABLE "User" ADD COLUMN "nlBalance" TEXT NOT NULL DEFAULT '0';

-- Add USD value and NL earned to SwapUsage
ALTER TABLE "SwapUsage" ADD COLUMN "usdValue" TEXT;
ALTER TABLE "SwapUsage" ADD COLUMN "nlEarned" TEXT;

-- Create NLReward table
CREATE TABLE "NLReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "usdValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NLReward_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX "NLReward_userId_idx" ON "NLReward"("userId");
CREATE INDEX "NLReward_source_idx" ON "NLReward"("source");
CREATE INDEX "NLReward_createdAt_idx" ON "NLReward"("createdAt");

-- Add foreign key
ALTER TABLE "NLReward" ADD CONSTRAINT "NLReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;





