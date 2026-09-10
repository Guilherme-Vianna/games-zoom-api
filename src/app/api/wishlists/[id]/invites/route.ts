import { requireUser } from "@/lib/auth-context";
import { handle, HttpError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeInvite } from "@/lib/serialize";
import { expiresAtFromPreset, generateToken } from "@/lib/tokens";
import { createInviteSchema } from "@/lib/validations";
import { assertOwner, loadWishlistForUser } from "@/lib/wishlist-repo";

const MAX_ACTIVE_INVITES = 20;

/** GET /api/wishlists/:id/invites — lista os convites (dono). */
export const GET = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const { wishlist, access } = await loadWishlistForUser(id, user.id);
  assertOwner(access);

  return json({ invites: wishlist.invites.map(serializeInvite) });
});

/** POST /api/wishlists/:id/invites — gera um novo link (dono). Body: { expiry }. */
export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const { expiry } = createInviteSchema.parse(await req.json().catch(() => ({})));

  const { wishlist, access } = await loadWishlistForUser(id, user.id);
  assertOwner(access);

  const activeCount = wishlist.invites.filter((i) => !i.revokedAt).length;
  if (activeCount >= MAX_ACTIVE_INVITES) {
    throw new HttpError("Muitos links ativos. Revogue algum antes de gerar outro.", 409);
  }

  const invite = await prisma.wishlistInvite.create({
    data: {
      wishlistId: id,
      token: generateToken(),
      createdById: user.id,
      expiresAt: expiresAtFromPreset(expiry),
    },
    include: { createdBy: { select: { name: true } } },
  });

  return json({ invite: serializeInvite(invite) }, { status: 201 });
});
