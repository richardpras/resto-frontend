// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QROrder from "./QROrder";

const mockUseQrOrderStore = vi.fn();
const mockCreateRequest = vi.fn();
const mockCallCashier = vi.fn();
const mockToastError = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams("outletId=2&tableId=7&tableName=T07")],
    useParams: () => ({ qrPublicId: undefined }),
    useNavigate: () => mockNavigate,
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
const mockListFloorTables = vi.fn();
const mockResolveLegacyTable = vi.fn();
const mockResolveTableFromPublicId = vi.fn();
const mockFetchTableOperationalStatus = vi.fn();

describe("QROrder production flow guards", () => {
  beforeEach(() => {
    mockCreateRequest.mockReset();
    mockCallCashier.mockReset();
    mockToastError.mockReset();
    mockNavigate.mockReset();
    mockListFloorTables.mockReset();
    mockGetApiAccessToken.mockReset();
    mockResolveLegacyTable.mockReset();
    mockResolveTableFromPublicId.mockReset();
    mockFetchTableOperationalStatus.mockReset();
    mockCreateRequest.mockResolvedValue({ id: "req-1", requestCode: "QRR-001" });
    mockCallCashier.mockResolvedValue({ id: "req-1", requestCode: "QRR-001" });
    mockGetApiAccessToken.mockReturnValue(null);
    mockResolveLegacyTable.mockResolvedValue({
      outletId: 2,
      tableId: 7,
      tableName: "T07",
      qrPublicId: "TBL_LEGACY07",
      guestSession: { token: "QGS_TESTTOKEN", expiresAt: "2099-01-01T00:00:00Z" },
    });
    mockResolveTableFromPublicId.mockRejectedValue(new Error("not-used"));
    mockListFloorTables.mockResolvedValue([
      { id: 7, tableOperationalStatus: "available" },
    ]);
    mockFetchTableOperationalStatus.mockResolvedValue("available");
    mockUseQrOrderStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        createRequest: mockCreateRequest,
        callCashier: mockCallCashier,
        isSubmitting: false,
        hasApiAccess: () => Boolean(mockGetApiAccessToken()),
        resolveTableFromPublicId: mockResolveTableFromPublicId,
        resolveLegacyTable: mockResolveLegacyTable,
        fetchTableOperationalStatus: mockFetchTableOperationalStatus,
      }),
    );
  });

  it("submits request, shows awaiting cashier, and allows call cashier", async () => {
    render(<QROrder />);

    await waitFor(() => expect(mockResolveLegacyTable).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /nasi goreng special/i }));
    fireEvent.click(screen.getByRole("button", { name: /view cart/i }));
    fireEvent.click(screen.getByRole("button", { name: /checkout/i }));
    fireEvent.change(screen.getByPlaceholderText(/enter your name/i), { target: { value: "Guest A" } });
    fireEvent.click(screen.getByRole("button", { name: /submit order/i }));

    await waitFor(() => expect(mockCreateRequest).toHaveBeenCalledTimes(1));
    expect(mockCreateRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        guestSessionToken: "QGS_TESTTOKEN",
        qrPublicId: "TBL_LEGACY07",
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/qr/order/QRR-001");
  });

  it("blocks submission when projection marks table as reserved", async () => {
    mockGetApiAccessToken.mockReturnValue("token");
    mockFetchTableOperationalStatus.mockResolvedValue("reserved");

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
