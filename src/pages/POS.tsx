import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Plus, Minus, Trash2, X, CreditCard, Banknote, QrCode, Smartphone,
  SplitSquareHorizontal, Printer, MessageSquare, CheckCircle2, ChefHat, Users, User, Phone, Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore, type Order, type SplitPerson } from "@/stores/orderStore";
import { usePromotionStore, type AppliedPromo } from "@/stores/promotionStore";
import { useMemberStore, type Member } from "@/stores/memberStore";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  addOrderPayments,
  createOrder,
  getOrder,
  listMenuItems,
  type CreateOrderPayload,
  type OrderApi,
  type OrderPaymentPayload,
} from "@/lib/api-integration/endpoints";

type MenuItem = {
  id: string; name: string; price: number; category: string; emoji: string;
};
type CartItem = MenuItem & { qty: number; notes: string };

/** Matches template/dev setup; override with `VITE_API_TENANT_ID` in web/.env */
const POS_TENANT_ID = Number(import.meta.env.VITE_API_TENANT_ID ?? 1) || 1;

const PAYMENT_LABEL_TO_API: Record<string, string> = {
  Cash: "cash",
  QRIS: "qris",
  "E-Wallet": "ewallet",
  Card: "card",
};

function toApiPaymentMethod(label: string): string {
  return PAYMENT_LABEL_TO_API[label] ?? label.toLowerCase().replace(/\s+/g, "-");
}

function orderApiToStoreOrder(o: OrderApi): Order {
  return {
    id: String(o.id),
    code: o.code,
    source: o.source,
    orderType: o.orderType,
    items: o.items.map((it) => ({
      orderItemId: it.orderItemId,
      id: String(it.id),
      name: it.name,
      price: it.price,
      qty: it.qty,
      emoji: it.emoji ?? "",
      notes: typeof it.notes === "string" ? it.notes : "",
    })),
    subtotal: o.subtotal,
    tax: o.tax,
    total: o.total,
    status: o.status,
    paymentStatus: o.paymentStatus,
    payments: o.payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      paidAt: p.paidAt ? new Date(p.paidAt) : new Date(),
      allocations: p.allocations?.map((a) => ({
        orderItemId: String(a.orderItemId),
        qty: a.qty,
        amount: a.amount,
      })),
    })),
    customerName: o.customerName ?? "",
    customerPhone: o.customerPhone ?? "",
    tableNumber: o.tableNumber ?? "",
    createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
    confirmedAt: o.confirmedAt ? new Date(o.confirmedAt) : undefined,
    splitBill: o.splitBill as Order["splitBill"],
  };
}

function buildCartPayload(
  cart: CartItem[],
  subtotal: number,
  tax: number,
  total: number,
  discount: number,
  customerName: string,
  customerPhone: string,
  selectedTable: string,
): Pick<
  CreateOrderPayload,
  "items" | "subtotal" | "tax" | "total" | "customerName" | "customerPhone" | "tableNumber" | "discountAmount"
> {
  return {
    items: cart.map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      qty: c.qty,
      emoji: c.emoji,
      notes: c.notes || undefined,
    })),
    subtotal,
    tax,
    total,
    ...(discount > 0 ? { discountAmount: discount } : {}),
    ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
    ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
    ...(selectedTable ? { tableNumber: selectedTable } : {}),
  };
}

function buildSplitPaymentsPayload(
  order: OrderApi,
  splitPersons: SplitPerson[],
  splitMethod: "equal" | "by-item",
  cart: CartItem[],
): OrderPaymentPayload[] {
  const out: OrderPaymentPayload[] = [];
  for (const person of splitPersons) {
    for (const p of person.payments) {
      const base: OrderPaymentPayload = {
        method: toApiPaymentMethod(p.method),
        amount: p.amount,
        paidAt: p.paidAt.toISOString(),
      };
      if (splitMethod === "by-item" && person.items.length > 0) {
        const allocations: { orderItemId: number; qty: number; amount: number }[] = [];
        for (const it of person.items) {
          const line = order.items.find((oi) => String(oi.id) === it.itemId);
          const ci = cart.find((c) => c.id === it.itemId);
          if (!line?.orderItemId || !ci) continue;
          const amount = ci.price * it.qty;
          allocations.push({
            orderItemId: Number(line.orderItemId),
            qty: it.qty,
            amount,
          });
        }
        const sumAlloc = allocations.reduce((s, a) => s + a.amount, 0);
        if (allocations.length > 0 && Math.abs(sumAlloc - p.amount) <= 0.02) {
          out.push({ ...base, allocations });
        } else {
          out.push(base);
        }
      } else {
        out.push(base);
      }
    }
  }
  return out;
}

