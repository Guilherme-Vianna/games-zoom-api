export type AccessRole = "owner" | "collaborator" | "none";

export type WishlistAccess = {
  role: AccessRole;
  canView: boolean;
  canAddItems: boolean;
  canDeleteWishlist: boolean;
};

/**
 * Regras de acesso a uma lista. Puro — recebe os ids ja carregados.
 *  - dono: ve tudo, adiciona itens, apaga a lista
 *  - colaborador (entrou pelo link): ve e adiciona itens, NAO apaga a lista
 *  - ninguem: sem acesso
 */
export function resolveWishlistAccess(params: {
  ownerId: string;
  collaboratorIds: readonly string[];
  userId: string | null;
}): WishlistAccess {
  const { ownerId, collaboratorIds, userId } = params;

  if (userId && userId === ownerId) {
    return { role: "owner", canView: true, canAddItems: true, canDeleteWishlist: true };
  }
  if (userId && collaboratorIds.includes(userId)) {
    return {
      role: "collaborator",
      canView: true,
      canAddItems: true,
      canDeleteWishlist: false,
    };
  }
  return { role: "none", canView: false, canAddItems: false, canDeleteWishlist: false };
}

/** Quem pode remover um item: o dono da lista ou quem adicionou o item. */
export function canRemoveItem(params: {
  ownerId: string;
  itemAuthorId: string;
  userId: string;
}): boolean {
  return params.userId === params.ownerId || params.userId === params.itemAuthorId;
}
