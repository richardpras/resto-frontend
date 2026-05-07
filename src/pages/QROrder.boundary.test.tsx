// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QROrder from "./QROrder";

const mockCreateRequest = vi.fn();
const mockUseQrOrderStore = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams("outletId=2&tableId=7&tableName=T07")],
  };
});

vi.mock("@/stores/qrOrderStore", () => ({
  useQrOrderStore: (selector: (state: Record<string, unknown>) => unknown) => mockUseQrOrderStore(selector),
}));

vi.mock("@/lib/api-integration/qrOrderEndpoints", () => ({
  createQrOrder: vi.fn(),
}));

describe("QROrder page store boundary", () => {
  beforeEach(() => {
    mockCreateRequest.mockReset();
    mockUseQrOrderStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        createRequest: mockCreateRequest,
        isSubmitting: false,
      }),
    );
  });

  it("uses store state/actions only and keeps root layout", () => {
    const { container } = render(<QROrder />);
    expect(screen.getByText(/RestoHub Menu/i)).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("min-h-screen");
    expect(container.firstChild).toHaveClass("bg-background");
  });
});
