/**
 * Utilidades puras para lidar com jogos da Steam. Sem I/O aqui exceto
 * `fetchSteamAppDetails` (isolado no fim) — o resto e testavel sem rede.
 */

const NUMERIC_ONLY = /^\d{1,7}$/;
// Captura o id em URLs tipo .../app/730/CounterStrike_2/?snr=... ou .../app/730
const APP_PATH = /\/app\/(\d{1,7})(?:\/|\?|#|$)/;

/**
 * Extrai o Steam AppID de uma entrada do usuario. Aceita:
 *  - um numero puro ("730")
 *  - um link da loja ("https://store.steampowered.com/app/730/CounterStrike_2/")
 *  - um link com querystring de rastreio (?snr=1_7_7_230_150_1)
 *  - um link da comunidade ("https://steamcommunity.com/app/440")
 * Retorna `null` para qualquer coisa que nao seja reconhecivel com seguranca.
 */
export function parseSteamAppId(input: string | null | undefined): number | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;

  if (NUMERIC_ONLY.test(value)) {
    const n = Number(value);
    return n > 0 ? n : null;
  }

  // So aceitamos /app/<id> quando a string realmente parece um link da Steam,
  // para nao capturar "/app/123" de um dominio qualquer.
  if (!/steampowered\.com|steamcommunity\.com/i.test(value)) return null;

  const match = value.match(APP_PATH);
  if (!match) return null;
  const n = Number(match[1]);
  return n > 0 ? n : null;
}

/** URL canonica da pagina da loja para um AppID. */
export function steamStoreUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}/`;
}

/** Endpoint publico de detalhes da loja (nome, imagem, preco em BRL). */
export function steamAppDetailsUrl(appId: number): string {
  return `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=br&l=brazilian`;
}

export type SteamPriceOverview = {
  currency: string;
  initial: number;
  final: number;
  discountPercent: number;
  finalFormatted: string;
};

export type SteamGame = {
  steamAppId: number;
  title: string;
  imageUrl: string | null;
  storeUrl: string;
  isFree: boolean;
  priceOverview: SteamPriceOverview | null;
};

type RawAppDetails = Record<
  string,
  | {
      success: boolean;
      data?: {
        name?: string;
        header_image?: string;
        is_free?: boolean;
        price_overview?: {
          currency?: string;
          initial?: number;
          final?: number;
          discount_percent?: number;
          final_formatted?: string;
        };
      };
    }
  | undefined
>;

/**
 * Converte a resposta crua do endpoint `appdetails` no nosso shape.
 * Retorna `null` quando a Steam responde `success: false` (AppID inexistente,
 * regiao bloqueada, DLC sem pagina propria, etc.).
 */
export function mapAppDetails(raw: unknown, appId: number): SteamGame | null {
  const entry = (raw as RawAppDetails | null)?.[String(appId)];
  if (!entry || !entry.success || !entry.data) return null;

  const data = entry.data;
  const name = (data.name ?? "").trim();
  if (!name) return null;

  const po = data.price_overview;
  const priceOverview: SteamPriceOverview | null = po
    ? {
        currency: po.currency ?? "BRL",
        initial: po.initial ?? 0,
        final: po.final ?? 0,
        discountPercent: po.discount_percent ?? 0,
        finalFormatted: po.final_formatted ?? "",
      }
    : null;

  return {
    steamAppId: appId,
    title: name,
    imageUrl: data.header_image?.trim() || null,
    storeUrl: steamStoreUrl(appId),
    isFree: Boolean(data.is_free),
    priceOverview,
  };
}

/** Busca e mapeia os detalhes de um jogo. Lanca em erro de rede/HTTP. */
export async function fetchSteamAppDetails(
  appId: number,
  fetchImpl: typeof fetch = fetch,
): Promise<SteamGame | null> {
  const res = await fetchImpl(steamAppDetailsUrl(appId), {
    headers: { Accept: "application/json" },
    // A resposta muda de preco com o tempo; cache curto no edge da Vercel.
    next: { revalidate: 60 * 30 },
  } as RequestInit);

  if (!res.ok) {
    throw new Error(`Steam appdetails respondeu ${res.status}`);
  }

  const json = (await res.json()) as unknown;
  return mapAppDetails(json, appId);
}
