import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";

/**
 * Verifica se o request veio da Vercel Cron (ou de um caller autorizado):
 * exige `Authorization: Bearer <CRON_SECRET>`. Lanca 401 caso contrario, sem
 * vazar detalhe. A Vercel injeta esse header automaticamente quando a env
 * `CRON_SECRET` esta setada no projeto.
 */
export function assertCronRequest(req: Request): void {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token || token !== env.cronSecret) {
    throw new HttpError("Nao autorizado", 401);
  }
}

/** Versao pura para teste: recebe o header e o segredo. */
export function isValidCronAuth(header: string | null, secret: string): boolean {
  const [scheme, token] = (header ?? "").split(" ");
  return scheme?.toLowerCase() === "bearer" && !!token && token === secret;
}
