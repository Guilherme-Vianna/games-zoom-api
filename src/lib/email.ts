import { env } from "@/lib/env";

export type EmailMessage = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
};

/** Monta o e-mail de confirmacao de conta. Puro — testavel sem rede. */
export function buildVerificationEmail(params: {
  name: string;
  verifyUrl: string;
}): Omit<EmailMessage, "to" | "toName"> {
  const { name, verifyUrl } = params;
  const subject = "Confirme seu e-mail — Games Zoom";
  const text = [
    `Ola, ${name}!`,
    "",
    "Confirme seu e-mail para ativar sua conta no Games Zoom:",
    verifyUrl,
    "",
    "Se voce nao criou esta conta, ignore este e-mail.",
  ].join("\n");
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto">
    <h2 style="color:#1d3b86">Games Zoom</h2>
    <p>Ola, <strong>${escapeHtml(name)}</strong>!</p>
    <p>Confirme seu e-mail para ativar sua conta:</p>
    <p style="margin:24px 0">
      <a href="${escapeHtml(verifyUrl)}"
         style="background:#1d3b86;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">
        Confirmar e-mail
      </a>
    </p>
    <p style="color:#666;font-size:13px">Ou copie e cole este link no navegador:<br>${escapeHtml(verifyUrl)}</p>
    <p style="color:#666;font-size:13px">Se voce nao criou esta conta, ignore este e-mail.</p>
  </div>`;
  return { subject, html, text };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Dispara o e-mail pelo transporte configurado. */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (env.emailTransport === "console") {
    console.info("[email:console]", {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return;
  }
  await sendViaSendPulse(message);
}

async function sendPulseAccessToken(): Promise<string> {
  const { apiKey, clientId, clientSecret } = env.sendpulse;
  // Opcao A: chave unica da SMTP API usada diretamente como Bearer.
  if (apiKey) return apiKey;

  // Opcao B: OAuth client_credentials.
  const res = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`SendPulse OAuth falhou (${res.status})`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("SendPulse OAuth sem access_token");
  return data.access_token;
}

async function sendViaSendPulse(message: EmailMessage): Promise<void> {
  const token = await sendPulseAccessToken();
  const res = await fetch("https://api.sendpulse.com/smtp/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: {
        subject: message.subject,
        html: Buffer.from(message.html).toString("base64"),
        text: message.text,
        from: { name: env.sendpulse.senderName, email: env.sendpulse.senderEmail },
        to: [{ name: message.toName ?? message.to, email: message.to }],
      },
    }),
  });
  const raw = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`SendPulse /smtp/emails ${res.status}: ${raw}`);
  }
  // A API responde 200 mesmo em alguns erros logicos — checar `result`.
  let parsed: { result?: boolean } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* resposta nao-JSON: aceitamos o 200 */
  }
  if (parsed.result === false) {
    throw new Error(`SendPulse recusou o envio: ${raw}`);
  }
}
