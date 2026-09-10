/**
 * Contrato de um provedor de precos de chave. Hoje so temos o GG.deals
 * (agregador), mas a interface deixa espaco para somar/trocar provedores
 * (feed de afiliado, scraper especifico, tier premium) sem mexer no resto.
 */
export type KeyPrices = {
  /** Menor preco em loja oficial (centavos). */
  retailCents: number | null;
  /** Menor preco em keyshop / revendedor (centavos). */
  keyshopCents: number | null;
  historicalRetailCents: number | null;
  historicalKeyshopCents: number | null;
  currency: string | null;
  /** Pagina do agregador com todas as lojas. */
  dealsUrl: string | null;
};

export interface KeyPriceProvider {
  readonly name: string;
  /**
   * Precos por Steam AppID. A chave do Map e o AppID; valor `null` = jogo sem
   * dados no provedor. Deve lidar internamente com o teto de itens por request.
   */
  fetchPrices(
    steamAppIds: number[],
    region: string,
  ): Promise<Map<number, KeyPrices | null>>;
}
