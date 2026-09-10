import { env } from "@/lib/env";
import { decimalStringToCents } from "@/lib/keys/decimal-cents";
import type { KeyPriceProvider, KeyPrices } from "@/lib/keys/key-price-provider";

const GG_DEALS_ENDPOINT = "https://api.gg.deals/v1/prices/by-steam-app-id/";
const MAX_IDS_PER_REQUEST = 100;

type GGDealsPrices = {
  currentRetail?: string | null;
  currentKeyshops?: string | null;
  historicalRetail?: string | null;
  historicalKeyshops?: string | null;
  currency?: string | null;
};

type GGDealsResponse = {
  success?: boolean;
  data?: Record<
    string,
    { title?: string; url?: string; prices?: GGDealsPrices } | null
  > | null;
};

/**
 * Converte a resposta do endpoint `by-steam-app-id` num Map AppID -> KeyPrices.
 * Puro. Lanca `Error` quando `success` e falso (ex.: e-mail nao confirmado,
 * key invalida) para o caller registrar `keysLastSyncError`.
 */
export function parseGGDealsResponse(
  json: unknown,
  fallbackCurrency: string,
): Map<number, KeyPrices | null> {
  const body = json as GGDealsResponse | null;
  if (!body || typeof body !== "object") {
    throw new Error("GG.deals: resposta vazia ou invalida");
  }
  if (body.success === false) {
    const msg =
      (body as { data?: { message?: string } }).data?.message ??
      "GG.deals recusou a requisicao";
    throw new Error(`GG.deals: ${msg}`);
  }

  const out = new Map<number, KeyPrices | null>();
  const data = body.data ?? {};
  for (const [key, entry] of Object.entries(data)) {
    const appId = Number(key);
    if (!Number.isInteger(appId) || appId <= 0) continue;
    if (!entry || !entry.prices) {
      out.set(appId, null);
      continue;
    }
    const p = entry.prices;
    out.set(appId, {
      retailCents: decimalStringToCents(p.currentRetail ?? null),
      keyshopCents: decimalStringToCents(p.currentKeyshops ?? null),
      historicalRetailCents: decimalStringToCents(p.historicalRetail ?? null),
      historicalKeyshopCents: decimalStringToCents(p.historicalKeyshops ?? null),
      currency: p.currency ?? fallbackCurrency,
      dealsUrl: entry.url ?? null,
    });
  }
  return out;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Provedor de precos via GG.deals (agregador: Eneba, Nuuvem, Kinguin, etc).
 * `region=br` -> precos em BRL e keyshops relevantes para o Brasil.
 * Sem `GGDEALS_API_KEY` configurada, devolve tudo `null` (feature inerte).
 */
export class GGDealsProvider implements KeyPriceProvider {
  readonly name = "gg.deals";

  constructor(
    private readonly apiKey = env.ggDealsApiKey,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async fetchPrices(
    steamAppIds: number[],
    region: string,
  ): Promise<Map<number, KeyPrices | null>> {
    const ids = [...new Set(steamAppIds.filter((n) => Number.isInteger(n) && n > 0))];
    const result = new Map<number, KeyPrices | null>();
    if (ids.length === 0) return result;

    if (!this.apiKey) {
      for (const id of ids) result.set(id, null);
      return result;
    }

    for (const batch of chunk(ids, MAX_IDS_PER_REQUEST)) {
      const url = new URL(GG_DEALS_ENDPOINT);
      url.searchParams.set("ids", batch.join(","));
      url.searchParams.set("region", region);
      url.searchParams.set("key", this.apiKey);

      const res = await this.fetchImpl(url, {
        headers: { Accept: "application/json" },
      } as RequestInit);
      if (!res.ok) {
        throw new Error(`GG.deals respondeu ${res.status}`);
      }
      const json = (await res.json()) as unknown;
      const parsed = parseGGDealsResponse(json, region.toUpperCase() === "BR" ? "BRL" : region);
      for (const id of batch) result.set(id, parsed.get(id) ?? null);
    }

    return result;
  }
}
