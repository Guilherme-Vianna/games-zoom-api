-- Deploy A (aditivo, nao-destrutivo): entidade Game compartilhada, tabelas de job,
-- cache no banco e preferencias/ledger de notificacao. A coluna WishlistItem.gameId
-- entra nullable e sem FK; o backfill e a migration seguinte cuidam disso.

-- CreateEnum
CREATE TYPE "GameReleaseStatus" AS ENUM ('released', 'unreleased');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "steamAppId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "storeUrl" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "releaseStatus" "GameReleaseStatus" NOT NULL DEFAULT 'released',
    "priceInitial" INTEGER,
    "priceFinal" INTEGER,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "onSale" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_steamAppId_key" ON "Game"("steamAppId");
CREATE INDEX "Game_onSale_idx" ON "Game"("onSale");
CREATE INDEX "Game_releaseStatus_idx" ON "Game"("releaseStatus");
CREATE INDEX "Game_lastSyncedAt_idx" ON "Game"("lastSyncedAt");

-- CreateTable
CREATE TABLE "GameSaleEvent" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "prevFinal" INTEGER,
    "newFinal" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "GameSaleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameSaleEvent_gameId_idx" ON "GameSaleEvent"("gameId");
CREATE INDEX "GameSaleEvent_notifiedAt_idx" ON "GameSaleEvent"("notifiedAt");
CREATE INDEX "GameSaleEvent_detectedAt_idx" ON "GameSaleEvent"("detectedAt");

-- CreateTable
CREATE TABLE "GameSaleNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameSaleEventId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSaleNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameSaleNotification_userId_gameSaleEventId_key" ON "GameSaleNotification"("userId", "gameSaleEventId");
CREATE INDEX "GameSaleNotification_userId_idx" ON "GameSaleNotification"("userId");

-- CreateTable
CREATE TABLE "UserNotificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "saleDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deliveryHour" INTEGER NOT NULL DEFAULT 9,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationSettings_userId_key" ON "UserNotificationSettings"("userId");

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "lastStartedAt" TIMESTAMP(3),
    "lastFinishedAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "meta" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobRun_jobName_key" ON "JobRun"("jobName");

-- CreateTable
CREATE TABLE "CacheEntry" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "CacheEntry_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "GameSaleEvent" ADD CONSTRAINT "GameSaleEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameSaleNotification" ADD CONSTRAINT "GameSaleNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameSaleNotification" ADD CONSTRAINT "GameSaleNotification_gameSaleEventId_fkey" FOREIGN KEY ("gameSaleEventId") REFERENCES "GameSaleEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (nullable, sem FK ainda)
ALTER TABLE "WishlistItem" ADD COLUMN "gameId" TEXT;
