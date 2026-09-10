import { requireUser } from "@/lib/auth-context";
import { handle, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { buildPageMeta, parsePageParams } from "@/lib/pagination";
import { serializeWishlist } from "@/lib/serialize";
import { generateToken } from "@/lib/tokens";
import { createWishlistSchema, wishlistsQuerySchema } from "@/lib/validations";

/** GET /api/wishlists — listas que eu possuo + em que colaboro, paginadas. */
export const GET = handle(async (req) => {
  const user = await requireUser(req);

  const url = new URL(req.url);
  const query = wishlistsQuerySchema.parse(Object.fromEntries(url.searchParams));
  const { page, pageSize, skip, take } = parsePageParams(query);

  const term = query.q?.trim();
  const where = {
    OR: [{ ownerId: user.id }, { collaborators: { some: { userId: user.id } } }],
    ...(term ? { name: { contains: term, mode: "insensitive" as const } } : {}),
  };

  const [wishlists, total] = await Promise.all([
    prisma.wishlist.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      include: {
        owner: { select: { name: true } },
        collaborators: { select: { userId: true, createdAt: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.wishlist.count({ where }),
  ]);

  return json({
    wishlists: wishlists.map((w) => serializeWishlist(w, user.id)),
    ...buildPageMeta(total, page, pageSize),
  });
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
