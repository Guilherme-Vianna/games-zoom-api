import { describe, expect, it } from "vitest";
import {
  expiresAtFromPreset,
  expiresInHours,
  generateToken,
  inviteState,
  isExpired,
} from "./tokens";

describe("generateToken", () => {
  it("gera token url-safe (sem +, / ou =)", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("gera tokens distintos a cada chamada", () => {
    const set = new Set(Array.from({ length: 200 }, () => generateToken()));
    expect(set.size).toBe(200);
  });

  it("respeita o tamanho de entropia pedido", () => {
    expect(generateToken(12).length).toBeLessThan(generateToken(48).length);
  });
});

describe("expiresInHours / isExpired", () => {
  const base = new Date("2026-01-01T00:00:00.000Z");

  it("soma as horas corretamente", () => {
    expect(expiresInHours(24, base).toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  it("nao esta expirado antes do prazo", () => {
    const exp = expiresInHours(1, base);
    expect(isExpired(exp, new Date("2026-01-01T00:30:00.000Z"))).toBe(false);
  });

  it("esta expirado exatamente no limite e depois dele", () => {
    const exp = expiresInHours(1, base);
    expect(isExpired(exp, new Date("2026-01-01T01:00:00.000Z"))).toBe(true);
    expect(isExpired(exp, new Date("2026-01-01T02:00:00.000Z"))).toBe(true);
  });
});

describe("inviteState", () => {
  const now = new Date("2026-01-10T00:00:00.000Z");

  it("ativo quando sem expiracao e sem revogacao", () => {
    expect(inviteState({ expiresAt: null, revokedAt: null }, now)).toBe("active");
  });

  it("ativo quando expira no futuro", () => {
    expect(
      inviteState({ expiresAt: new Date("2026-01-11T00:00:00Z"), revokedAt: null }, now),
    ).toBe("active");
  });

  it("expirado quando a data ja passou", () => {
    expect(
      inviteState({ expiresAt: new Date("2026-01-09T00:00:00Z"), revokedAt: null }, now),
    ).toBe("expired");
  });

  it("revogado tem prioridade sobre expirado", () => {
    expect(
      inviteState(
        { expiresAt: new Date("2026-01-09T00:00:00Z"), revokedAt: new Date("2026-01-08T00:00:00Z") },
        now,
      ),
    ).toBe("revoked");
  });
});

describe("expiresAtFromPreset", () => {
  const base = new Date("2026-01-01T00:00:00.000Z");

  it("never -> null", () => {
    expect(expiresAtFromPreset("never", base)).toBeNull();
  });

  it("7d -> +168h", () => {
    expect(expiresAtFromPreset("7d", base)?.toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });
});
