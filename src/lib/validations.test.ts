import { describe, expect, it } from "vitest";
import { addItemSchema, loginSchema, registerSchema } from "./validations";

describe("registerSchema", () => {
  it("normaliza email para minusculo e faz trim", () => {
    const parsed = registerSchema.parse({
      name: "  Bob  ",
      email: "  BOB@Example.COM ",
      password: "12345678",
    });
    expect(parsed.email).toBe("bob@example.com");
    expect(parsed.name).toBe("Bob");
  });

  it("rejeita senha curta", () => {
    const r = registerSchema.safeParse({ name: "Bob", email: "b@b.com", password: "123" });
    expect(r.success).toBe(false);
  });

  it("rejeita nome com 1 caractere", () => {
    const r = registerSchema.safeParse({ name: "B", email: "b@b.com", password: "12345678" });
    expect(r.success).toBe(false);
  });

  it("rejeita email invalido", () => {
    const r = registerSchema.safeParse({ name: "Bob", email: "nope", password: "12345678" });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("aceita qualquer senha nao-vazia", () => {
    expect(loginSchema.safeParse({ email: "a@a.com", password: "x" }).success).toBe(true);
  });
  it("rejeita senha vazia", () => {
    expect(loginSchema.safeParse({ email: "a@a.com", password: "" }).success).toBe(false);
  });
});

describe("addItemSchema", () => {
  it("faz trim do input", () => {
    expect(addItemSchema.parse({ input: "  730  " }).input).toBe("730");
  });
  it("rejeita input vazio", () => {
    expect(addItemSchema.safeParse({ input: "   " }).success).toBe(false);
  });
});