const orderTypes = ["Dine-in", "Takeaway", "Online"];
const paymentMethods = [
  { label: "Cash", icon: Banknote },
  { label: "QRIS", icon: QrCode },
  { label: "E-Wallet", icon: Smartphone },
  { label: "Card", icon: CreditCard },
];

function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

export default function POS() {
  const { addOrder, tables, updateTableStatus } = useOrderStore();
  const { getBestPromo, getApplicablePromos } = usePromotionStore();
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState("Dine-in");
  const [notesItem, setNotesItem] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const { members, fetchMembers } = useMemberStore();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  // Modal states
  const [showPayment, setShowPayment] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [showConfirmSent, setShowConfirmSent] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [showPromoList, setShowPromoList] = useState(false);
  const [manualPromo, setManualPromo] = useState<AppliedPromo | null>(null);

  // Split bill state
  const [splitPersons, setSplitPersons] = useState<SplitPerson[]>([]);
  const [splitMethod, setSplitMethod] = useState<"equal" | "by-item">("equal");
  const [splitCount, setSplitCount] = useState(2);
  const [payingPersonIdx, setPayingPersonIdx] = useState<number | null>(null);
  const [splitPayMethod, setSplitPayMethod] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchMembers().catch((e) => {
      if (e instanceof ApiHttpError) toast.error(e.message);
    });
  }, [fetchMembers]);

  const { data: menuApiItems = [], isLoading: menuLoading, isError: menuError, refetch: refetchMenu } = useQuery({
    queryKey: ["menu-items", POS_TENANT_ID],
    queryFn: () => listMenuItems({ tenantId: POS_TENANT_ID, perPage: 200 }),
  });

  const menuItems: MenuItem[] = useMemo(() => {
    return menuApiItems
      .filter((m) => m.available !== false)
      .map((m) => ({
        id: String(m.id),
        name: m.name,
        price: m.price,
        category: m.category?.trim() ? m.category : "Uncategorized",
        emoji: m.emoji ?? "🍽️",
      }));
  }, [menuApiItems]);

  const categories = useMemo(() => {
    const set = new Set(menuItems.map((m) => m.category));
    return ["All", ...Array.from(set).sort()];
  }, [menuItems]);

  const filtered = menuItems.filter(
    (m) => (activeCat === "All" || m.category === activeCat) &&
      m.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1, notes: "" }];
    });
  };
  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter((c) => c.qty > 0));
  };
  const updateNotes = (id: string, notes: string) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, notes } : c));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  // Promo logic
  const cartForPromo = cart.map((c) => ({ id: c.id, name: c.name, price: c.price, qty: c.qty }));
  const autoPromo = getBestPromo(cartForPromo, subtotal);
  const appliedPromo = manualPromo || autoPromo;
  const discount = appliedPromo?.discountAmount || 0;
  const applicablePromos = getApplicablePromos(cartForPromo, subtotal);
  const tax = Math.round((subtotal - discount) * 0.1);
  const total = subtotal - discount + tax;
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);

  const availableTables = tables.filter((t) => t.status === "available");

  function toastApiError(e: unknown): void {
    if (e instanceof ApiHttpError) {
      toast.error(e.message);
      return;
    }
    toast.error("Something went wrong. Try again.");
  }

  // FLOW 1: Confirm Order → Send to Kitchen (single POST: confirmed + unpaid → kitchen ticket)
  const handleConfirmOrder = async () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const code = "POS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const payload: CreateOrderPayload = {
        tenantId: POS_TENANT_ID,
        code,
        source: "pos",
        orderType,
        status: "confirmed",
        paymentStatus: "unpaid",
        payments: [],
        confirmedAt: new Date().toISOString(),
        ...buildCartPayload(cart, subtotal, tax, total, discount, customerName, customerPhone, selectedTable),
      };
      const apiOrder = await createOrder(payload);
      addOrder(orderApiToStoreOrder(apiOrder));
      if (selectedTable) {
        updateTableStatus(selectedTable, "occupied", String(apiOrder.id));
      }
      setCurrentOrderId(String(apiOrder.id));
      resetCart();
      setShowConfirmSent(true);
      toast.success(`Order ${apiOrder.code} sent to kitchen!`, { icon: "🍳" });
    } catch (e) {
      toastApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  // FLOW 2: Pay Now (Takeaway/Quick)
  const handlePayNow = () => {
    if (cart.length === 0) return;
    setShowPayment(true);
  };

  const completeDirectPayment = async () => {
    if (!selectedPayment || submitting) return;
    setSubmitting(true);
    try {
      const code = "POS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const payload: CreateOrderPayload = {
        tenantId: POS_TENANT_ID,
        code,
        source: "pos",
        orderType,
        status: "confirmed",
        paymentStatus: "paid",
        payments: [
          {
            method: toApiPaymentMethod(selectedPayment),
            amount: total,
            paidAt: new Date().toISOString(),
          },
        ],
        confirmedAt: new Date().toISOString(),
        ...buildCartPayload(cart, subtotal, tax, total, discount, customerName, customerPhone, selectedTable),
      };
      const apiOrder = await createOrder(payload);
      addOrder(orderApiToStoreOrder(apiOrder));
      if (selectedTable) {
        updateTableStatus(selectedTable, "occupied", String(apiOrder.id));
      }
      resetCart();
      setShowPayment(false);
      setSelectedPayment(null);
      toast.success(`Order ${apiOrder.code} paid & sent to kitchen!`, { icon: "✅" });
    } catch (e) {
      toastApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const resetCart = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedTable("");
    setManualPromo(null);
  };

  // Split bill helpers
  const initSplitBill = () => {
    setShowPayment(false);
    setShowSplit(true);
    setSplitMethod("equal");
    setSplitCount(2);
    buildEqualSplit(2);
  };

  const buildEqualSplit = (count: number) => {
    const perPerson = Math.ceil(total / count);
    setSplitPersons(
      Array.from({ length: count }, (_, i) => ({
        label: `Person ${i + 1}`,
        items: [],
        payments: [],
        totalDue: i === count - 1 ? total - perPerson * (count - 1) : perPerson,
      }))
    );
  };

  const buildItemSplit = (count: number) => {
    setSplitPersons(
      Array.from({ length: count }, (_, i) => ({
        label: `Person ${i + 1}`,
        items: [],
        payments: [],
        totalDue: 0,
      }))
    );
  };

  const toggleItemAssign = (personIdx: number, itemId: string) => {
    setSplitPersons((prev) => {
      const updated = prev.map((p, i) => {
        if (i !== personIdx) return p;
        const existing = p.items.find((it) => it.itemId === itemId);
        if (existing) {
          return { ...p, items: p.items.filter((it) => it.itemId !== itemId) };
        }
        const cartItem = cart.find((c) => c.id === itemId);
        return { ...p, items: [...p.items, { itemId, qty: cartItem?.qty || 1 }] };
      });
      // Recalculate totals for by-item
      return updated.map((p) => ({
        ...p,
        totalDue: p.items.reduce((s, it) => {
          const ci = cart.find((c) => c.id === it.itemId);
          return s + (ci ? ci.price * it.qty : 0);
        }, 0),
      }));
    });
  };

  const completeSplitOrder = async () => {
    if (submitting || splitPersons.length === 0) return;
    setSubmitting(true);
    try {
      const code = "POS-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const created = await createOrder({
        tenantId: POS_TENANT_ID,
        code,
        source: "pos",
        orderType,
        status: "confirmed",
        paymentStatus: "unpaid",
        payments: [],
        confirmedAt: new Date().toISOString(),
        splitBill: { method: splitMethod === "equal" ? "equal" : "by-item", persons: splitPersons },
        ...buildCartPayload(cart, subtotal, tax, total, discount, customerName, customerPhone, selectedTable),
      });
      const fresh = await getOrder(created.id);
      const batch = buildSplitPaymentsPayload(fresh, splitPersons, splitMethod, cart);
      const paidOrder =
        batch.length > 0 ? await addOrderPayments(String(created.id), { payments: batch }) : fresh;
      addOrder(orderApiToStoreOrder(paidOrder));
      const totalPaid = paidOrder.payments.reduce((s, p) => s + p.amount, 0);
      if (selectedTable) {
        updateTableStatus(selectedTable, totalPaid >= total ? "available" : "waiting-payment", String(created.id));
      }
      resetCart();
      setShowSplit(false);
      toast.success("Split bill order saved!", { icon: "💰" });
    } catch (e) {
      toastApiError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSplitPersonPay = () => {
    if (payingPersonIdx === null || !splitPayMethod) return;
    const person = splitPersons[payingPersonIdx];
    const alreadyPaid = person.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = person.totalDue - alreadyPaid;
    if (remaining <= 0) return;
    setSplitPersons((prev) =>
      prev.map((p, i) =>
        i === payingPersonIdx
          ? { ...p, payments: [...p.payments, { method: splitPayMethod!, amount: remaining, paidAt: new Date() }] }
          : p
      )
    );
    setPayingPersonIdx(null);
    setSplitPayMethod(null);
    toast.success(`${person.label} paid ${formatRp(remaining)} via ${splitPayMethod}`);
  };

  const allSplitPaid = splitPersons.every((p) => {
    const paid = p.payments.reduce((s, pm) => s + pm.amount, 0);
    return paid >= p.totalDue;
  });

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Menu Panel */}
      <div className="flex-1 flex flex-col min-w-0 p-4 md:p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text" placeholder="Search menu..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex gap-1.5 bg-card rounded-xl p-1 border border-border">
            {orderTypes.map((t) => (
              <button key={t} onClick={() => setOrderType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${orderType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >{t}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${activeCat === c ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}
            >{c}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {menuLoading && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">Loading menu…</div>
          )}
          {menuError && !menuLoading && (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-4">
              <p className="text-sm text-destructive">Could not load menu from the server.</p>
              <button
                type="button"
                onClick={() => void refetchMenu()}
                className="text-sm font-medium text-primary underline"
              >
                Retry
              </button>
            </div>
          )}
          {!menuLoading && !menuError && menuItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
              No menu items available for this tenant.
            </div>
          )}
          {!menuLoading && !menuError && menuItems.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((item) => {
              const inCart = cart.find((c) => c.id === item.id);
              return (
                <motion.button key={item.id} whileTap={{ scale: 0.97 }} onClick={() => addToCart(item)}
                  className={`relative bg-card rounded-2xl p-4 border transition-all text-left hover:pos-shadow-md ${inCart ? "border-primary/30 ring-1 ring-primary/10" : "border-border/50"}`}
                >
                  <span className="text-3xl block mb-2">{item.emoji}</span>
                  <p className="text-sm font-medium text-foreground leading-tight">{item.name}</p>
                  <p className="text-sm font-bold text-primary mt-1">{formatRp(item.price)}</p>
                  {inCart && (
                    <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{inCart.qty}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-[340px] lg:w-[380px] bg-card border-l flex flex-col shrink-0 hidden md:flex">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground">Current Order</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">{orderType} • {totalItems} items</span>
          </div>
          {/* Customer Info */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input type="text" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20" />
              </div>
              <div className="relative flex-1">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input type="text" placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20" />
              </div>
            </div>
            {/* Member selector */}
            {selectedMember ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50 border border-accent">
                <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{selectedMember.name}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedMember.points} pts</p>
                </div>
                <button onClick={() => setSelectedMember(null)} className="text-xs text-muted-foreground hover:text-destructive">×</button>
              </div>
            ) : (
              <button onClick={() => setShowMemberPicker(true)} className="w-full px-3 py-2 rounded-lg bg-background border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors text-left">
                + Select member (optional)
              </button>
            )}
            {orderType === "Dine-in" && (
              <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground">
                <option value="">Select table...</option>
                {availableTables.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.seats} seats)</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <AnimatePresence>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCartEmpty />
                <p className="text-sm mt-3">No items yet</p>
                <p className="text-xs">Tap menu items to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-background rounded-xl p-3 border border-border/50">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatRp(item.price)}</p>
                      {item.notes && <p className="text-xs text-info mt-1 italic">📝 {item.notes}</p>}
                    </div>
                    <p className="text-sm font-bold text-foreground">{formatRp(item.price * item.qty)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.id, -1)} className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                        {item.qty === 1 ? <Trash2 className="h-3.5 w-3.5 text-destructive" /> : <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-foreground">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <button onClick={() => setNotesItem(notesItem === item.id ? null : item.id)} className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  {notesItem === item.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="mt-2 overflow-hidden">
                      <input type="text" placeholder="Add notes (e.g. no spicy)" value={item.notes} onChange={(e) => updateNotes(item.id, e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-1 focus:ring-primary/20" />
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t space-y-3">
          {/* Promo badge */}
          {appliedPromo && cart.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Tag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-700 truncate">{appliedPromo.promoName}</p>
                <p className="text-[10px] text-emerald-600">-{formatRp(appliedPromo.discountAmount)}</p>
              </div>
              {applicablePromos.length > 1 && (
                <button onClick={() => setShowPromoList(!showPromoList)}
                  className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 underline whitespace-nowrap">
                  {applicablePromos.length} promos
                </button>
              )}
              {manualPromo && (
                <button onClick={() => setManualPromo(null)} className="p-1 rounded hover:bg-emerald-500/10">
                  <X className="h-3 w-3 text-emerald-600" />
                </button>
              )}
            </div>
          )}
          {/* Promo selector */}
          {showPromoList && applicablePromos.length > 1 && (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {applicablePromos.map((p) => (
                <button key={p.promoId} onClick={() => { setManualPromo(p); setShowPromoList(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${appliedPromo?.promoId === p.promoId ? "bg-primary/10 text-primary font-medium" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}>
                  <span className="truncate">{p.promoName}</span>
                  <span className="font-semibold shrink-0 ml-2">-{formatRp(p.discountAmount)}</span>
                </button>
              ))}
            </div>
          )}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatRp(subtotal)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium"><span>Discount</span><span>-{formatRp(discount)}</span></div>
            )}
            <div className="flex justify-between text-muted-foreground"><span>Tax (10%)</span><span>{formatRp(tax)}</span></div>
            <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border/50"><span>Total</span><span>{formatRp(total)}</span></div>
          </div>
          <div className="flex gap-2">
            {orderType === "Dine-in" ? (
              <>
                <button onClick={() => void handleConfirmOrder()} disabled={cart.length === 0 || submitting || menuLoading || !!menuError}
                  className="flex-1 py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <ChefHat className="h-4 w-4" /> {submitting ? "…" : "Confirm Order"}
                </button>
                <button onClick={handlePayNow} disabled={cart.length === 0 || submitting || menuLoading || !!menuError}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <CreditCard className="h-4 w-4" /> Pay Now
                </button>
              </>
            ) : (
              <button onClick={handlePayNow} disabled={cart.length === 0 || submitting || menuLoading || !!menuError}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
                Pay {formatRp(total)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Sent Modal */}
      <AnimatePresence>
        {showConfirmSent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirmSent(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-8 max-w-sm w-full text-center pos-shadow-md">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <ChefHat className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Order Sent to Kitchen!</h3>
              <p className="text-sm text-muted-foreground mb-4">The kitchen team has been notified. Payment can be collected later.</p>
              <button onClick={() => setShowConfirmSent(false)} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
                New Order
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && !showSplit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPayment(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 w-full max-w-md pos-shadow-md">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Payment</h3>
                <button onClick={() => setShowPayment(false)} className="p-1 rounded-lg hover:bg-muted"><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold text-foreground mt-1">{formatRp(total)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {paymentMethods.map((pm) => (
                  <button key={pm.label} onClick={() => setSelectedPayment(pm.label)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selectedPayment === pm.label ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30 hover:bg-primary/5"}`}>
                    <pm.icon className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium text-foreground">{pm.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={initSplitBill}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all mb-4">
                <SplitSquareHorizontal className="h-4 w-4" /> Split Bill
              </button>
              <button onClick={() => void completeDirectPayment()} disabled={!selectedPayment || submitting}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity mb-3">
                <span className="flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> {submitting ? "Processing…" : "Complete Payment"}</span>
              </button>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 text-success text-sm">
                <Printer className="h-4 w-4" /><span className="font-medium">Print: Ready</span>
                <span className="text-xs opacity-70 ml-auto">Cashier Printer</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split Bill Modal */}
      <AnimatePresence>
        {showSplit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSplit(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl p-6 w-full max-w-lg pos-shadow-md max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground">Split Bill</h3>
                <button onClick={() => setShowSplit(false)} className="p-1 rounded-lg hover:bg-muted"><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>

              <div className="text-center mb-5">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{formatRp(total)}</p>
              </div>

              {/* Split method toggle */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => { setSplitMethod("equal"); buildEqualSplit(splitCount); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${splitMethod === "equal" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  Equal Split
                </button>
                <button onClick={() => { setSplitMethod("by-item"); buildItemSplit(splitCount); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${splitMethod === "by-item" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  Split by Item
                </button>
              </div>

              {/* Person count */}
              <div className="flex items-center justify-center gap-4 mb-5">
                <button onClick={() => {
                  const c = Math.max(2, splitCount - 1);
                  setSplitCount(c);
                  if (splitMethod === "equal") buildEqualSplit(c);
                  else buildItemSplit(c);
                }}
                  className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{splitCount}</p>
                  <p className="text-xs text-muted-foreground">people</p>
                </div>
                <button onClick={() => {
                  const c = Math.min(10, splitCount + 1);
                  setSplitCount(c);
                  if (splitMethod === "equal") buildEqualSplit(c);
                  else buildItemSplit(c);
                }}
                  className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* By-item assignment */}
              {splitMethod === "by-item" && (
                <div className="mb-5 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Assign items to each person:</p>
                  {splitPersons.map((person, pIdx) => (
                    <div key={pIdx} className="bg-background rounded-xl p-3 border border-border/50">
                      <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" /> {person.label}
                        <span className="ml-auto text-xs font-bold text-primary">{formatRp(person.totalDue)}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {cart.map((item) => {
                          const assigned = person.items.some((it) => it.itemId === item.id);
                          return (
                            <button key={item.id} onClick={() => toggleItemAssign(pIdx, item.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${assigned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                              {item.emoji} {item.name} ×{item.qty}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Split persons with payment */}
              <div className="space-y-2 mb-5">
                {splitPersons.map((person, i) => {
                  const paid = person.payments.reduce((s, p) => s + p.amount, 0);
                  const isPaid = paid >= person.totalDue && person.totalDue > 0;
                  return (
                    <div key={i} className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${isPaid ? "bg-success/5 border-success/20" : "bg-background border-border/50"}`}>
                      <span className="text-sm font-medium text-foreground flex-1">{person.label}</span>
                      <span className="text-sm font-bold text-foreground">{formatRp(person.totalDue)}</span>
                      {isPaid ? (
                        <span className="px-3 py-1 rounded-lg text-xs font-medium bg-success/10 text-success">✓ Paid ({person.payments[0]?.method})</span>
                      ) : (
                        <button onClick={() => { setPayingPersonIdx(i); setSplitPayMethod(null); }}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">
                          Add Payment
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Per-person payment picker */}
              <AnimatePresence>
                {payingPersonIdx !== null && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-5">
                    <div className="bg-accent/30 rounded-xl p-4 border border-accent">
                      <p className="text-sm font-semibold text-foreground mb-3">
                        Pay for {splitPersons[payingPersonIdx]?.label}: {formatRp(splitPersons[payingPersonIdx]?.totalDue || 0)}
                      </p>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {paymentMethods.map((pm) => (
                          <button key={pm.label} onClick={() => setSplitPayMethod(pm.label)}
                            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs transition-all ${splitPayMethod === pm.label ? "border-primary bg-primary/5" : "border-border"}`}>
                            <pm.icon className="h-4 w-4 text-primary" />
                            {pm.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setPayingPersonIdx(null)} className="flex-1 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium">Cancel</button>
                        <button onClick={handleSplitPersonPay} disabled={!splitPayMethod}
                          className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40">Confirm Payment</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button onClick={() => void completeSplitOrder()} disabled={!allSplitPaid || splitPersons.length === 0 || submitting}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
                {submitting ? "Saving…" : allSplitPaid ? "Complete Split Order" : `${splitPersons.filter((p) => p.payments.reduce((s, pm) => s + pm.amount, 0) >= p.totalDue && p.totalDue > 0).length}/${splitPersons.length} Paid`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member picker */}
      <AnimatePresence>
        {showMemberPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowMemberPicker(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              className="bg-card rounded-2xl w-full max-w-md p-5 pos-shadow-md"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold mb-3">Select member</h3>
              <input
                autoFocus value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm mb-3"
              />
              <div className="max-h-72 overflow-y-auto space-y-1">
                {members
                  .filter((m) => m.status === "active" &&
                    (m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                     m.phone.includes(memberSearch)))
                  .map((m) => (
                    <button key={m.id}
                      onClick={() => {
                        setSelectedMember(m);
                        setCustomerName(m.name);
                        setCustomerPhone(m.phone);
                        setShowMemberPicker(false);
                        setMemberSearch("");
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted text-left">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.phone}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary">{m.points} pts</span>
                    </button>
                  ))}
              </div>
              <button onClick={() => { setShowMemberPicker(false); setMemberSearch(""); }}
                className="mt-3 w-full py-2 rounded-xl bg-muted text-sm font-medium hover:bg-accent">
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShoppingCartEmpty() {
  return (
    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
      <svg className="h-8 w-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    </div>
  );
}
