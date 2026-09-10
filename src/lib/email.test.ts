import { describe, expect, it } from "vitest";
import { buildVerificationEmail, escapeHtml } from "./email";

describe("escapeHtml", () => {
  it("escapa caracteres perigosos", () => {
    expect(escapeHtml('<script>"x"&\'')).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;");
  });
});

describe("buildVerificationEmail", () => {
  const url = "https://ui.app/verificar?token=abc123";

  it("inclui o link tanto no texto quanto no html", () => {
    const mail = buildVerificationEmail({ name: "Alice", verifyUrl: url });
    expect(mail.text).toContain(url);
    expect(mail.html).toContain(url);
  });

  it("escapa o nome no corpo html (anti-injection)", () => {
    const mail = buildVerificationEmail({
      name: "<b>Bob</b>",
      verifyUrl: url,
    });
    expect(mail.html).not.toContain("<b>Bob</b>");
    expect(mail.html).toContain("&lt;b&gt;Bob&lt;/b&gt;");
  });

  it("tem assunto nao-vazio", () => {
    expect(buildVerificationEmail({ name: "X", verifyUrl: url }).subject.length).toBeGreaterThan(0);
  });
});
