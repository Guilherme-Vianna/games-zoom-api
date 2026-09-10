import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const ALG = "HS256";
const ISSUER = "games-zoom-api";

export type SessionClaims = {
  sub: string;
  email: string;
  name: string;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.jwtSecret);
}

/** Emite o JWT que o frontend guarda na sessao e reapresenta no header. */
export async function signSessionToken(
  claims: SessionClaims,
  expiresIn = "30d",
): Promise<string> {
  return new SignJWT({ email: claims.email, name: claims.name })
    .setProtectedHeader({ alg: ALG })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

/** Valida assinatura + expiracao. Retorna `null` para token invalido/expirado. */
export async function verifySessionToken(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}
