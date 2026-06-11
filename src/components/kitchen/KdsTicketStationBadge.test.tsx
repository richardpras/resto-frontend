// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KdsTicketCard } from "@/components/kitchen/KdsTicketCard";
import { KITCHEN_BOARD_COLUMNS } from "@/domain/kitchenWorkflow";
import type { KitchenTicket } from "@/domain/kitchenAdapters";

vi.mock("framer-motion", () => ({
  motion: {
    article: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const ticket: KitchenTicket = {
  id: "t1",
  outletId: 1,
  orderId: "99",
  orderNumber: "ORD-1001",
  ticketNo: "KDS-1-99-kitchen",
  status: "queued",
  station: { id: 2, code: "kitchen", name: "Kitchen" },
  queuedAt: new Date("2026-06-03T10:00:00.000Z"),
  createdAt: new Date("2026-06-03T10:00:00.000Z"),
  updatedAt: new Date("2026-06-03T10:00:00.000Z"),
  items: [
    {
      id: "i1",
      orderItemId: "oi1",
      name: "Nasi Goreng",
      qty: 1,
      notes: "",
      status: "queued",
    },
  ],
};

describe("KdsTicketStationBadge", () => {
  it("shows station badge in all view", () => {
    render(
      <div className="kds-display">
        <KdsTicketCard
          ticket={ticket}
          column={KITCHEN_BOARD_COLUMNS[0]}
          nowMs={new Date("2026-06-03T10:05:00.000Z").getTime()}
          isSubmitting={false}
          recoverySubmitting={false}
          canReportItemRecovery={false}
          showStationBadge
          onAdvance={vi.fn()}
          onCancel={vi.fn()}
          onItemIssue={vi.fn()}
        />
      </div>,
    );

    expect(screen.getByTestId("kds-ticket-station-badge")).toHaveTextContent("Kitchen");
  });

  it("hides station badge when not in all view", () => {
    render(
      <div className="kds-display">
        <KdsTicketCard
          ticket={ticket}
          column={KITCHEN_BOARD_COLUMNS[0]}
          nowMs={new Date("2026-06-03T10:05:00.000Z").getTime()}
          isSubmitting={false}
          recoverySubmitting={false}
          canReportItemRecovery={false}
          showStationBadge={false}
          onAdvance={vi.fn()}
          onCancel={vi.fn()}
          onItemIssue={vi.fn()}
        />
      </div>,
    );

    expect(screen.queryByTestId("kds-ticket-station-badge")).not.toBeInTheDocument();
  });

  it("does not crash for legacy ticket without station", () => {
    render(
      <div className="kds-display">
        <KdsTicketCard
          ticket={{ ...ticket, station: null }}
          column={KITCHEN_BOARD_COLUMNS[0]}
          nowMs={new Date("2026-06-03T10:05:00.000Z").getTime()}
          isSubmitting={false}
          recoverySubmitting={false}
          canReportItemRecovery={false}
          showStationBadge
          onAdvance={vi.fn()}
          onCancel={vi.fn()}
          onItemIssue={vi.fn()}
        />
      </div>,
    );

    expect(screen.queryByTestId("kds-ticket-station-badge")).not.toBeInTheDocument();
    expect(screen.getByText("#ORD-1001")).toBeInTheDocument();
  });
});
