import { requireUser } from "@/lib/auth-context";
import { error, handle, HttpError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeItem } from "@/lib/serialize";
import { fetchSteamAppDetails, parseSteamAppId } from "@/lib/steam";
import { addItemSchema } from "@/lib/validations";
import { loadWishlistForUser } from "@/lib/wishlist-repo";

/** POST /api/wishlists/:id/items — adiciona um jogo pelo link/AppID da Steam. */
export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const { input } = addItemSchema.parse(await req.json());

  const { access } = await loadWishlistForUser(id, user.id);
  if (!access.canAddItems) {
    throw new HttpError("Voce precisa entrar na lista para adicionar jogos", 403);
  }

  const appId = parseSteamAppId(input);
  if (!appId) {
    return error("Nao consegui identificar o jogo. Cole o link da loja Steam ou o AppID.", 422);
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: { wishlistId_steamAppId: { wishlistId: id, steamAppId: appId } },
  });
  if (existing) return error("Esse jogo ja esta na lista.", 409);

  let game;
  try {
    game = await fetchSteamAppDetails(appId);
  } catch (err) {
    console.error("[steam] fetch falhou", err);
    return error("A Steam nao respondeu agora. Tente de novo em instantes.", 502);
  }
  if (!game) return error("Jogo nao encontrado na Steam (AppID invalido?).", 404);

  const item = await prisma.wishlistItem.create({
    data: {
      wishlistId: id,
      steamAppId: game.steamAppId,
      title: game.title,
      imageUrl: game.imageUrl,
      storeUrl: game.storeUrl,
      isFree: game.isFree,
      priceOverview: game.priceOverview ?? undefined,
      addedById: user.id,
      addedByName: user.name,
    },
  });

  await prisma.wishlist.update({ where: { id }, data: { updatedAt: new Date() } });

  return json({ item: serializeItem(item) }, { status: 201 });
});
