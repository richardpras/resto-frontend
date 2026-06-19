// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PosReservationPickerDialog } from "./PosReservationPickerDialog";

const mockOpenFlow = vi.fn();
const mockGetQueue = vi.fn();

vi.mock("@/components/reservations/openReservationInPosFlow", () => ({
  openReservationInPosFlow: (...args: unknown[]) => mockOpenFlow(...args),
}));

vi.mock("@/lib/api-integration/reservationEndpoints", () => ({
  getReservationPosQueue: (...args: unknown[]) => mockGetQueue(...args),
}));

vi.mock("@/i18n/useOpsTranslation", () => ({
  useOpsTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const applyDeps = {
  setCurrentOrderId: vi.fn(),
  setCustomerName: vi.fn(),
  setCustomerPhone: vi.fn(),
  setSelectedTable: vi.fn(),
  setOrderType: vi.fn(),
  setSelectedMember: vi.fn(),
  setActiveReservationId: vi.fn(),
  fetchMembers: vi.fn().mockResolvedValue(undefined),
  fetchOrderRemote: vi.fn().mockResolvedValue(undefined),
  activeOutletId: 1,
};

function renderPicker(currentOrderId: string | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  const onLoaded = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <PosReservationPickerDialog
        open
        outletId={1}
        currentOrderId={currentOrderId}
        applyDeps={applyDeps}
        onClose={onClose}
        onLoaded={onLoaded}
      />
    </QueryClientProvider>,
  );
  return { onClose, onLoaded };
}

describe("PosReservationPickerDialog", () => {
  beforeEach(() => {
    mockOpenFlow.mockReset();
    mockGetQueue.mockReset();
    mockOpenFlow.mockResolvedValue(undefined);
    mockGetQueue.mockResolvedValue({
      readyToStart: [
        {
          id: 1,
          customerName: "Pras",
          reservationAt: "2026-06-20T18:00:00.000Z",
          partySize: 2,
          linkedOrderId: null,
        },
      ],
      inService: [
        {
          id: 2,
          customerName: "Richard",
          reservationAt: "2026-06-20T19:00:00.000Z",
          partySize: 4,
          linkedOrderId: 42,
        },
      ],
    });
  });

  it("excludes in-service reservation matching current order id", async () => {
    renderPicker("42");
    await waitFor(() => {
      expect(screen.getByTestId("reservation-picker-row-1")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("reservation-picker-row-2")).not.toBeInTheDocument();
  });

  it("loads reservation in-place when row is selected", async () => {
    const { onClose, onLoaded } = renderPicker();
    await waitFor(() => {
      expect(screen.getByTestId("reservation-picker-row-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("reservation-picker-row-1"));
    await waitFor(() => {
      expect(mockOpenFlow).toHaveBeenCalledWith(1, { mode: "inPlace", apply: applyDeps });
    });
    expect(onLoaded).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
