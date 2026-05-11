import { create } from "zustand";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  createInventoryItem as apiCreateInventoryItem,
  createStockMovement as apiCreateStockMovement,
  deleteInventoryItem as apiDeleteInventoryItem,
  listInventoryWithMeta as apiListInventoryWithMeta,
  listStockMovementsWithMeta as apiListStockMovementsWithMeta,
  updateInventoryItem as apiUpdateInventoryItem,
  type InventoryListMeta,
  type InventoryPayload,
  type ListInventoryParams,
  type ListStockMovementsParams,
  type StockMovementPayload,
} from "@/lib/api-integration/inventoryEndpoints";
import {
  mapInventoryItemApiToStore,
  mapStockMovementApiToStore,
} from "@/domain/inventoryAdapters";
export type { InventoryPayload } from "@/lib/api-integration/inventoryEndpoints";

export type InventoryItemType = "ingredient" | "atk" | "asset";

export type InventoryItem = {
  id: string;
  name: string;
  type: InventoryItemType;
  stock: number;
  min: number;
  unit: string;
  price?: number;
  notes?: string;
};

export type StockMovement = {
  id: string;
  inventoryItemId: string;
  outletId: number | null;
  inventoryItemName: string | null;
  type: "purchase" | "sale" | "adjustment" | "waste";
  quantity: number;
  sourceType: string;
  sourceId: string | null;
  createdAt: string | null;
};

export type Ingredient = InventoryItem;
export type RecipeItem = { ingredientId: string; qty: number };
export type Recipe = { menuItemId: string; ingredients: RecipeItem[] };

type InventoryStore = {
  ingredients: InventoryItem[];
  stockMovements: StockMovement[];
  recipes: Recipe[];
  blockOnInsufficient: boolean;
  isLoading: boolean;
  isInventoryLoading: boolean;
  isMovementLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  pagination: InventoryListMeta | null;
  movementPagination: InventoryListMeta | null;
  lastSyncAt: string | null;
  lastListParams: ListInventoryParams | null;
  lastMovementListParams: ListStockMovementsParams | null;
  setBlockOnInsufficient: (v: boolean) => void;
  fetchInventory: (params?: ListInventoryParams) => Promise<InventoryItem[]>;
  revalidateInventory: () => Promise<InventoryItem[] | null>;
  fetchStockMovements: (params?: ListStockMovementsParams) => Promise<StockMovement[]>;
  revalidateStockMovements: () => Promise<StockMovement[] | null>;
  createItemRemote: (payload: InventoryPayload) => Promise<InventoryItem>;
  updateItemRemote: (id: string, payload: Partial<InventoryPayload>) => Promise<InventoryItem>;
  deleteItemRemote: (id: string) => Promise<void>;
  createStockMovementRemote: (payload: StockMovementPayload) => Promise<StockMovement>;
  addItem: (item: Omit<InventoryItem, "id">) => void;
  updateItem: (id: string, data: Partial<Omit<InventoryItem, "id">>) => void;
  removeItem: (id: string) => void;
  addRecipe: (menuItemId: string, ingredients: RecipeItem[]) => void;
  removeRecipe: (menuItemId: string) => void;
  getRecipe: (menuItemId: string) => Recipe | undefined;
  deductStock: (menuItemId: string, qty: number) => { success: boolean; missing: string[] };
  updateIngredientStock: (ingredientId: string, newStock: number) => void;
  resetAsync: () => void;
};

const defaultRecipes: Recipe[] = [
  { menuItemId: "1", ingredients: [{ ingredientId: "ing-1", qty: 0.3 }, { ingredientId: "ing-4", qty: 2 }, { ingredientId: "ing-3", qty: 0.05 }, { ingredientId: "ing-9", qty: 0.02 }, { ingredientId: "ing-11", qty: 0.02 }] },
  { menuItemId: "2", ingredients: [{ ingredientId: "ing-2", qty: 0.25 }, { ingredientId: "ing-9", qty: 0.03 }, { ingredientId: "ing-11", qty: 0.02 }] },
  { menuItemId: "3", ingredients: [{ ingredientId: "ing-5", qty: 1 }, { ingredientId: "ing-4", qty: 1 }, { ingredientId: "ing-3", qty: 0.05 }] },
  { menuItemId: "4", ingredients: [{ ingredientId: "ing-2", qty: 0.3 }, { ingredientId: "ing-13", qty: 0.05 }, { ingredientId: "ing-9", qty: 0.03 }] },
  { menuItemId: "8", ingredients: [{ ingredientId: "ing-7", qty: 0.1 }, { ingredientId: "ing-6", qty: 0.03 }] },
  { menuItemId: "10", ingredients: [{ ingredientId: "ing-8", qty: 0.02 }, { ingredientId: "ing-6", qty: 0.02 }] },
  { menuItemId: "12", ingredients: [{ ingredientId: "ing-16", qty: 2 }, { ingredientId: "ing-15", qty: 0.1 }, { ingredientId: "ing-3", qty: 0.05 }] },
];

let nextId = 100;

