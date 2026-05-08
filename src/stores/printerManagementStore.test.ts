import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "./settingsStore";
import { usePrinterManagementStore } from "./printerManagementStore";

const mockListPrinterQueues = vi.fn();
const mockRetryPrinterQueueJob = vi.fn();
const mockPatchPrinter = vi.fn();
const mockPostPrinter = vi.fn();
const mockGetApiAccessToken = vi.fn();

vi.mock("@/lib/api-integration/client", () => ({
  getApiAccessToken: () => mockGetApiAccessToken(),
}));

vi.mock("@/lib/api-integration/printerManagementEndpoints", () => ({
  listPrinterQueues: (...args: unknown[]) => mockListPrinterQueues(...args),
  retryPrinterQueueJob: (...args: unknown[]) => mockRetryPrinterQueueJob(...args),
}));

vi.mock("@/lib/api-integration/settingsDomainEndpoints", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-integration/settingsDomainEndpoints")>(
    "@/lib/api-integration/settingsDomainEndpoints",
  );
  return {
    ...actual,
    patchPrinter: (...args: unknown[]) => mockPatchPrinter(...args),
    postPrinter: (...args: unknown[]) => mockPostPrinter(...args),
  };
});

describe("printerManagementStore orchestration", () => {
  beforeEach(() => {
    mockListPrinterQueues.mockReset();
    mockRetryPrinterQueueJob.mockReset();
    mockPatchPrinter.mockReset();
    mockPostPrinter.mockReset();
    mockGetApiAccessToken.mockReset();
    usePrinterManagementStore.getState().reset();
    useSettingsStore.setState({
      outlets: [{ id: 1, code: "OUT-1", name: "Main", address: "", phone: "", manager: "", status: "active" }],
      printers: [],
    });
  });

  it("renders queue data from store fetch", async () => {
    mockGetApiAccessToken.mockReturnValue("token");
    mockListPrinterQueues.mockResolvedValue([
      { printerId: "p-1", printerName: "Kitchen A", pending: 2, failed: 1, printing: 1, jobs: [] },
    ]);

    await usePrinterManagementStore.getState().fetchQueueStatus();
    expect(usePrinterManagementStore.getState().queueByPrinter[0]?.pending).toBe(2);
  });

  it("retries failed queue jobs through store action", async () => {
    mockGetApiAccessToken.mockReturnValue("token");
    usePrinterManagementStore.setState({
      queueByPrinter: [
        {
          printerId: "p-1",
          printerName: "Kitchen A",
          pending: 0,
          failed: 1,
          printing: 0,
          jobs: [{ id: "job-1", status: "failed", route: "kitchen", attempts: 3, createdAt: null }],
        },
      ],
    });
    mockRetryPrinterQueueJob.mockResolvedValue({ id: "job-1", status: "pending", attempts: 4 });

    await usePrinterManagementStore.getState().retryFailedJob("p-1", "job-1");

    const queue = usePrinterManagementStore.getState().queueByPrinter[0];
    expect(mockRetryPrinterQueueJob).toHaveBeenCalledWith("p-1", "job-1");
    expect(queue.failed).toBe(0);
    expect(queue.pending).toBe(1);
    expect(queue.jobs[0]?.status).toBe("pending");
  });

  it("keeps page orchestration store-only for create/update profile", async () => {
    mockGetApiAccessToken.mockReturnValue("token");
    mockPostPrinter.mockResolvedValue({
      id: "p-2",
      name: "Cashier A",
      printerType: "cashier",
      connection: "lan",
      outletId: 1,
      ip: "192.168.1.2",
      assignedCategories: [],
    });

    await usePrinterManagementStore.getState().saveProfile({
      id: "p-2",
      name: "Cashier A",
      printerType: "cashier",
      connection: "lan",
      outletId: 1,
      ip: "192.168.1.2",
      routeRules: ["cashier"],
    });

    expect(mockPostPrinter).toHaveBeenCalledTimes(1);
    expect(useSettingsStore.getState().printers[0]?.id).toBe("p-2");
  });
});
