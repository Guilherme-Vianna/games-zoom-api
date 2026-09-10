/** Leitura centralizada de variaveis de ambiente do servidor. */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const env = {
  get jwtSecret() {
    return required("API_JWT_SECRET");
  },
  get corsOrigin() {
    return process.env.CORS_ORIGIN ?? "*";
  },
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get emailTransport() {
    return (process.env.EMAIL_TRANSPORT ?? "console") as "console" | "sendpulse";
  },
  /** Segredo que a Vercel Cron reapresenta em `Authorization: Bearer`. */
  get cronSecret() {
    return required("CRON_SECRET");
  },
  get timezone() {
    return process.env.APP_TIMEZONE ?? "America/Sao_Paulo";
  },
  /** Ajustes do job `sync-games` (defaults sensatos para a escala atual). */
  get syncConcurrency() {
    return numberEnv("SYNC_CONCURRENCY", 5);
  },
  get syncBatchSize() {
    return numberEnv("SYNC_BATCH_SIZE", 200);
  },
  get maxGamesPerSync() {
    return numberEnv("MAX_GAMES_PER_SYNC", 1500);
  },
  /** Idade maxima do cache de um Game antes de valer a pena buscar na Steam de novo. */
  get gameCacheMaxAgeMs() {
    return numberEnv("GAME_CACHE_MAX_AGE_MS", 24 * 60 * 60 * 1000);
  },
  /** GG.deals (ofertas de chave). Sem a key, a feature fica inerte (retorna null). */
  get ggDealsApiKey() {
    return process.env.GGDEALS_API_KEY ?? "";
  },
  get ggDealsRegion() {
    return process.env.GGDEALS_REGION ?? "br";
  },
  get keysCacheMaxAgeMs() {
    return numberEnv("KEYS_CACHE_MAX_AGE_MS", 6 * 60 * 60 * 1000);
  },
  /** Intervalo minimo entre refreshes sob demanda do mesmo Game. */
  get refreshMinIntervalMs() {
    return numberEnv("REFRESH_MIN_INTERVAL_MS", 60 * 1000);
  },
  sendpulse: {
    get senderEmail() {
      return process.env.SENDPULSE_SENDER_EMAIL ?? "no-reply@localhost";
    },
    get senderName() {
      return process.env.SENDPULSE_SENDER_NAME ?? "Games Zoom";
    },
    get apiKey() {
      return process.env.SENDPULSE_API_KEY ?? "";
    },
    get clientId() {
      return process.env.SENDPULSE_CLIENT_ID ?? "";
    },
    get clientSecret() {
      return process.env.SENDPULSE_CLIENT_SECRET ?? "";
    },
  },
};
