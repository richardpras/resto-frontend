// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KitchenWorkflowBoard } from "@/components/kitchen/KitchenWorkflowBoard";
import { KitchenWorkflowSummary } from "@/components/kitchen/KitchenWorkflowSummary";
import { KitchenTicketCard } from "@/components/kitchen/KitchenTicketCard";
import { KITCHEN_BOARD_COLUMNS } from "@/domain/kitchenWorkflow";
import type { KitchenTicket } from "@/domain/kitchenAdapters";

vi.mock("framer-motion", () => ({
  motion: {
    article: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const baseTicket: KitchenTicket = {
  id: "t-ready",
  outletId: 1,
  orderId: "99",
  orderNumber: "ORD-9",
  ticketNo: "KDS-0099",
  status: "ready",
  queuedAt: new Date("2026-06-03T10:00:00.000Z"),
  createdAt: new Date("2026-06-03T10:00:00.000Z"),
  updatedAt: new Date("2026-06-03T10:30:00.000Z"),
  items: [
    {
      id: "i1",
      orderItemId: "oi1",
      name: "Burger",
      qty: 1,
      notes: "NO ONION",
      status: "ready",
    },
  ],
};

describe("KitchenPolishWorkflowTest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders column headers for each kanban lane", () => {
    render(
      <div className="kds-display">
        <KitchenWorkflowBoard
          tickets={[baseTicket]}
          nowMs={Date.now()}
          isSubmitting={false}
          recoverySubmitting={false}
          canReportItemRecovery={false}
          onAdvance={vi.fn()}
          onCancel={vi.fn()}
          onItemIssue={vi.fn()}
        />
      </div>,
    );

    for (const column of KITCHEN_BOARD_COLUMNS) {
      const header = screen.getByTestId(`kitchen-column-header-${column.id}`);
      expect(header).toHaveTextContent(column.title);
    }
  });

  it("shows workflow summary counters from tickets", () => {
    const tickets: KitchenTicket[] = [
      { ...baseTicket, id: "1", status: "queued" },
      { ...baseTicket, id: "2", status: "in_progress" },
      { ...baseTicket, id: "3", status: "ready" },
      { ...baseTicket, id: "4", status: "ready" },
    ];
    render(<KitchenWorkflowSummary tickets={tickets} />);
    expect(screen.getByTestId("kitchen-summary-new")).toHaveTextContent("NEW (1)");
    expect(screen.getByTestId("kitchen-summary-cooking")).toHaveTextContent("COOKING (1)");
    expect(screen.getByTestId("kitchen-summary-ready")).toHaveTextContent("READY (2)");
  });

  it("emphasizes ready tickets and highlights item notes", () => {
    render(
      <div className="kds-display">
        <KitchenTicketCard
          ticket={baseTicket}
          column={KITCHEN_BOARD_COLUMNS[2]}
          nowMs={Date.now()}
          isSubmitting={false}
          recoverySubmitting={false}
          canReportItemRecovery={false}
          onAdvance={vi.fn()}
          onCancel={vi.fn()}
          onItemIssue={vi.fn()}
        />
      </div>,
    );

    const card = screen.getByTestId("kitchen-ticket-card");
    expect(card).toHaveAttribute("data-ready-emphasis", "true");
    expect(card.className).toMatch(/border-2/);
    expect(screen.getByTestId("kitchen-ready-badge")).toBeInTheDocument();
    expect(screen.getByTestId("kitchen-item-notes")).toHaveTextContent("+ NO ONION");
  });
});
