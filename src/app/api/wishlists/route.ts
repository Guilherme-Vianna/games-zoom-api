import { requireUser } from "@/lib/auth-context";
import { handle, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeWishlist } from "@/lib/serialize";
import { generateToken } from "@/lib/tokens";
import { createWishlistSchema } from "@/lib/validations";

/** GET /api/wishlists — listas que eu possuo + listas em que colaboro. */
export const GET = handle(async (req) => {
  const user = await requireUser(req);

  const wishlists = await prisma.wishlist.findMany({
    where: {
      OR: [{ ownerId: user.id }, { collaborators: { some: { userId: user.id } } }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      owner: { select: { name: true } },
      collaborators: { select: { userId: true, createdAt: true } },
      _count: { select: { items: true } },
    },
  });

  return json({ wishlists: wishlists.map((w) => serializeWishlist(w, user.id)) });
});

/** POST /api/wishlists — cria uma lista + um link de convite padrao (sem expiracao). */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const { name } = createWishlistSchema.parse(await req.json());

  const wishlist = await prisma.wishlist.create({
    data: {
      name,
      ownerId: user.id,
      invites: { create: { token: generateToken(), createdById: user.id } },
    },
    include: {
      owner: { select: { name: true } },
      collaborators: { select: { userId: true, createdAt: true } },
      invites: { include: { createdBy: { select: { name: true } } } },
      _count: { select: { items: true } },
    },
  });

  return json({ wishlist: serializeWishlist(wishlist, user.id) }, { status: 201 });
});
