import { describe, expect, it } from "vitest";
import { parseGGDealsResponse } from "./gg-deals";

describe("parseGGDealsResponse", () => {
  it("mapeia precos de um jogo", () => {
    const json = {
      success: true,
      data: {
        "367520": {
          title: "Hollow Knight",
          url: "https://gg.deals/game/hollow-knight/",
          prices: {
            currentRetail: "27.99",
            currentKeyshops: "13.99",
            historicalRetail: "13.99",
            historicalKeyshops: "9.50",
            currency: "BRL",
          },
        },
      },
    };
    const map = parseGGDealsResponse(json, "BRL");
    expect(map.get(367520)).toEqual({
      retailCents: 2799,
      keyshopCents: 1399,
      historicalRetailCents: 1399,
      historicalKeyshopCents: 950,
      currency: "BRL",
      dealsUrl: "https://gg.deals/game/hollow-knight/",
    });
  });

  it("jogo sem dados -> null", () => {
    const map = parseGGDealsResponse({ success: true, data: { "1": null } }, "BRL");
    expect(map.get(1)).toBeNull();
  });

  it("preco ausente vira null, mantendo os outros", () => {
    const json = {
      success: true,
      data: {
        "10": { url: "u", prices: { currentKeyshops: "5.00", currency: "BRL" } },
      },
    };
    expect(parseGGDealsResponse(json, "BRL").get(10)).toMatchObject({
      retailCents: null,
      keyshopCents: 500,
      dealsUrl: "u",
    });
  });

  it("success:false lanca com a mensagem", () => {
    expect(() =>
      parseGGDealsResponse(
        { success: false, data: { message: "You need to confirm your email address." } },
        "BRL",
      ),
    ).toThrow(/confirm your email/);
  });

  it("resposta invalida lanca", () => {
    expect(() => parseGGDealsResponse(null, "BRL")).toThrow();
    expect(() => parseGGDealsResponse("erro", "BRL")).toThrow();
  });

  it("ignora chaves nao numericas", () => {
    const map = parseGGDealsResponse({ success: true, data: { foo: null } }, "BRL");
    expect(map.size).toBe(0);
  });
});
