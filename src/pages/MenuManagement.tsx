import { Plus, Search, Edit2, ToggleLeft, ToggleRight, X, Trash2, ChefHat, Settings2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createMenuItem, listIngredients, listMenuItems, listOutlets, updateMenuItem, type InventoryItemApi, type MenuItemApi } from "@/lib/api";
import { toast } from "sonner";
import { useOutletStore } from "@/stores/outletStore";

const TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

type EditingRecipe = {
  menuItemId: string;
  menuName: string;
  ingredients: { inventoryItemId: string; quantity: number }[];
};

type EditMenuForm = {
  name: string;
  category: string;
  price: string;
  emoji: string;
  menuItemOutlets: MenuItemOutletForm[];
};

type OutletRow = Awaited<ReturnType<typeof listOutlets>>[number];
type MenuItemOutletForm = {
  outletId: number;
  outletName: string;
  isActive: boolean;
  priceOverride: string;
  nameOverride: string;
  receiptName: string;
};

export default function MenuManagement() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<MenuItemApi[]>([]);
  const [ingredients, setIngredients] = useState<InventoryItemApi[]>([]);
  const [outlets, setOutlets] = useState<OutletRow[]>([]);
  const [editingRecipe, setEditingRecipe] = useState<EditingRecipe | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItemApi | null>(null);
  const [creatingItem, setCreatingItem] = useState(false);
  const [editForm, setEditForm] = useState<EditMenuForm>({ name: "", category: "", price: "", emoji: "", menuItemOutlets: [] });
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditMenuForm, string>>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [createForm, setCreateForm] = useState<EditMenuForm>({ name: "", category: "", price: "", emoji: "", menuItemOutlets: [] });
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof EditMenuForm, string>>>({});
  const [savingCreate, setSavingCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const [blockOnInsufficient, setBlockOnInsufficient] = useState(false);

  const toOutletForms = (allOutlets: OutletRow[], itemOutlets?: MenuItemApi["menuItemOutlets"]): MenuItemOutletForm[] => {
    const mapping = new Map((itemOutlets ?? []).map((row) => [row.outletId, row]));
    return allOutlets.map((outlet) => {
      const row = mapping.get(outlet.id);
      return {
        outletId: outlet.id,
        outletName: outlet.name,
        isActive: row?.isActive ?? false,
        priceOverride: row?.priceOverride !== null && row?.priceOverride !== undefined ? String(row.priceOverride) : "",
        nameOverride: row?.nameOverride ?? "",
        receiptName: row?.receiptName ?? "",
      };
    });
  };

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const menuParams = {
        tenantId: TENANT_ID,
        ...(typeof activeOutletId === "number" && activeOutletId >= 1 ? { outletId: activeOutletId } : {}),
      };
      const ingredientParams = {
        tenantId: TENANT_ID,
        ...(typeof activeOutletId === "number" && activeOutletId >= 1 ? { outletId: activeOutletId } : {}),
      };
      const [menuItems, ingredientsData, outletsData] = await Promise.all([
        listMenuItems(menuParams),
        listIngredients(ingredientParams),
        listOutlets(),
      ]);
      setItems(menuItems);
      setIngredients(ingredientsData);
      setOutlets(outletsData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load menu data");
    } finally {
      setLoading(false);
    }
  }, [activeOutletId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const toggleAvailability = async (id: string) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;

    try {
      const updated = await updateMenuItem(id, { available: !current.available });
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update menu");
    }
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
  const ingredientOptions = ingredients.filter((item) => item.type === "ingredient");

  const openRecipeEditor = (menuItem: MenuItemApi) => {
    const existing = menuItem.recipes ?? [];
    setEditingRecipe({
      menuItemId: menuItem.id,
      menuName: menuItem.name,
      ingredients: existing.map((i) => ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity })),
    });
  };

  const addIngredientRow = () => {
    if (!editingRecipe) return;
    setEditingRecipe({
      ...editingRecipe,
      ingredients: [...editingRecipe.ingredients, { inventoryItemId: "", quantity: 0 }],
    });
  };

  const updateIngredientRow = (index: number, field: "inventoryItemId" | "quantity", value: string | number) => {
    if (!editingRecipe) return;
    const updated = editingRecipe.ingredients.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setEditingRecipe({ ...editingRecipe, ingredients: updated });
  };

  const removeIngredientRow = (index: number) => {
    if (!editingRecipe) return;
    setEditingRecipe({
      ...editingRecipe,
      ingredients: editingRecipe.ingredients.filter((_, i) => i !== index),
    });
  };

  const saveRecipe = async () => {
    if (!editingRecipe) return;
    const valid = editingRecipe.ingredients.filter((i) => i.inventoryItemId && i.quantity > 0);

    try {
      const updated = await updateMenuItem(editingRecipe.menuItemId, {
        recipes: valid,
      });
      setItems((prev) => prev.map((item) => (item.id === editingRecipe.menuItemId ? updated : item)));
      toast.success("Recipe saved");
      setEditingRecipe(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save recipe");
    }
  };

  const getRecipeCount = (menuItemId: string) => {
    const menu = items.find((item) => item.id === menuItemId);
    return menu?.recipes?.length ?? 0;
  };

  const openItemEditor = (item: MenuItemApi) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      emoji: item.emoji,
      menuItemOutlets: toOutletForms(outlets, item.menuItemOutlets),
    });
    setEditErrors({});
  };

  const openCreateModal = () => {
    setCreateForm({ name: "", category: "", price: "", emoji: "", menuItemOutlets: toOutletForms(outlets) });
    setCreateErrors({});
    setCreatingItem(true);
  };

  const validateEditForm = () => {
    const errors: Partial<Record<keyof EditMenuForm, string>> = {};
    if (!editForm.name.trim()) errors.name = "Name is required";
    if (!editForm.category.trim()) errors.category = "Category is required";
    if (editForm.price.trim() === "") {
      errors.price = "Price is required";
    } else if (isNaN(Number(editForm.price)) || Number(editForm.price) < 0) {
      errors.price = "Price must be a valid positive number";
    }
    if (!editForm.emoji.trim()) errors.emoji = "Emoji is required";
    for (const outletRow of editForm.menuItemOutlets) {
      if (outletRow.priceOverride.trim() !== "" && (isNaN(Number(outletRow.priceOverride)) || Number(outletRow.priceOverride) < 0)) {
        errors.price = "Outlet override price must be a valid positive number";
      }
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCreateForm = () => {
    const errors: Partial<Record<keyof EditMenuForm, string>> = {};
    if (!createForm.name.trim()) errors.name = "Name is required";
    if (!createForm.category.trim()) errors.category = "Category is required";
    if (createForm.price.trim() === "") {
      errors.price = "Price is required";
    } else if (isNaN(Number(createForm.price)) || Number(createForm.price) < 0) {
      errors.price = "Price must be a valid positive number";
    }
    if (!createForm.emoji.trim()) errors.emoji = "Emoji is required";
    for (const outletRow of createForm.menuItemOutlets) {
      if (outletRow.priceOverride.trim() !== "" && (isNaN(Number(outletRow.priceOverride)) || Number(outletRow.priceOverride) < 0)) {
        errors.price = "Outlet override price must be a valid positive number";
      }
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveItemEdit = async () => {
    if (!editingItem) return;
    if (!validateEditForm()) return;

    try {
      setSavingEdit(true);
      const updated = await updateMenuItem(editingItem.id, {
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        price: Number(editForm.price),
        emoji: editForm.emoji.trim(),
        menuItemOutlets: editForm.menuItemOutlets.map((row) => ({
          outletId: row.outletId,
          isActive: row.isActive,
          priceOverride: row.priceOverride.trim() !== "" ? Number(row.priceOverride) : null,
          nameOverride: row.nameOverride.trim() || null,
          receiptName: row.receiptName.trim() || null,
        })),
      });
      setItems((prev) => prev.map((item) => (item.id === editingItem.id ? updated : item)));
      toast.success("Menu item updated");
      setEditingItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update menu item");
    } finally {
      setSavingEdit(false);
    }
  };

  const saveNewItem = async () => {
    if (!validateCreateForm()) return;

    try {
      setSavingCreate(true);
      const created = await createMenuItem({
        name: createForm.name.trim(),
        category: createForm.category.trim(),
        price: Number(createForm.price),
        emoji: createForm.emoji.trim(),
        available: true,
        recipes: [],
        menuItemOutlets: createForm.menuItemOutlets.map((row) => ({
          outletId: row.outletId,
          isActive: row.isActive,
          priceOverride: row.priceOverride.trim() !== "" ? Number(row.priceOverride) : null,
          nameOverride: row.nameOverride.trim() || null,
          receiptName: row.receiptName.trim() || null,
        })),
      });
      setItems((prev) => [created, ...prev]);
      toast.success("Menu item created");
      setCreatingItem(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create menu item");
    } finally {
      setSavingCreate(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menu Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{items.length} items</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-xs">
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Block insufficient stock</span>
            <button onClick={() => setBlockOnInsufficient(!blockOnInsufficient)}>
              {blockOnInsufficient ? (
                <ToggleRight className="h-5 w-5 text-primary" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Loading menu...</p>
        </div>
      ) : (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b bg-muted/30">
              <th className="p-4 font-medium">Item</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Price</th>
              <th className="p-4 font-medium">Recipe</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const recipeCount = getRecipeCount(item.id);
              return (
                <tr key={item.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{item.category}</td>
                  <td className="p-4 font-semibold text-foreground">{formatRp(item.price)}</td>
                  <td className="p-4">
                    <button
                      onClick={() => openRecipeEditor(item)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                        recipeCount > 0
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <ChefHat className="h-3 w-3" />
                      {recipeCount > 0 ? `${recipeCount} ingredients` : "No recipe"}
                    </button>
                  </td>
                  <td className="p-4">
                    <button onClick={() => toggleAvailability(item.id)}>
                      {item.available ? (
                        <span className="flex items-center gap-1.5 text-success text-xs font-medium">
                          <ToggleRight className="h-5 w-5" /> Available
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                          <ToggleLeft className="h-5 w-5" /> Unavailable
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => openItemEditor(item)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      aria-label={`Edit ${item.name}`}
                      title={`Edit ${item.name}`}
                    >
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Recipe Editor Modal */}
      <AnimatePresence>
        {editingRecipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setEditingRecipe(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-border/50">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-primary" /> Recipe
                  </h2>
                  <p className="text-sm text-muted-foreground">{editingRecipe.menuName}</p>
                </div>
                <button onClick={() => setEditingRecipe(null)} className="p-2 rounded-lg hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {editingRecipe.ingredients.length === 0 && (
                  <div className="text-center py-8">
                    <ChefHat className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No ingredients yet</p>
                    <p className="text-xs text-muted-foreground/60">Add ingredients to track stock usage</p>
                  </div>
                )}

                {editingRecipe.ingredients.map((ri, index) => {
                  const selectedIng = ingredients.find((i) => i.id === ri.inventoryItemId);
                  return (
                    <div key={index} className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/30">
                      <div className="flex-1">
                        <select
                          value={ri.inventoryItemId}
                          onChange={(e) => updateIngredientRow(index, "inventoryItemId", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">Select ingredient...</option>
                          {ingredientOptions.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.stock} {ing.unit} left)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={ri.quantity || ""}
                          onChange={(e) => updateIngredientRow(index, "quantity", parseFloat(e.target.value) || 0)}
                          placeholder="Qty"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      {selectedIng && (
                        <span className="text-xs text-muted-foreground w-10 text-center">{selectedIng.unit}</span>
                      )}
                      <button
                        onClick={() => removeIngredientRow(index)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={addIngredientRow}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary/30 text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Ingredient
                </button>
              </div>

              <div className="p-5 border-t border-border/50 flex gap-2">
                <button
                  onClick={() => setEditingRecipe(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRecipe}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Save Recipe
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Item Modal */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setEditingItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-5 border-b border-border/50">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Edit Menu Item</h2>
                  <p className="text-sm text-muted-foreground">Update item details</p>
                </div>
                <button onClick={() => setEditingItem(null)} className="p-2 rounded-lg hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Item Name</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      editErrors.name ? "border-destructive" : "border-border"
                    }`}
                    placeholder="e.g. Nasi Goreng Special"
                  />
                  {editErrors.name && <p className="text-xs text-destructive">{editErrors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <input
                    value={editForm.category}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      editErrors.category ? "border-destructive" : "border-border"
                    }`}
                    placeholder="e.g. Main Course"
                  />
                  {editErrors.category && <p className="text-xs text-destructive">{editErrors.category}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Price</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.price}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        editErrors.price ? "border-destructive" : "border-border"
                      }`}
                      placeholder="0"
                    />
                    {editErrors.price && <p className="text-xs text-destructive">{editErrors.price}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Emoji</label>
                    <input
                      value={editForm.emoji}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, emoji: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        editErrors.emoji ? "border-destructive" : "border-border"
                      }`}
                      placeholder="🍛"
                    />
                    {editErrors.emoji && <p className="text-xs text-destructive">{editErrors.emoji}</p>}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-sm font-medium text-foreground">Outlet Settings</label>
                  <div className="space-y-2 max-h-56 overflow-y-auto border border-border/50 rounded-xl p-3 bg-muted/10">
                    {editForm.menuItemOutlets.map((row) => (
                      <div key={row.outletId} className="rounded-lg border border-border/40 p-3 space-y-2 bg-background">
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <input
                            type="checkbox"
                            checked={row.isActive}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                menuItemOutlets: prev.menuItemOutlets.map((outletRow) =>
                                  outletRow.outletId === row.outletId ? { ...outletRow, isActive: e.target.checked } : outletRow
                                ),
                              }))
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          {row.outletName}
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input
                            value={row.nameOverride}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                menuItemOutlets: prev.menuItemOutlets.map((outletRow) =>
                                  outletRow.outletId === row.outletId ? { ...outletRow, nameOverride: e.target.value } : outletRow
                                ),
                              }))
                            }
                            placeholder="POS name override"
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <input
                            type="number"
                            min="0"
                            value={row.priceOverride}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                menuItemOutlets: prev.menuItemOutlets.map((outletRow) =>
                                  outletRow.outletId === row.outletId ? { ...outletRow, priceOverride: e.target.value } : outletRow
                                ),
                              }))
                            }
                            placeholder="Price override"
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <input
                            value={row.receiptName}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                menuItemOutlets: prev.menuItemOutlets.map((outletRow) =>
                                  outletRow.outletId === row.outletId ? { ...outletRow, receiptName: e.target.value } : outletRow
                                ),
                              }))
                            }
                            placeholder="Receipt name"
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-border/50 flex gap-2">
                <button
                  onClick={() => setEditingItem(null)}
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveItemEdit}
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Item Modal */}
      <AnimatePresence>
        {creatingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setCreatingItem(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-5 border-b border-border/50">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Add Menu Item</h2>
                  <p className="text-sm text-muted-foreground">Create a new item</p>
                </div>
                <button onClick={() => setCreatingItem(false)} className="p-2 rounded-lg hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Item Name</label>
                  <input
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      createErrors.name ? "border-destructive" : "border-border"
                    }`}
                    placeholder="e.g. Nasi Goreng Special"
                  />
                  {createErrors.name && <p className="text-xs text-destructive">{createErrors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <input
                    value={createForm.category}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      createErrors.category ? "border-destructive" : "border-border"
                    }`}
                    placeholder="e.g. Main Course"
                  />
                  {createErrors.category && <p className="text-xs text-destructive">{createErrors.category}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Price</label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.price}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, price: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        createErrors.price ? "border-destructive" : "border-border"
                      }`}
                      placeholder="0"
                    />
                    {createErrors.price && <p className="text-xs text-destructive">{createErrors.price}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Emoji</label>
                    <input
                      value={createForm.emoji}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, emoji: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        createErrors.emoji ? "border-destructive" : "border-border"
                      }`}
                      placeholder="🍛"
                    />
                    {createErrors.emoji && <p className="text-xs text-destructive">{createErrors.emoji}</p>}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-sm font-medium text-foreground">Outlet Settings</label>
                  <div className="space-y-2 max-h-56 overflow-y-auto border border-border/50 rounded-xl p-3 bg-muted/10">
                    {createForm.menuItemOutlets.map((row) => (
                      <div key={row.outletId} className="rounded-lg border border-border/40 p-3 space-y-2 bg-background">
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <input
                            type="checkbox"
                            checked={row.isActive}
                            onChange={(e) =>
                              setCreateForm((prev) => ({
                                ...prev,
                                menuItemOutlets: prev.menuItemOutlets.map((outletRow) =>
                                  outletRow.outletId === row.outletId ? { ...outletRow, isActive: e.target.checked } : outletRow
                                ),
                              }))
                            }
                            className="h-4 w-4 accent-primary"
                          />
                          {row.outletName}
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input
                            value={row.nameOverride}
                            onChange={(e) =>
                              setCreateForm((prev) => ({
                                ...prev,
                                menuItemOutlets: prev.menuItemOutlets.map((outletRow) =>
                                  outletRow.outletId === row.outletId ? { ...outletRow, nameOverride: e.target.value } : outletRow
                                ),
                              }))
                            }
                            placeholder="POS name override"
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <input
                            type="number"
                            min="0"
                            value={row.priceOverride}
                            onChange={(e) =>
                              setCreateForm((prev) => ({
                                ...prev,
                                menuItemOutlets: prev.menuItemOutlets.map((outletRow) =>
                                  outletRow.outletId === row.outletId ? { ...outletRow, priceOverride: e.target.value } : outletRow
                                ),
                              }))
                            }
                            placeholder="Price override"
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <input
                            value={row.receiptName}
                            onChange={(e) =>
                              setCreateForm((prev) => ({
                                ...prev,
                                menuItemOutlets: prev.menuItemOutlets.map((outletRow) =>
                                  outletRow.outletId === row.outletId ? { ...outletRow, receiptName: e.target.value } : outletRow
                                ),
                              }))
                            }
                            placeholder="Receipt name"
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-border/50 flex gap-2">
                <button
                  onClick={() => setCreatingItem(false)}
                  disabled={savingCreate}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNewItem}
                  disabled={savingCreate}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingCreate ? "Saving..." : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
