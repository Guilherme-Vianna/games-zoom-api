-- Deploy B (destrutivo). Roda depois que o backfill (20260910130001) garantiu
-- que todo WishlistItem tem gameId. Em base de producao grande: rodar `pg_dump`
-- da DIRECT_URL e `prisma migrate status` antes.

-- AlterTable
ALTER TABLE "WishlistItem" ALTER COLUMN "gameId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "WishlistItem_gameId_idx" ON "WishlistItem"("gameId");

-- AlterTable: colunas migradas para Game.
ALTER TABLE "WishlistItem"
    DROP COLUMN "title",
    DROP COLUMN "imageUrl",
    DROP COLUMN "storeUrl",
    DROP COLUMN "isFree",
    DROP COLUMN "priceOverview";
