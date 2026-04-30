import { create } from "zustand";

export type PromotionType = "percentage" | "fixed" | "buy-x-get-y";

export type Promotion = {
  id: string;
  name: string;
  description: string;
  type: PromotionType;
  // Rules
  discountPercent?: number;
  maxDiscount?: number;
  discountAmount?: number;
  buyQty?: number;
  getQty?: number;
  applicableMenuIds: string[];
  // Conditions
  minPurchase: number;
  applicableCategories: string[];
  outlet: string;
  dayRestriction: string[]; // e.g. ["Mon","Tue"]
  timeStart: string; // "HH:mm"
  timeEnd: string;
  // Limitations
  usageLimitPerDay: number | null;
  usagePerCustomer: number | null;
  stackable: boolean;
  // Period
  startDate: Date;
  endDate: Date;
  // State
  active: boolean;
  usedToday: number;
};

export type AppliedPromo = {
  promoId: string;
  promoName: string;
  discountAmount: number;
};

type CartItemForPromo = {
  id: string;
  name: string;
  price: number;
  qty: number;
  category?: string;
};

type PromotionStore = {
  promotions: Promotion[];
  addPromotion: (p: Promotion) => void;
  updatePromotion: (id: string, data: Partial<Promotion>) => void;
  removePromotion: (id: string) => void;
  toggleActive: (id: string) => void;
  getBestPromo: (cart: CartItemForPromo[], subtotal: number) => AppliedPromo | null;
  getApplicablePromos: (cart: CartItemForPromo[], subtotal: number) => AppliedPromo[];
  incrementUsage: (promoId: string) => void;
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isPromoValid(p: Promotion, subtotal: number): boolean {
  const now = new Date();
  if (!p.active) return false;
  if (now < new Date(p.startDate) || now > new Date(p.endDate)) return false;
  if (p.minPurchase > 0 && subtotal < p.minPurchase) return false;
  if (p.dayRestriction.length > 0 && !p.dayRestriction.includes(dayNames[now.getDay()])) return false;
  if (p.timeStart && p.timeEnd) {
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (hhmm < p.timeStart || hhmm > p.timeEnd) return false;
  }
  if (p.usageLimitPerDay !== null && p.usedToday >= p.usageLimitPerDay) return false;
  return true;
}

function calcDiscount(p: Promotion, cart: CartItemForPromo[], subtotal: number): number {
  if (p.type === "percentage") {
    let disc = Math.round(subtotal * (p.discountPercent || 0) / 100);
    if (p.maxDiscount && disc > p.maxDiscount) disc = p.maxDiscount;
    return disc;
  }
  if (p.type === "fixed") {
    return Math.min(p.discountAmount || 0, subtotal);
  }
  if (p.type === "buy-x-get-y") {
    const buyQ = p.buyQty || 1;
    const getQ = p.getQty || 1;
    const eligible = p.applicableMenuIds.length > 0
      ? cart.filter((c) => p.applicableMenuIds.includes(c.id))
      : cart;
    let totalDisc = 0;
    for (const item of eligible) {
      const sets = Math.floor(item.qty / (buyQ + getQ));
      totalDisc += sets * getQ * item.price;
    }
    return totalDisc;
  }
  return 0;
}

export const usePromotionStore = create<PromotionStore>((set, get) => ({
  promotions: [],
  addPromotion: (p) => set((s) => ({ promotions: [...s.promotions, p] })),
  updatePromotion: (id, data) =>
    set((s) => ({
      promotions: s.promotions.map((p) => (p.id === id ? { ...p, ...data } : p)),
    })),
  removePromotion: (id) => set((s) => ({ promotions: s.promotions.filter((p) => p.id !== id) })),
  toggleActive: (id) =>
    set((s) => ({
      promotions: s.promotions.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    })),
  getApplicablePromos: (cart, subtotal) => {
    const { promotions } = get();
    const results: AppliedPromo[] = [];
    for (const p of promotions) {
      if (!isPromoValid(p, subtotal)) continue;
      // Check menu applicability
      if (p.applicableMenuIds.length > 0) {
        const hasItem = cart.some((c) => p.applicableMenuIds.includes(c.id));
        if (!hasItem) continue;
      }
      const disc = calcDiscount(p, cart, subtotal);
      if (disc > 0) {
        results.push({ promoId: p.id, promoName: p.name, discountAmount: disc });
      }
    }
    return results;
  },
  getBestPromo: (cart, subtotal) => {
    const promos = get().getApplicablePromos(cart, subtotal);
    if (promos.length === 0) return null;
    return promos.reduce((best, p) => (p.discountAmount > best.discountAmount ? p : best));
  },
  incrementUsage: (promoId) =>
    set((s) => ({
      promotions: s.promotions.map((p) => (p.id === promoId ? { ...p, usedToday: p.usedToday + 1 } : p)),
    })),
}));
