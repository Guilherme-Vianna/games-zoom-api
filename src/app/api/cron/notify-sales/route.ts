import { assertCronRequest } from "@/lib/cron-auth";
import { handle, json } from "@/lib/http";
import { runNotifySales } from "@/lib/run-notify-sales";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/cron/notify-sales — roda de hora em hora (Vercel Cron, UTC). Envia o
 * digest de promocoes para quem escolheu esta hora (fuso America/Sao_Paulo).
 */
export const GET = handle(async (req) => {
  assertCronRequest(req);
  const report = await runNotifySales();
  return json(report);
});
