import { requireUser } from "@/lib/auth-context";
import { mapWithConcurrency } from "@/lib/concurrency";
import { env } from "@/lib/env";
import { refreshGameFromSteam } from "@/lib/game-repo";
import { handle, json } from "@/lib/http";
import { refreshGameKeys } from "@/lib/keys/refresh-keys";
import { prisma } from "@/lib/prisma";
import { assertCanView, loadWishlistForUser } from "@/lib/wishlist-repo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Quantos jogos da lista atualizamos contra a Steam por clique (o resto fica pendente). */
const STEAM_REFRESH_CAP = 40;

/**
 * POST /api/wishlists/:id/refresh — atualiza todos os jogos da lista (chaves) e
 * a fatia mais desatualizada contra a Steam. Qualquer membro pode disparar.
 */
export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const { access } = await loadWishlistForUser(id, user.id);
  assertCanView(access);

  const items = await prisma.wishlistItem.findMany({
    where: { wishlistId: id },
    select: { gameId: true },
  });
  const gameIds = [...new Set(items.map((i) => i.gameId))];

  // (1) Chaves: barato (1 request / 100 jogos).
  const keys = await refreshGameKeys(gameIds);

  // (2) Steam: os mais velhos primeiro, com teto por clique.
  const stale = await prisma.game.findMany({
    where: { id: { in: gameIds } },
    orderBy: [{ lastSyncedAt: { sort: "asc", nulls: "first" } }],
    select: { id: true },
    take: STEAM_REFRESH_CAP,
  });

  const outcomes = await mapWithConcurrency(stale, env.syncConcurrency, async (g) => {
    try {
      await refreshGameFromSteam(g.id);
      return true;
    } catch (err) {
      console.error("[wishlists/refresh] steam falhou", err);
      return false;
    }
  });

  const steamRefreshed = outcomes.filter(Boolean).length;
  const steamFailed = outcomes.length - steamRefreshed;
  const steamPending = Math.max(0, gameIds.length - stale.length);

  return json({
    keysRefreshed: keys.refreshed,
    keysFailed: keys.failed,
    steamRefreshed,
    steamFailed,
    steamPending,
  });
});
