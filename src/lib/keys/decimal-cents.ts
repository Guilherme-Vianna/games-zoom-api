/**
 * Converte um preco decimal em string (ex. da API do GG.deals: "24.30", "5",
 * "1234.5") para centavos inteiros. Retorna `null` para vazio/nulo/lixo.
 */
export function decimalStringToCents(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const s = typeof value === "number" ? String(value) : value.trim();
  if (!s) return null;
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Formata centavos como "R$ 24,30" (fallback quando a loja nao manda formatado). */
export function formatCentsBRL(cents: number | null | undefined): string | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}
