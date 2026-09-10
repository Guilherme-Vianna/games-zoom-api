import { buildSaleDigestEmail } from "@/lib/sale-digest";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import {
  currentHourInTz,
  saleDigestCutoff,
  saleEventTtlCutoff,
} from "@/lib/notification-window";
import { buildUserDigest, type PendingSaleEvent } from "@/lib/notify-sales";
import { prisma } from "@/lib/prisma";

export type NotifyReport = {
  hour: number;
  users: number;
  emailsSent: number;
  emailsFailed: number;
  eventsClosed: number;
};

/**
 * Job horario: envia o digest de promocoes para quem optou por recebe-lo nesta
 * hora (fuso America/Sao_Paulo). So notifica se ha jogo novo em promocao numa
 * lista do usuario. Idempotente via ledger `GameSaleNotification`.
 */
export async function runNotifySales(
  deps: { now?: Date } = {},
): Promise<NotifyReport> {
  const now = deps.now ?? new Date();
  const hour = currentHourInTz(now, env.timezone);

  await prisma.jobRun.upsert({
    where: { jobName: "notify-sales" },
    create: { jobName: "notify-sales", lastStartedAt: now, lastStatus: "running" },
    update: { lastStartedAt: now, lastStatus: "running" },
  });

  const recipients = await prisma.userNotificationSettings.findMany({
    where: { saleDigestEnabled: true, deliveryHour: hour },
    include: { user: { select: { id: true, name: true, email: true, emailVerified: true } } },
  });

  const cutoff = saleDigestCutoff(now);
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const rec of recipients) {
    if (!rec.user.emailVerified) continue;
    const userId = rec.user.id;

    const events = await prisma.gameSaleEvent.findMany({
      where: {
        notifiedAt: null,
        detectedAt: { gte: cutoff },
        notifications: { none: { userId } },
        game: {
          items: {
            some: {
              wishlist: {
                OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
              },
            },
          },
        },
      },
      include: {
        game: {
          include: {
            items: {
              where: {
                wishlist: {
                  OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
                },
              },
              select: { wishlist: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (events.length === 0) continue;

    const pending: PendingSaleEvent[] = events.map((ev) => ({
      eventId: ev.id,
      gameTitle: ev.game.title,
      storeUrl: ev.game.storeUrl,
      discountPercent: ev.discountPercent,
      priceFinal: ev.newFinal,
      lists: dedupeLists(ev.game.items.map((i) => i.wishlist)),
    }));

    const groups = buildUserDigest(pending);
    if (!groups) continue;

    const email = buildSaleDigestEmail({ recipientName: rec.user.name, groups });
    try {
      await sendEmail({ ...email, to: rec.user.email, toName: rec.user.name });
      await prisma.gameSaleNotification.createMany({
        data: events.map((ev) => ({ userId, gameSaleEventId: ev.id })),
        skipDuplicates: true,
      });
      emailsSent++;
    } catch (err) {
      console.error("[notify-sales] envio falhou para", rec.user.email, err);
      emailsFailed++;
    }
  }

  // TTL sweep: eventos com mais de 48h nunca mais entram num digest novo.
  const closed = await prisma.gameSaleEvent.updateMany({
    where: { notifiedAt: null, detectedAt: { lt: saleEventTtlCutoff(now) } },
    data: { notifiedAt: now },
  });

  const report: NotifyReport = {
    hour,
    users: recipients.length,
    emailsSent,
    emailsFailed,
    eventsClosed: closed.count,
  };

  await prisma.jobRun.update({
    where: { jobName: "notify-sales" },
    data: {
      lastFinishedAt: new Date(),
      lastStatus: emailsFailed > 0 && emailsSent === 0 ? "error" : "ok",
      meta: report,
    },
  });

  return report;
}

function dedupeLists(lists: { id: string; name: string }[]): { id: string; name: string }[] {
  const seen = new Map<string, { id: string; name: string }>();
  for (const l of lists) if (!seen.has(l.id)) seen.set(l.id, l);
  return [...seen.values()];
}
