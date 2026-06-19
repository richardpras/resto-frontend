// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QROrder from "./QROrder";

const mockCreateRequest = vi.fn();
const mockUseQrOrderStore = vi.fn();

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

vi.mock("@/lib/api-integration/publicMenuEndpoints", () => ({
  fetchPublicQrMenu: vi.fn().mockResolvedValue([
    {
      id: "1",
      name: "Nasi Goreng Special",
      price: 30000,
      category: "Main Course",
      emoji: "🍛",
      available: true,
    },
  ]),
}));

describe("QROrder page store boundary", () => {
  beforeEach(() => {
    mockCreateRequest.mockReset();
    mockUseQrOrderStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        createRequest: mockCreateRequest,
        callCashier: vi.fn(),
        isSubmitting: false,
        hasApiAccess: () => false,
        resolveTableFromPublicId: vi.fn(),
        resolveLegacyTable: vi.fn().mockResolvedValue({
          outletId: 2,
          tableId: 7,
          tableName: "T07",
          qrPublicId: "legacy-qr-07",
          guestSession: { token: "guest-token-test" },
        }),
        fetchTableOperationalStatus: vi.fn().mockResolvedValue("available"),
      }),
    );
  });

  it("uses store state/actions only and keeps root layout", async () => {
    const { container } = render(<QROrder />);
    expect(screen.getByText(/RestoHub Menu/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /language/i })).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("min-h-screen");
    expect(container.firstChild).toHaveClass("bg-background");
  });

  it("submits QR order and shows awaiting cashier flow", async () => {
    mockCreateRequest.mockResolvedValue({ id: "req-1", requestCode: "QRR-001" });
    render(<QROrder />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /nasi goreng special/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /nasi goreng special/i }));
    fireEvent.click(screen.getByRole("button", { name: /view cart/i }));
    fireEvent.click(screen.getByRole("button", { name: /checkout/i }));
    fireEvent.change(screen.getByPlaceholderText(/enter your name/i), { target: { value: "Guest A" } });
    fireEvent.click(screen.getByRole("button", { name: /submit order/i }));

    await waitFor(() => {
      expect(mockCreateRequest).toHaveBeenCalled();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/qr/order/QRR-001");
  });
});
