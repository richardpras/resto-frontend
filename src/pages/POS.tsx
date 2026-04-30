import { useState } from "react";
import {
  Search, Plus, Minus, Trash2, X, CreditCard, Banknote, QrCode, Smartphone,
  SplitSquareHorizontal, Printer, MessageSquare, CheckCircle2, ChefHat, Users, User, Phone, Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore, type Order, type PaymentEntry } from "@/stores/orderStore";
import { usePromotionStore, type AppliedPromo } from "@/stores/promotionStore";
import { toast } from "sonner";
import {
  addOrderPayments,
  createOrder as createOrderApi,
  type CreateOrderPayload,
  type OrderApi,
  type OrderPaymentPayload,
} from "@/lib/api";
import type { SplitOrderItem, SplitPerson as SplitPaymentPerson } from "@/features/pos/splitPaymentTypes";
import {
  buildSplitOrderItems,
  clampPaymentAmount,
  calculatePaidTotal,
  calculateRemaining,
  clampAllocationQty,
  createPaymentAllocations,
  createSplitPersons,
  getTotalAllocatedQty,
  sumAllocationAmount,
  upsertPersonAllocation,
} from "@/features/pos/splitPaymentUtils";

type MenuItem = {
  id: string; name: string; price: number; category: string; emoji: string;
};
type CartItem = MenuItem & { qty: number; notes: string };

const categories = ["All", "Main Course", "Appetizers", "Drinks", "Desserts", "Sides"];
const menuItems: MenuItem[] = [
  { id: "1", name: "Nasi Goreng Special", price: 30000, category: "Main Course", emoji: "🍛" },
  { id: "2", name: "Ayam Bakar", price: 40000, category: "Main Course", emoji: "🍗" },
  { id: "3", name: "Mie Goreng", price: 25000, category: "Main Course", emoji: "🍝" },
  { id: "4", name: "Sate Ayam 10pcs", price: 35000, category: "Main Course", emoji: "🥘" },
  { id: "5", name: "Gado-Gado", price: 22000, category: "Appetizers", emoji: "🥗" },
  { id: "6", name: "Lumpia Goreng", price: 15000, category: "Appetizers", emoji: "🌯" },
  { id: "7", name: "Tahu Goreng", price: 12000, category: "Appetizers", emoji: "🧈" },
  { id: "8", name: "Es Teh Manis", price: 10000, category: "Drinks", emoji: "🧊" },
  { id: "9", name: "Jus Alpukat", price: 18000, category: "Drinks", emoji: "🥑" },
  { id: "10", name: "Kopi Susu", price: 20000, category: "Drinks", emoji: "☕" },
  { id: "11", name: "Es Jeruk", price: 12000, category: "Drinks", emoji: "🍊" },
  { id: "12", name: "Pisang Goreng", price: 15000, category: "Desserts", emoji: "🍌" },
  { id: "13", name: "Es Campur", price: 18000, category: "Desserts", emoji: "🍧" },
  { id: "14", name: "Kerupuk Udang", price: 8000, category: "Sides", emoji: "🦐" },
  { id: "15", name: "Sambal Extra", price: 5000, category: "Sides", emoji: "🌶️" },
  { id: "16", name: "Nasi Putih", price: 7000, category: "Sides", emoji: "🍚" },
];
const orderTypes = ["Dine-in", "Takeaway", "Online"];
const paymentMethods = [
  { label: "Cash", icon: Banknote },
  { label: "QRIS", icon: QrCode },
  { label: "E-Wallet", icon: Smartphone },
  { label: "Card", icon: CreditCard },
];

function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

