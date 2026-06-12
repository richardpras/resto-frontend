import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Search, Plus, Minus, Trash2, ShoppingCart, ChevronLeft, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQrOrderStore } from "@/stores/qrOrderStore";
import { toast } from "sonner";
import { getApiErrorCode } from "@/lib/apiErrorCode";
import {
  qrScanErrorMessage,
  qrScanErrorTitle,
  type QrScanErrorCode,
} from "@/components/tables/qrScanErrors";
import { QrOrderMyOrdersSection } from "@/components/qr-order/QrOrderMyOrdersSection";
import type { QrActiveSessionApi } from "@/lib/api-integration/tableEndpoints";
import {
  addActiveOrderCode,
  setCurrentTableToken,
  setLastSubmittedOrderCode,
  setOrderRequestId,
  setOrderTableContext,
} from "@/lib/qrOrderSession";

type MenuItem = {
  id: string; name: string; price: number; category: string; emoji: string; description: string;
};
type CartItem = MenuItem & { qty: number; notes: string };

const categories = ["All", "Main Course", "Appetizers", "Drinks", "Desserts", "Sides"];
const menuItems: MenuItem[] = [
  { id: "1", name: "Nasi Goreng Special", price: 30000, category: "Main Course", emoji: "🍛", description: "Fried rice with egg, chicken & shrimp crackers" },
  { id: "2", name: "Ayam Bakar", price: 40000, category: "Main Course", emoji: "🍗", description: "Grilled chicken with signature sambal" },
  { id: "3", name: "Mie Goreng", price: 25000, category: "Main Course", emoji: "🍝", description: "Stir-fried noodles with vegetables" },
  { id: "4", name: "Sate Ayam 10pcs", price: 35000, category: "Main Course", emoji: "🥘", description: "Chicken satay with peanut sauce" },
  { id: "5", name: "Gado-Gado", price: 22000, category: "Appetizers", emoji: "🥗", description: "Mixed vegetables with peanut dressing" },
  { id: "6", name: "Lumpia Goreng", price: 15000, category: "Appetizers", emoji: "🌯", description: "Crispy spring rolls (4pcs)" },
  { id: "7", name: "Tahu Goreng", price: 12000, category: "Appetizers", emoji: "🧈", description: "Fried tofu with sweet soy sauce" },
  { id: "8", name: "Es Teh Manis", price: 10000, category: "Drinks", emoji: "🧊", description: "Sweet iced tea" },
  { id: "9", name: "Jus Alpukat", price: 18000, category: "Drinks", emoji: "🥑", description: "Creamy avocado juice" },
  { id: "10", name: "Kopi Susu", price: 20000, category: "Drinks", emoji: "☕", description: "Iced coffee with milk" },
  { id: "11", name: "Es Jeruk", price: 12000, category: "Drinks", emoji: "🍊", description: "Fresh orange juice with ice" },
  { id: "12", name: "Pisang Goreng", price: 15000, category: "Desserts", emoji: "🍌", description: "Fried banana fritters (5pcs)" },
  { id: "13", name: "Es Campur", price: 18000, category: "Desserts", emoji: "🍧", description: "Mixed ice dessert with fruits" },
  { id: "14", name: "Kerupuk Udang", price: 8000, category: "Sides", emoji: "🦐", description: "Shrimp crackers" },
  { id: "15", name: "Sambal Extra", price: 5000, category: "Sides", emoji: "🌶️", description: "Extra chili sambal" },
  { id: "16", name: "Nasi Putih", price: 7000, category: "Sides", emoji: "🍚", description: "Steamed white rice" },
];

function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

type View = "menu" | "cart" | "confirm";

/**
 * Guest / table self-order flow. Routed at `/qr-order` outside the main layout in `App.tsx`
 * so it is full-viewport without the staff sidebar — intentional for customer phones & kiosks.
 * Staff monitors QR traffic at `/qr-orders` inside the app shell.
 */
