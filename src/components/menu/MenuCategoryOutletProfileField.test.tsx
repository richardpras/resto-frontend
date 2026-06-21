// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MenuCategoryOutletProfileField,
  buildCategoryOutletProfileRows,
} from "./MenuCategoryOutletProfileField";

describe("MenuCategoryOutletProfileField", () => {
  const outlets = [{ id: 1, code: "OUT-1", name: "Outlet 1", address: "", phone: "", manager: "", status: "active" as const }];
  const printers = [
    { id: "10", name: "Kitchen Printer", printerType: "kitchen" as const, connection: "lan" as const, ip: "10.0.0.2", outletId: 1, printerProfileId: 10 },
  ];

  it("builds outlet profile rows from existing mappings", () => {
    const rows = buildCategoryOutletProfileRows(
      outlets,
      [{ id: 99, outletId: 1, menuCategoryId: 1, printerProfileId: 10, priority: 10, isActive: true }],
      1,
    );
    expect(rows).toEqual([
      {
        outletId: 1,
        outletName: "Outlet 1",
        isActive: true,
        printerProfileId: "10",
        mappingId: 99,
      },
    ]);
  });

  it("renders outlet checkbox and printer select when active", () => {
    const onChange = vi.fn();
    render(
      <MenuCategoryOutletProfileField
        outlets={outlets}
        printers={printers}
        mappings={[]}
        rows={[
          {
            outletId: 1,
            outletName: "Outlet 1",
            isActive: true,
            printerProfileId: "",
            mappingId: null,
          },
        ]}
        onChange={onChange}
      />,
    );

    expect(screen.getByTestId("menu-category-outlet-profile")).toBeInTheDocument();
    expect(screen.getByText("Outlet 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalled();
  });

  it("includes cashier printers in dropdown options", () => {
    render(
      <MenuCategoryOutletProfileField
        outlets={outlets}
        printers={[
          { id: "12", name: "Cashier Printer", printerType: "cashier" as const, connection: "lan" as const, ip: "10.0.0.4", outletId: 1, printerProfileId: 12 },
          ...printers,
        ]}
        mappings={[]}
        rows={[
          {
            outletId: 1,
            outletName: "Outlet 1",
            isActive: true,
            printerProfileId: "",
            mappingId: null,
          },
        ]}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByText("Cashier Printer (cashier)")).toBeInTheDocument();
  });

  it("shows unsynced printer hint when outlet has printers without profile", () => {
    render(
      <MenuCategoryOutletProfileField
        outlets={outlets}
        printers={[
          { id: "11", name: "Bar Printer", printerType: "bar", connection: "lan", ip: "10.0.0.3", outletId: 1 },
        ]}
        mappings={[]}
        rows={[
          {
            outletId: 1,
            outletName: "Outlet 1",
            isActive: true,
            printerProfileId: "",
            mappingId: null,
          },
        ]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/not synced yet/i)).toBeInTheDocument();
    expect(screen.getByText("Bar Printer")).toBeInTheDocument();
  });
});
