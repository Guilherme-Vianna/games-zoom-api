import { requireUser } from "@/lib/auth-context";
import { handle, HttpError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { canRemoveItem } from "@/lib/wishlist-access";
import { loadWishlistForUser } from "@/lib/wishlist-repo";

/** DELETE /api/wishlists/:id/items/:itemId — dono da lista ou autor do item. */
export const DELETE = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { id, itemId } = await ctx.params;

  const { wishlist, access } = await loadWishlistForUser(id, user.id);
  if (!access.canView) throw new HttpError("Sem acesso a esta lista", 403);

  const item = await prisma.wishlistItem.findFirst({
    where: { id: itemId, wishlistId: id },
    select: { id: true, addedById: true },
  });
  if (!item) throw new HttpError("Item nao encontrado", 404);

  if (!canRemoveItem({ ownerId: wishlist.ownerId, itemAuthorId: item.addedById, userId: user.id })) {
    throw new HttpError("Voce so pode remover jogos que voce adicionou", 403);
  }

  await prisma.wishlistItem.delete({ where: { id: itemId } });
  return json({ ok: true });
});
