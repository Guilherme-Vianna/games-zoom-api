// Roda `prisma migrate deploy` apenas quando ha URL de banco no ambiente.
// Em previews da Vercel sem DATABASE_URL/DIRECT_URL o build nao deve quebrar —
// so pula a migration (nenhum banco pra migrar).
import { execSync } from "node:child_process";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!url) {
  console.warn(
    "[migrate-deploy] Sem DIRECT_URL/DATABASE_URL no ambiente — pulando `prisma migrate deploy`.",
  );
  process.exit(0);
}

execSync("prisma migrate deploy", { stdio: "inherit" });
