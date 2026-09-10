// Roda `prisma migrate deploy` quando ha URL de banco no ambiente.
//
// - Preview da Vercel sem banco: pula (build nao deve quebrar).
// - Producao (VERCEL_ENV=production) sem banco: FALHA o build — deployar o codigo
//   novo contra um schema velho gera 500 em runtime (pior que falhar o build).
//   Se cair aqui: garanta DATABASE_URL e DIRECT_URL nas Environment Variables do
//   projeto (Production), disponiveis para o build.
import { execSync } from "node:child_process";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!url) {
  const msg =
    "[migrate-deploy] Sem DIRECT_URL/DATABASE_URL no ambiente — `prisma migrate deploy` nao pode rodar.";
  if (process.env.VERCEL_ENV === "production") {
    console.error(msg + " Abortando o build de producao.");
    process.exit(1);
  }
  console.warn(msg + " Pulando (preview/local sem banco).");
  process.exit(0);
}

execSync("prisma migrate deploy", { stdio: "inherit" });
