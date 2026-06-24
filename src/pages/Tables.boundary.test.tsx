// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Tables from "./Tables";

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: vi.fn(() => "token"),
  ApiHttpError: class ApiHttpError extends Error {},
}));

const mockListFloorTables = vi.fn();

vi.mock("@/lib/api-integration/tableEndpoints", () => ({
  listFloorTables: (...args: unknown[]) => mockListFloorTables(...args),
  createFloorTable: vi.fn(),
  updateFloorTable: vi.fn(),
  deleteFloorTable: vi.fn(),
  generateTableQr: vi.fn(),
  rotateTableQr: vi.fn(),
  enableTableQr: vi.fn(),
  disableTableQr: vi.fn(),
  fetchTableQrImageBlob: vi.fn(),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (state: { activeOutletId: number }) => unknown) =>
    selector({ activeOutletId: 1 }),
}));

vi.mock("@/stores/orderStore", () => ({
  useOrderStore: (selector: (state: { orders: unknown[] }) => unknown) => selector({ orders: [] }),
}));

vi.mock("@/stores/authStore", () => ({
  PERMISSIONS: { TABLES_MANAGE: "tables.manage" },
  useAuthStore: (selector: (state: { hasPermission: (p: string) => boolean }) => unknown) =>
    selector({ hasPermission: () => true }),
}));

vi.mock("@/stores/settingsStore", () => {
  const state = {
    outlets: [{ id: 1, name: "Main" }],
    ensureSectionsLoaded: vi.fn(),
  };
  const useSettingsStore = (selector: (s: typeof state) => unknown) => selector(state);
  useSettingsStore.getState = () => state;
  return { useSettingsStore };
});

vi.mock("@/hooks/useReservationTableProjectionSync", () => ({
  useReservationTableProjectionSync: () => undefined,
}));

vi.mock("@/components/tables/QrPreviewModal", () => ({
  QrPreviewModal: () => null,
}));

vi.mock("@/components/tables/BulkQrPrintDialog", () => ({
  BulkQrPrintDialog: () => null,
}));

function renderTables() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Tables />
    </QueryClientProvider>,
  );
}

describe("Tables page boundary", () => {
  beforeEach(() => {
    mockListFloorTables.mockReset();
    mockListFloorTables.mockResolvedValue([
      {
        id: 1,
        outletId: 1,
        name: "T01",
        capacity: 4,
        status: "active",
        tableOperationalStatus: "available",
        qrEnabled: false,
      },
      {
        id: 2,
        outletId: 1,
        name: "T12",
        capacity: 6,
        status: "active",
        tableOperationalStatus: "occupied",
        qrEnabled: true,
      },
    ]);
  });

  it("renders toolbar and filters tables by search", async () => {
    renderTables();
    await waitFor(() => expect(screen.getByText("T01")).toBeInTheDocument());
    expect(screen.getByTestId("tables-page-toolbar")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("tables-search-input"), { target: { value: "T12" } });
    await waitFor(() => {
      expect(screen.queryByText("T01")).not.toBeInTheDocument();
      expect(screen.getByText("T12")).toBeInTheDocument();
    });
  });

  it("shows no search results message when filter matches nothing", async () => {
    renderTables();
    await waitFor(() => expect(screen.getByText("T01")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("tables-search-input"), { target: { value: "ZZZ" } });
    await waitFor(() => expect(screen.getByText(/no tables match/i)).toBeInTheDocument());
  });
});
