import { useState } from "react";
import {
  Plus, Search, X, Percent, DollarSign, Gift, ToggleLeft, ToggleRight,
  Edit2, Trash2, Calendar, Clock, Tag, AlertCircle, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePromotionStore, type Promotion, type PromotionType } from "@/stores/promotionStore";
import { format } from "date-fns";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const menuItems = [
  { id: "1", name: "Nasi Goreng Special", category: "Main Course" },
  { id: "2", name: "Ayam Bakar", category: "Main Course" },
  { id: "3", name: "Mie Goreng", category: "Main Course" },
  { id: "4", name: "Sate Ayam 10pcs", category: "Main Course" },
  { id: "5", name: "Gado-Gado", category: "Appetizers" },
  { id: "6", name: "Lumpia Goreng", category: "Appetizers" },
  { id: "7", name: "Tahu Goreng", category: "Appetizers" },
  { id: "8", name: "Es Teh Manis", category: "Drinks" },
  { id: "9", name: "Jus Alpukat", category: "Drinks" },
  { id: "10", name: "Kopi Susu", category: "Drinks" },
  { id: "11", name: "Es Jeruk", category: "Drinks" },
  { id: "12", name: "Pisang Goreng", category: "Desserts" },
  { id: "13", name: "Es Campur", category: "Desserts" },
  { id: "14", name: "Kerupuk Udang", category: "Sides" },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const categories = ["Main Course", "Appetizers", "Drinks", "Desserts", "Sides"];

function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

function getPromoStatus(p: Promotion): "active" | "inactive" | "expired" {
  if (!p.active) return "inactive";
  const now = new Date();
  if (now > new Date(p.endDate)) return "expired";
  if (now < new Date(p.startDate)) return "inactive";
  return "active";
}

const typeLabels: Record<PromotionType, string> = {
  percentage: "Percentage Discount",
  fixed: "Fixed Discount",
  "buy-x-get-y": "Buy X Get Y",
};
const typeIcons: Record<PromotionType, typeof Percent> = {
  percentage: Percent,
  fixed: DollarSign,
  "buy-x-get-y": Gift,
};

type FormData = {
  name: string;
  description: string;
  type: PromotionType;
  discountPercent: number;
  maxDiscount: number;
  discountAmount: number;
  buyQty: number;
  getQty: number;
  applicableMenuIds: string[];
  minPurchase: number;
  applicableCategories: string[];
  outlet: string;
  dayRestriction: string[];
  timeStart: string;
  timeEnd: string;
  usageLimitPerDay: string;
  usagePerCustomer: string;
  stackable: boolean;
  startDate: Date;
  endDate: Date;
  active: boolean;
};

const defaultForm: FormData = {
  name: "",
  description: "",
  type: "percentage",
  discountPercent: 10,
  maxDiscount: 0,
  discountAmount: 0,
  buyQty: 1,
  getQty: 1,
  applicableMenuIds: [],
  minPurchase: 0,
  applicableCategories: [],
  outlet: "Main Outlet",
  dayRestriction: [],
  timeStart: "",
  timeEnd: "",
  usageLimitPerDay: "",
  usagePerCustomer: "",
  stackable: false,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 86400000),
  active: true,
};

