import { describe, expect, it } from "vitest";
import { canRemoveItem, resolveWishlistAccess } from "./wishlist-access";

describe("resolveWishlistAccess", () => {
  const base = { ownerId: "owner", collaboratorIds: ["col1", "col2"] };

  it("dono tem acesso total", () => {
    expect(resolveWishlistAccess({ ...base, userId: "owner" })).toEqual({
      role: "owner",
      canView: true,
      canAddItems: true,
      canDeleteWishlist: true,
    });
  });

  it("colaborador ve e adiciona, mas nao apaga a lista", () => {
    const acc = resolveWishlistAccess({ ...base, userId: "col1" });
    expect(acc.role).toBe("collaborator");
    expect(acc.canAddItems).toBe(true);
    expect(acc.canDeleteWishlist).toBe(false);
  });

  it("usuario aleatorio nao tem acesso", () => {
    expect(resolveWishlistAccess({ ...base, userId: "estranho" }).canView).toBe(false);
  });

  it("visitante anonimo (userId null) nao tem acesso", () => {
    expect(resolveWishlistAccess({ ...base, userId: null }).role).toBe("none");
  });
});

describe("canRemoveItem", () => {
  it("dono da lista pode remover item de qualquer um", () => {
    expect(canRemoveItem({ ownerId: "o", itemAuthorId: "x", userId: "o" })).toBe(true);
  });
  it("autor do item pode remover o proprio item", () => {
    expect(canRemoveItem({ ownerId: "o", itemAuthorId: "x", userId: "x" })).toBe(true);
  });
  it("terceiro nao pode remover", () => {
    expect(canRemoveItem({ ownerId: "o", itemAuthorId: "x", userId: "y" })).toBe(false);
  });
});
