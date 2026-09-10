import { revalidateTag, unstable_cache } from "next/cache";
import { requireUser } from "@/lib/auth-context";
import { error, handle, HttpError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { buildPageMeta, parsePageParams } from "@/lib/pagination";
import { serializeItem } from "@/lib/serialize";
import { buildItemsOrderBy, buildItemsWhere } from "@/lib/items-query";
import { MAX_ADD_ENTRIES, parseAddItemsInput, type AddEntry } from "@/lib/add-items-input";
import { findOrCreateGameForAppId } from "@/lib/game-repo";
import { fetchSteamAppIdByName } from "@/lib/steam";
import { addItemSchema, itemsQuerySchema } from "@/lib/validations";
import { assertCanView, loadWishlistCounts, loadWishlistForUser } from "@/lib/wishlist-repo";

type SkipReason = "duplicate" | "not_found" | "steam_error";

/**
 * GET /api/wishlists/:id/items — itens paginados, filtrados por aba de status,
 * busca textual e ordenacao (tudo no banco). Resposta com `counts` por bucket
 * para os badges das abas.
 */
export const GET = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const { access } = await loadWishlistForUser(id, user.id);
  assertCanView(access);

  const url = new URL(req.url);
  const query = itemsQuerySchema.parse(Object.fromEntries(url.searchParams));
  const { page, pageSize, skip, take } = parsePageParams(query);

  const cacheKey = ["wishlist-items", id, JSON.stringify(query)];
  const load = unstable_cache(
    async () => {
      const where = buildItemsWhere({ wishlistId: id, status: query.status, q: query.q });
      const [rows, total, counts] = await Promise.all([
        prisma.wishlistItem.findMany({
          where,
          orderBy: buildItemsOrderBy(query.sort),
          skip,
          take,
          include: { game: true },
        }),
        prisma.wishlistItem.count({ where }),
        loadWishlistCounts(id, query.q),
      ]);
      return { rows, total, counts };
    },
    cacheKey,
    { tags: [`wishlist:${id}`, "wishlist-items"], revalidate: 300 },
  );

  const { rows, total, counts } = await load();

  return json({
    items: rows.map(serializeItem),
    ...buildPageMeta(total, page, pageSize),
    counts,
  });
});

/** Resolve uma entrada (AppID direto ou nome) no Game (cache compartilhado). */
async function resolveEntry(
  entry: AddEntry,
): Promise<{ gameId: string; steamAppId: number } | { reason: SkipReason }> {
  let appId: number | null;
  try {
    appId = entry.kind === "appId" ? entry.appId : await fetchSteamAppIdByName(entry.term);
  } catch (err) {
    console.error("[steam] busca por nome falhou", err);
    return { reason: "steam_error" };
  }
  if (!appId) return { reason: "not_found" };

  try {
    const game = await findOrCreateGameForAppId(appId);
    if (!game) return { reason: "not_found" };
    return { gameId: game.id, steamAppId: game.steamAppId };
  } catch (err) {
    console.error("[steam] fetch appdetails falhou", err);
    return { reason: "steam_error" };
  }
}

/**
 * POST /api/wishlists/:id/items — adiciona um ou varios jogos.
 * `input` pode ser um link/AppID da Steam OU nomes separados por virgula /
 * quebra de linha (resolvidos por busca na loja da Steam).
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

  const addedIds: string[] = [];
  const skipped: { term: string; reason: SkipReason }[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const result = resolved[i];

    if ("reason" in result) {
      skipped.push({ term: entry.raw, reason: result.reason });
      continue;
    }
    if (known.has(result.steamAppId)) {
      skipped.push({ term: entry.raw, reason: "duplicate" });
      continue;
    }
    known.add(result.steamAppId);

    const item = await prisma.wishlistItem.create({
      data: {
        wishlistId: id,
        steamAppId: result.steamAppId,
        gameId: result.gameId,
        addedById: user.id,
        addedByName: user.name,
      },
    });
    addedIds.push(item.id);
  }

  if (addedIds.length === 0) {
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

  const added = await prisma.wishlistItem.findMany({
    where: { id: { in: addedIds } },
    include: { game: true },
    orderBy: { createdAt: "desc" },
  });

  revalidateTag(`wishlist:${id}`, "max");
  revalidateTag("wishlist-items", "max");

  return json({ added: added.map(serializeItem), skipped }, { status: 201 });
});
