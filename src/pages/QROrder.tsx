import { useState, useMemo } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, ChevronLeft, Send, X, Store, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createOrder, type CreateOrderPayload } from "@/lib/api";
import { toast } from "sonner";

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

type View = "menu" | "cart" | "confirm" | "success";

export default function QROrder() {
  const [view, setView] = useState<View>("menu");
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notesItem, setNotesItem] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("12");
  const [paymentChoice, setPaymentChoice] = useState<"cashier" | "online">("cashier");
  const [orderCode, setOrderCode] = useState(() => "QR-" + Math.random().toString(36).substring(2, 8).toUpperCase());

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
  const total = subtotal + tax;
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);

  const submitOrder = async () => {
    try {
      const payload: CreateOrderPayload = {
        code: orderCode,
        source: "qr",
        orderType: "Dine-in",
        items: cart.map((c) => ({ id: c.id, name: c.name, price: c.price, qty: c.qty, emoji: c.emoji, notes: c.notes })),
        subtotal,
        tax,
        total,
        status: "confirmed",
        paymentStatus: "unpaid",
        payments: [],
        customerName,
        customerPhone: "",
        tableNumber,
        createdAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
      };
      const response = await createOrder(payload);
      setOrderCode(response.code);
      setView("success");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit QR order");
    }
  };

  // --- SUCCESS VIEW ---
  if (view === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-card rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-border">
          <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center mx-auto mb-5"><span className="text-4xl">✅</span></div>
          <h2 className="text-xl font-bold text-foreground mb-1">Order Submitted!</h2>
          <p className="text-sm text-muted-foreground mb-6">Your order is being prepared</p>
          <div className="bg-muted rounded-2xl p-4 mb-6">
            <p className="text-xs text-muted-foreground mb-1">Order Code</p>
            <p className="text-2xl font-bold text-primary tracking-wider">{orderCode}</p>
          </div>
          <div className="space-y-2 text-sm text-left mb-6">
            <div className="flex justify-between"><span className="text-muted-foreground">Table</span><span className="font-medium text-foreground">#{tableNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span className="font-medium text-foreground">{totalItems} items</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold text-foreground">{formatRp(total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="font-medium text-foreground">{paymentChoice === "cashier" ? "Pay at Cashier" : "Online Payment"}</span></div>
          </div>
          <p className="text-xs text-muted-foreground">Show this code to the cashier when picking up your order.</p>
          <button
            onClick={() => {
              setCart([]);
              setOrderCode("QR-" + Math.random().toString(36).substring(2, 8).toUpperCase());
              setView("menu");
            }}
            className="mt-6 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Order More
          </button>
        </motion.div>
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
              <label className="text-xs text-muted-foreground mb-1 block">Name (optional)</label>
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
          <div className="bg-card rounded-2xl p-4 border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPaymentChoice("cashier")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${paymentChoice === "cashier" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"}`}>
                <Store className="h-6 w-6 text-primary" /><span className="text-xs font-medium text-foreground">Pay at Cashier</span>
              </button>
              <button onClick={() => setPaymentChoice("online")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${paymentChoice === "online" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"}`}>
                <CreditCard className="h-6 w-6 text-primary" /><span className="text-xs font-medium text-foreground">Pay Online</span>
              </button>
            </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
          <div className="max-w-lg mx-auto">
            <button onClick={submitOrder} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2">
              <Send className="h-4 w-4" /> Submit Order • {formatRp(total)}
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
