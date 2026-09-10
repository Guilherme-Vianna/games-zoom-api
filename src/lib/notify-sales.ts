/**
 * Logica pura do digest `notify-sales`. O route cuida do banco/e-mail; aqui
 * ficam a selecao de quem recebe nesta hora e a montagem dos grupos por lista.
 */
import { formatCentsBRL, type DigestGroup } from "@/lib/sale-digest";

export type NotificationSetting = {
  userId: string;
  saleDigestEnabled: boolean;
  deliveryHour: number;
};

/** Usuarios que optaram pelo digest e escolheram exatamente esta hora. */
export function selectUsersForHour<T extends NotificationSetting>(
  settings: readonly T[],
  hour: number,
): T[] {
  return settings.filter((s) => s.saleDigestEnabled && s.deliveryHour === hour);
}

export type PendingSaleEvent = {
  eventId: string;
  gameTitle: string;
  storeUrl: string;
  discountPercent: number;
  priceFinal: number;
  /** Listas do usuario (id + nome) que contem este jogo. */
  lists: { id: string; name: string }[];
};

/**
 * Agrupa os eventos pendentes de um usuario por lista. Retorna `null` quando
 * nao ha nada a enviar (o route pula o e-mail nesse caso).
 */
export function buildUserDigest(events: readonly PendingSaleEvent[]): DigestGroup[] | null {
  if (events.length === 0) return null;

  const byList = new Map<string, { name: string; games: DigestGroup["games"]; seen: Set<string> }>();

  for (const ev of events) {
    for (const list of ev.lists) {
      let entry = byList.get(list.id);
      if (!entry) {
        entry = { name: list.name, games: [], seen: new Set() };
        byList.set(list.id, entry);
      }
      if (entry.seen.has(ev.gameTitle)) continue;
      entry.seen.add(ev.gameTitle);
      entry.games.push({
        title: ev.gameTitle,
        priceFormatted: formatCentsBRL(ev.priceFinal),
        discountPercent: ev.discountPercent,
        storeUrl: ev.storeUrl,
      });
    }
  }

  const groups = [...byList.values()]
    .filter((g) => g.games.length > 0)
    .map((g) => ({ listName: g.name, games: g.games }));

  return groups.length > 0 ? groups : null;
}
