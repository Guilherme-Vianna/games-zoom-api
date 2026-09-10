import { env } from "@/lib/env";
import { GGDealsProvider } from "@/lib/keys/gg-deals";
import type { KeyPriceProvider } from "@/lib/keys/key-price-provider";
import { prisma } from "@/lib/prisma";

export type KeyRefreshReport = { refreshed: number; failed: number };

type Deps = { provider?: KeyPriceProvider; region?: string };

/**
 * Atualiza os campos `key*` de um conjunto de `Game` a partir do provedor de
 * ofertas (GG.deals). Barato: 1 request por 100 jogos. Reusado pelo cron
 * `sync-games` e pelas rotas de refresh sob demanda.
 *
 * Nunca lanca — em erro do provedor, grava `keysLastSyncError` em todos os jogos
 * do lote e retorna `failed` > 0.
 */
export async function refreshGameKeys(
  gameIds: string[],
  deps: Deps = {},
): Promise<KeyRefreshReport> {
  const ids = [...new Set(gameIds)];
  if (ids.length === 0) return { refreshed: 0, failed: 0 };

  const provider = deps.provider ?? new GGDealsProvider();
  const region = deps.region ?? env.ggDealsRegion;

  const games = await prisma.game.findMany({
    where: { id: { in: ids } },
    select: { id: true, steamAppId: true },
  });
  if (games.length === 0) return { refreshed: 0, failed: 0 };

  const appIdToGameId = new Map(games.map((g) => [g.steamAppId, g.id]));

  let prices: Awaited<ReturnType<KeyPriceProvider["fetchPrices"]>>;
  try {
    prices = await provider.fetchPrices([...appIdToGameId.keys()], region);
  } catch (err) {
    const message = String((err as Error)?.message ?? err).slice(0, 300);
    console.error("[refresh-keys] provedor falhou", err);
    await prisma.game.updateMany({
      where: { id: { in: games.map((g) => g.id) } },
      data: { keysLastSyncError: message, keysLastSyncedAt: new Date() },
    });
    return { refreshed: 0, failed: games.length };
  }

  let refreshed = 0;
  const now = new Date();
  for (const game of games) {
    const kp = prices.get(game.steamAppId) ?? null;
    await prisma.game.update({
      where: { id: game.id },
      data: {
        keyRetailCents: kp?.retailCents ?? null,
        keyKeyshopCents: kp?.keyshopCents ?? null,
        keyHistoricalRetailCents: kp?.historicalRetailCents ?? null,
        keyHistoricalKeyshopCents: kp?.historicalKeyshopCents ?? null,
        keyCurrency: kp?.currency ?? null,
        keyDealsUrl: kp?.dealsUrl ?? null,
        keysLastSyncedAt: now,
        keysLastSyncError: null,
      },
    });
    refreshed++;
  }

  return { refreshed, failed: 0 };
}
