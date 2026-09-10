import { HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import type { ItemStatusCounts } from "@/lib/serialize";
import { resolveWishlistAccess, type WishlistAccess } from "@/lib/wishlist-access";

const baseInclude = {
  owner: { select: { name: true } },
  collaborators: {
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  invites: {
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  _count: { select: { items: true } },
} as const;

/**
 * Carrega a lista (colaboradores/convites/contagem) e resolve o acesso do
 * usuario. Por padrao **nao** traz os itens — eles vem paginados por
 * `GET /wishlists/:id/items`. Passe `{ withItems: true }` só quando precisar
 * de todos (ex.: previa de convite, com `take` proprio no caller).
 */
export async function loadWishlistForUser(
  wishlistId: string,
  userId: string | null,
  opts: { withItems?: boolean } = {},
) {
  const wishlist = await prisma.wishlist.findUnique({
    where: { id: wishlistId },
    include: opts.withItems
      ? {
          ...baseInclude,
          items: { orderBy: { createdAt: "desc" as const }, include: { game: true } },
        }
      : baseInclude,
  });
  if (!wishlist) throw new HttpError("Lista nao encontrada", 404);

  const access: WishlistAccess = resolveWishlistAccess({
    ownerId: wishlist.ownerId,
    collaboratorIds: wishlist.collaborators.map((c) => c.userId),
    userId,
  });

  return { wishlist, access };
}

/** Contagem de itens por bucket de status (para os badges das abas). */
export async function loadWishlistCounts(
  wishlistId: string,
  q?: string | null,
): Promise<ItemStatusCounts> {
  const term = q?.trim();
  const titleFilter = term
    ? { title: { contains: term, mode: "insensitive" as const } }
    : {};

  const [onSale, unreleased, regular] = await Promise.all([
    prisma.wishlistItem.count({
      where: {
        wishlistId,
        game: { releaseStatus: "released", discountPercent: { gt: 0 }, ...titleFilter },
      },
    }),
    prisma.wishlistItem.count({
      where: { wishlistId, game: { releaseStatus: "unreleased", ...titleFilter } },
    }),
    prisma.wishlistItem.count({
      where: {
        wishlistId,
        game: { releaseStatus: "released", discountPercent: 0, ...titleFilter },
      },
    }),
  ]);

  return { onSale, unreleased, regular };
}

export function assertCanView(access: WishlistAccess) {
  if (!access.canView) throw new HttpError("Voce nao tem acesso a esta lista", 403);
}

export function assertOwner(access: WishlistAccess) {
  if (access.role !== "owner") throw new HttpError("Apenas o dono pode fazer isso", 403);
}
