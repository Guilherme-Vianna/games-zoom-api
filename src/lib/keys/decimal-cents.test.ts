import { describe, expect, it } from "vitest";
import { decimalStringToCents, formatCentsBRL } from "./decimal-cents";

describe("decimalStringToCents", () => {
  it("converte decimais", () => {
    expect(decimalStringToCents("24.30")).toBe(2430);
    expect(decimalStringToCents("5")).toBe(500);
    expect(decimalStringToCents("1234.5")).toBe(123450);
    expect(decimalStringToCents("0.99")).toBe(99);
  });
  it("aceita numero", () => {
    expect(decimalStringToCents(24.3)).toBe(2430);
  });
  it("arredonda centavo fracionario", () => {
    expect(decimalStringToCents("1.999")).toBe(200);
  });
  it("null / vazio / lixo -> null", () => {
    expect(decimalStringToCents(null)).toBeNull();
    expect(decimalStringToCents(undefined)).toBeNull();
    expect(decimalStringToCents("")).toBeNull();
    expect(decimalStringToCents("  ")).toBeNull();
    expect(decimalStringToCents("R$ 24,30")).toBeNull();
    expect(decimalStringToCents("abc")).toBeNull();
    expect(decimalStringToCents("-5")).toBeNull();
  });
});

describe("formatCentsBRL", () => {
  it("formata", () => {
    expect(formatCentsBRL(2430)).toBe("R$ 24,30");
    expect(formatCentsBRL(500)).toBe("R$ 5,00");
  });
  it("null -> null", () => {
    expect(formatCentsBRL(null)).toBeNull();
    expect(formatCentsBRL(undefined)).toBeNull();
  });
});
