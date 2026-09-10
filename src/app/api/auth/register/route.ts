import bcrypt from "bcryptjs";
import { env } from "@/lib/env";
import { buildVerificationEmail, sendEmail } from "@/lib/email";
import { error, handle, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { expiresInHours, generateToken } from "@/lib/tokens";
import { registerSchema } from "@/lib/validations";

const VERIFY_TOKEN_TTL_HOURS = 24;

export const POST = handle(async (req) => {
  const body = registerSchema.parse(await req.json());

  const existing = await prisma.user.findUnique({ where: { email: body.email } });

  // Conta ja confirmada -> nao da pra recriar.
  if (existing?.emailVerified) {
    return error("Ja existe uma conta confirmada com este e-mail. Faca login.", 409);
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const token = generateToken();
  const expiresAt = expiresInHours(VERIFY_TOKEN_TTL_HOURS);

  let user;
  if (existing) {
    // Conta existe mas nunca foi confirmada: atualiza os dados, invalida tokens
    // antigos e gera um novo. Assim o usuario pode "recriar" e receber o link de novo.
    await prisma.verificationToken.deleteMany({ where: { userId: existing.id } });
    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        password: passwordHash,
        verificationTokens: { create: { token, expiresAt } },
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: passwordHash,
        verificationTokens: { create: { token, expiresAt } },
      },
    });
  }

  const verifyUrl = `${env.appUrl}/verificar?token=${token}`;
  const mail = buildVerificationEmail({ name: user.name, verifyUrl });

  let emailSent = true;
  try {
    await sendEmail({ to: user.email, toName: user.name, ...mail });
  } catch (err) {
    // Nao falha o cadastro se o e-mail cair — o usuario reenvia pela tela.
    console.error("[register] envio de e-mail falhou", err);
    emailSent = false;
  }

  return json(
    {
      ok: true,
      email: user.email,
      emailSent,
      message: emailSent
        ? "Conta criada. Confirme seu e-mail para entrar."
        : "Conta criada, mas nao conseguimos enviar o e-mail agora. Use o botao de reenviar.",
    },
    { status: existing ? 200 : 201 },
  );
});
