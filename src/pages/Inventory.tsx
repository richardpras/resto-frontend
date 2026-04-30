import { Package, AlertTriangle, TrendingDown, Search, Plus, Pencil, Trash2, Paperclip, Armchair } from "lucide-react";
import { useEffect, useState } from "react";
import { type InventoryItemType } from "@/stores/inventoryStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InventoryFormModal from "@/components/InventoryFormModal";
import { toast } from "@/hooks/use-toast";
import {
  createIngredient,
  deleteIngredient,
  listIngredients,
  type InventoryItemApi,
  type InventoryPayload,
  updateIngredient,
} from "@/lib/api";

const typeIcon: Record<InventoryItemType, React.ReactNode> = {
  ingredient: <Package className="h-4 w-4" />,
  atk: <Paperclip className="h-4 w-4" />,
  asset: <Armchair className="h-4 w-4" />,
};

const typeBadge: Record<InventoryItemType, { label: string; className: string }> = {
  ingredient: { label: "Ingredient", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  atk: { label: "ATK", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  asset: { label: "Asset", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
};

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<InventoryItemType | "all">("all");
  const [ingredients, setIngredients] = useState<InventoryItemApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItemApi | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await listIngredients();
        setIngredients(data);
      } catch (error) {
        toast({
          title: "Failed to load inventory",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filtered = ingredients
    .filter((i) => filterType === "all" || i.type === filterType)
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const lowCount = ingredients.filter((i) => i.type !== "asset" && i.stock < i.min).length;

  const handleEdit = (item: InventoryItemApi) => {
    setEditItem(item);
    setFormOpen(true);
  };

  const handleDelete = async (item: InventoryItemApi) => {
    try {
      await deleteIngredient(item.id);
      setIngredients((prev) => prev.filter((i) => i.id !== item.id));
      toast({ title: "Deleted", description: `${item.name} removed from inventory.` });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleCreate = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  const counts = {
    all: ingredients.length,
    ingredient: ingredients.filter((i) => i.type === "ingredient").length,
    atk: ingredients.filter((i) => i.type === "atk").length,
    asset: ingredients.filter((i) => i.type === "asset").length,
  };

  const handleSave = async (payload: InventoryPayload, id?: string) => {
    if (id) {
      const updated = await updateIngredient(id, payload);
      setIngredients((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return;
    }

    const created = await createIngredient(payload);
    setIngredients((prev) => [created, ...prev]);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{ingredients.length} items tracked</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {lowCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-warning/10 border border-warning/20 mb-4">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{lowCount} items below minimum stock</p>
            <p className="text-xs text-muted-foreground">Consider placing a purchase order</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["all", "ingredient", "atk", "asset"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              filterType === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            }`}
          >
            {t === "all" ? "All" : typeBadge[t].label} ({counts[t]})
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Loading inventory...</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((item) => {
          const isLow = item.type !== "asset" && item.stock < item.min;
          const tb = typeBadge[item.type];
          return (
            <div
              key={item.id}
              className={`bg-card rounded-2xl p-4 border shadow-sm group ${isLow ? "border-warning/30" : "border-border/50"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0">{typeIcon[item.type]}</span>
                  <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={`text-[10px] ${tb.className}`}>
                    {tb.label}
                  </Badge>
                  {isLow && (
                    <span className="flex items-center gap-0.5 text-xs font-medium text-warning ml-1">
                      <TrendingDown className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">{item.stock}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.type !== "asset" ? `Min: ${item.min} ${item.unit}` : item.unit}
                  </p>
                  {item.price && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Rp {item.price.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {item.type !== "asset" && (
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full transition-all ${isLow ? "bg-warning" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, (item.stock / Math.max(1, item.min * 2)) * 100)}%` }}
                  />
                </div>
              )}

              {item.notes && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{item.notes}</p>
              )}
            </div>
          );
        })}
      </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No items found</p>
        </div>
      )}

      <InventoryFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editItem={editItem}
        onSave={handleSave}
      />
    </div>
  );
}
