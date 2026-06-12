import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { listMenuItems, type MenuItemApi } from "@/lib/api-integration/endpoints";

type Props = {
  outletId: number;
  onSelect: (item: MenuItemApi) => void;
};

export function QrOrderMenuPicker({ outletId, onSelect }: Props) {
  const [search, setSearch] = useState("");

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ["qr-review-menu", outletId],
    queryFn: () => listMenuItems({ outletId, perPage: 200 }),
    enabled: outletId > 0,
  });

  const filtered = useMemo(
    () =>
      menuItems.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [menuItems, search],
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading menu...</p>;
  }

  return (
    <div className="space-y-3" data-testid="qr-order-menu-picker">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu..."
          className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm flex justify-between gap-2"
          >
            <span>{item.name}</span>
            <span className="text-muted-foreground shrink-0">
              Rp {Number(item.price).toLocaleString("id-ID")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