export default function QROrder() {
  const navigate = useNavigate();
  const { qrPublicId } = useParams<{ qrPublicId: string }>();
  const [searchParams] = useSearchParams();
  const createRequest = useQrOrderStore((s) => s.createRequest);
  const isSubmitting = useQrOrderStore((s) => s.isSubmitting);
  const hasApiAccess = useQrOrderStore((s) => s.hasApiAccess);
  const resolveTableFromPublicId = useQrOrderStore((s) => s.resolveTableFromPublicId);
  const resolveLegacyTable = useQrOrderStore((s) => s.resolveLegacyTable);
  const fetchTableOperationalStatus = useQrOrderStore((s) => s.fetchTableOperationalStatus);

  const [view, setView] = useState<View>("menu");
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notesItem, setNotesItem] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [projectionStatus, setProjectionStatus] = useState<
    "unknown" | "checking" | "available" | "occupied" | "reserved" | "cleaning" | "disabled"
  >("unknown");
  const outletIdParam = Number(searchParams.get("outletId"));
  const tableIdParam = Number(searchParams.get("tableId"));
  const [resolvedOutletId, setResolvedOutletId] = useState<number | null>(null);
  const [resolvedTableId, setResolvedTableId] = useState<number | null>(null);
  const [resolveError, setResolveError] = useState<QrScanErrorCode | null>(null);
  const [resolvingQr, setResolvingQr] = useState(false);
  const [activeSession, setActiveSession] = useState<QrActiveSessionApi | null>(null);
  const [appendToRequestCode, setAppendToRequestCode] = useState<string | null>(null);
  const tableNameParam = searchParams.get("tableName")?.trim() ?? "";
  const [tableNumber, setTableNumber] = useState(tableNameParam || "12");
  const activeOutletId = resolvedOutletId ?? (Number.isFinite(outletIdParam) ? outletIdParam : null);
  const activeTableId = resolvedTableId ?? (Number.isFinite(tableIdParam) ? tableIdParam : null);
  const tableSessionToken =
    typeof qrPublicId === "string" && qrPublicId.trim() !== ""
      ? qrPublicId.trim()
      : activeOutletId !== null && activeTableId !== null
        ? `legacy-${activeOutletId}-${activeTableId}`
        : null;

  useEffect(() => {
    let active = true;
    if (typeof qrPublicId !== "string" || qrPublicId.trim() === "") return;
    setResolvingQr(true);
    setResolveError(null);
    void resolveTableFromPublicId(qrPublicId)
      .then((resolved) => {
        if (!active) return;
        setResolvedOutletId(resolved.outletId);
        setResolvedTableId(resolved.tableId);
        setTableNumber(resolved.tableName);
        setResolveError(null);
        setCurrentTableToken(qrPublicId.trim());
        setActiveSession(resolved.activeSession ?? null);
        const activeCode = resolved.activeSession?.activeQrOrder?.requestCode ?? null;
        setAppendToRequestCode(activeCode);
      })
      .catch((error) => {
        if (!active) return;
        const code = getApiErrorCode(error);
        if (
          code === "qr_not_found" ||
          code === "qr_expired" ||
          code === "table_unavailable" ||
          code === "outlet_unavailable"
        ) {
          setResolveError(code);
        }
      })
      .finally(() => {
        if (active) setResolvingQr(false);
      });
    return () => {
      active = false;
    };
  }, [qrPublicId, resolveTableFromPublicId]);

  useEffect(() => {
    let active = true;
    if (typeof qrPublicId === "string" && qrPublicId.trim() !== "") return;
    if (resolvedOutletId !== null || resolvedTableId !== null) return;
    if (!Number.isFinite(outletIdParam) || outletIdParam < 1 || !Number.isFinite(tableIdParam) || tableIdParam < 1) return;
    setResolvingQr(true);
    setResolveError(null);
    void resolveLegacyTable(outletIdParam, tableIdParam)
      .then((resolved) => {
        if (!active) return;
        setResolvedOutletId(resolved.outletId);
        setResolvedTableId(resolved.tableId);
        setTableNumber(resolved.tableName);
        setResolveError(null);
      })
      .catch((error) => {
        if (!active) return;
        const code = getApiErrorCode(error);
        if (
          code === "qr_not_found" ||
          code === "qr_expired" ||
          code === "table_unavailable" ||
          code === "outlet_unavailable"
        ) {
          setResolveError(code);
        }
      })
      .finally(() => {
        if (active) setResolvingQr(false);
      });
    return () => {
      active = false;
    };
  }, [qrPublicId, outletIdParam, tableIdParam, resolvedOutletId, resolvedTableId, resolveLegacyTable]);

  const filtered = useMemo(() =>
    menuItems.filter(
      (m) => (activeCat === "All" || m.category === activeCat) &&
        m.name.toLowerCase().includes(search.toLowerCase())
    ), [activeCat, search]);

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
  const tax = Math.round(subtotal * 0.1);
  const baseTotal = subtotal + tax;
  const total = baseTotal;
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);

  useEffect(() => {
    let active = true;
    if (!hasApiAccess() || !Number.isFinite(activeOutletId) || activeOutletId < 1 || !Number.isFinite(activeTableId) || activeTableId < 1) {
      return;
    }
    setProjectionStatus("checking");
    void fetchTableOperationalStatus(activeOutletId, activeTableId)
      .then((status) => {
        if (!active) return;
        setProjectionStatus(status);
      })
      .catch(() => {
        if (!active) return;
        setProjectionStatus("unknown");
      });
    return () => {
      active = false;
    };
  }, [activeOutletId, activeTableId, hasApiAccess, fetchTableOperationalStatus]);

  const submitOrder = async () => {
    if (!Number.isFinite(activeOutletId) || activeOutletId < 1 || !Number.isFinite(activeTableId) || activeTableId < 1) {
      toast.error("QR link is invalid. Missing outletId/tableId.");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Please enter your name before submitting.");
      return;
    }
    if (projectionStatus === "checking") {
      toast.error("Table availability is still loading. Please wait a moment.");
      return;
    }
    if (projectionStatus === "reserved" || projectionStatus === "cleaning" || projectionStatus === "disabled") {
      toast.error(`Table is currently ${projectionStatus}. Please ask staff for assistance.`);
      return;
    }
    try {
      const created = await createRequest({
        outletId: activeOutletId,
        tableId: activeTableId,
        customerName: customerName.trim(),
        ...(appendToRequestCode ? { appendToRequestCode } : {}),
        items: cart.map((item) => ({
          menuItemId: Number(item.id),
          qty: item.qty,
          notes: item.notes || undefined,
        })),
      });
      if (tableSessionToken) {
        setCurrentTableToken(tableSessionToken);
        addActiveOrderCode(tableSessionToken, created.requestCode);
      }
      setOrderRequestId(created.requestCode, String(created.id));
      setOrderTableContext(created.requestCode, {
        outletId: activeOutletId,
        tableId: activeTableId,
      });
      setLastSubmittedOrderCode(created.requestCode);
      setCart([]);
      navigate(`/qr/order/${encodeURIComponent(created.requestCode)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit QR order");
    }
  };

  if (resolveError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="qr-scan-error">
        <div className="bg-card rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-border">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">{qrScanErrorTitle(resolveError)}</h1>
          <p className="text-sm text-muted-foreground">{qrScanErrorMessage(resolveError)}</p>
        </div>
      </div>
    );
  }

  if (resolvingQr && activeOutletId === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="qr-scan-loading">
        <p className="text-sm text-muted-foreground">Opening table menu…</p>
      </div>
    );
  }

  // --- CONFIRM VIEW ---
  if (view === "confirm") {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 bg-card border-b border-border z-10">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => setView("cart")} className="p-1.5 rounded-xl hover:bg-muted"><ChevronLeft className="h-5 w-5 text-foreground" /></button>
            <h1 className="text-base font-bold text-foreground">Confirm Order</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Your Details</h3>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter your name"
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Table Number</label>
              <input type="text" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Order Summary</h3>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0"><span>{item.emoji}</span><span className="text-foreground truncate">{item.name}</span><span className="text-muted-foreground shrink-0">×{item.qty}</span></div>
                  <span className="font-medium text-foreground shrink-0 ml-2">{formatRp(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-3 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatRp(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Tax (10%)</span><span>{formatRp(tax)}</span></div>
              <div className="flex justify-between font-bold text-foreground text-base pt-1"><span>Total</span><span>{formatRp(total)}</span></div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground px-1">
            Payment is handled by cashier only. You cannot pay from this screen.
          </p>
          {(projectionStatus === "reserved" || projectionStatus === "cleaning" || projectionStatus === "disabled") && (
            <p className="text-xs text-destructive px-1">
              This table is currently {projectionStatus}. New QR orders are temporarily blocked.
            </p>
          )}
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
          <div className="max-w-lg mx-auto">
            <button
              disabled={isSubmitting}
              onClick={submitOrder}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <Send className="h-4 w-4" /> {isSubmitting ? "Submitting..." : `Submit Order • ${formatRp(total)}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- CART VIEW ---
  if (view === "cart") {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 bg-card border-b border-border z-10">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => setView("menu")} className="p-1.5 rounded-xl hover:bg-muted"><ChevronLeft className="h-5 w-5 text-foreground" /></button>
            <h1 className="text-base font-bold text-foreground">Your Cart</h1>
            <span className="text-xs text-muted-foreground ml-auto bg-muted px-2 py-1 rounded-lg">{totalItems} items</span>
          </div>
        </div>
        <div className="max-w-lg mx-auto p-4 pb-28 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Your cart is empty</p>
              <button onClick={() => setView("menu")} className="mt-4 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Browse Menu</button>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }}
                  className="bg-card rounded-2xl p-4 border border-border">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatRp(item.price)} each</p>
                      {item.notes && <p className="text-xs text-primary/70 mt-1 italic">📝 {item.notes}</p>}
                    </div>
                    <p className="text-sm font-bold text-foreground">{formatRp(item.price * item.qty)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.id, -1)} className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform">
                        {item.qty === 1 ? <Trash2 className="h-3.5 w-3.5 text-destructive" /> : <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-foreground">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform">
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <button onClick={() => setNotesItem(notesItem === item.id ? null : item.id)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {item.notes ? "Edit note" : "+ Add note"}
                    </button>
                  </div>
                  <AnimatePresence>
                    {notesItem === item.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <input type="text" placeholder="e.g. No spicy, extra sauce..." value={item.notes} onChange={(e) => updateNotes(item.id, e.target.value)}
                          className="mt-3 w-full text-xs px-3 py-2.5 rounded-xl bg-muted border-0 focus:outline-none focus:ring-1 focus:ring-primary/20" autoFocus />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
            <div className="max-w-lg mx-auto space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{formatRp(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax (10%)</span><span className="text-foreground">{formatRp(tax)}</span></div>
              <button onClick={() => setView("confirm")} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2">
                Checkout • {formatRp(total)}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- MENU VIEW ---
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-card border-b border-border z-10">
        <div className="px-4 pt-4 pb-3 max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-foreground mb-0.5">🍽️ RestoHub Menu</h1>
          <p className="text-xs text-muted-foreground">Scan • Order • Enjoy</p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search menu..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide max-w-lg mx-auto">
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeCat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-lg mx-auto p-4 pb-24">
        {activeSession?.activeQrOrder && (
          <div
            className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3"
            data-testid="qr-active-order-resume"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Resume Existing Order</p>
              <p className="text-xs text-muted-foreground mt-1">
                Table {tableNumber} · {activeSession.activeQrOrder.requestCode}
              </p>
              <p className="text-sm text-primary font-medium mt-1">
                {activeSession.activeQrOrder.customerStatusLabel}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/qr/order/${encodeURIComponent(activeSession.activeQrOrder.requestCode)}`}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold text-center"
              >
                View Order
              </Link>
              <button
                type="button"
                onClick={() => setAppendToRequestCode(activeSession.activeQrOrder?.requestCode ?? null)}
                className="flex-1 py-2.5 rounded-xl border border-primary text-primary text-sm font-semibold"
              >
                Add More Items
              </button>
            </div>
            {appendToRequestCode && (
              <p className="text-xs text-muted-foreground">
                New items will be added to {appendToRequestCode}.
              </p>
            )}
          </div>
        )}
        {tableSessionToken ? <QrOrderMyOrdersSection tableToken={tableSessionToken} /> : null}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((item) => {
            const inCart = cart.find((c) => c.id === item.id);
            return (
              <motion.button key={item.id} whileTap={{ scale: 0.96 }} onClick={() => addToCart(item)}
                className={`relative bg-card rounded-2xl p-4 border text-left transition-all ${inCart ? "border-primary/30 ring-1 ring-primary/10" : "border-border"}`}>
                <span className="text-3xl block mb-2">{item.emoji}</span>
                <p className="text-sm font-medium text-foreground leading-tight">{item.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                <p className="text-sm font-bold text-primary mt-1.5">{formatRp(item.price)}</p>
                {inCart && (
                  <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{inCart.qty}</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
          <div className="max-w-lg mx-auto">
            <button onClick={() => setView("cart")}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-3">
              <ShoppingCart className="h-4 w-4" />
              View Cart ({totalItems}) • {formatRp(total)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
