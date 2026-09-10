import { mapWithConcurrency } from "@/lib/concurrency";
import { env } from "@/lib/env";
import { detectSaleTransition, mapSteamGameToFields } from "@/lib/game-mapping";
import { prisma } from "@/lib/prisma";
import { fetchSteamAppDetails } from "@/lib/steam";

export type SyncReport = {
  scanned: number;
  updated: number;
  failed: number;
  saleEvents: number;
  durationMs: number;
};

type SyncDeps = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

/**
 * Job horario: atualiza o cache `Game` contra a Steam e registra os jogos que
 * entraram (ou aprofundaram) uma promocao em `GameSaleEvent`.
 *
 * Escala: custo O(jogos distintos), nao O(itens). Processa a fatia mais velha
 * (`lastSyncedAt` asc) ate `MAX_GAMES_PER_SYNC`, com concorrencia limitada para
 * nao levar rate-limit da Steam. Erro num jogo nao derruba os demais — mantem o
 * dado velho e grava `lastSyncError`.
 */
export async function runGameSync(deps: SyncDeps = {}): Promise<SyncReport> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => new Date());
  const started = now();

  await prisma.jobRun.upsert({
    where: { jobName: "sync-games" },
    create: { jobName: "sync-games", lastStartedAt: started, lastStatus: "running" },
    update: { lastStartedAt: started, lastStatus: "running" },
  });

  const games = await prisma.game.findMany({
    orderBy: [{ lastSyncedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
    take: env.maxGamesPerSync,
  });

  let updated = 0;
  let failed = 0;
  let saleEvents = 0;
  const batchSize = env.syncBatchSize;

  for (let start = 0; start < games.length; start += batchSize) {
    const batch = games.slice(start, start + batchSize);
    const outcomes = await mapWithConcurrency(batch, env.syncConcurrency, async (game) => {
      try {
        const steamGame = await fetchSteamAppDetails(game.steamAppId, fetchImpl);
        if (!steamGame) {
          await prisma.game.update({
            where: { id: game.id },
            data: { lastSyncedAt: now(), lastSyncError: "Steam: appid nao encontrado" },
          });
          return { ok: true as const, sale: false };
        }

        const next = mapSteamGameToFields(steamGame);
        const transition = detectSaleTransition(
          { onSale: game.onSale, priceFinal: game.priceFinal, discountPercent: game.discountPercent },
          { onSale: next.onSale, priceFinal: next.priceFinal, discountPercent: next.discountPercent },
        );

        await prisma.$transaction(async (tx) => {
          await tx.game.update({
            where: { id: game.id },
            data: { ...next, lastSyncedAt: now(), lastSyncError: null },
          });
          if (transition) {
            await tx.gameSaleEvent.create({
              data: {
                gameId: game.id,
                prevFinal: transition.prevFinal,
                newFinal: transition.newFinal,
                discountPercent: transition.discountPercent,
                detectedAt: now(),
              },
            });
          }
        });

        return { ok: true as const, sale: !!transition };
      } catch (err) {
        console.error("[sync-games] falhou para", game.steamAppId, err);
        await prisma.game
          .update({
            where: { id: game.id },
            data: { lastSyncError: String((err as Error)?.message ?? err).slice(0, 300) },
          })
          .catch(() => {});
        return { ok: false as const, sale: false };
      }
    });

    for (const o of outcomes) {
      if (o.ok) updated++;
      else failed++;
      if (o.sale) saleEvents++;
    }

    // Respiro entre lotes para nao martelar a Steam.
    if (start + batchSize < games.length) {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
    }
  }

  const finished = now();
  const report: SyncReport = {
    scanned: games.length,
    updated,
    failed,
    saleEvents,
    durationMs: finished.getTime() - started.getTime(),
  };

  await prisma.jobRun.update({
    where: { jobName: "sync-games" },
    data: {
      lastFinishedAt: finished,
      lastStatus: failed > 0 && updated === 0 ? "error" : "ok",
      lastError: null,
      meta: report,
    },
  });

  return report;
}
