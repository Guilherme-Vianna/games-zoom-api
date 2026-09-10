import { describe, expect, it } from "vitest";
import { parseAddItemsInput } from "./add-items-input";

describe("parseAddItemsInput", () => {
  it("retorna vazio para entrada vazia/nula", () => {
    expect(parseAddItemsInput("")).toEqual([]);
    expect(parseAddItemsInput("   ")).toEqual([]);
    expect(parseAddItemsInput(null)).toEqual([]);
    expect(parseAddItemsInput(undefined)).toEqual([]);
  });

  it("trata a entrada inteira como AppID quando e um numero puro", () => {
    expect(parseAddItemsInput("730")).toEqual([{ raw: "730", kind: "appId", appId: 730 }]);
  });

  it("trata um link unico (com querystring de rastreio) como uma entrada", () => {
    const url = "https://store.steampowered.com/app/1086940/Baldurs_Gate_3/?snr=1_7_7_230";
    expect(parseAddItemsInput(url)).toEqual([{ raw: url, kind: "appId", appId: 1086940 }]);
  });

  it("trata texto solto sem separador como um nome unico", () => {
    expect(parseAddItemsInput("Hollow Knight")).toEqual([
      { raw: "Hollow Knight", kind: "name", term: "Hollow Knight" },
    ]);
  });

  it("quebra nomes separados por virgula", () => {
    expect(parseAddItemsInput("Hollow Knight, Elden Ring , Hades")).toEqual([
      { raw: "Hollow Knight", kind: "name", term: "Hollow Knight" },
      { raw: "Elden Ring", kind: "name", term: "Elden Ring" },
      { raw: "Hades", kind: "name", term: "Hades" },
    ]);
  });

  it("quebra por quebra de linha e ponto-e-virgula", () => {
    expect(parseAddItemsInput("Hades\nCeleste; Katana ZERO")).toHaveLength(3);
  });

  it("mistura link, AppID e nome numa lista", () => {
    const out = parseAddItemsInput("730, https://store.steampowered.com/app/570/, Hades");
    expect(out).toEqual([
      { raw: "730", kind: "appId", appId: 730 },
      { raw: "https://store.steampowered.com/app/570/", kind: "appId", appId: 570 },
      { raw: "Hades", kind: "name", term: "Hades" },
    ]);
  });

  it("dedupe por AppID e por nome normalizado, preservando ordem", () => {
    const out = parseAddItemsInput("Hades, 730, hades , CS:GO, 730, HADES");
    expect(out).toEqual([
      { raw: "Hades", kind: "name", term: "Hades" },
      { raw: "730", kind: "appId", appId: 730 },
      { raw: "CS:GO", kind: "name", term: "CS:GO" },
    ]);
  });
});
