import { HttpError } from "@/lib/http";
import { verifySessionToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
};

/** Le o Bearer token, valida e devolve o usuario. Lanca 401 se ausente/invalido. */
export async function requireUser(req: Request): Promise<AuthedUser> {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new HttpError("Nao autenticado", 401);
  }

  const claims = await verifySessionToken(token);
  if (!claims) throw new HttpError("Sessao invalida ou expirada", 401);

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user) throw new HttpError("Usuario nao encontrado", 401);
  if (!user.emailVerified) throw new HttpError("Confirme seu e-mail para continuar", 403);

  return { id: user.id, email: user.email, name: user.name };
}
