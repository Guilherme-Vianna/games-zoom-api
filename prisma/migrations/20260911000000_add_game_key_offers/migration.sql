-- Ofertas de chave (agregadas via GG.deals) no cache Game. Aditivo, nullable —
-- sem backfill; o primeiro refresh/cron preenche.

ALTER TABLE "Game"
    ADD COLUMN "keyRetailCents" INTEGER,
    ADD COLUMN "keyKeyshopCents" INTEGER,
    ADD COLUMN "keyHistoricalRetailCents" INTEGER,
    ADD COLUMN "keyHistoricalKeyshopCents" INTEGER,
    ADD COLUMN "keyCurrency" TEXT,
    ADD COLUMN "keyDealsUrl" TEXT,
    ADD COLUMN "keysLastSyncedAt" TIMESTAMP(3),
    ADD COLUMN "keysLastSyncError" TEXT;

CREATE INDEX "Game_keysLastSyncedAt_idx" ON "Game"("keysLastSyncedAt");
