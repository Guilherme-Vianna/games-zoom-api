import { requireUser } from "@/lib/auth-context";
import { handle, HttpError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertOwner, loadWishlistForUser } from "@/lib/wishlist-repo";

/** DELETE /api/wishlists/:id/invites/:inviteId — revoga um link (dono). */
export const DELETE = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { id, inviteId } = await ctx.params;

  const { wishlist, access } = await loadWishlistForUser(id, user.id);
  assertOwner(access);

  const invite = wishlist.invites.find((i) => i.id === inviteId);
  if (!invite) throw new HttpError("Link nao encontrado", 404);
  if (invite.revokedAt) return json({ ok: true, alreadyRevoked: true });

  await prisma.wishlistInvite.update({
    where: { id: inviteId },
    data: { revokedAt: new Date() },
  });
  return json({ ok: true });
});
