import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(80),
  email: z.string().trim().toLowerCase().email("E-mail invalido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail invalido"),
  password: z.string().min(1, "Informe a senha"),
});

export const resendSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail invalido"),
});

export const createWishlistSchema = z.object({
  name: z.string().trim().min(1, "De um nome para a lista").max(80),
});

export const addItemSchema = z.object({
  // Pode ser um AppID puro ou o link da loja/comunidade Steam.
  input: z.string().trim().min(1, "Cole o link da Steam ou o AppID"),
});

export const createInviteSchema = z.object({
  expiry: z.enum(["1d", "7d", "30d", "never"]).default("7d"),
});

const pageQuery = {
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(24),
  q: z.string().trim().max(120).optional(),
};

/** Query de `GET /wishlists/:id/items` — aba de status + paginacao + ordenacao. */
export const itemsQuerySchema = z.object({
  ...pageQuery,
  status: z.enum(["onSale", "unreleased", "regular"]).optional(),
  sort: z
    .enum(["recent", "oldest", "price_asc", "price_desc", "discount", "title", "author"])
    .optional(),
});

/** Query de `GET /wishlists` — paginacao + busca por nome. */
export const wishlistsQuerySchema = z.object(pageQuery);

/** Body de `PUT /me/notification-settings`. */
export const notificationSettingsSchema = z.object({
  saleDigestEnabled: z.boolean(),
  deliveryHour: z.coerce.number().int().min(0).max(23),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateWishlistInput = z.infer<typeof createWishlistSchema>;
export type AddItemInput = z.infer<typeof addItemSchema>;
export type ItemsQuery = z.infer<typeof itemsQuerySchema>;
export type WishlistsQuery = z.infer<typeof wishlistsQuerySchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
