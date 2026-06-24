// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TableFloorTile } from "./TableFloorTile";
import type { FloorTableApi } from "@/lib/api-integration/tableEndpoints";

const table: FloorTableApi = {
  id: 1,
  outletId: 1,
  name: "T12",
  capacity: 4,
  status: "active",
  tableOperationalStatus: "available",
  qrEnabled: true,
  qrUrl: "https://example.com/qr/T12",
};

const statusConfig = {
  label: "Available",
  color: "bg-success/10 text-success border-success/20",
  dot: "bg-success",
};

describe("TableFloorTile", () => {
  it("calls onOpen when clicked", () => {
    const onOpen = vi.fn();
    render(
      <TableFloorTile
        table={table}
        statusConfig={statusConfig}
        linkedOrder={null}
        seatsLabel="4 seats"
        reservationLabel="Reservation"
        qrEnabledLabel="Enabled"
        qrDisabledLabel="Disabled"
        openDetailAria="Open T12"
        onOpen={onOpen}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open T12" }));
    expect(onOpen).toHaveBeenCalled();
  });

  it("does not render full QR URL in the tile", () => {
    render(
      <TableFloorTile
        table={table}
        statusConfig={statusConfig}
        linkedOrder={null}
        seatsLabel="4 seats"
        reservationLabel="Reservation"
        qrEnabledLabel="Enabled"
        qrDisabledLabel="Disabled"
        openDetailAria="Open T12"
        onOpen={vi.fn()}
      />,
    );
    expect(screen.queryByText(table.qrUrl!)).not.toBeInTheDocument();
  });
});
