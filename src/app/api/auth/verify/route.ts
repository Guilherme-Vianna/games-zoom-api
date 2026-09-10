import { error, handle, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { isExpired } from "@/lib/tokens";

/** GET /api/auth/verify?token=... — confirma o e-mail de uma conta. */
export const GET = handle(async (req) => {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) return error("Token ausente", 400);

  const record = await prisma.verificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record || record.usedAt) return error("Link invalido ou ja utilizado", 400);
  if (isExpired(record.expiresAt)) return error("Link expirado. Solicite um novo.", 410);

  if (record.user.emailVerified) {
    return json({ ok: true, alreadyVerified: true });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return json({ ok: true });
});
