import { beforeAll, describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "./jwt";

beforeAll(() => {
  process.env.API_JWT_SECRET = "segredo-de-teste-bem-longo-0123456789";
});

const claims = { sub: "user_1", email: "a@a.com", name: "Alice" };

describe("jwt roundtrip", () => {
  it("assina e valida devolvendo os mesmos claims", async () => {
    const token = await signSessionToken(claims);
    expect(await verifySessionToken(token)).toEqual(claims);
  });

  it("rejeita token adulterado", async () => {
    const token = await signSessionToken(claims);
    expect(await verifySessionToken(token + "x")).toBeNull();
  });

  it("rejeita lixo", async () => {
    expect(await verifySessionToken("nao-e-um-jwt")).toBeNull();
  });

  it("rejeita token expirado", async () => {
    const token = await signSessionToken(claims, "-1s");
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejeita token assinado com outro segredo", async () => {
    const token = await signSessionToken(claims);
    process.env.API_JWT_SECRET = "outro-segredo-completamente-diferente-xyz";
    expect(await verifySessionToken(token)).toBeNull();
    process.env.API_JWT_SECRET = "segredo-de-teste-bem-longo-0123456789";
  });
});
