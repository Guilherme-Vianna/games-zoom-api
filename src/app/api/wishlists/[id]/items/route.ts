import { requireUser } from "@/lib/auth-context";
import { error, handle, HttpError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeItem } from "@/lib/serialize";
import { MAX_ADD_ENTRIES, parseAddItemsInput, type AddEntry } from "@/lib/add-items-input";
import { fetchSteamAppDetails, fetchSteamAppIdByName, type SteamGame } from "@/lib/steam";
import { addItemSchema } from "@/lib/validations";
import { loadWishlistForUser } from "@/lib/wishlist-repo";

type SkipReason = "duplicate" | "not_found" | "steam_error";

/** Resolve uma entrada (AppID direto ou nome) no jogo da Steam. */
async function resolveEntry(
  entry: AddEntry,
): Promise<{ game: SteamGame } | { reason: SkipReason }> {
  let appId: number | null;
  try {
    appId = entry.kind === "appId" ? entry.appId : await fetchSteamAppIdByName(entry.term);
  } catch (err) {
    console.error("[steam] busca por nome falhou", err);
    return { reason: "steam_error" };
  }
  if (!appId) return { reason: "not_found" };

  let game: SteamGame | null;
  try {
    game = await fetchSteamAppDetails(appId);
  } catch (err) {
    console.error("[steam] fetch appdetails falhou", err);
    return { reason: "steam_error" };
  }
  if (!game) return { reason: "not_found" };
  return { game };
}

/**
 * POST /api/wishlists/:id/items — adiciona um ou varios jogos.
 * `input` pode ser um link/AppID da Steam OU nomes de jogos separados por
 * virgula / quebra de linha (resolvidos por busca na loja da Steam).
 */
export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const { input } = addItemSchema.parse(await req.json());

  const { access } = await loadWishlistForUser(id, user.id);
  if (!access.canAddItems) {
    throw new HttpError("Voce precisa entrar na lista para adicionar jogos", 403);
  }

  const entries = parseAddItemsInput(input);
  if (entries.length === 0) {
    return error("Cole o link da Steam, um AppID ou nomes de jogos separados por virgula.", 422);
  }
  if (entries.length > MAX_ADD_ENTRIES) {
    return error(`Adicione no maximo ${MAX_ADD_ENTRIES} jogos por vez.`, 422);
  }

  const already = await prisma.wishlistItem.findMany({
    where: { wishlistId: id },
    select: { steamAppId: true },
  });
  const known = new Set<number>(already.map((r) => r.steamAppId));

  const resolved = await Promise.all(entries.map(resolveEntry));

  const added: ReturnType<typeof serializeItem>[] = [];
  const skipped: { term: string; reason: SkipReason }[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const result = resolved[i];

    if ("reason" in result) {
      skipped.push({ term: entry.raw, reason: result.reason });
      continue;
    }

    const game = result.game;
    if (known.has(game.steamAppId)) {
      skipped.push({ term: entry.raw, reason: "duplicate" });
      continue;
    }
    known.add(game.steamAppId);

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
    added.push(serializeItem(item));
  }

  if (added.length === 0) {
    if (skipped.every((s) => s.reason === "duplicate")) {
      return error("Esse jogo ja esta na lista.", 409, { skipped });
    }
    if (skipped.some((s) => s.reason === "steam_error")) {
      return error("A Steam nao respondeu agora. Tente de novo em instantes.", 502, { skipped });
    }
    return error("Nenhum jogo encontrado. Confira os nomes ou cole o link da Steam.", 404, {
      skipped,
    });
  }

  await prisma.wishlist.update({ where: { id }, data: { updatedAt: new Date() } });

  return json({ added, skipped }, { status: 201 });
});
