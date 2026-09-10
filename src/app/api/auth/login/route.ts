import bcrypt from "bcryptjs";
import { error, handle, json } from "@/lib/http";
import { signSessionToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";

/**
 * POST /api/auth/login — usado pelo Credentials provider do next-auth na UI.
 * Devolve { token, user }. `token` e reapresentado no header Authorization.
 */
export const POST = handle(async (req) => {
  const body = loginSchema.parse(await req.json());

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const genericFail = () => error("E-mail ou senha invalidos", 401);

  if (!user) {
    // Compara mesmo assim para nao vazar a existencia do e-mail pelo timing.
    await bcrypt.compare(body.password, "$2a$10$invalidinvalidinvalidinvalidinva");
    return genericFail();
  }

  const ok = await bcrypt.compare(body.password, user.password);
  if (!ok) return genericFail();

  if (!user.emailVerified) {
    return error("Confirme seu e-mail antes de entrar.", 403, { code: "EMAIL_NOT_VERIFIED" });
  }

  const token = await signSessionToken({ sub: user.id, email: user.email, name: user.name });
  return json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});
