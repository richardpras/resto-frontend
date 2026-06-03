import { describe, expect, it } from "vitest";
import { collectNewQueuedTicketIdsForSound, collectNewReadyTicketIdsForSound } from "./kitchenNewTicketSound";

describe("collectNewQueuedTicketIdsForSound", () => {
  it("returns empty on initial hydration", () => {
    const ids = collectNewQueuedTicketIdsForSound({
      tickets: [{ id: "1", status: "queued" }],
      source: "fetch",
      alreadyNotifiedIds: new Set(),
      hasInitialized: false,
    });
    expect(ids).toEqual([]);
  });

  it("does not notify on polling fetch updates", () => {
    const ids = collectNewQueuedTicketIdsForSound({
      tickets: [{ id: "2", status: "queued" }],
      source: "fetch",
      alreadyNotifiedIds: new Set(),
      hasInitialized: true,
    });
    expect(ids).toEqual([]);
  });

  it("notifies only new queued tickets on realtime", () => {
    const ids = collectNewQueuedTicketIdsForSound({
      tickets: [
        { id: "1", status: "queued" },
        { id: "2", status: "queued" },
      ],
      source: "realtime",
      alreadyNotifiedIds: new Set(["1"]),
      hasInitialized: true,
    });
    expect(ids).toEqual(["2"]);
  });

  it("deduplicates repeat realtime snapshots for same ticket", () => {
    const already = new Set(["9"]);
    const ids = collectNewQueuedTicketIdsForSound({
      tickets: [{ id: "9", status: "queued" }],
      source: "realtime",
      alreadyNotifiedIds: already,
      hasInitialized: true,
    });
    expect(ids).toEqual([]);
  });
});

describe("KitchenReadySoundTest", () => {
  it("returns empty on initial hydration", () => {
    const ids = collectNewReadyTicketIdsForSound({
      tickets: [{ id: "1", status: "ready" }],
      source: "fetch",
      alreadyReadyNotifiedIds: new Set(),
      hasInitialized: false,
    });
    expect(ids).toEqual([]);
  });

  it("does not notify on polling fetch updates", () => {
    const ids = collectNewReadyTicketIdsForSound({
      tickets: [{ id: "2", status: "ready" }],
      source: "fetch",
      alreadyReadyNotifiedIds: new Set(),
      hasInitialized: true,
    });
    expect(ids).toEqual([]);
  });

  it("notifies only new ready tickets on realtime", () => {
    const ids = collectNewReadyTicketIdsForSound({
      tickets: [
        { id: "1", status: "ready" },
        { id: "2", status: "ready" },
      ],
      source: "realtime",
      alreadyReadyNotifiedIds: new Set(["1"]),
      hasInitialized: true,
    });
    expect(ids).toEqual(["2"]);
  });

  it("deduplicates repeat realtime snapshots for same ticket", () => {
    const ids = collectNewReadyTicketIdsForSound({
      tickets: [{ id: "9", status: "ready" }],
      source: "realtime",
      alreadyReadyNotifiedIds: new Set(["9"]),
      hasInitialized: true,
    });
    expect(ids).toEqual([]);
  });
});
