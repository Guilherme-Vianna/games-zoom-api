import { randomBytes } from "node:crypto";

/**
 * Gera um token opaco url-safe. Usado tanto para o link compartilhavel de uma
 * lista quanto para o token de confirmacao de email.
 * `bytes` de entropia -> ~1.33*bytes chars em base64url.
 */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

/** Data de expiracao a partir de agora, em horas. */
export function expiresInHours(hours: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export type InviteState = "active" | "expired" | "revoked";

/**
 * Estado de um link de convite. Puro. `expiresAt` null = nunca expira.
 * Revogado tem prioridade sobre expirado.
 */
export function inviteState(
  invite: { expiresAt: Date | null; revokedAt: Date | null },
  now: Date = new Date(),
): InviteState {
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt && isExpired(invite.expiresAt, now)) return "expired";
  return "active";
}

/** Presets de expiracao aceitos ao gerar um convite (em horas). null = nunca. */
export const INVITE_EXPIRY_PRESETS = {
  "1d": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  never: null,
} as const;

export type InviteExpiryPreset = keyof typeof INVITE_EXPIRY_PRESETS;

export function expiresAtFromPreset(
  preset: InviteExpiryPreset,
  from: Date = new Date(),
): Date | null {
  const hours = INVITE_EXPIRY_PRESETS[preset];
  return hours === null ? null : expiresInHours(hours, from);
}
