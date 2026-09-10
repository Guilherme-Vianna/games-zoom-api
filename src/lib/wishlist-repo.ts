import { HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resolveWishlistAccess, type WishlistAccess } from "@/lib/wishlist-access";

const fullInclude = {
  owner: { select: { name: true } },
  collaborators: {
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  invites: {
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  items: { orderBy: { createdAt: "desc" as const } },
} as const;

/** Carrega a lista com itens/colaboradores/convites e resolve o acesso do usuario. */
export async function loadWishlistForUser(wishlistId: string, userId: string | null) {
  const wishlist = await prisma.wishlist.findUnique({
    where: { id: wishlistId },
    include: fullInclude,
  });
  if (!wishlist) throw new HttpError("Lista nao encontrada", 404);

  const access: WishlistAccess = resolveWishlistAccess({
    ownerId: wishlist.ownerId,
    collaboratorIds: wishlist.collaborators.map((c) => c.userId),
    userId,
  });

  return { wishlist, access };
}

export function assertCanView(access: WishlistAccess) {
  if (!access.canView) throw new HttpError("Voce nao tem acesso a esta lista", 403);
}

export function assertOwner(access: WishlistAccess) {
  if (access.role !== "owner") throw new HttpError("Apenas o dono pode fazer isso", 403);
}
