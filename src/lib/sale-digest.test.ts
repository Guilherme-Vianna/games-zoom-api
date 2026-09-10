import { describe, expect, it } from "vitest";
import {
  buildSaleDigestEmail,
  countDigestGames,
  formatCentsBRL,
  type DigestGroup,
} from "./sale-digest";

const groups: DigestGroup[] = [
  {
    listName: "Coop com a galera",
    games: [
      {
        title: "Hollow Knight",
        priceFormatted: "R$ 13,99",
        discountPercent: 50,
        storeUrl: "https://store.steampowered.com/app/367520/",
      },
    ],
  },
  {
    listName: "Solo",
    games: [
      {
        title: "Celeste",
        priceFormatted: "R$ 18,99",
        discountPercent: 60,
        storeUrl: "https://store.steampowered.com/app/504230/",
      },
    ],
  },
];

describe("formatCentsBRL", () => {
  it("formata centavos", () => {
    expect(formatCentsBRL(1849)).toBe("R$ 18,49");
  });
  it("null -> vazio", () => {
    expect(formatCentsBRL(null)).toBe("");
  });
});

describe("countDigestGames", () => {
  it("soma todos os grupos", () => {
    expect(countDigestGames(groups)).toBe(2);
  });
});

describe("buildSaleDigestEmail", () => {
  it("assunto cita a contagem", () => {
    const email = buildSaleDigestEmail({ recipientName: "Bob", groups });
    expect(email.subject).toBe("2 jogos entraram em promocao — Games Zoom");
  });

  it("singular quando so um jogo", () => {
    const email = buildSaleDigestEmail({ recipientName: "Bob", groups: [groups[0]] });
    expect(email.subject).toBe("1 jogo entrou em promocao — Games Zoom");
  });

  it("inclui nome da lista e do jogo no html e no texto", () => {
    const email = buildSaleDigestEmail({ recipientName: "Bob", groups });
    expect(email.html).toContain("Coop com a galera");
    expect(email.html).toContain("Hollow Knight");
    expect(email.text).toContain("# Solo");
    expect(email.text).toContain("- Celeste — R$ 18,99 (-60%)");
  });

  it("escapa nome do usuario e do jogo", () => {
    const email = buildSaleDigestEmail({
      recipientName: "<script>",
      groups: [
        {
          listName: "L & M",
          games: [
            { title: "A<b>", priceFormatted: "R$ 1", discountPercent: 10, storeUrl: "x" },
          ],
        },
      ],
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("L &amp; M");
  });
});
