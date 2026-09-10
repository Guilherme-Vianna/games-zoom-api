/**
 * Janela de tempo do digest de promocoes. Puro e testavel.
 *
 * O cron `notify-sales` roda de hora em hora (UTC). Cada rodada descobre que
 * hora e "agora" no fuso do usuario (America/Sao_Paulo) via `Intl` — nao um
 * offset fixo de -3 — e so notifica quem escolheu essa hora.
 */

/** Hora do dia (0-23) no fuso informado, a partir de um instante. */
export function currentHourInTz(now: Date, tz = "America/Sao_Paulo"): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = Number(hourPart);
  // `24` acontece em algumas engines para meia-noite.
  return hour === 24 ? 0 : hour;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * Eventos candidatos ao digest: detectados nas ultimas ~30h. A folga acima de
 * 24h garante que toda hora de entrega ocorra ao menos uma vez dentro da janela,
 * mesmo com um cron atrasado.
 */
export function saleDigestCutoff(now: Date): Date {
  return new Date(now.getTime() - 30 * HOUR_MS);
}

/** Depois de 48h, o evento e encerrado (nunca mais entra num digest novo). */
export function saleEventTtlCutoff(now: Date): Date {
  return new Date(now.getTime() - 48 * HOUR_MS);
}