export default function Promotions() {
  const { promotions, addPromotion, updatePromotion, removePromotion, toggleActive } = usePromotionStore();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [filterType, setFilterType] = useState<"all" | PromotionType>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = promotions.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    const status = getPromoStatus(p);
    if (filterStatus !== "all" && status !== filterStatus) return false;
    if (filterType !== "all" && p.type !== filterType) return false;
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      type: p.type,
      discountPercent: p.discountPercent || 10,
      maxDiscount: p.maxDiscount || 0,
      discountAmount: p.discountAmount || 0,
      buyQty: p.buyQty || 1,
      getQty: p.getQty || 1,
      applicableMenuIds: [...p.applicableMenuIds],
      minPurchase: p.minPurchase,
      applicableCategories: [...p.applicableCategories],
      outlet: p.outlet,
      dayRestriction: [...p.dayRestriction],
      timeStart: p.timeStart,
      timeEnd: p.timeEnd,
      usageLimitPerDay: p.usageLimitPerDay !== null ? String(p.usageLimitPerDay) : "",
      usagePerCustomer: p.usagePerCustomer !== null ? String(p.usagePerCustomer) : "",
      stackable: p.stackable,
      startDate: new Date(p.startDate),
      endDate: new Date(p.endDate),
      active: p.active,
    });
    setErrors({});
    setShowForm(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.type === "percentage" && (form.discountPercent <= 0 || form.discountPercent > 100))
      e.discountPercent = "Must be 1–100";
    if (form.type === "fixed" && form.discountAmount <= 0)
      e.discountAmount = "Must be > 0";
    if (form.type === "buy-x-get-y" && form.buyQty <= 0) e.buyQty = "Must be > 0";
    if (form.endDate <= form.startDate) e.endDate = "End must be after start";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const promo: Promotion = {
      id: editingId || crypto.randomUUID(),
      name: form.name,
      description: form.description,
      type: form.type,
      discountPercent: form.discountPercent,
      maxDiscount: form.maxDiscount || undefined,
      discountAmount: form.discountAmount,
      buyQty: form.buyQty,
      getQty: form.getQty,
      applicableMenuIds: form.applicableMenuIds,
      minPurchase: form.minPurchase,
      applicableCategories: form.applicableCategories,
      outlet: form.outlet,
      dayRestriction: form.dayRestriction,
      timeStart: form.timeStart,
      timeEnd: form.timeEnd,
      usageLimitPerDay: form.usageLimitPerDay ? parseInt(form.usageLimitPerDay) : null,
      usagePerCustomer: form.usagePerCustomer ? parseInt(form.usagePerCustomer) : null,
      stackable: form.stackable,
      startDate: form.startDate,
      endDate: form.endDate,
      active: form.active,
      usedToday: 0,
    };
    if (editingId) {
      updatePromotion(editingId, promo);
    } else {
      addPromotion(promo);
    }
    setShowForm(false);
  };

  const toggleMenu = (id: string) => {
    setForm((f) => ({
      ...f,
      applicableMenuIds: f.applicableMenuIds.includes(id)
        ? f.applicableMenuIds.filter((m) => m !== id)
        : [...f.applicableMenuIds, id],
    }));
  };

  const toggleDay = (d: string) => {
    setForm((f) => ({
      ...f,
      dayRestriction: f.dayRestriction.includes(d)
        ? f.dayRestriction.filter((x) => x !== d)
        : [...f.dayRestriction, d],
    }));
  };

  const toggleCategory = (c: string) => {
    setForm((f) => ({
      ...f,
      applicableCategories: f.applicableCategories.includes(c)
        ? f.applicableCategories.filter((x) => x !== c)
        : [...f.applicableCategories, c],
    }));
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600",
    inactive: "bg-muted text-muted-foreground",
    expired: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Promotions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {promotions.length} promotions • {promotions.filter((p) => getPromoStatus(p) === "active").length} active
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> New Promotion
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search promotions..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive", "expired"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none">
          <option value="all">All Types</option>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed</option>
          <option value="buy-x-get-y">Buy X Get Y</option>
        </select>
      </div>

      {/* Promo List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Tag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No promotions found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Create your first promotion to get started</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => {
            const status = getPromoStatus(p);
            const Icon = typeIcons[p.type];
            return (
              <motion.div key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border/50 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${status === "active" ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`h-5 w-5 ${status === "active" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusColors[status]}`}>{status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{typeLabels[p.type]}
                      {p.type === "percentage" && ` — ${p.discountPercent}% off`}
                      {p.type === "fixed" && ` — ${formatRp(p.discountAmount || 0)} off`}
                      {p.type === "buy-x-get-y" && ` — Buy ${p.buyQty} Get ${p.getQty}`}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
                        {format(new Date(p.startDate), "dd MMM")} – {format(new Date(p.endDate), "dd MMM yyyy")}
                      </span>
                      {p.minPurchase > 0 && <span>Min. {formatRp(p.minPurchase)}</span>}
                      {p.dayRestriction.length > 0 && <span>{p.dayRestriction.join(", ")}</span>}
                      {p.timeStart && p.timeEnd && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.timeStart}–{p.timeEnd}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActive(p.id)} className="p-2 rounded-lg hover:bg-muted transition-colors" title={p.active ? "Deactivate" : "Activate"}>
                      {p.active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => removePromotion(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-border/50 shrink-0">
                <h2 className="text-lg font-bold text-foreground">{editingId ? "Edit" : "Create"} Promotion</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Section 1: Basic Info */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Promotion Name *</label>
                      <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className={`w-full px-3 py-2.5 rounded-xl bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.name ? "border-destructive" : "border-border"}`}
                        placeholder="e.g. Weekend Special 20% Off" />
                      {errors.name && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Type *</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["percentage", "fixed", "buy-x-get-y"] as PromotionType[]).map((t) => {
                          const Icon = typeIcons[t];
                          return (
                            <button key={t} onClick={() => setForm({ ...form, type: t })}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${form.type === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                              <Icon className="h-5 w-5" />
                              {typeLabels[t]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        rows={2} placeholder="Optional description..." />
                    </div>
                  </div>
                </section>

                {/* Section 2: Rules */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Promotion Rules</h3>
                  <div className="space-y-3 bg-muted/20 rounded-xl p-4 border border-border/30">
                    {form.type === "percentage" && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Discount (%)</label>
                            <input type="number" min={1} max={100} value={form.discountPercent}
                              onChange={(e) => setForm({ ...form, discountPercent: parseInt(e.target.value) || 0 })}
                              className={`w-full px-3 py-2.5 rounded-xl bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.discountPercent ? "border-destructive" : "border-border"}`} />
                            {errors.discountPercent && <p className="text-xs text-destructive mt-1">{errors.discountPercent}</p>}
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Discount</label>
                            <input type="number" min={0} value={form.maxDiscount}
                              onChange={(e) => setForm({ ...form, maxDiscount: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="No limit" />
                          </div>
                        </div>
                      </>
                    )}
                    {form.type === "fixed" && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Discount Amount</label>
                        <input type="number" min={0} value={form.discountAmount}
                          onChange={(e) => setForm({ ...form, discountAmount: parseInt(e.target.value) || 0 })}
                          className={`w-full px-3 py-2.5 rounded-xl bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.discountAmount ? "border-destructive" : "border-border"}`} />
                        {errors.discountAmount && <p className="text-xs text-destructive mt-1">{errors.discountAmount}</p>}
                      </div>
                    )}
                    {form.type === "buy-x-get-y" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Buy Quantity (X)</label>
                          <input type="number" min={1} value={form.buyQty}
                            onChange={(e) => setForm({ ...form, buyQty: parseInt(e.target.value) || 1 })}
                            className={`w-full px-3 py-2.5 rounded-xl bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.buyQty ? "border-destructive" : "border-border"}`} />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Get Quantity (Y)</label>
                          <input type="number" min={1} value={form.getQty}
                            onChange={(e) => setForm({ ...form, getQty: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        </div>
                      </div>
                    )}
                    {form.type === "buy-x-get-y" && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Applicable Menu Items</label>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          {menuItems.map((m) => (
                            <button key={m.id} onClick={() => toggleMenu(m.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${form.applicableMenuIds.includes(m.id) ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground hover:text-foreground"}`}>
                              {m.name}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Leave empty to apply to all items</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Section 3: Conditions */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-primary" /> Conditions</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Minimum Purchase</label>
                      <input type="number" min={0} value={form.minPurchase}
                        onChange={(e) => setForm({ ...form, minPurchase: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="0 (no minimum)" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Applicable Categories</label>
                      <div className="flex flex-wrap gap-1.5">
                        {categories.map((c) => (
                          <button key={c} onClick={() => toggleCategory(c)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${form.applicableCategories.includes(c) ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground hover:text-foreground"}`}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Day Restriction</label>
                      <div className="flex gap-1.5">
                        {days.map((d) => (
                          <button key={d} onClick={() => toggleDay(d)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${form.dayRestriction.includes(d) ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground hover:text-foreground"}`}>
                            {d}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Leave empty for all days</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Time Start</label>
                        <input type="time" value={form.timeStart}
                          onChange={(e) => setForm({ ...form, timeStart: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Time End</label>
                        <input type="time" value={form.timeEnd}
                          onChange={(e) => setForm({ ...form, timeEnd: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 4: Limitations */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Limitations</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Usage Limit / Day</label>
                      <input type="number" min={0} value={form.usageLimitPerDay}
                        onChange={(e) => setForm({ ...form, usageLimitPerDay: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Unlimited" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Usage / Customer</label>
                      <input type="number" min={0} value={form.usagePerCustomer}
                        onChange={(e) => setForm({ ...form, usagePerCustomer: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Unlimited" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">Stackable</p>
                      <p className="text-xs text-muted-foreground">Can combine with other promos</p>
                    </div>
                    <button onClick={() => setForm({ ...form, stackable: !form.stackable })}>
                      {form.stackable ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                    </button>
                  </div>
                </section>

                {/* Section 5: Active Period */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Active Period</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-left flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/20">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {format(form.startDate, "dd MMM yyyy")}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarUI mode="single" selected={form.startDate}
                            onSelect={(d) => d && setForm({ ...form, startDate: d })}
                            className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className={`w-full px-3 py-2.5 rounded-xl bg-background border text-sm text-left flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.endDate ? "border-destructive" : "border-border"}`}>
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {format(form.endDate, "dd MMM yyyy")}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarUI mode="single" selected={form.endDate}
                            onSelect={(d) => d && setForm({ ...form, endDate: d })}
                            className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                      {errors.endDate && <p className="text-xs text-destructive mt-1">{errors.endDate}</p>}
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-5 border-t border-border/50 flex gap-2 shrink-0">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                  {editingId ? "Update" : "Create"} Promotion
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
