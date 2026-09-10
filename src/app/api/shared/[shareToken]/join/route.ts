import { requireUser } from "@/lib/auth-context";
import { handle, HttpError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { inviteState } from "@/lib/tokens";

/** POST /api/shared/:shareToken/join — entra na lista como colaborador via convite. */
export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { shareToken } = await ctx.params;

  const invite = await prisma.wishlistInvite.findUnique({
    where: { token: shareToken },
    include: { wishlist: { select: { id: true, ownerId: true } } },
  });
  if (!invite || invite.revokedAt) throw new HttpError("Link invalido", 404);

  const state = inviteState(invite);
  if (state !== "active") {
    throw new HttpError("Este convite expirou. Peca um novo link ao dono da lista.", 410);
  }

  if (invite.wishlist.ownerId === user.id) {
    return json({ ok: true, wishlistId: invite.wishlist.id, role: "owner" });
  }

  const existing = await prisma.wishlistCollaborator.findUnique({
    where: { wishlistId_userId: { wishlistId: invite.wishlist.id, userId: user.id } },
  });

  if (!existing) {
    await prisma.$transaction([
      prisma.wishlistCollaborator.create({
        data: { wishlistId: invite.wishlist.id, userId: user.id },
      }),
      prisma.wishlistInvite.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } },
      }),
    ]);
  }

  return json({ ok: true, wishlistId: invite.wishlist.id, role: "collaborator" });
});
