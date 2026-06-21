// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import POS from "./POS";

const mockFetchMembers = vi.fn();
const mockRefreshLoyalty = vi.fn();
const mockCapabilities = vi.fn(() => ({ crm: true }));

vi.mock("@/domain/accessControl", () => ({
  getUserCapabilities: () => mockCapabilities(),
}));

vi.mock("@/stores/authStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/stores/authStore")>();
  return {
    ...actual,
    useAuthStore: (selector: (state: { user: { id: string; permissions: string[] } | null }) => unknown) =>
      selector({ user: { id: "1", permissions: [] } }),
  };
});

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (state: { activeOutletId: number }) => unknown) => selector({ activeOutletId: 3 }),
}));

vi.mock("@/stores/orderStore", () => ({
  useOrderStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      tables: [],
      orders: [],
      updateTableStatus: vi.fn(),
      replaceFloorTables: vi.fn(),
      createOrderRemote: vi.fn(),
      fetchOrder: vi.fn(),
      addOrderPaymentsRemote: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  deriveRuntimeFloorTables: () => [],
}));

const memberStoreState = {
  members: [],
  loading: false,
  searchLoading: false,
  searchResults: [],
  fetchMembers: mockFetchMembers,
  searchMembersForOutlet: vi.fn(),
  quickCreateMember: vi.fn(),
};

vi.mock("@/stores/memberStore", () => ({
  useMemberStore: (selector?: (state: typeof memberStoreState) => unknown) =>
    selector ? selector(memberStoreState) : memberStoreState,
}));

vi.mock("@/stores/loyaltyStore", () => ({
  useLoyaltyStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      pointsBalanceByCustomer: {},
      refreshForOutlet: mockRefreshLoyalty,
      enqueueRedemption: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock("@/stores/posSessionStore", () => ({
  usePosSessionStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      fetchCurrent: vi.fn().mockResolvedValue(undefined),
      open: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      currentSession: null,
      isLoading: false,
    }),
}));

vi.mock("@/stores/paymentStore", () => ({
  usePaymentStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      isSubmitting: false,
      error: null,
      currentTransaction: null,
      expiryCountdown: 0,
      createPaymentTransaction: vi.fn(),
      pollTransactionStatus: vi.fn(),
      retryPayment: vi.fn(),
      expireTransaction: vi.fn(),
      reconcileTransaction: vi.fn(),
      resetAsync: vi.fn(),
    }),
}));

vi.mock("@/hooks/pos/usePosBootstrap", () => ({
  usePosBootstrap: () => ({
    menuApiItems: [],
    menuLoading: false,
    menuError: false,
    refetchMenu: vi.fn(),
    bootstrapLoading: false,
    bootstrapError: false,
  }),
}));

vi.mock("@/hooks/pos/usePosLazyFloorTables", () => ({
  usePosLazyFloorTables: () => ({
    requestTables: vi.fn(),
    tablesLoading: false,
  }),
}));

vi.mock("@/hooks/pos/useConsumePosBridge", () => ({
  useConsumePosBridge: vi.fn(),
}));

vi.mock("@/hooks/useReservationTableProjectionSync", () => ({
  useReservationTableProjectionSync: vi.fn(),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() })),
  };
});

function renderPos() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <POS />
    </QueryClientProvider>,
  );
}

describe("POS PERF orchestration boundaries", () => {
  beforeEach(() => {
    mockFetchMembers.mockReset();
    mockRefreshLoyalty.mockReset();
    mockFetchMembers.mockResolvedValue(undefined);
    mockRefreshLoyalty.mockResolvedValue(undefined);
    mockCapabilities.mockReturnValue({ crm: true });
  });

  it("does not fetch crm/member data on initial POS open", () => {
    renderPos();
    expect(mockFetchMembers).not.toHaveBeenCalled();
    expect(mockRefreshLoyalty).not.toHaveBeenCalled();
  });

  it("lazy-loads member data when member picker is opened", () => {
    renderPos();
    fireEvent.click(screen.getByRole("button", { name: /\+ select member/i }));
    expect(mockFetchMembers).toHaveBeenCalledTimes(1);
    expect(mockRefreshLoyalty).toHaveBeenCalledTimes(1);
  });

  it("prevents crm/member request when capability is missing", () => {
    mockCapabilities.mockReturnValue({ crm: false });
    renderPos();
    const button = screen.getByRole("button", { name: /\+ select member/i });
    fireEvent.click(button);
    expect(mockFetchMembers).not.toHaveBeenCalled();
    expect(mockRefreshLoyalty).not.toHaveBeenCalled();
  });
});

