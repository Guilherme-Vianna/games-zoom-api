-- Deploy A (parte 2): backfill do Game a partir dos WishlistItem existentes.
-- Defensivo com NULLIF/COALESCE/cast — priceOverview e um JSON livre (snapshot antigo).
-- lastSyncedAt fica NULL de proposito: o primeiro `sync-games` reconcilia
-- releaseStatus, currency e precos de verdade contra a Steam.

INSERT INTO "Game" (
    "id", "steamAppId", "title", "imageUrl", "storeUrl", "isFree",
    "releaseStatus", "priceInitial", "priceFinal", "discountPercent",
    "onSale", "currency", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    src."steamAppId",
    src."title",
    src."imageUrl",
    src."storeUrl",
    src."isFree",
    'released'::"GameReleaseStatus",
    NULLIF(src."priceOverview" ->> 'initial', '')::int,
    NULLIF(src."priceOverview" ->> 'final', '')::int,
    COALESCE(NULLIF(src."priceOverview" ->> 'discountPercent', ''), '0')::int,
    COALESCE(NULLIF(src."priceOverview" ->> 'discountPercent', ''), '0')::int > 0,
    COALESCE(NULLIF(src."priceOverview" ->> 'currency', ''), 'BRL'),
    now(),
    now()
FROM (
    SELECT DISTINCT ON ("steamAppId")
        "steamAppId", "title", "imageUrl", "storeUrl", "isFree", "priceOverview"
    FROM "WishlistItem"
    ORDER BY "steamAppId", "createdAt" DESC
) src
ON CONFLICT ("steamAppId") DO NOTHING;

-- Liga cada item ao seu Game.
UPDATE "WishlistItem" i
SET "gameId" = g."id"
FROM "Game" g
WHERE g."steamAppId" = i."steamAppId"
  AND i."gameId" IS NULL;

-- Guarda de seguranca: aborta a migration se sobrou item sem gameId.
DO $$
DECLARE orphan_count int;
BEGIN
    SELECT count(*) INTO orphan_count FROM "WishlistItem" WHERE "gameId" IS NULL;
    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'Backfill incompleto: % WishlistItem sem gameId', orphan_count;
    END IF;
END $$;
