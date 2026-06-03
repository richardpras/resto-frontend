import { describe, expect, it } from "vitest";
import { kitchenRealtimePayloadToApiTicket } from "./realtimeAdapter";

describe("kitchenRealtimePayloadToApiTicket", () => {
  it("maps snake_case and camelCase snapshot fields", () => {
    const ticket = kitchenRealtimePayloadToApiTicket({
      ticket_id: 7,
      outlet_id: 3,
      order_id: 44,
      ticket_no: "KDS-3-44",
      status: "ready",
      order_code: "POS-44",
      table_number: "A1",
      service_mode: "dine_in",
      queued_at: "2026-06-03T08:00:00.000Z",
      started_at: "2026-06-03T08:10:00.000Z",
      ready_at: "2026-06-03T08:20:00.000Z",
      served_at: null,
      created_at: "2026-06-03T08:00:00.000Z",
      updated_at: "2026-06-03T08:20:00.000Z",
      items: [
        {
          id: 1,
          order_item_id: 10,
          name: "Coffee",
          qty: 1,
          status: "ready",
        },
      ],
    });

    expect(ticket).not.toBeNull();
    expect(ticket?.id).toBe(7);
    expect(ticket?.orderCode).toBe("POS-44");
    expect(ticket?.tableNumber).toBe("A1");
    expect(ticket?.serviceMode).toBe("dine_in");
    expect(ticket?.status).toBe("ready");
    expect(ticket?.items).toHaveLength(1);
    expect(ticket?.items[0]?.name).toBe("Coffee");
  });

  it("returns null when items array is missing", () => {
    expect(
      kitchenRealtimePayloadToApiTicket({
        ticket_id: 1,
        outlet_id: 1,
        order_id: 2,
        ticket_no: "KDS-1-2",
        status: "queued",
      }),
    ).toBeNull();
  });
});
