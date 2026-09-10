import { requireUser } from "@/lib/auth-context";
import { handle, HttpError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeWishlist } from "@/lib/serialize";
import { assertCanView, loadWishlistForUser } from "@/lib/wishlist-repo";

/** GET /api/wishlists/:id — detalhe com itens, colaboradores e (so p/ dono) convites. */
export const GET = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const { wishlist, access } = await loadWishlistForUser(id, user.id);
  assertCanView(access);

  // Convites so aparecem para o dono.
  if (access.role !== "owner") wishlist.invites = [];

  return json({
    wishlist: serializeWishlist(wishlist, user.id),
    access,
  });
});

/** DELETE /api/wishlists/:id — apenas o dono. */
export const DELETE = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const { access } = await loadWishlistForUser(id, user.id);

  if (!access.canDeleteWishlist) {
    throw new HttpError("Apenas o dono pode apagar a lista", 403);
  }

  await prisma.wishlist.delete({ where: { id } });
  return json({ ok: true });
});
