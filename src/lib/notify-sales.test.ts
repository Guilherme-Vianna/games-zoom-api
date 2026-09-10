import { describe, expect, it } from "vitest";
import {
  buildUserDigest,
  selectUsersForHour,
  type PendingSaleEvent,
} from "./notify-sales";

describe("selectUsersForHour", () => {
  const settings = [
    { userId: "a", saleDigestEnabled: true, deliveryHour: 9 },
    { userId: "b", saleDigestEnabled: false, deliveryHour: 9 },
    { userId: "c", saleDigestEnabled: true, deliveryHour: 21 },
  ];
  it("so quem ativou e escolheu a hora", () => {
    expect(selectUsersForHour(settings, 9).map((s) => s.userId)).toEqual(["a"]);
    expect(selectUsersForHour(settings, 21).map((s) => s.userId)).toEqual(["c"]);
    expect(selectUsersForHour(settings, 3)).toEqual([]);
  });
});

describe("buildUserDigest", () => {
  it("null quando nao ha eventos", () => {
    expect(buildUserDigest([])).toBeNull();
  });

  it("agrupa por lista", () => {
    const events: PendingSaleEvent[] = [
      {
        eventId: "e1",
        gameTitle: "Hollow Knight",
        storeUrl: "u1",
        discountPercent: 50,
        priceFinal: 1399,
        lists: [
          { id: "l1", name: "Coop" },
          { id: "l2", name: "Solo" },
        ],
      },
      {
        eventId: "e2",
        gameTitle: "Celeste",
        storeUrl: "u2",
        discountPercent: 60,
        priceFinal: 1899,
        lists: [{ id: "l1", name: "Coop" }],
      },
    ];
    const groups = buildUserDigest(events);
    expect(groups).toEqual([
      {
        listName: "Coop",
        games: [
          { title: "Hollow Knight", priceFormatted: "R$ 13,99", discountPercent: 50, storeUrl: "u1" },
          { title: "Celeste", priceFormatted: "R$ 18,99", discountPercent: 60, storeUrl: "u2" },
        ],
      },
      {
        listName: "Solo",
        games: [
          { title: "Hollow Knight", priceFormatted: "R$ 13,99", discountPercent: 50, storeUrl: "u1" },
        ],
      },
    ]);
  });

  it("nao repete o mesmo jogo dentro de uma lista", () => {
    const events: PendingSaleEvent[] = [
      { eventId: "e1", gameTitle: "X", storeUrl: "u", discountPercent: 10, priceFinal: 100, lists: [{ id: "l1", name: "A" }] },
      { eventId: "e2", gameTitle: "X", storeUrl: "u", discountPercent: 20, priceFinal: 90, lists: [{ id: "l1", name: "A" }] },
    ];
    expect(buildUserDigest(events)?.[0].games).toHaveLength(1);
  });
});