function mapApiError(error: unknown): string {
  if (error instanceof ApiHttpError) return error.message;
  if (error instanceof Error) return error.message;
  return "Inventory request failed";
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  ingredients: [],
  stockMovements: [],
  recipes: defaultRecipes,
  blockOnInsufficient: false,
  isLoading: false,
  isInventoryLoading: false,
  isMovementLoading: false,
  isSubmitting: false,
  error: null,
  pagination: null,
  movementPagination: null,
  lastSyncAt: null,
  lastListParams: null,
  lastMovementListParams: null,

  setBlockOnInsufficient: (v) => set({ blockOnInsufficient: v }),

  fetchInventory: async (params) => {
    set({ isLoading: true, isInventoryLoading: true, error: null, lastListParams: params ?? null });
    try {
      const result = await apiListInventoryWithMeta(params);
      if (get().lastListParams !== (params ?? null)) {
        return get().ingredients;
      }
      const mapped = result.items.map(mapInventoryItemApiToStore);
      set({
        ingredients: mapped,
        pagination: result.meta,
        lastSyncAt: new Date().toISOString(),
      });
      return mapped;
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      const nextMovementLoading = get().isMovementLoading;
      set({ isInventoryLoading: false, isLoading: nextMovementLoading });
    }
  },

  revalidateInventory: async () => {
    const params = get().lastListParams;
    if (params === null) return null;
    return get().fetchInventory(params);
  },

  fetchStockMovements: async (params) => {
    set({ isLoading: true, isMovementLoading: true, error: null, lastMovementListParams: params ?? null });
    try {
      const result = await apiListStockMovementsWithMeta(params);
      if (get().lastMovementListParams !== (params ?? null)) {
        return get().stockMovements;
      }
      const mapped = result.movements.map(mapStockMovementApiToStore);
      set({
        stockMovements: mapped,
        movementPagination: result.meta,
        lastSyncAt: new Date().toISOString(),
      });
      return mapped;
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      const nextInventoryLoading = get().isInventoryLoading;
      set({ isMovementLoading: false, isLoading: nextInventoryLoading });
    }
  },

  revalidateStockMovements: async () => {
    const params = get().lastMovementListParams;
    if (params === null) return null;
    return get().fetchStockMovements(params);
  },

  createItemRemote: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const created = mapInventoryItemApiToStore(await apiCreateInventoryItem(payload));
      set((state) => ({
        ingredients: [created, ...state.ingredients],
        lastSyncAt: new Date().toISOString(),
      }));
      return created;
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateItemRemote: async (id, payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const updated = mapInventoryItemApiToStore(await apiUpdateInventoryItem(id, payload));
      set((state) => ({
        ingredients: state.ingredients.map((item) => (item.id === id ? updated : item)),
        lastSyncAt: new Date().toISOString(),
      }));
      return updated;
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteItemRemote: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      await apiDeleteInventoryItem(id);
      set((state) => ({
        ingredients: state.ingredients.filter((item) => item.id !== id),
        lastSyncAt: new Date().toISOString(),
      }));
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  createStockMovementRemote: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const created = mapStockMovementApiToStore(await apiCreateStockMovement(payload));
      set((state) => ({
        stockMovements: [created, ...state.stockMovements],
        lastSyncAt: new Date().toISOString(),
      }));
      return created;
    } catch (error) {
      set({ error: mapApiError(error) });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  addItem: (item) =>
    set((s) => ({
      ingredients: [...s.ingredients, { ...item, id: `inv-${nextId++}` }],
    })),

  updateItem: (id, data) =>
    set((s) => ({
      ingredients: s.ingredients.map((i) => (i.id === id ? { ...i, ...data } : i)),
    })),

  removeItem: (id) =>
    set((s) => ({ ingredients: s.ingredients.filter((i) => i.id !== id) })),

  addRecipe: (menuItemId, ingredients) =>
    set((s) => ({
      recipes: [
        ...s.recipes.filter((r) => r.menuItemId !== menuItemId),
        { menuItemId, ingredients },
      ],
    })),

  removeRecipe: (menuItemId) =>
    set((s) => ({ recipes: s.recipes.filter((r) => r.menuItemId !== menuItemId) })),

  getRecipe: (menuItemId) => get().recipes.find((r) => r.menuItemId === menuItemId),

  deductStock: (menuItemId, qty) => {
    const recipe = get().recipes.find((r) => r.menuItemId === menuItemId);
    if (!recipe) return { success: true, missing: [] };

    const { ingredients, blockOnInsufficient } = get();
    const missing: string[] = [];

    for (const ri of recipe.ingredients) {
      const ing = ingredients.find((i) => i.id === ri.ingredientId);
      if (ing && ing.stock < ri.qty * qty) {
        missing.push(ing.name);
      }
    }

    if (missing.length > 0 && blockOnInsufficient) {
      return { success: false, missing };
    }

    set((s) => ({
      ingredients: s.ingredients.map((ing) => {
        const ri = recipe.ingredients.find((r) => r.ingredientId === ing.id);
        if (!ri) return ing;
        return { ...ing, stock: Math.max(0, ing.stock - ri.qty * qty) };
      }),
    }));

    return { success: true, missing };
  },

  updateIngredientStock: (ingredientId, newStock) =>
    set((s) => ({
      ingredients: s.ingredients.map((i) =>
        i.id === ingredientId ? { ...i, stock: newStock } : i
      ),
    })),

  resetAsync: () =>
    set({
      isLoading: false,
      isInventoryLoading: false,
      isMovementLoading: false,
      isSubmitting: false,
      error: null,
      pagination: null,
      movementPagination: null,
      lastSyncAt: null,
      lastListParams: null,
      lastMovementListParams: null,
    }),
}));
