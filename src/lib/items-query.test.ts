import { describe, expect, it } from "vitest";
import { buildItemsOrderBy, buildItemsWhere, parseItemSort } from "./items-query";

describe("buildItemsWhere", () => {
  it("so wishlistId quando sem filtro", () => {
    expect(buildItemsWhere({ wishlistId: "w1" })).toEqual({ wishlistId: "w1" });
  });

  it("filtra promocao", () => {
    expect(buildItemsWhere({ wishlistId: "w1", status: "onSale" })).toEqual({
      wishlistId: "w1",
      game: { releaseStatus: "released", discountPercent: { gt: 0 } },
    });
  });

  it("filtra nao lancados", () => {
    expect(buildItemsWhere({ wishlistId: "w1", status: "unreleased" }).game).toEqual({
      releaseStatus: "unreleased",
    });
  });

  it("filtra preco normal", () => {
    expect(buildItemsWhere({ wishlistId: "w1", status: "regular" }).game).toEqual({
      releaseStatus: "released",
      discountPercent: 0,
    });
  });

  it("combina status e busca no mesmo sub-where de game", () => {
    expect(buildItemsWhere({ wishlistId: "w1", status: "onSale", q: " hollow " }).game).toEqual({
      releaseStatus: "released",
      discountPercent: { gt: 0 },
      title: { contains: "hollow", mode: "insensitive" },
    });
  });

  it("ignora busca vazia", () => {
    expect(buildItemsWhere({ wishlistId: "w1", q: "   " })).toEqual({ wishlistId: "w1" });
  });
});

describe("parseItemSort", () => {
  it("default recent para valor invalido", () => {
    expect(parseItemSort("banana")).toBe("recent");
    expect(parseItemSort(undefined)).toBe("recent");
  });
  it("aceita valores conhecidos", () => {
    expect(parseItemSort("discount")).toBe("discount");
  });
});

describe("buildItemsOrderBy", () => {
  it("recent", () => {
    expect(buildItemsOrderBy("recent")).toEqual({ createdAt: "desc" });
  });
  it("price_asc ordena por game.priceFinal", () => {
    expect(buildItemsOrderBy("price_asc")).toEqual([
      { game: { priceFinal: "asc" } },
      { createdAt: "desc" },
    ]);
  });
  it("discount desc", () => {
    expect(buildItemsOrderBy("discount")).toEqual([
      { game: { discountPercent: "desc" } },
      { createdAt: "desc" },
    ]);
  });
  it("title", () => {
    expect(buildItemsOrderBy("title")).toEqual({ game: { title: "asc" } });
  });
});
