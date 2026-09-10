import { describe, expect, it } from "vitest";
import {
  currentHourInTz,
  saleDigestCutoff,
  saleEventTtlCutoff,
} from "./notification-window";

describe("currentHourInTz", () => {
  it("converte UTC para America/Sao_Paulo (UTC-3)", () => {
    // 2026-09-10T12:00:00Z -> 09:00 em Sao Paulo
    expect(currentHourInTz(new Date("2026-09-10T12:00:00Z"))).toBe(9);
  });

  it("vira o dia para tras perto da meia-noite UTC", () => {
    // 2026-09-10T01:00:00Z -> 22:00 do dia 09 em Sao Paulo
    expect(currentHourInTz(new Date("2026-09-10T01:00:00Z"))).toBe(22);
  });

  it("meia-noite local vira 0", () => {
    // 2026-09-10T03:00:00Z -> 00:00 em Sao Paulo
    expect(currentHourInTz(new Date("2026-09-10T03:00:00Z"))).toBe(0);
  });
});

describe("cutoffs", () => {
  const now = new Date("2026-09-10T12:00:00Z");
  it("digest cutoff = agora - 30h", () => {
    expect(saleDigestCutoff(now).toISOString()).toBe("2026-09-09T06:00:00.000Z");
  });
  it("ttl cutoff = agora - 48h", () => {
    expect(saleEventTtlCutoff(now).toISOString()).toBe("2026-09-08T12:00:00.000Z");
  });
});
