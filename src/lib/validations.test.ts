import { describe, expect, it } from "vitest";
import {
  addItemSchema,
  itemsQuerySchema,
  loginSchema,
  notificationSettingsSchema,
  registerSchema,
  wishlistsQuerySchema,
} from "./validations";

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

describe("itemsQuerySchema", () => {
  it("aplica defaults de paginacao", () => {
    const p = itemsQuerySchema.parse({});
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(24);
  });
  it("coage strings de query", () => {
    const p = itemsQuerySchema.parse({ page: "3", pageSize: "50", status: "onSale" });
    expect(p).toMatchObject({ page: 3, pageSize: 50, status: "onSale" });
  });
  it("cai no default quando page e invalida", () => {
    expect(itemsQuerySchema.parse({ page: "abc" }).page).toBe(1);
  });
  it("limita pageSize a 100", () => {
    expect(itemsQuerySchema.parse({ pageSize: "999" }).pageSize).toBe(24);
  });
  it("rejeita status desconhecido", () => {
    expect(itemsQuerySchema.safeParse({ status: "nope" }).success).toBe(false);
  });
});

describe("wishlistsQuerySchema", () => {
  it("defaults", () => {
    expect(wishlistsQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 24 });
  });
});

describe("notificationSettingsSchema", () => {
  it("aceita hora valida", () => {
    expect(
      notificationSettingsSchema.parse({ saleDigestEnabled: true, deliveryHour: "21" }),
    ).toEqual({ saleDigestEnabled: true, deliveryHour: 21 });
  });
  it("rejeita hora fora de 0-23", () => {
    expect(
      notificationSettingsSchema.safeParse({ saleDigestEnabled: false, deliveryHour: 24 }).success,
    ).toBe(false);
  });
  it("exige o booleano", () => {
    expect(notificationSettingsSchema.safeParse({ deliveryHour: 9 }).success).toBe(false);
  });
});
