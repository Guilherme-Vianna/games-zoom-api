import { describe, expect, it } from "vitest";
import { isValidCronAuth } from "./cron-auth";

describe("isValidCronAuth", () => {
  it("aceita o Bearer com o segredo certo", () => {
    expect(isValidCronAuth("Bearer s3cr3t", "s3cr3t")).toBe(true);
    expect(isValidCronAuth("bearer s3cr3t", "s3cr3t")).toBe(true);
  });
  it("rejeita segredo errado", () => {
    expect(isValidCronAuth("Bearer nope", "s3cr3t")).toBe(false);
  });
  it("rejeita header ausente ou malformado", () => {
    expect(isValidCronAuth(null, "s3cr3t")).toBe(false);
    expect(isValidCronAuth("", "s3cr3t")).toBe(false);
    expect(isValidCronAuth("Basic s3cr3t", "s3cr3t")).toBe(false);
    expect(isValidCronAuth("Bearer", "s3cr3t")).toBe(false);
  });
});
