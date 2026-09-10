import { requireUser } from "@/lib/auth-context";
import { handle, HttpError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { loadWishlistForUser } from "@/lib/wishlist-repo";

/**
 * DELETE /api/wishlists/:id/collaborators/:userId
 *  - dono remove qualquer colaborador
 *  - colaborador remove a si mesmo (sair da lista). `:userId` pode ser "me".
 */
export const DELETE = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { id, userId: rawTarget } = await ctx.params;
  const targetId = rawTarget === "me" ? user.id : rawTarget;

  const { wishlist, access } = await loadWishlistForUser(id, user.id);
  if (!access.canView) throw new HttpError("Sem acesso a esta lista", 403);

  const isOwner = access.role === "owner";
  const removingSelf = targetId === user.id;
  if (!isOwner && !removingSelf) {
    throw new HttpError("Voce so pode remover a si mesmo desta lista", 403);
  }
  if (targetId === wishlist.ownerId) {
    throw new HttpError("O dono nao pode ser removido da propria lista", 400);
  }

  const link = wishlist.collaborators.find((c) => c.userId === targetId);
  if (!link) throw new HttpError("Essa pessoa nao esta na lista", 404);

  await prisma.wishlistCollaborator.delete({ where: { id: link.id } });
  return json({ ok: true, removedSelf: removingSelf });
});
