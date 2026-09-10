import type { NextConfig } from "next";

// A API roda em UTC na Vercel; fixamos o fuso para que qualquer formatacao de
// data no servidor seja consistente com o restante do sistema (Brasilia).
process.env.TZ = process.env.APP_TIMEZONE ?? "America/Sao_Paulo";

const nextConfig: NextConfig = {
  // Route handlers puros; nao precisamos do bundler de imagens etc.
  poweredByHeader: false,
  // Nao deixar o Next gerenciar/gerar o CLAUDE.md — ele e mantido a mao.
  agentRules: false,
};

export default nextConfig;
