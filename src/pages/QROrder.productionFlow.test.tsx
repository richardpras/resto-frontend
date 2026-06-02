// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QROrder from "./QROrder";

const mockUseQrOrderStore = vi.fn();
const mockCreateRequest = vi.fn();
const mockCallCashier = vi.fn();
const mockToastError = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams("outletId=2&tableId=7&tableName=T07")],
    useParams: () => ({ qrPublicId: undefined }),
  };
});

vi.mock("@/stores/qrOrderStore", () => ({
  useQrOrderStore: (selector: (state: Record<string, unknown>) => unknown) => mockUseQrOrderStore(selector),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
  },
}));

const mockGetApiAccessToken = vi.fn();
vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: () => mockGetApiAccessToken(),
}));

const mockListFloorTables = vi.fn();
const mockResolveLegacyTableQr = vi.fn();
const mockResolveTableQrPublicId = vi.fn();
vi.mock("@/lib/api-integration/tableEndpoints", () => ({
  listFloorTables: (...args: unknown[]) => mockListFloorTables(...args),
  resolveLegacyTableQr: (...args: unknown[]) => mockResolveLegacyTableQr(...args),
  resolveTableQrPublicId: (...args: unknown[]) => mockResolveTableQrPublicId(...args),
}));

describe("QROrder production flow guards", () => {
  beforeEach(() => {
    mockCreateRequest.mockReset();
    mockCallCashier.mockReset();
    mockToastError.mockReset();
    mockListFloorTables.mockReset();
    mockGetApiAccessToken.mockReset();
    mockResolveLegacyTableQr.mockReset();
    mockResolveTableQrPublicId.mockReset();
    mockCreateRequest.mockResolvedValue({ id: "req-1", requestCode: "QRR-001" });
    mockCallCashier.mockResolvedValue({ id: "req-1", requestCode: "QRR-001" });
    mockGetApiAccessToken.mockReturnValue(null);
    mockResolveLegacyTableQr.mockResolvedValue({ outletId: 2, tableId: 7, tableName: "T07" });
    mockResolveTableQrPublicId.mockRejectedValue(new Error("not-used"));
    mockListFloorTables.mockResolvedValue([
      { id: 7, tableOperationalStatus: "available" },
    ]);
    mockUseQrOrderStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        createRequest: mockCreateRequest,
        callCashier: mockCallCashier,
        isSubmitting: false,
      }),
    );
  });

  it("submits request, shows awaiting cashier, and allows call cashier", async () => {
    render(<QROrder />);

    fireEvent.click(screen.getByRole("button", { name: /nasi goreng special/i }));
    fireEvent.click(screen.getByRole("button", { name: /view cart/i }));
    fireEvent.click(screen.getByRole("button", { name: /checkout/i }));
    fireEvent.change(screen.getByPlaceholderText(/enter your name/i), { target: { value: "Guest A" } });
    fireEvent.click(screen.getByRole("button", { name: /submit order/i }));

    await waitFor(() => expect(mockCreateRequest).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/status: awaiting cashier/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /call cashier/i }));
    await waitFor(() => expect(mockCallCashier).toHaveBeenCalledWith("req-1", { outletId: 2, tableId: 7 }));
  });

  it("blocks submission when projection marks table as reserved", async () => {
    mockGetApiAccessToken.mockReturnValue("token");
    mockListFloorTables.mockResolvedValueOnce([
      { id: 7, tableOperationalStatus: "reserved" },
    ]);

    render(<QROrder />);
    fireEvent.click(screen.getByRole("button", { name: /nasi goreng special/i }));
    fireEvent.click(screen.getByRole("button", { name: /view cart/i }));
    fireEvent.click(screen.getByRole("button", { name: /checkout/i }));
    fireEvent.change(screen.getByPlaceholderText(/enter your name/i), { target: { value: "Guest A" } });

    await waitFor(() =>
      expect(screen.getByText(/this table is currently reserved/i)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /submit order/i }));
    expect(mockCreateRequest).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalled();
  });
});
