import type { SteamPriceOverview } from "@/lib/steam";
import { inviteState } from "@/lib/tokens";

type ItemRow = {
  id: string;
  steamAppId: number;
  title: string;
  imageUrl: string | null;
  storeUrl: string;
  isFree: boolean;
  priceOverview: unknown;
  addedById: string;
  addedByName: string;
  createdAt: Date;
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

export function serializeItem(item: ItemRow) {
  return {
    id: item.id,
    steamAppId: item.steamAppId,
    title: item.title,
    imageUrl: item.imageUrl,
    storeUrl: item.storeUrl,
    isFree: item.isFree,
    priceOverview: (item.priceOverview as SteamPriceOverview | null) ?? null,
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

export function serializeWishlist(wishlist: WishlistRow, viewerId?: string) {
  return {
    id: wishlist.id,
    name: wishlist.name,
    ownerId: wishlist.ownerId,
    ownerName: wishlist.owner?.name ?? null,
    isOwner: viewerId ? viewerId === wishlist.ownerId : undefined,
    itemCount: wishlist._count?.items ?? wishlist.items?.length ?? 0,
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
