/**
 * Parsing puro do campo "adicionar jogo": aceita um link/AppID unico OU varios
 * jogos de uma vez, separados por virgula, ponto-e-virgula ou quebra de linha.
 * Cada pedaco vira uma entrada classificada como AppID (link/numero da Steam) ou
 * nome livre (a ser resolvido por busca na loja da Steam).
 */
import { normalizeTitle, parseSteamAppId } from "./steam";

export type AddEntry =
  | { raw: string; kind: "appId"; appId: number }
  | { raw: string; kind: "name"; term: string };

/** Teto de entradas por request — evita abusar da busca da Steam. */
export const MAX_ADD_ENTRIES = 30;

export function parseAddItemsInput(raw: string | null | undefined): AddEntry[] {
  const value = (raw ?? "").trim();
  if (!value) return [];

  // Sem separador -> uma unica entrada (link, AppID ou nome).
  if (!/[\n,;]/.test(value)) {
    const appId = parseSteamAppId(value);
    return appId !== null
      ? [{ raw: value, kind: "appId", appId }]
      : [{ raw: value, kind: "name", term: value }];
  }

  const parts = value
    .split(/[\n,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const seenIds = new Set<number>();
  const seenNames = new Set<string>();
  const out: AddEntry[] = [];

  for (const part of parts) {
    const appId = parseSteamAppId(part);
    if (appId !== null) {
      if (seenIds.has(appId)) continue;
      seenIds.add(appId);
      out.push({ raw: part, kind: "appId", appId });
      continue;
    }

    const key = normalizeTitle(part);
    if (!key || seenNames.has(key)) continue;
    seenNames.add(key);
    out.push({ raw: part, kind: "name", term: part });
  }

  return out;
}
