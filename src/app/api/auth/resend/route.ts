import { env } from "@/lib/env";
import { buildVerificationEmail, sendEmail } from "@/lib/email";
import { handle, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { expiresInHours, generateToken } from "@/lib/tokens";
import { resendSchema } from "@/lib/validations";

/**
 * POST /api/auth/resend — reenvia o link de confirmacao.
 * Nao vaza se a conta existe: a mensagem e sempre generica. `sent` diz se um
 * e-mail foi de fato despachado (para o toast do frontend).
 */
export const POST = handle(async (req) => {
  const { email } = resendSchema.parse(await req.json());
  const generic = (sent: boolean) =>
    json({ ok: true, sent, message: "Se a conta existir e ainda nao foi confirmada, enviamos um novo link." });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) return generic(false);

  const token = generateToken();
  await prisma.verificationToken.create({
    data: { userId: user.id, token, expiresAt: expiresInHours(24) },
  });

  const verifyUrl = `${env.appUrl}/verificar?token=${token}`;
  const mail = buildVerificationEmail({ name: user.name, verifyUrl });

  try {
    await sendEmail({ to: user.email, toName: user.name, ...mail });
    return generic(true);
  } catch (err) {
    console.error("[resend] envio falhou", err);
    return json(
      { ok: false, sent: false, error: "Nao conseguimos enviar o e-mail agora. Tente de novo em instantes." },
      { status: 502 },
    );
  }
});
