import { create } from "zustand";

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

// Keep backward compat alias
export type Ingredient = InventoryItem;

export type RecipeItem = {
  ingredientId: string;
  qty: number;
};

export type Recipe = {
  menuItemId: string;
  ingredients: RecipeItem[];
};

type InventoryStore = {
  ingredients: InventoryItem[];
  recipes: Recipe[];
  blockOnInsufficient: boolean;
  setBlockOnInsufficient: (v: boolean) => void;
  addItem: (item: Omit<InventoryItem, "id">) => void;
  updateItem: (id: string, data: Partial<Omit<InventoryItem, "id">>) => void;
  removeItem: (id: string) => void;
  addRecipe: (menuItemId: string, ingredients: RecipeItem[]) => void;
  removeRecipe: (menuItemId: string) => void;
  getRecipe: (menuItemId: string) => Recipe | undefined;
  deductStock: (menuItemId: string, qty: number) => { success: boolean; missing: string[] };
  updateIngredientStock: (ingredientId: string, newStock: number) => void;
};

const defaultIngredients: InventoryItem[] = [
  { id: "ing-1", name: "Rice", type: "ingredient", stock: 45, min: 20, unit: "kg", price: 12000 },
  { id: "ing-2", name: "Chicken", type: "ingredient", stock: 8, min: 10, unit: "kg", price: 35000 },
  { id: "ing-3", name: "Cooking Oil", type: "ingredient", stock: 12, min: 5, unit: "L", price: 18000 },
  { id: "ing-4", name: "Eggs", type: "ingredient", stock: 30, min: 50, unit: "pcs", price: 2500 },
  { id: "ing-5", name: "Noodles", type: "ingredient", stock: 100, min: 30, unit: "pack", price: 3500 },
  { id: "ing-6", name: "Sugar", type: "ingredient", stock: 3, min: 5, unit: "kg", price: 15000 },
  { id: "ing-7", name: "Tea bags", type: "ingredient", stock: 15, min: 5, unit: "box", price: 8000 },
  { id: "ing-8", name: "Coffee beans", type: "ingredient", stock: 6, min: 3, unit: "kg", price: 85000 },
  { id: "ing-9", name: "Soy Sauce", type: "ingredient", stock: 10, min: 3, unit: "L", price: 12000 },
  { id: "ing-10", name: "Chili", type: "ingredient", stock: 5, min: 2, unit: "kg", price: 25000 },
  { id: "ing-11", name: "Garlic", type: "ingredient", stock: 4, min: 2, unit: "kg", price: 30000 },
  { id: "ing-12", name: "Onion", type: "ingredient", stock: 6, min: 3, unit: "kg", price: 18000 },
  { id: "ing-13", name: "Peanuts", type: "ingredient", stock: 8, min: 3, unit: "kg", price: 28000 },
  { id: "ing-14", name: "Coconut Milk", type: "ingredient", stock: 10, min: 4, unit: "L", price: 15000 },
  { id: "ing-15", name: "Flour", type: "ingredient", stock: 15, min: 5, unit: "kg", price: 10000 },
  { id: "ing-16", name: "Banana", type: "ingredient", stock: 20, min: 10, unit: "pcs", price: 3000 },
  { id: "ing-17", name: "Avocado", type: "ingredient", stock: 12, min: 5, unit: "pcs", price: 8000 },
  { id: "ing-18", name: "Orange", type: "ingredient", stock: 15, min: 5, unit: "pcs", price: 5000 },
  { id: "ing-19", name: "Shrimp Crackers", type: "ingredient", stock: 25, min: 10, unit: "pack", price: 5000 },
  { id: "ing-20", name: "Tofu", type: "ingredient", stock: 10, min: 5, unit: "pcs", price: 4000 },
  { id: "atk-1", name: "Thermal Paper", type: "atk", stock: 20, min: 5, unit: "pcs", price: 15000 },
  { id: "atk-2", name: "Tissue Box", type: "atk", stock: 12, min: 5, unit: "box", price: 25000 },
  { id: "asset-1", name: "Dining Chair", type: "asset", stock: 24, min: 0, unit: "pcs", notes: "Wooden chairs for dining area" },
  { id: "asset-2", name: "Blender", type: "asset", stock: 2, min: 0, unit: "pcs", notes: "Philips HR2157" },
];

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

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  ingredients: defaultIngredients,
  recipes: defaultRecipes,
  blockOnInsufficient: false,

  setBlockOnInsufficient: (v) => set({ blockOnInsufficient: v }),

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
}));
