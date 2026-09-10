import { describe, expect, it } from "vitest";
import {
  deriveGameStatus,
  detectSaleTransition,
  mapSteamGameToFields,
  type SaleSnapshot,
} from "./game-mapping";
import type { SteamGame } from "./steam";

const baseGame: SteamGame = {
  steamAppId: 730,
  title: "Counter-Strike 2",
  imageUrl: "x.jpg",
  storeUrl: "https://store.steampowered.com/app/730/",
  isFree: false,
  releaseStatus: "released",
  priceOverview: {
    currency: "BRL",
    initial: 3699,
    final: 1849,
    discountPercent: 50,
    finalFormatted: "R$ 18,49",
  },
};

describe("mapSteamGameToFields", () => {
  it("mapeia jogo pago em promocao", () => {
    const f = mapSteamGameToFields(baseGame);
    expect(f).toMatchObject({
      priceInitial: 3699,
      priceFinal: 1849,
      discountPercent: 50,
      onSale: true,
      currency: "BRL",
      releaseStatus: "released",
    });
  });

  it("jogo gratuito nao entra em promocao", () => {
    const f = mapSteamGameToFields({ ...baseGame, isFree: true, priceOverview: null });
    expect(f.priceInitial).toBeNull();
    expect(f.priceFinal).toBeNull();
    expect(f.discountPercent).toBe(0);
    expect(f.onSale).toBe(false);
  });

  it("jogo nao lancado nunca fica onSale mesmo com desconto", () => {
    const f = mapSteamGameToFields({ ...baseGame, releaseStatus: "unreleased" });
    expect(f.onSale).toBe(false);
    expect(f.releaseStatus).toBe("unreleased");
  });
});

describe("deriveGameStatus", () => {
  it("unreleased tem prioridade", () => {
    expect(deriveGameStatus({ releaseStatus: "unreleased", discountPercent: 40 })).toBe(
      "unreleased",
    );
  });
  it("com desconto -> onSale", () => {
    expect(deriveGameStatus({ releaseStatus: "released", discountPercent: 10 })).toBe("onSale");
  });
  it("sem desconto -> regular", () => {
    expect(deriveGameStatus({ releaseStatus: "released", discountPercent: 0 })).toBe("regular");
  });
});

describe("detectSaleTransition", () => {
  const noSale: SaleSnapshot = { onSale: false, priceFinal: 3699, discountPercent: 0 };
  const onSale: SaleSnapshot = { onSale: true, priceFinal: 1849, discountPercent: 50 };

  it("dispara ao entrar em promocao", () => {
    expect(detectSaleTransition(noSale, onSale)).toEqual({
      prevFinal: 3699,
      newFinal: 1849,
      discountPercent: 50,
    });
  });

  it("nao dispara se continua sem promocao", () => {
    expect(detectSaleTransition(noSale, noSale)).toBeNull();
  });

  it("nao dispara se continua na mesma promocao", () => {
    expect(detectSaleTransition(onSale, onSale)).toBeNull();
  });

  it("dispara quando o desconto aprofunda", () => {
    const deeper: SaleSnapshot = { onSale: true, priceFinal: 999, discountPercent: 73 };
    expect(detectSaleTransition(onSale, deeper)).toEqual({
      prevFinal: 1849,
      newFinal: 999,
      discountPercent: 73,
    });
  });

  it("nao dispara quando a promocao acaba", () => {
    expect(detectSaleTransition(onSale, noSale)).toBeNull();
  });

  it("nao dispara quando o novo preco e desconhecido", () => {
    expect(
      detectSaleTransition(noSale, { onSale: true, priceFinal: null, discountPercent: 20 }),
    ).toBeNull();
  });
});
