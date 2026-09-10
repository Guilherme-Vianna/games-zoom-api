import { requireUser } from "@/lib/auth-context";
import { env } from "@/lib/env";
import { refreshGameFromSteam } from "@/lib/game-repo";
import { handle, HttpError, json } from "@/lib/http";
import { refreshGameKeys } from "@/lib/keys/refresh-keys";
import { prisma } from "@/lib/prisma";
import { serializeGame } from "@/lib/serialize";
import { steamAppIdParamSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/games/:steamAppId/refresh — atualiza um jogo agora (Steam + chaves),
 * sem esperar o cron. `Game` e compartilhado e publico: qualquer usuario
 * confirmado pode disparar. Guarda de staleness evita marteladas.
 */
export const POST = handle(async (req, ctx) => {
  await requireUser(req);
  const { steamAppId } = await ctx.params;
  const appId = steamAppIdParamSchema.parse(steamAppId);

  const game = await prisma.game.findUnique({ where: { steamAppId: appId } });
  if (!game) throw new HttpError("Jogo nao encontrado", 404);

  const minInterval = env.refreshMinIntervalMs;
  const fresh = (d: Date | null) => d != null && Date.now() - d.getTime() < minInterval;

  if (fresh(game.lastSyncedAt) && fresh(game.keysLastSyncedAt)) {
    return json({ game: serializeGame(game), skipped: true });
  }

  // Steam e chaves em paralelo; um falhar nao derruba o outro.
  const [steamResult] = await Promise.allSettled([
    fresh(game.lastSyncedAt) ? Promise.resolve() : refreshGameFromSteam(game.id),
    fresh(game.keysLastSyncedAt) ? Promise.resolve() : refreshGameKeys([game.id]),
  ]);
  if (steamResult.status === "rejected") {
    console.error("[games/refresh] steam falhou", steamResult.reason);
  }

  const updated = await prisma.game.findUnique({ where: { id: game.id } });
  return json({ game: serializeGame(updated ?? game), skipped: false });
});
