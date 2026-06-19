// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReservationPosBridgeStore } from "@/stores/reservationPosBridgeStore";

const mockOpenApi = vi.fn();
const mockApply = vi.fn();

vi.mock("@/lib/api-integration/reservationEndpoints", () => ({
  openReservationInPos: (...args: unknown[]) => mockOpenApi(...args),
}));

vi.mock("@/components/reservations/applyReservationPosPayload", () => ({
  applyReservationPosPayload: (...args: unknown[]) => mockApply(...args),
}));

const sampleResponse = {
  posSession: { sessionType: "reservation" as const, reservationCode: "RSV-TEST" },
  loadPayload: {
    reservationId: 9,
    reservationCode: "RSV-TEST",
    outletId: 1,
    linkedOrderId: "42",
    tableId: 3,
    customerName: "Richard",
    memberId: 7,
    memberNo: "MEM-00001",
  },
};

describe("Reservation POS bridge", () => {
  beforeEach(() => {
    useReservationPosBridgeStore.getState().clear();
    mockOpenApi.mockReset();
    mockApply.mockReset();
    mockOpenApi.mockResolvedValue(sampleResponse);
    mockApply.mockResolvedValue(undefined);
  });

  it("stores draft session from open-in-pos response (navigate mode)", async () => {
    const { openReservationInPos } = await import("@/lib/api-integration/reservationEndpoints");
    const result = await openReservationInPos(9);
    useReservationPosBridgeStore.getState().setFromOpenInPos(result.posSession, result.loadPayload);

    const state = useReservationPosBridgeStore.getState();
    expect(state.draftSession?.sessionType).toBe("reservation");
    expect(state.draftSession?.reservationCode).toBe("RSV-TEST");
    expect(state.loadPayload?.linkedOrderId).toBe("42");
    expect(state.loadPayload?.memberId).toBe(7);
  });

  it("navigate mode sets bridge and navigates", async () => {
    const navigate = vi.fn();
    const setFromOpenInPos = vi.fn();
    const { openReservationInPosFlow } = await import("@/components/reservations/openReservationInPosFlow");

    await openReservationInPosFlow(9, { setFromOpenInPos, navigate });

    expect(mockOpenApi).toHaveBeenCalledWith(9);
    expect(setFromOpenInPos).toHaveBeenCalledWith(sampleResponse.posSession, sampleResponse.loadPayload);
    expect(navigate).toHaveBeenCalledWith("/pos");
    expect(mockApply).not.toHaveBeenCalled();
  });

  it("inPlace mode applies payload without navigate", async () => {
    const navigate = vi.fn();
    const apply = { setCurrentOrderId: vi.fn() };
    const { openReservationInPosFlow } = await import("@/components/reservations/openReservationInPosFlow");

    await openReservationInPosFlow(9, { mode: "inPlace", apply: apply as never });

    expect(mockOpenApi).toHaveBeenCalledWith(9);
    expect(mockApply).toHaveBeenCalledWith(sampleResponse.loadPayload, apply);
    expect(navigate).not.toHaveBeenCalled();
  });
});
