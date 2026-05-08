// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import PrinterSettings from "./settings/PrinterSettings";
import { useSettingsStore } from "@/stores/settingsStore";
import { usePrinterManagementStore } from "@/stores/printerManagementStore";

describe("PrinterSettings queue panel", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      outlets: [{ id: 1, code: "OUT-1", name: "Main", address: "", phone: "", manager: "", status: "active" }],
      printers: [
        { id: "p-1", name: "Kitchen A", printerType: "kitchen", connection: "lan", outletId: 1, ip: "192.168.1.10" },
      ],
    });
    usePrinterManagementStore.setState({
      queueByPrinter: [
        {
          printerId: "p-1",
          printerName: "Kitchen A",
          pending: 2,
          failed: 1,
          printing: 1,
          jobs: [{ id: "job-1", status: "failed", route: "kitchen", attempts: 2, createdAt: null }],
        },
      ],
      isLoadingQueue: false,
      isSavingProfile: false,
      error: null,
      fetchQueueStatus: async () => undefined,
    });
  });

  it("renders printer queue status from store state", () => {
    render(<PrinterSettings />);
    expect(screen.getByText(/Queue Status/i)).toBeTruthy();
    expect(screen.getAllByText(/Kitchen A/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pending:/i).textContent).toContain("2");
    expect(screen.getByText(/Pending:/i).textContent).toContain("Failed: 1");
  });
});
