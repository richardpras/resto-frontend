// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KdsBoard } from "./KdsBoard";
import type { KitchenTicket } from "@/domain/kitchenAdapters";

vi.mock("framer-motion", () => ({
  motion: {
    article: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const baseTicket: KitchenTicket = {
  id: "t1",
  outletId: 1,
  orderId: "99",
  orderNumber: "ORD-1024",
  ticketNo: "KDS-0100",
  status: "queued",
  queuedAt: new Date("2026-06-03T10:00:00.000Z"),
  createdAt: new Date("2026-06-03T10:00:00.000Z"),
  updatedAt: new Date("2026-06-03T10:00:00.000Z"),
  items: [{ id: "i1", orderItemId: "oi1", name: "Nasi Goreng", qty: 2, notes: "", status: "queued" }],
};

describe("KdsBoard", () => {
  it("renders kanban columns with independent ticket placement", () => {
    const tickets: KitchenTicket[] = [
      baseTicket,
      { ...baseTicket, id: "t2", status: "in_progress", ticketNo: "KDS-0101" },
      { ...baseTicket, id: "t3", status: "ready", ticketNo: "KDS-0102" },
    ];

    render(
      <div className="kds-display h-screen flex flex-col">
        <KdsBoard
          tickets={tickets}
          nowMs={new Date("2026-06-03T10:02:00.000Z").getTime()}
          isSubmitting={false}
          recoverySubmitting={false}
          canReportItemRecovery={false}
          onAdvance={vi.fn()}
          onCancel={vi.fn()}
          onItemIssue={vi.fn()}
        />
      </div>,
    );

    expect(screen.getByTestId("kitchen-workflow-board")).toBeInTheDocument();
    expect(screen.getByTestId("kitchen-column-new").querySelector('[data-ticket-id="t1"]')).toBeTruthy();
    expect(screen.getByTestId("kitchen-column-cooking").querySelector('[data-ticket-id="t2"]')).toBeTruthy();
    expect(screen.getByTestId("kitchen-column-ready").querySelector('[data-ticket-id="t3"]')).toBeTruthy();
  });
});
