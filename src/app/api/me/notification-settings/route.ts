import { requireUser } from "@/lib/auth-context";
import { handle, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeNotificationSettings } from "@/lib/serialize";
import { notificationSettingsSchema } from "@/lib/validations";

const DEFAULTS = { saleDigestEnabled: false, deliveryHour: 9 };

/** GET /api/me/notification-settings — preferencias do usuario (defaults se nunca salvou). */
export const GET = handle(async (req) => {
  const user = await requireUser(req);
  const row = await prisma.userNotificationSettings.findUnique({
    where: { userId: user.id },
  });
  return json({ settings: serializeNotificationSettings(row ?? DEFAULTS) });
});

/** PUT /api/me/notification-settings — ativa/desativa o digest e escolhe a hora. */
export const PUT = handle(async (req) => {
  const user = await requireUser(req);
  const data = notificationSettingsSchema.parse(await req.json());

  const row = await prisma.userNotificationSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  return json({ settings: serializeNotificationSettings(row) });
});
