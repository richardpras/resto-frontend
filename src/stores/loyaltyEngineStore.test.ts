import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListPrograms = vi.fn();
const mockSimulate = vi.fn();
const mockSetActivation = vi.fn();

vi.mock("@/lib/api-integration/loyaltyEngineEndpoints", () => ({
  listLoyaltyPrograms: (...args: unknown[]) => mockListPrograms(...args),
  simulateLoyaltyProgram: (...args: unknown[]) => mockSimulate(...args),
  setLoyaltyProgramActivation: (...args: unknown[]) => mockSetActivation(...args),
  createLoyaltyProgram: vi.fn(),
  updateLoyaltyProgram: vi.fn(),
  listLoyaltyProgramRules: vi.fn(),
  createLoyaltyProgramRule: vi.fn(),
  updateLoyaltyProgramRule: vi.fn(),
  deleteLoyaltyProgramRule: vi.fn(),
  fetchLoyaltyEngineAnalytics: vi.fn(),
}));

import { useLoyaltyEngineStore } from "./loyaltyEngineStore";

describe("loyaltyEngineStore", () => {
  beforeEach(() => {
    mockListPrograms.mockReset();
    mockSimulate.mockReset();
    mockSetActivation.mockReset();
    useLoyaltyEngineStore.setState({
      programs: [],
      rules: [],
      analytics: null,
      lastSimulation: null,
      loadingPrograms: false,
    });
  });

  it("loads programs for an outlet", async () => {
    mockListPrograms.mockResolvedValueOnce([
      { id: "1", outletId: 5, code: "A", name: "Program A", type: "spend_based", isActive: true, rulesCount: 1 },
    ]);
    await useLoyaltyEngineStore.getState().fetchPrograms(5);
    expect(mockListPrograms).toHaveBeenCalledWith({ outletId: 5 });
    expect(useLoyaltyEngineStore.getState().programs).toHaveLength(1);
  });

  it("stores simulation results", async () => {
    mockSimulate.mockResolvedValueOnce({
      programId: "1",
      programCode: "A",
      programName: "Program A",
      programType: "spend_based",
      simulationDate: "2026-06-01",
      isEffective: true,
      isActive: true,
      expectedPoints: 10,
      triggeredRules: [],
      breakdown: [{ step: "spend_based", result: 10 }],
    });
    const result = await useLoyaltyEngineStore.getState().runSimulation({
      outletId: 5,
      programId: 1,
      spendingAmount: 100000,
    });
    expect(result.expectedPoints).toBe(10);
    expect(useLoyaltyEngineStore.getState().lastSimulation?.expectedPoints).toBe(10);
  });

  it("refreshes programs after activation toggle", async () => {
    mockSetActivation.mockResolvedValueOnce({ id: "1", isActive: false });
    mockListPrograms.mockResolvedValue([]);
    useLoyaltyEngineStore.setState({
      programs: [{ id: "1", outletId: 5, code: "A", name: "P", type: "spend_based", isActive: true, rulesCount: 0 }],
    });
    await useLoyaltyEngineStore.getState().setProgramActive("1", false);
    expect(mockSetActivation).toHaveBeenCalledWith("1", false);
    expect(mockListPrograms).toHaveBeenCalled();
  });
});
