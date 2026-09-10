/**
 * Monta `where` e `orderBy` do Prisma para listar itens de uma wishlist com
 * filtro por status (aba), busca textual e ordenacao — tudo no banco (a lista
 * pode ser grande, entao nao da pra filtrar em memoria). Puro e testavel:
 * retorna objetos simples que o route repassa ao Prisma.
 */

export type ItemStatus = "onSale" | "unreleased" | "regular";

export const ITEM_STATUSES: readonly ItemStatus[] = ["onSale", "unreleased", "regular"];

export type ItemSort =
  | "recent"
  | "oldest"
  | "price_asc"
  | "price_desc"
  | "discount"
  | "title"
  | "author";

const DEFAULT_SORT: ItemSort = "recent";

type GameWhere = Record<string, unknown>;

/** Sub-`where` do relacionamento `game` para um bucket de status. */
export function statusGameWhere(status: ItemStatus): GameWhere {
  switch (status) {
    case "onSale":
      return { releaseStatus: "released", discountPercent: { gt: 0 } };
    case "unreleased":
      return { releaseStatus: "unreleased" };
    case "regular":
      return { releaseStatus: "released", discountPercent: 0 };
  }
}

export function buildItemsWhere(params: {
  wishlistId: string;
  status?: ItemStatus | null;
  q?: string | null;
}): Record<string, unknown> {
  const { wishlistId, status, q } = params;
  const game: GameWhere = {};

  if (status) Object.assign(game, statusGameWhere(status));

  const term = q?.trim();
  if (term) game.title = { contains: term, mode: "insensitive" };

  const where: Record<string, unknown> = { wishlistId };
  if (Object.keys(game).length > 0) where.game = game;
  return where;
}

export function parseItemSort(value: unknown): ItemSort {
  const allowed: ItemSort[] = [
    "recent",
    "oldest",
    "price_asc",
    "price_desc",
    "discount",
    "title",
    "author",
  ];
  return allowed.includes(value as ItemSort) ? (value as ItemSort) : DEFAULT_SORT;
}

export function buildItemsOrderBy(
  sort: unknown,
): Record<string, unknown> | Record<string, unknown>[] {
  switch (parseItemSort(sort)) {
    case "oldest":
      return { createdAt: "asc" };
    case "price_asc":
      return [{ game: { priceFinal: "asc" } }, { createdAt: "desc" }];
    case "price_desc":
      return [{ game: { priceFinal: "desc" } }, { createdAt: "desc" }];
    case "discount":
      return [{ game: { discountPercent: "desc" } }, { createdAt: "desc" }];
    case "title":
      return { game: { title: "asc" } };
    case "author":
      return [{ addedByName: "asc" }, { createdAt: "desc" }];
    case "recent":
    default:
      return { createdAt: "desc" };
  }
}
