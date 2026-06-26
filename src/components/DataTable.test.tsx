// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { from?: number; to?: number; total?: number; current?: number }) => {
      if (key === "dataTable.showingRange" && opts) {
        return `Showing ${opts.from}–${opts.to} of ${opts.total}`;
      }
      if (key === "dataTable.pageInfo" && opts) {
        return `Page ${opts.current} / ${opts.total}`;
      }
      const defaults: Record<string, string> = {
        "dataTable.searchPlaceholder": "Search…",
        "dataTable.emptyMessage": "No data available",
        "dataTable.loadingLabel": "Loading table",
        "dataTable.rowsPerPage": "Rows per page",
      };
      return defaults[key] ?? key;
    },
  }),
}));

vi.mock("@/components/skeletons/SkeletonBusyRegion", () => ({
  SkeletonBusyRegion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/skeletons/table/SkeletonTableBodyRows", () => ({
  SkeletonTableBodyRows: () => <tr><td>loading</td></tr>,
}));

type Row = { id: number; name: string; role: string };

const rows: Row[] = [{ id: 1, name: "Alice", role: "Manager" }];

const columns = [
  { key: "name", header: "Name" },
  { key: "role", header: "Role" },
];

describe("DataTable mobile cards", () => {
  it("renders mobile card view and hides desktop table below lg breakpoint", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => String(row.id)}
        searchable={false}
      />,
    );

    const mobilePanel = document.querySelector(".lg\\:hidden.p-4");
    expect(mobilePanel).not.toBeNull();
    expect(mobilePanel?.querySelector(".rounded-xl.border")).not.toBeNull();
    expect(mobilePanel?.textContent).toContain("Alice");
    const table = document.querySelector("table");
    expect(table).not.toBeNull();
    expect(table?.closest(".hidden.lg\\:block")).not.toBeNull();
  });
});
