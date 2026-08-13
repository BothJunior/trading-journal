const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");

// Read .env manually
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"(.*)"\s*$/) || line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL is not defined in .env");
  process.exit(1);
}

const client = createClient({
  url,
  authToken,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" DATETIME,
    "passwordHash" TEXT,
    "image" TEXT,
    "nativeCurrency" TEXT NOT NULL DEFAULT 'USD',
    "riskModel" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");`,
  `CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");`,

  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");`,

  `CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");`,

  `CREATE TABLE IF NOT EXISTS "TradingAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "broker" TEXT NOT NULL DEFAULT 'Generic',
    "accountNumber" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "initialBalance" REAL NOT NULL DEFAULT 10000,
    "currentBalance" REAL NOT NULL DEFAULT 10000,
    "isDefault" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS "TradingAccount_userId_idx" ON "TradingAccount"("userId");`,

  `CREATE TABLE IF NOT EXISTS "Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" TEXT,
    "targetWinRate" REAL,
    "targetRR" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS "Strategy_userId_idx" ON "Strategy"("userId");`,

  `CREATE TABLE IF NOT EXISTS "Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "strategyId" TEXT,
    "ticker" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL DEFAULT 'EQUITY',
    "status" TEXT NOT NULL DEFAULT 'CLOSED',
    "entryDate" DATETIME NOT NULL,
    "exitDate" DATETIME,
    "entryPrice" REAL,
    "exitPrice" REAL,
    "quantity" REAL NOT NULL DEFAULT 0,
    "stopLoss" REAL,
    "takeProfit" REAL,
    "initialRisk" REAL NOT NULL DEFAULT 0,
    "grossPnL" REAL NOT NULL DEFAULT 0,
    "netPnL" REAL NOT NULL DEFAULT 0,
    "totalFees" REAL NOT NULL DEFAULT 0,
    "realizedR" REAL NOT NULL DEFAULT 0,
    "mae" REAL,
    "mfe" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS "Trade_userId_idx" ON "Trade"("userId");`,
  `CREATE INDEX IF NOT EXISTS "Trade_tradingAccountId_idx" ON "Trade"("tradingAccountId");`,
  `CREATE INDEX IF NOT EXISTS "Trade_strategyId_idx" ON "Trade"("strategyId");`,

  `CREATE TABLE IF NOT EXISTS "Execution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "action" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "quantity" REAL NOT NULL,
    "fee" REAL NOT NULL DEFAULT 0,
    "slippage" REAL NOT NULL DEFAULT 0,
    "executionHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "Execution_userId_executionHash_key" ON "Execution"("userId", "executionHash");`,
  `CREATE INDEX IF NOT EXISTS "Execution_tradeId_idx" ON "Execution"("tradeId");`,
  `CREATE INDEX IF NOT EXISTS "Execution_userId_idx" ON "Execution"("userId");`,

  `CREATE TABLE IF NOT EXISTS "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "type" TEXT NOT NULL DEFAULT 'MISTAKE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "Tag_userId_name_key" ON "Tag"("userId", "name");`,
  `CREATE INDEX IF NOT EXISTS "Tag_userId_idx" ON "Tag"("userId");`,

  `CREATE TABLE IF NOT EXISTS "TradeTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "TradeTag_tradeId_tagId_key" ON "TradeTag"("tradeId", "tagId");`,
  `CREATE INDEX IF NOT EXISTS "TradeTag_tradeId_idx" ON "TradeTag"("tradeId");`,
  `CREATE INDEX IF NOT EXISTS "TradeTag_tagId_idx" ON "TradeTag"("tagId");`,
];

async function main() {
  console.log("Connecting to Turso Database:", url);
  for (const sql of statements) {
    await client.execute(sql);
  }
  console.log("SUCCESS: All Prisma schema tables and indexes created on remote Turso Database!");
}

main().catch((err) => {
  console.error("Error setting up Turso database:", err);
  process.exit(1);
});
