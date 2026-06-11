// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KdsTicketCard } from "./KdsTicketCard";
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
  id: "t-ready",
  outletId: 1,
  orderId: "99",
  orderNumber: "ORD-1024",
  ticketNo: "KDS-0099",
  status: "ready",
  queuedAt: new Date("2026-06-03T10:00:00.000Z"),
  createdAt: new Date("2026-06-03T10:00:00.000Z"),
  updatedAt: new Date("2026-06-03T10:30:00.000Z"),
  items: [
    {
      id: "i1",
      orderItemId: "oi1",
      name: "Ayam Bakar",
      qty: 1,
      notes: "Pedas",
      status: "ready",
    },
  ],
};

describe("KdsTicketCard", () => {
  it("shows large order number, age in minutes, and touch-friendly action", () => {
    const onAdvance = vi.fn();
    render(
      <div className="kds-display">
        <KdsTicketCard
          ticket={ticket}
          column={KITCHEN_BOARD_COLUMNS[2]}
          nowMs={new Date("2026-06-03T10:07:00.000Z").getTime()}
          isSubmitting={false}
          recoverySubmitting={false}
          canReportItemRecovery={false}
          onAdvance={onAdvance}
          onCancel={vi.fn()}
          onItemIssue={vi.fn()}
        />
      </div>,
    );

    expect(screen.getByText("#ORD-1024")).toBeInTheDocument();
    expect(screen.getByTestId("kds-order-age")).toHaveTextContent("7 min");
    expect(screen.getByTestId("kitchen-item-notes")).toHaveTextContent("+ Pedas");
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    expect(onAdvance).toHaveBeenCalledWith("t-ready");
  });
});
