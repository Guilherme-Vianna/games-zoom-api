-- CreateTable
CREATE TABLE "WishlistInvite" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WishlistInvite_token_key" ON "WishlistInvite"("token");

-- CreateIndex
CREATE INDEX "WishlistInvite_wishlistId_idx" ON "WishlistInvite"("wishlistId");

-- AddForeignKey
ALTER TABLE "WishlistInvite" ADD CONSTRAINT "WishlistInvite_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistInvite" ADD CONSTRAINT "WishlistInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserva os links compartilhaveis existentes: cada Wishlist.shareToken vira um
-- convite sem expiracao, criado pelo dono da lista.
INSERT INTO "WishlistInvite" ("id", "wishlistId", "token", "createdById", "createdAt")
SELECT gen_random_uuid()::text, w."id", w."shareToken", w."ownerId", now()
FROM "Wishlist" w;

-- DropIndex
DROP INDEX "Wishlist_shareToken_key";

-- AlterTable
ALTER TABLE "Wishlist" DROP COLUMN "shareToken";
