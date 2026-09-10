import { assertCronRequest } from "@/lib/cron-auth";
import { handle, json } from "@/lib/http";
import { runGameSync } from "@/lib/sync-games";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET /api/cron/sync-games — job horario (Vercel Cron). Atualiza o cache Game. */
export const GET = handle(async (req) => {
  assertCronRequest(req);
  const report = await runGameSync();
  return json(report);
});
