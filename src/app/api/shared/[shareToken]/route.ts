import { handle, HttpError, json } from "@/lib/http";
import { verifySessionToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { serializeWishlist } from "@/lib/serialize";
import { inviteState } from "@/lib/tokens";
import { resolveWishlistAccess } from "@/lib/wishlist-access";

/**
 * GET /api/shared/:shareToken — previa de uma lista via link de convite.
 * Sem login funciona (previa publica). Com Bearer valido, informa se o usuario
 * ja e dono/colaborador. Link revogado -> 404; expirado -> 200 com state "expired".
 */
export const GET = handle(async (req, ctx) => {
  const { shareToken } = await ctx.params;

  const invite = await prisma.wishlistInvite.findUnique({
    where: { token: shareToken },
    include: {
      wishlist: {
        include: {
          owner: { select: { name: true } },
          collaborators: { select: { userId: true, createdAt: true } },
          // Previa: mostra ate 60 itens (a lista completa exige entrar).
          items: {
            orderBy: { createdAt: "desc" },
            take: 60,
            include: { game: true },
          },
        },
      },
    },
  });
  if (!invite || invite.revokedAt) throw new HttpError("Link invalido", 404);

  const state = inviteState(invite);

  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7) : null;
  const claims = token ? await verifySessionToken(token) : null;
  const viewerId = claims?.sub ?? null;

  const access = resolveWishlistAccess({
    ownerId: invite.wishlist.ownerId,
    collaboratorIds: invite.wishlist.collaborators.map((c) => c.userId),
    userId: viewerId,
  });

  return json({
    inviteState: state,
    alreadyMember: access.role !== "none",
    wishlist: serializeWishlist(
      { ...invite.wishlist, invites: [] },
      viewerId ?? undefined,
    ),
  });
});
