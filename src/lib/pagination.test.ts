import { describe, expect, it } from "vitest";
import {
  buildPageMeta,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parsePageParams,
} from "./pagination";

describe("parsePageParams", () => {
  it("usa defaults quando ausente", () => {
    expect(parsePageParams({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
    });
  });

  it("calcula skip a partir da pagina", () => {
    expect(parsePageParams({ page: "3", pageSize: "10" })).toEqual({
      page: 3,
      pageSize: 10,
      skip: 20,
      take: 10,
    });
  });

  it("clampa pagina minima em 1", () => {
    expect(parsePageParams({ page: "0" }).page).toBe(1);
    expect(parsePageParams({ page: "-5" }).page).toBe(1);
  });

  it("clampa pageSize no maximo", () => {
    expect(parsePageParams({ pageSize: "9999" }).pageSize).toBe(MAX_PAGE_SIZE);
    expect(parsePageParams({ pageSize: "0" }).pageSize).toBe(1);
  });

  it("ignora valores nao numericos", () => {
    expect(parsePageParams({ page: "abc", pageSize: "" }).page).toBe(1);
    expect(parsePageParams({ pageSize: "abc" }).pageSize).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("buildPageMeta", () => {
  it("calcula totalPages arredondando para cima", () => {
    expect(buildPageMeta(45, 1, 20)).toEqual({
      page: 1,
      pageSize: 20,
      total: 45,
      totalPages: 3,
    });
  });
  it("total zero -> zero paginas", () => {
    expect(buildPageMeta(0, 1, 20).totalPages).toBe(0);
  });
});
