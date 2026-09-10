/**
 * Utilidades puras para converter os detalhes da Steam no shape do model `Game`
 * e para detectar quando um jogo entrou (ou aprofundou) uma promocao.
 */
import type { SteamGame } from "@/lib/steam";

export type GameStatus = "onSale" | "unreleased" | "regular";

/** Campos que o job/rota gravam em `Game` a partir da Steam. */
export type GameFields = {
  title: string;
  imageUrl: string | null;
  storeUrl: string;
  isFree: boolean;
  releaseStatus: "released" | "unreleased";
  priceInitial: number | null;
  priceFinal: number | null;
  discountPercent: number;
  onSale: boolean;
  currency: string;
};

/** Converte o resultado de `fetchSteamAppDetails` nos campos do model Game. */
export function mapSteamGameToFields(game: SteamGame): GameFields {
  const po = game.priceOverview;
  const discountPercent = po?.discountPercent ?? 0;
  return {
    title: game.title,
    imageUrl: game.imageUrl,
    storeUrl: game.storeUrl,
    isFree: game.isFree,
    releaseStatus: game.releaseStatus,
    priceInitial: po ? po.initial : null,
    priceFinal: po ? po.final : null,
    discountPercent,
    onSale: game.releaseStatus === "released" && discountPercent > 0,
    currency: po?.currency ?? "BRL",
  };
}

/** Bucket de status usado pelas abas da UI. */
export function deriveGameStatus(g: {
  releaseStatus: "released" | "unreleased";
  discountPercent: number;
}): GameStatus {
  if (g.releaseStatus === "unreleased") return "unreleased";
  return g.discountPercent > 0 ? "onSale" : "regular";
}

export type SaleSnapshot = {
  onSale: boolean;
  priceFinal: number | null;
  discountPercent: number;
};

export type SaleEventInput = {
  prevFinal: number | null;
  newFinal: number;
  discountPercent: number;
};

/**
 * Retorna os dados de um `GameSaleEvent` quando:
 *  - o jogo saiu de "sem promocao" para "em promocao"; ou
 *  - ja estava em promocao e o preco final baixou ainda mais.
 * Retorna `null` quando nao ha novidade (ou quando o novo preco e desconhecido).
 */
export function detectSaleTransition(
  prev: SaleSnapshot,
  next: SaleSnapshot,
): SaleEventInput | null {
  if (!next.onSale || next.priceFinal == null) return null;

  const enteredSale = !prev.onSale;
  const deeperDiscount =
    prev.onSale && prev.priceFinal != null && next.priceFinal < prev.priceFinal;

  if (!enteredSale && !deeperDiscount) return null;

  return {
    prevFinal: prev.priceFinal,
    newFinal: next.priceFinal,
    discountPercent: next.discountPercent,
  };
}
