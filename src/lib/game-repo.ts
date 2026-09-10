import { env } from "@/lib/env";
import { mapSteamGameToFields } from "@/lib/game-mapping";
import { prisma } from "@/lib/prisma";
import { fetchSteamAppDetails, type SteamGame } from "@/lib/steam";

type GameModel = Awaited<ReturnType<typeof prisma.game.findUnique>>;

/**
 * Grava/atualiza um Game a partir dos campos ja mapeados da Steam.
 * Nao gera GameSaleEvent aqui — isso e responsabilidade do job `sync-games`.
 */
export async function upsertGameFromSteam(game: SteamGame) {
  const fields = mapSteamGameToFields(game);
  return prisma.game.upsert({
    where: { steamAppId: game.steamAppId },
    create: { steamAppId: game.steamAppId, ...fields, lastSyncedAt: new Date() },
    update: { ...fields, lastSyncedAt: new Date(), lastSyncError: null },
  });
}

/**
 * Resolve o Game de um AppID para vincular a um item recem-adicionado:
 *  - reusa a linha do cache quando `lastSyncedAt` esta fresco;
 *  - senao busca na Steam e faz upsert.
 * Retorna `null` quando a Steam nao reconhece o AppID. Lanca em erro de rede.
 */
export async function findOrCreateGameForAppId(
  appId: number,
  opts: { fetchImpl?: typeof fetch; maxAgeMs?: number } = {},
): Promise<NonNullable<GameModel> | null> {
  const maxAgeMs = opts.maxAgeMs ?? env.gameCacheMaxAgeMs;
  const existing = await prisma.game.findUnique({ where: { steamAppId: appId } });
  if (
    existing?.lastSyncedAt &&
    Date.now() - existing.lastSyncedAt.getTime() < maxAgeMs
  ) {
    return existing;
  }

  const steamGame = await fetchSteamAppDetails(appId, opts.fetchImpl ?? fetch);
  if (!steamGame) return existing ?? null;

  return upsertGameFromSteam(steamGame);
}

/**
 * Forca a atualizacao de um `Game` contra a Steam agora (ignora `lastSyncedAt`).
 * Usado pelo refresh sob demanda (modal / botao da lista). Em erro da Steam,
 * grava `lastSyncError` e devolve a linha atual sem quebrar.
 */
export async function refreshGameFromSteam(
  gameId: string,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<NonNullable<GameModel>> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error(`Game ${gameId} nao encontrado`);

  try {
    const steamGame = await fetchSteamAppDetails(game.steamAppId, opts.fetchImpl ?? fetch);
    if (!steamGame) {
      return prisma.game.update({
        where: { id: gameId },
        data: { lastSyncedAt: new Date(), lastSyncError: "Steam: appid nao encontrado" },
      });
    }
    return await upsertGameFromSteam(steamGame);
  } catch (err) {
    console.error("[refresh-steam] falhou para", game.steamAppId, err);
    return prisma.game.update({
      where: { id: gameId },
      data: { lastSyncError: String((err as Error)?.message ?? err).slice(0, 300) },
    });
  }
}
