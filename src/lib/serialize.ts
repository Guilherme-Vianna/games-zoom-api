import type { SteamPriceOverview } from "@/lib/steam";
import { deriveGameStatus } from "@/lib/game-mapping";
import { inviteState } from "@/lib/tokens";

export type GameRow = {
  steamAppId: number;
  title: string;
  imageUrl: string | null;
  storeUrl: string;
  isFree: boolean;
  releaseStatus: "released" | "unreleased";
  priceInitial: number | null;
  priceFinal: number | null;
  discountPercent: number;
  onSale: boolean;
  currency: string;
  lastSyncedAt: Date | null;
};

type ItemRow = {
  id: string;
  steamAppId: number;
  addedById: string;
  addedByName: string;
  createdAt: Date;
  game: GameRow;
};

type InviteRow = {
  id: string;
  token: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  useCount: number;
  createdAt: Date;
  createdBy?: { name: string } | null;
};

export type ItemStatusCounts = { onSale: number; unreleased: number; regular: number };

type WishlistRow = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  owner?: { name: string } | null;
  items?: ItemRow[];
  collaborators?: {
    userId: string;
    createdAt: Date;
    user?: { name: string; email: string } | null;
  }[];
  invites?: InviteRow[];
  _count?: { items: number };
};

/**
 * Reconstroi o shape antigo de `priceOverview` a partir das colunas do Game,
 * para a UI (price.ts / GameCard) nao precisar mudar.
 */
function priceOverviewFromGame(game: GameRow): SteamPriceOverview | null {
  if (game.priceInitial == null || game.priceFinal == null) return null;
  const finalReais = (game.priceFinal / 100).toFixed(2).replace(".", ",");
  return {
    currency: game.currency,
    initial: game.priceInitial,
    final: game.priceFinal,
    discountPercent: game.discountPercent,
    finalFormatted: `R$ ${finalReais}`,
  };
}

export function serializeItem(item: ItemRow) {
  const game = item.game;
  return {
    id: item.id,
    steamAppId: game.steamAppId,
    title: game.title,
    imageUrl: game.imageUrl,
    storeUrl: game.storeUrl,
    isFree: game.isFree,
    priceOverview: priceOverviewFromGame(game),
    // Novos campos vindos do cache compartilhado:
    releaseStatus: game.releaseStatus,
    onSale: game.onSale,
    discountPercent: game.discountPercent,
    status: deriveGameStatus(game),
    lastSyncedAt: game.lastSyncedAt?.toISOString() ?? null,
    addedById: item.addedById,
    addedByName: item.addedByName,
    createdAt: item.createdAt.toISOString(),
  };
}

export function serializeInvite(invite: InviteRow) {
  return {
    id: invite.id,
    token: invite.token,
    state: inviteState(invite),
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    revokedAt: invite.revokedAt?.toISOString() ?? null,
    useCount: invite.useCount,
    createdByName: invite.createdBy?.name ?? null,
    createdAt: invite.createdAt.toISOString(),
  };
}

export function serializeWishlist(
  wishlist: WishlistRow,
  viewerId?: string,
  counts?: ItemStatusCounts,
) {
  return {
    id: wishlist.id,
    name: wishlist.name,
    ownerId: wishlist.ownerId,
    ownerName: wishlist.owner?.name ?? null,
    isOwner: viewerId ? viewerId === wishlist.ownerId : undefined,
    itemCount: wishlist._count?.items ?? wishlist.items?.length ?? 0,
    counts: counts ?? undefined,
    collaborators:
      wishlist.collaborators?.map((c) => ({
        userId: c.userId,
        name: c.user?.name ?? null,
        email: c.user?.email ?? null,
        joinedAt: c.createdAt.toISOString(),
      })) ?? [],
    invites: wishlist.invites?.map(serializeInvite) ?? [],
    items: wishlist.items?.map(serializeItem) ?? [],
    createdAt: wishlist.createdAt.toISOString(),
    updatedAt: wishlist.updatedAt.toISOString(),
  };
}

export function serializePageMeta(meta: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  return { ...meta };
}

export function serializeNotificationSettings(row: {
  saleDigestEnabled: boolean;
  deliveryHour: number;
}) {
  return {
    saleDigestEnabled: row.saleDigestEnabled,
    deliveryHour: row.deliveryHour,
  };
}
