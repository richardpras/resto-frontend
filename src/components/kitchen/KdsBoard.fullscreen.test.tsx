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

const ticket: KitchenTicket = {
  id: "t1",
  outletId: 1,
  orderId: "1",
  orderNumber: "ORD-100",
  ticketNo: "KT-1",
  status: "queued",
  queuedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [{ id: "i1", orderItemId: "oi1", name: "Nasi Goreng", qty: 1, notes: "", status: "queued" }],
};

describe("KdsBoard fullscreen layout", () => {
  it("keeps ticket cards from shrinking when a column has many tickets", () => {
    const many = Array.from({ length: 24 }, (_, index) => ({
      ...ticket,
      id: `t${index}`,
      orderNumber: `ORD-${index}`,
      ticketNo: `KT-${index}`,
    }));

    render(
      <div className="kds-display flex flex-col h-[600px]" data-kds-fullscreen="true">
        <div className="kds-board-region flex-1 min-h-0 flex flex-col overflow-hidden">
          <KdsBoard
            tickets={many}
            nowMs={Date.now()}
            isFullscreen
            focusMode="compact"
            isSubmitting={false}
            recoverySubmitting={false}
            canReportItemRecovery={false}
            onAdvance={vi.fn()}
            onCancel={vi.fn()}
            onItemIssue={vi.fn()}
          />
        </div>
      </div>,
    );

    const scroll = screen.getByTestId("kitchen-column-new").querySelector(".kds-column-scroll");
    expect(scroll).toBeTruthy();
    expect(scroll?.className).toMatch(/overflow-y-auto/);
    const cards = screen.getAllByTestId("kitchen-ticket-card");
    expect(cards.length).toBe(24);
    for (const card of cards) {
      expect(card.className).toMatch(/flex-none|shrink-0/);
    }
  });

  it("renders ticket cards inside fullscreen board columns", () => {
    render(
      <div className="kds-display flex flex-col h-dvh" data-kds-fullscreen="true">
        <div className="kds-board-region flex-1 min-h-0 flex flex-col overflow-hidden">
          <KdsBoard
            tickets={[ticket]}
            nowMs={Date.now()}
            isFullscreen
            isSubmitting={false}
            recoverySubmitting={false}
            canReportItemRecovery={false}
            onAdvance={vi.fn()}
            onCancel={vi.fn()}
            onItemIssue={vi.fn()}
          />
        </div>
      </div>,
    );

    const board = screen.getByTestId("kitchen-workflow-board");
    expect(board.className).toMatch(/kds-board-fullscreen/);
    expect(screen.getByTestId("kitchen-ticket-card")).toBeInTheDocument();
    expect(screen.getByText("#ORD-100")).toBeInTheDocument();
  });
});
