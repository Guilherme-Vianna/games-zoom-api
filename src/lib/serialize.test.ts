import { describe, expect, it } from "vitest";
import { serializeGame, serializeItem, serializeWishlist, type GameRow } from "./serialize";

const game: GameRow = {
  steamAppId: 367520,
  title: "Hollow Knight",
  imageUrl: "h.jpg",
  storeUrl: "https://store.steampowered.com/app/367520/",
  isFree: false,
  releaseStatus: "released",
  priceInitial: 2799,
  priceFinal: 1399,
  discountPercent: 50,
  onSale: true,
  currency: "BRL",
  lastSyncedAt: new Date("2026-09-10T12:00:00Z"),
};

const item = {
  id: "i1",
  steamAppId: 367520,
  addedById: "u1",
  addedByName: "Bob",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  game,
};

describe("serializeItem", () => {
  it("achata os campos do Game e sintetiza priceOverview", () => {
    const s = serializeItem(item);
    expect(s).toMatchObject({
      title: "Hollow Knight",
      steamAppId: 367520,
      status: "onSale",
      onSale: true,
      discountPercent: 50,
      priceOverview: {
        currency: "BRL",
        initial: 2799,
        final: 1399,
        discountPercent: 50,
        finalFormatted: "R$ 13,99",
      },
      lastSyncedAt: "2026-09-10T12:00:00.000Z",
    });
  });

  it("priceOverview null quando o Game nao tem preco", () => {
    const s = serializeItem({ ...item, game: { ...game, priceInitial: null, priceFinal: null } });
    expect(s.priceOverview).toBeNull();
  });

  it("status regular quando lancado e sem desconto", () => {
    const s = serializeItem({
      ...item,
      game: { ...game, discountPercent: 0, onSale: false },
    });
    expect(s.status).toBe("regular");
  });

  it("status unreleased para jogo nao lancado", () => {
    const s = serializeItem({ ...item, game: { ...game, releaseStatus: "unreleased" } });
    expect(s.status).toBe("unreleased");
  });

  it("ofertas de chave: null quando ausentes, formatadas quando presentes", () => {
    expect(serializeItem(item)).toMatchObject({ keyKeyshop: null, keyRetail: null, keyDealsUrl: null });
    const withKeys = serializeItem({
      ...item,
      game: {
        ...game,
        keyKeyshopCents: 1399,
        keyHistoricalKeyshopCents: 950,
        keyDealsUrl: "https://gg.deals/game/hollow-knight/",
        keysLastSyncedAt: new Date("2026-09-11T00:00:00Z"),
      },
    });
    expect(withKeys.keyKeyshop).toEqual({ cents: 1399, formatted: "R$ 13,99" });
    expect(withKeys.keyHistoricalKeyshop).toEqual({ cents: 950, formatted: "R$ 9,50" });
    expect(withKeys.keyDealsUrl).toBe("https://gg.deals/game/hollow-knight/");
    expect(withKeys.keysLastSyncedAt).toBe("2026-09-11T00:00:00.000Z");
  });
});

describe("serializeGame", () => {
  it("traz os campos do jogo + ofertas de chave, sem campos de item", () => {
    const s = serializeGame({ ...game, keyKeyshopCents: 500 });
    expect(s).toMatchObject({ steamAppId: 367520, status: "onSale", keyKeyshop: { cents: 500 } });
    expect(s).not.toHaveProperty("addedById");
  });
});

describe("serializeWishlist", () => {
  it("inclui counts quando passado e omite items sem eles", () => {
    const w = serializeWishlist(
      {
        id: "w1",
        name: "L",
        ownerId: "u1",
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { items: 3 },
      },
      "u1",
      { onSale: 1, unreleased: 0, regular: 2 },
    );
    expect(w.counts).toEqual({ onSale: 1, unreleased: 0, regular: 2 });
    expect(w.itemCount).toBe(3);
    expect(w.items).toEqual([]);
  });
});
