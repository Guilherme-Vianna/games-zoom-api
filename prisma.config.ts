import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations precisam de conexao direta (nao-pooled): `migrate deploy` usa
    // advisory locks do Postgres, que nao funcionam atraves do pooler do Neon
    // ("P1002 / Timed out trying to acquire a postgres advisory lock").
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
