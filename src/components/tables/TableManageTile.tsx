import type { FloorTableApi } from "@/lib/api-integration/tableEndpoints";
import type { Order } from "@/stores/orderStore";
import { TableFloorTile, type TableFloorTileProps } from "./TableFloorTile";

export type TableManageTileProps = Omit<TableFloorTileProps, "showCheckbox"> & {
  table: FloorTableApi;
  linkedOrder: Order | null;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
};

export function TableManageTile({
  selectMode,
  selected,
  onToggleSelect,
  selectTableAria,
  ...props
}: TableManageTileProps) {
  return (
    <TableFloorTile
      {...props}
      showCheckbox={selectMode}
      checked={selected}
      onCheckedChange={onToggleSelect}
      selectTableAria={selectTableAria}
    />
  );
}
