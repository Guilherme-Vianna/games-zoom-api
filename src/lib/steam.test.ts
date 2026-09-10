import { describe, expect, it } from "vitest";
import {
  mapAppDetails,
  normalizeTitle,
  parseSteamAppId,
  pickBestSearchMatch,
  steamStoreSearchUrl,
  steamStoreUrl,
} from "./steam";

describe("parseSteamAppId", () => {
  it("aceita um numero puro", () => {
    expect(parseSteamAppId("730")).toBe(730);
  });

  it("extrai o id de um link da loja", () => {
    expect(
      parseSteamAppId("https://store.steampowered.com/app/730/CounterStrike_2/"),
    ).toBe(730);
  });

  it("ignora a querystring de rastreio", () => {
    expect(
      parseSteamAppId(
        "https://store.steampowered.com/app/1086940/Baldurs_Gate_3/?snr=1_7_7_230_150_1",
      ),
    ).toBe(1086940);
  });

  it("aceita link sem barra final e sem protocolo", () => {
    expect(parseSteamAppId("store.steampowered.com/app/570")).toBe(570);
  });

  it("aceita link da comunidade Steam", () => {
    expect(parseSteamAppId("https://steamcommunity.com/app/440")).toBe(440);
  });

  it("faz trim de espacos em volta", () => {
    expect(
      parseSteamAppId("  https://store.steampowered.com/app/292030/The_Witcher_3/  "),
    ).toBe(292030);
  });

  it("retorna null para string vazia, nula ou indefinida", () => {
    expect(parseSteamAppId("")).toBeNull();
    expect(parseSteamAppId("   ")).toBeNull();
    expect(parseSteamAppId(null)).toBeNull();
    expect(parseSteamAppId(undefined)).toBeNull();
  });

  it("retorna null para texto que nao e link nem numero", () => {
    expect(parseSteamAppId("counter strike")).toBeNull();
  });

  it("retorna null para a home da loja sem /app/", () => {
    expect(parseSteamAppId("https://store.steampowered.com/")).toBeNull();
  });

  it("nao captura /app/<id> de um dominio que nao e da Steam", () => {
    expect(parseSteamAppId("https://exemplo.com/app/730")).toBeNull();
  });

  it("retorna null para id zero", () => {
    expect(parseSteamAppId("0")).toBeNull();
  });
});

describe("steamStoreUrl", () => {
  it("monta a URL canonica da loja", () => {
    expect(steamStoreUrl(730)).toBe("https://store.steampowered.com/app/730/");
  });
});

describe("normalizeTitle", () => {
  it("remove acento, pontuacao e caixa", () => {
    expect(normalizeTitle("  Sekiro™: Shadows Die Twice  ")).toBe("sekiro shadows die twice");
    expect(normalizeTitle("Pokémon")).toBe("pokemon");
  });
});

describe("steamStoreSearchUrl", () => {
  it("escapa o termo na querystring", () => {
    expect(steamStoreSearchUrl("hollow knight")).toBe(
      "https://store.steampowered.com/api/storesearch/?term=hollow%20knight&cc=br&l=brazilian",
    );
  });
});

describe("pickBestSearchMatch", () => {
  const raw = {
    items: [
      { type: "app", name: "Hollow Knight: Silksong - Soundtrack", id: 3928720 },
      { type: "app", name: "Hollow Knight: Silksong", id: 1030300 },
    ],
  };

  it("prefere o app com nome exato ao termo", () => {
    expect(pickBestSearchMatch(raw, "hollow knight silksong")).toBe(1030300);
    expect(pickBestSearchMatch(raw, "Hollow Knight: Silksong")).toBe(1030300);
  });

  it("cai no primeiro app quando nao ha match exato", () => {
    expect(pickBestSearchMatch(raw, "hollow knight")).toBe(3928720);
  });

  it("ignora itens sem id valido ou que nao sao app", () => {
    const mixed = {
      items: [
        { type: "bundle", name: "Elden Ring Bundle", id: 12345 },
        { type: "app", name: "ELDEN RING", id: 0 },
        { type: "app", name: "ELDEN RING", id: 1245620 },
      ],
    };
    expect(pickBestSearchMatch(mixed, "elden ring")).toBe(1245620);
  });

  it("retorna null quando nao ha itens", () => {
    expect(pickBestSearchMatch({ items: [] }, "x")).toBeNull();
    expect(pickBestSearchMatch({}, "x")).toBeNull();
    expect(pickBestSearchMatch(null, "x")).toBeNull();
  });
});

describe("mapAppDetails", () => {
  const appId = 730;

  it("mapeia um jogo pago com desconto", () => {
    const raw = {
      "730": {
        success: true,
        data: {
          name: "Counter-Strike 2",
          header_image: "https://cdn.steam/730/header.jpg",
          is_free: false,
          price_overview: {
            currency: "BRL",
            initial: 3699,
            final: 1849,
            discount_percent: 50,
            final_formatted: "R$ 18,49",
          },
        },
      },
    };
    expect(mapAppDetails(raw, appId)).toEqual({
      steamAppId: 730,
      title: "Counter-Strike 2",
      imageUrl: "https://cdn.steam/730/header.jpg",
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
    });
  });

  it("mapeia um jogo gratuito (sem price_overview)", () => {
    const raw = {
      "730": {
        success: true,
        data: { name: "Dota 2", header_image: "x.jpg", is_free: true },
      },
    };
    const game = mapAppDetails(raw, appId);
    expect(game?.isFree).toBe(true);
    expect(game?.priceOverview).toBeNull();
  });

  it("retorna null quando success e false", () => {
    expect(mapAppDetails({ "730": { success: false } }, appId)).toBeNull();
  });

  it("retorna null quando o appId nao esta na resposta", () => {
    expect(mapAppDetails({ "999": { success: true, data: { name: "x" } } }, appId)).toBeNull();
  });

  it("retorna null quando a resposta e nula ou nao e objeto", () => {
    expect(mapAppDetails(null, appId)).toBeNull();
    expect(mapAppDetails("erro", appId)).toBeNull();
  });

  it("retorna null quando o nome vem vazio", () => {
    const raw = { "730": { success: true, data: { name: "   " } } };
    expect(mapAppDetails(raw, appId)).toBeNull();
  });

  it("normaliza header_image ausente para null", () => {
    const raw = { "730": { success: true, data: { name: "Jogo" } } };
    expect(mapAppDetails(raw, appId)?.imageUrl).toBeNull();
  });

  it("marca releaseStatus unreleased quando release_date.coming_soon", () => {
    const raw = {
      "730": {
        success: true,
        data: { name: "Jogo", release_date: { coming_soon: true, date: "Em breve" } },
      },
    };
    expect(mapAppDetails(raw, appId)?.releaseStatus).toBe("unreleased");
  });
});
