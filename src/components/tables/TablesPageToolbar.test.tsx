// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TablesPageToolbar } from "./TablesPageToolbar";

const baseProps = {
  searchQuery: "",
  onSearchQueryChange: vi.fn(),
  searchPlaceholder: "Search table name…",
  mode: "floor" as const,
  onModeChange: vi.fn(),
  modeFloorLabel: "Floor",
  modeManageLabel: "Manage",
  statusChips: [
    { key: "all" as const, label: "All", count: 3 },
    { key: "occupied" as const, label: "Occupied", count: 1 },
  ],
  statusFilter: "all" as const,
  onStatusFilterChange: vi.fn(),
  canManage: true,
  addTableLabel: "Add table",
  onAddTable: vi.fn(),
  selectMode: false,
  onSelectModeToggle: vi.fn(),
  selectTablesLabel: "Select tables",
  cancelSelectLabel: "Cancel select",
  selectedCount: 0,
  printSelectedLabel: "Print selected (0)",
  onPrintSelected: vi.fn(),
};

describe("TablesPageToolbar", () => {
  it("renders search input", () => {
    render(<TablesPageToolbar {...baseProps} />);
    expect(screen.getByTestId("tables-search-input")).toBeInTheDocument();
  });

  it("calls onSearchQueryChange when typing", () => {
    const onSearchQueryChange = vi.fn();
    render(<TablesPageToolbar {...baseProps} onSearchQueryChange={onSearchQueryChange} />);
    fireEvent.change(screen.getByTestId("tables-search-input"), { target: { value: "T12" } });
    expect(onSearchQueryChange).toHaveBeenCalledWith("T12");
  });

  it("calls onStatusFilterChange when filter chip clicked", () => {
    const onStatusFilterChange = vi.fn();
    render(<TablesPageToolbar {...baseProps} onStatusFilterChange={onStatusFilterChange} />);
    fireEvent.click(screen.getByTestId("tables-filter-occupied"));
    expect(onStatusFilterChange).toHaveBeenCalledWith("occupied");
  });
});