function mapApiOrderToStoreOrder(order: OrderApi): Order {
  return {
    id: order.id,
    code: order.code,
    source: order.source,
    orderType: order.orderType,
    items: order.items.map((item) => ({
      id: item.id,
      orderItemId: item.orderItemId,
      name: item.name,
      price: item.price,
      qty: item.qty,
      emoji: item.emoji ?? "",
      notes: item.notes ?? "",
    })),
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    status: order.status,
    paymentStatus: order.paymentStatus,
    payments: order.payments.map((payment) => ({
      method: payment.method,
      amount: payment.amount,
      paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(),
      allocations: payment.allocations,
    })),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    tableNumber: order.tableNumber,
    createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
    confirmedAt: order.confirmedAt ? new Date(order.confirmedAt) : undefined,
    splitBill: order.splitBill as Order["splitBill"],
  };
}

export default function POS() {
  const { addOrder, confirmOrder, tables, updateTableStatus } = useOrderStore();
  const { getBestPromo, getApplicablePromos, incrementUsage } = usePromotionStore();
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState("Dine-in");
  const [notesItem, setNotesItem] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedTable, setSelectedTable] = useState("");

  // Modal states
  const [showPayment, setShowPayment] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [showConfirmSent, setShowConfirmSent] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [showPromoList, setShowPromoList] = useState(false);
  const [manualPromo, setManualPromo] = useState<AppliedPromo | null>(null);

  // Split bill state
  const [splitPersons, setSplitPersons] = useState<SplitPaymentPerson[]>([]);
  const [splitOrderItems, setSplitOrderItems] = useState<SplitOrderItem[]>([]);
  const [splitPersonPayments, setSplitPersonPayments] = useState<Record<number, PaymentEntry[]>>({});
  const [splitMethod, setSplitMethod] = useState<"equal" | "by-item">("equal");
  const [splitCount, setSplitCount] = useState(2);
  const [payingPersonIdx, setPayingPersonIdx] = useState<number | null>(null);
  const [splitPayMethod, setSplitPayMethod] = useState<string | null>(null);
  const [splitPayAmount, setSplitPayAmount] = useState(0);

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

  const createOrder = (): Order => ({
    id: crypto.randomUUID(),
    code: "POS-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    source: "pos",
    orderType,
    items: cart.map((c) => ({ id: c.id, name: c.name, price: c.price, qty: c.qty, emoji: c.emoji, notes: c.notes })),
    subtotal, tax, total,
    status: "pending",
    paymentStatus: "unpaid",
    payments: [],
    customerName,
    customerPhone,
    tableNumber: selectedTable,
    createdAt: new Date(),
  });

  const submitOrder = async (order: Order): Promise<Order> => {
    const payload: CreateOrderPayload = {
      code: order.code,
      source: order.source,
      orderType: order.orderType,
      status: order.status,
      paymentStatus: order.paymentStatus,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        emoji: item.emoji,
        notes: item.notes,
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      payments: order.payments.map((payment) => ({
        method: payment.method,
        amount: payment.amount,
        paidAt: payment.paidAt.toISOString(),
        allocations: payment.allocations,
      })),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      tableNumber: order.tableNumber,
      createdAt: order.createdAt.toISOString(),
      confirmedAt: order.confirmedAt?.toISOString(),
      splitBill: order.splitBill,
    };

    const saved = await createOrderApi(payload);
    return mapApiOrderToStoreOrder(saved);
  };

  // FLOW 1: Confirm Order → Send to Kitchen (Dine-in)
  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    try {
      const localOrder = createOrder();
      localOrder.status = "confirmed";
      localOrder.confirmedAt = new Date();
      const order = await submitOrder(localOrder);
      addOrder(order);
      confirmOrder(order.id);
      if (selectedTable) {
        updateTableStatus(selectedTable, "occupied", order.id);
      }
      setCurrentOrderId(order.id);
      resetCart();
      setShowConfirmSent(true);
      toast.success(`Order ${order.code} sent to kitchen!`, { icon: "🍳" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit order");
    }
  };

  // FLOW 2: Pay Now (Takeaway/Quick)
  const handlePayNow = () => {
    if (cart.length === 0) return;
    setShowPayment(true);
  };

  const completeDirectPayment = async () => {
    if (!selectedPayment) return;
    try {
      const localOrder = createOrder();
      localOrder.status = "confirmed";
      localOrder.confirmedAt = new Date();
      localOrder.payments = [{ method: selectedPayment, amount: total, paidAt: new Date() }];
      localOrder.paymentStatus = "paid";
      const order = await submitOrder(localOrder);
      addOrder(order);
      if (selectedTable) {
        updateTableStatus(selectedTable, "occupied", order.id);
      }
      resetCart();
      setShowPayment(false);
      setSelectedPayment(null);
      toast.success(`Order ${order.code} paid & sent to kitchen!`, { icon: "✅" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit payment");
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
    setSplitOrderItems(buildSplitOrderItems(cart.map((item) => ({ id: item.id, name: item.name, qty: item.qty, price: item.price }))));
    setSplitPersonPayments({});
    buildEqualSplit(2);
  };

  const buildEqualSplit = (count: number) => {
    const perPerson = Math.ceil(total / count);
    setSplitPersons(Array.from({ length: count }, (_, i) => ({
        label: `Person ${i + 1}`,
        allocations: [],
        paidTotal: 0,
        totalDue: i === count - 1 ? total - perPerson * (count - 1) : perPerson,
      })));
  };

  const buildItemSplit = (count: number) => {
    setSplitPersons(createSplitPersons(count));
  };

  const updateItemAllocation = (personIdx: number, orderItemId: string, nextQty: number) => {
    setSplitPersons((prev) => {
      const orderItem = splitOrderItems.find((item) => item.orderItemId === orderItemId);
      if (!orderItem) return prev;
      return prev.map((person, index) => {
        if (index !== personIdx) return person;
        const allocatedByOthers = getTotalAllocatedQty(
          prev.filter((_, idx) => idx !== personIdx),
          orderItemId
        );
        const maxForPerson = Math.max(0, orderItem.qty - allocatedByOthers);
        return upsertPersonAllocation(person, orderItem, clampAllocationQty(nextQty, maxForPerson));
      });
    });
  };

  const getPersonPayments = (personIdx: number): PaymentEntry[] => splitPersonPayments[personIdx] ?? [];

  const syncSplitTotalsWithPayments = (persons: SplitPaymentPerson[]) => {
    return persons.map((person, personIdx) => ({
      ...person,
      paidTotal: calculatePaidTotal(getPersonPayments(personIdx)),
    }));
  };

  const setSplitCountAndRebuild = (count: number) => {
    const capped = Math.max(2, Math.min(10, count));
    setSplitCount(capped);
    if (splitMethod === "equal") {
      buildEqualSplit(capped);
    } else {
      buildItemSplit(capped);
    }
    setSplitPersonPayments((prev) => {
      const next: Record<number, PaymentEntry[]> = {};
      for (let idx = 0; idx < capped; idx += 1) {
        next[idx] = prev[idx] ?? [];
      }
      return next;
    });
  };

  const completeSplitOrder = async () => {
    try {
      const personsWithPaid = syncSplitTotalsWithPayments(splitPersons);
      const orderDraft = createOrder();
      orderDraft.status = "confirmed";
      orderDraft.confirmedAt = new Date();
      orderDraft.payments = [];
      orderDraft.paymentStatus = "unpaid";
      orderDraft.splitBill = {
        method: splitMethod === "equal" ? "equal" : "by-item",
        persons: personsWithPaid.map((person, personIdx) => ({
          label: person.label,
          items: person.allocations.map((allocation) => ({
            itemId: allocation.orderItemId,
            qty: allocation.qty,
          })),
          payments: getPersonPayments(personIdx),
          totalDue: person.totalDue,
        })),
      };
      const order = await submitOrder(orderDraft);

      const orderItemIdByMenuId = new Map<string, number>();
      for (const item of order.items) {
        const rawOrderItemId = Number(item.orderItemId);
        if (Number.isFinite(rawOrderItemId)) {
          orderItemIdByMenuId.set(item.id, rawOrderItemId);
        }
      }

      const paymentPayloads: OrderPaymentPayload[] = Object.values(splitPersonPayments).flat().map((payment) => {
        const allocations = (payment.allocations ?? [])
          .map((allocation) => {
            const orderItemId = orderItemIdByMenuId.get(allocation.orderItemId);
            if (!orderItemId) return null;
            return {
              orderItemId,
              qty: allocation.qty,
              amount: allocation.amount,
            };
          })
          .filter((allocation): allocation is { orderItemId: number; qty: number; amount: number } => allocation !== null);

        return {
          method: payment.method,
          amount: payment.amount,
          paidAt: payment.paidAt.toISOString(),
          allocations: allocations.length > 0 ? allocations : undefined,
        };
      });

      let syncedOrder = order;
      if (paymentPayloads.length > 0) {
        const paid = await addOrderPayments(order.id, { payments: paymentPayloads });
        syncedOrder = mapApiOrderToStoreOrder(paid);
      }

      addOrder(syncedOrder);
      const totalPaid = syncedOrder.payments.reduce((s, p) => s + p.amount, 0);
      if (selectedTable) updateTableStatus(selectedTable, totalPaid >= total ? "available" : "waiting-payment", syncedOrder.id);
      resetCart();
      setShowSplit(false);
      toast.success(`Split bill order created!`, { icon: "💰" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit split order");
    }
  };

  const handleSplitPersonPay = () => {
    if (payingPersonIdx === null || !splitPayMethod) return;
    const person = splitPersons[payingPersonIdx];
    if (!person) return;
    const paid = calculatePaidTotal(getPersonPayments(payingPersonIdx));
    const remaining = calculateRemaining(person.totalDue, paid);
    const amount = clampPaymentAmount(splitPayAmount, remaining);
    if (amount <= 0) return;

    const allocations = splitMethod === "by-item"
      ? createPaymentAllocations(person.allocations, amount)
      : [];
    const allocationAmount = splitMethod === "by-item" ? sumAllocationAmount(allocations) : amount;
    if (allocationAmount <= 0) return;

    setSplitPersonPayments((prev) => ({
      ...prev,
      [payingPersonIdx]: [
        ...(prev[payingPersonIdx] ?? []),
        {
          method: splitPayMethod,
          amount: allocationAmount,
          paidAt: new Date(),
          allocations,
        } as PaymentEntry,
      ],
    }));
    setSplitPayAmount(0);
    setPayingPersonIdx(null);
    setSplitPayMethod(null);
    toast.success(`${person.label} paid ${formatRp(amount)} via ${splitPayMethod}`);
  };

  const removeSplitPaymentLine = (personIdx: number, paymentIdx: number) => {
    setSplitPersonPayments((prev) => ({
      ...prev,
      [personIdx]: (prev[personIdx] ?? []).filter((_, idx) => idx !== paymentIdx),
    }));
  };

  const allSplitAllocated = splitMethod === "equal" || splitOrderItems.every((item) => (
    getTotalAllocatedQty(splitPersons, item.orderItemId) === item.qty
  ));

  const splitPersonsWithPaid = syncSplitTotalsWithPayments(splitPersons);

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
                <button onClick={handleConfirmOrder} disabled={cart.length === 0}
                  className="flex-1 py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <ChefHat className="h-4 w-4" /> Confirm Order
                </button>
                <button onClick={handlePayNow} disabled={cart.length === 0}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <CreditCard className="h-4 w-4" /> Pay Now
                </button>
              </>
            ) : (
              <button onClick={handlePayNow} disabled={cart.length === 0}
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
              <button onClick={completeDirectPayment} disabled={!selectedPayment}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity mb-3">
                <span className="flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> Complete Payment</span>
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
                  setSplitCountAndRebuild(splitCount - 1);
                }}
                  className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{splitCount}</p>
                  <p className="text-xs text-muted-foreground">people</p>
                </div>
                <button onClick={() => {
                  setSplitCountAndRebuild(splitCount + 1);
                }}
                  className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* By-item assignment */}
              {splitMethod === "by-item" && (
                <div className="mb-5 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Allocate item quantity per person:</p>
                  {splitOrderItems.map((item) => {
                    const allocated = getTotalAllocatedQty(splitPersons, item.orderItemId);
                    return (
                      <div key={item.orderItemId} className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                        {item.name} allocated {allocated}/{item.qty}
                      </div>
                    );
                  })}
                  {splitPersons.map((person, pIdx) => (
                    <div key={pIdx} className="bg-background rounded-xl p-3 border border-border/50">
                      <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" /> {person.label}
                        <span className="ml-auto text-xs font-bold text-primary">{formatRp(person.totalDue)}</span>
                      </p>
                      <div className="space-y-2">
                        {splitOrderItems.map((item) => {
                          const currentQty = person.allocations.find((line) => line.orderItemId === item.orderItemId)?.qty ?? 0;
                          const allocatedByOthers = getTotalAllocatedQty(
                            splitPersons.filter((_, idx) => idx !== pIdx),
                            item.orderItemId
                          );
                          const maxQty = Math.max(0, item.qty - allocatedByOthers);
                          return (
                            <div key={`${pIdx}-${item.orderItemId}`} className="grid grid-cols-[1fr_88px] gap-2 items-center">
                              <span className="text-xs text-foreground">{item.name} (max {maxQty})</span>
                              <input
                                aria-label={`${person.label}-${item.name}-qty`}
                                data-testid={`split-qty-${pIdx}-${item.orderItemId}`}
                                type="number"
                                min={0}
                                max={maxQty}
                                value={currentQty}
                                onChange={(event) => updateItemAllocation(pIdx, item.orderItemId, Number(event.target.value) || 0)}
                                className="w-full px-2 py-1.5 rounded-lg border border-border bg-card text-xs"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Split persons with payment */}
              <div className="space-y-2 mb-5">
                {splitPersonsWithPaid.map((person, i) => {
                  const paid = person.paidTotal;
                  const isPaid = paid >= person.totalDue && person.totalDue > 0;
                  return (
                    <div key={i} className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${isPaid ? "bg-success/5 border-success/20" : "bg-background border-border/50"}`}>
                      <span className="text-sm font-medium text-foreground flex-1">{person.label}</span>
                      <span className="text-xs text-muted-foreground">{formatRp(paid)} / {formatRp(person.totalDue)}</span>
                      {isPaid ? (
                        <span className="px-3 py-1 rounded-lg text-xs font-medium bg-success/10 text-success">Paid</span>
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
                      <p className="text-xs text-muted-foreground mb-3">
                        Remaining: {formatRp(
                          calculateRemaining(
                            splitPersons[payingPersonIdx]?.totalDue ?? 0,
                            calculatePaidTotal(getPersonPayments(payingPersonIdx))
                          )
                        )}
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
                      <input
                        aria-label="split-payment-amount"
                        data-testid="split-payment-amount"
                        type="number"
                        min={1}
                        value={splitPayAmount}
                        onChange={(event) => setSplitPayAmount(Number(event.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm mb-3"
                        placeholder="Enter payment amount"
                      />
                      {(getPersonPayments(payingPersonIdx) ?? []).length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {(getPersonPayments(payingPersonIdx) ?? []).map((line, lineIdx) => (
                            <div key={`split-payment-line-${lineIdx}`} className="flex items-center justify-between text-xs bg-background rounded-lg border border-border px-2 py-1.5">
                              <span>{line.method} • {formatRp(line.amount)}</span>
                              <button onClick={() => removeSplitPaymentLine(payingPersonIdx, lineIdx)} className="text-muted-foreground hover:text-foreground">
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => setPayingPersonIdx(null)} className="flex-1 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium">Cancel</button>
                        <button onClick={handleSplitPersonPay} disabled={!splitPayMethod || splitPayAmount <= 0}
                          className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40">Confirm Payment</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button onClick={completeSplitOrder} disabled={!allSplitAllocated || splitPersons.length === 0}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
                {!allSplitAllocated && splitMethod === "by-item"
                  ? "Finish Item Allocation"
                  : "Create Split Order"}
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
