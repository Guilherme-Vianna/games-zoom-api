/** Leitura centralizada de variaveis de ambiente do servidor. */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
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
