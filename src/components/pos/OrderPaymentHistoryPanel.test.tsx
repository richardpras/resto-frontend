// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderPaymentHistoryPanel } from "./OrderPaymentHistoryPanel";
import { useOrderPaymentHistoryStore } from "@/stores/orderPaymentHistoryStore";

const mockListOrderPayments = vi.fn();

vi.mock("@/lib/api-integration/endpoints", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-integration/endpoints")>("@/lib/api-integration/endpoints");
  return {
    ...actual,
    listOrderPayments: (...args: unknown[]) => mockListOrderPayments(...args),
  };
});

describe("OrderPaymentHistoryPanel", () => {
  beforeEach(() => {
    mockListOrderPayments.mockReset();
    useOrderPaymentHistoryStore.setState({
      entries: {},
      interestRefCount: new Map(),
      inflightPromiseByKey: new Map(),
      inflightAbortByKey: new Map(),
    });
  });

  it("renders split and status rows after lazy fetch", async () => {
    mockListOrderPayments.mockResolvedValue([
      {
        id: 10,
        orderId: 3,
        orderSplitId: 1,
        method: "cash",
        amount: 5000,
        status: "pending",
        paidAt: "2026-05-01T10:00:00.000Z",
        createdAt: "2026-05-01T10:00:00.000Z",
        splitLabel: "Guest 1",
      },
      {
        id: 11,
        orderId: 3,
        orderSplitId: null,
        method: "transfer",
        amount: 6000,
        status: "paid",
        paidAt: "2026-05-01T10:05:00.000Z",
        createdAt: "2026-05-01T10:05:00.000Z",
      },
    ]);

    render(<OrderPaymentHistoryPanel outletId={1} orderId="3" orderChannelLabel="POS · Dine-in" />);

    await waitFor(() => {
      expect(screen.getByTestId("payment-history-rows").querySelectorAll("li")).toHaveLength(2);
    });
    expect(screen.getByTestId("payment-history-row-10")).toHaveTextContent("Cash");
    expect(screen.getByTestId("payment-history-row-10")).toHaveTextContent("Guest 1");
    expect(screen.getByTestId("payment-history-row-10")).toHaveTextContent("POS · Dine-in");
    expect(screen.getByTestId("payment-history-row-11")).toHaveTextContent("Transfer");
  });

  it("shows void badge for void payments", async () => {
    mockListOrderPayments.mockResolvedValue([
      {
        id: 20,
        orderId: 9,
        orderSplitId: null,
        method: "card",
        amount: 1000,
        status: "void",
        createdAt: "2026-05-02T08:00:00.000Z",
      },
    ]);
    render(<OrderPaymentHistoryPanel outletId={1} orderId="9" orderChannelLabel="POS" />);
    await waitFor(() => {
      expect(screen.getByTestId("payment-history-row-20")).toHaveTextContent("Void");
    });
  });
});
