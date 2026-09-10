/**
 * Monta o e-mail de "resumo de promocoes" (digest). Puro — testavel sem rede.
 * Escapa todo texto vindo da Steam / do usuario.
 */
import { escapeHtml, type EmailMessage } from "@/lib/email";

export type DigestGame = {
  title: string;
  priceFormatted: string;
  discountPercent: number;
  storeUrl: string;
};

export type DigestGroup = {
  listName: string;
  games: DigestGame[];
};

export type SaleDigestInput = {
  recipientName: string;
  groups: DigestGroup[];
};

function formatCentsBRL(cents: number | null): string {
  if (cents == null) return "";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export { formatCentsBRL };

/** Conta quantos jogos ha no total (todos os grupos). */
export function countDigestGames(groups: DigestGroup[]): number {
  return groups.reduce((sum, g) => sum + g.games.length, 0);
}

export function buildSaleDigestEmail(
  input: SaleDigestInput,
): Omit<EmailMessage, "to" | "toName"> {
  const total = countDigestGames(input.groups);
  const noun = total === 1 ? "jogo entrou" : "jogos entraram";
  const subject = `${total} ${noun} em promocao — Games Zoom`;

  const textLines = [`Ola, ${input.recipientName}!`, "", `${total} ${noun} em promocao:`, ""];
  for (const group of input.groups) {
    textLines.push(`# ${group.listName}`);
    for (const game of group.games) {
      textLines.push(`- ${game.title} — ${game.priceFormatted} (-${game.discountPercent}%)`);
      textLines.push(`  ${game.storeUrl}`);
    }
    textLines.push("");
  }
  textLines.push("Voce recebe este resumo porque ativou as notificacoes de promocao.");

  const groupsHtml = input.groups
    .map((group) => {
      const rows = group.games
        .map(
          (game) => `
        <li style="margin:8px 0">
          <a href="${escapeHtml(game.storeUrl)}" style="color:#1d3b86;font-weight:600;text-decoration:none">
            ${escapeHtml(game.title)}
          </a>
          — ${escapeHtml(game.priceFormatted)}
          <span style="color:#0a7d33">(-${game.discountPercent}%)</span>
        </li>`,
        )
        .join("");
      return `
      <h3 style="margin:20px 0 4px">${escapeHtml(group.listName)}</h3>
      <ul style="padding-left:18px;margin:0">${rows}</ul>`;
    })
    .join("");

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto">
    <h2 style="color:#1d3b86">Games Zoom</h2>
    <p>Ola, <strong>${escapeHtml(input.recipientName)}</strong>!</p>
    <p>${total} ${noun} em promocao nas suas listas:</p>
    ${groupsHtml}
    <p style="color:#666;font-size:13px;margin-top:24px">
      Voce recebe este resumo porque ativou as notificacoes de promocao nas configuracoes.
    </p>
  </div>`;

  return { subject, html, text: textLines.join("\n") };
}
