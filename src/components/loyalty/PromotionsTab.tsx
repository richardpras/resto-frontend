import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import {
  createPromotion,
  listPromotions,
  setPromotionActivation,
  updatePromotion,
  type PromotionRow,
  type PromotionType,
} from "@/lib/api-integration/promotionEndpoints";
import { listMenuItems, type MenuItemApi } from "@/lib/api-integration/endpoints";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Pencil, Plus, Power } from "lucide-react";

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type PromotionFormState = {
  code: string;
  name: string;
  description: string;
  type: PromotionType;
  rate: string;
  maxDiscount: string;
  fixedAmount: string;
  buyQty: string;
  getQty: string;
  selectedMenuItemIds: string[];
  minSpend: string;
  priority: string;
  validFrom: string;
  validUntil: string;
  categories: string;
  dayRestriction: string[];
  timeStart: string;
  timeEnd: string;
  usageLimitPerDay: string;
};

const defaultForm = (): PromotionFormState => ({
  code: "",
  name: "",
  description: "",
  type: "percentage_order",
  rate: "10",
  maxDiscount: "",
  fixedAmount: "10000",
  buyQty: "1",
  getQty: "1",
  selectedMenuItemIds: [],
  minSpend: "0",
  priority: "5",
  validFrom: "",
  validUntil: "",
  categories: "",
  dayRestriction: [],
  timeStart: "",
  timeEnd: "",
  usageLimitPerDay: "0",
});

function buildConfig(form: PromotionFormState) {
  const menuItemIds = form.selectedMenuItemIds;

  if (form.type === "fixed_amount") {
    return { amount: Number(form.fixedAmount) || 0 };
  }
  if (form.type === "buy_x_get_y") {
    return {
      buyQty: Number(form.buyQty) || 1,
      getQty: Number(form.getQty) || 1,
      menuItemIds,
    };
  }
  return {
    rate: Number(form.rate) || 0,
    maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
    menuItemIds: form.type === "percentage_items" ? menuItemIds : [],
  };
}

function formFromRow(row: PromotionRow): PromotionFormState {
  const cfg = row.config ?? {};
  return {
    code: row.code,
    name: row.name,
    description: row.description ?? "",
    type: row.type,
    rate: String(cfg.rate ?? 10),
    maxDiscount: cfg.maxDiscount != null ? String(cfg.maxDiscount) : "",
    fixedAmount: String(cfg.amount ?? 0),
    buyQty: String(cfg.buyQty ?? 1),
    getQty: String(cfg.getQty ?? 1),
    menuItemIds: (cfg.menuItemIds ?? row.conditions?.menuItemIds ?? []).map(String),
    minSpend: String(row.conditions?.minSpend ?? 0),
    priority: String(row.priority ?? 0),
    validFrom: row.validFrom?.slice(0, 16) ?? "",
    validUntil: row.validUntil?.slice(0, 16) ?? "",
    categories: (row.conditions?.categories ?? []).join(", "),
    dayRestriction: row.conditions?.dayRestriction ?? [],
    timeStart: row.conditions?.timeStart ?? "",
    timeEnd: row.conditions?.timeEnd ?? "",
    usageLimitPerDay: String(row.conditions?.usageLimitPerDay ?? 0),
  };
}

type PromotionsTabProps = {
  outletId: number;
};

export function PromotionsTab({ outletId }: PromotionsTabProps) {
  const { t } = useErpTranslation();
  const [rows, setRows] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionRow | null>(null);
  const [form, setForm] = useState<PromotionFormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemApi[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listPromotions(outletId));
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("promotions.toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void listMenuItems({ outletId, perPage: 200 })
      .then((items) => setMenuItems(items.filter((item) => item.available !== false)))
      .catch(() => setMenuItems([]));
  }, [outletId]);

  const typeLabel = useCallback(
    (type: PromotionType) => t(`promotions.types.${type}` as "promotions.types.percentage_order"),
    [t],
  );

  const columns: Column<PromotionRow>[] = useMemo(
    () => [
      { key: "code", header: t("promotions.columns.code"), sortable: true },
      { key: "name", header: t("promotions.columns.name"), sortable: true },
      { key: "type", header: t("promotions.columns.type"), render: (r) => typeLabel(r.type) },
      { key: "priority", header: t("promotions.columns.priority"), sortable: true },
      {
        key: "isActive",
        header: t("promotions.columns.status"),
        render: (r) => (
          <span className={r.isActive ? "text-emerald-600" : "text-muted-foreground"}>
            {r.isActive ? t("payroll.shared.active") : t("payroll.shared.inactive")}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (r) => (
          <div className="flex gap-1 justify-end">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setEditing(r);
                setForm(formFromRow(r));
                setOpen(true);
              }}
              aria-label={t("promotions.actions.edit")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() =>
                void setPromotionActivation(r.id, !r.isActive)
                  .then(() => load())
                  .then(() =>
                    toast.success(
                      r.isActive ? t("promotions.toast.deactivated") : t("promotions.toast.activated"),
                    ),
                  )
                  .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("promotions.toast.failed")))
              }
              aria-label={t("promotions.actions.toggleActive")}
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [load, t, typeLabel],
  );

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        config: buildConfig(form),
        conditions: {
          minSpend: Number(form.minSpend) || 0,
          menuItemIds: form.selectedMenuItemIds,
          categories: form.categories
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          dayRestriction: form.dayRestriction,
          timeStart: form.timeStart || null,
          timeEnd: form.timeEnd || null,
          usageLimitPerDay: Number(form.usageLimitPerDay) || 0,
        },
        priority: Number(form.priority) || 0,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
      };

      if (editing) {
        await updatePromotion(editing.id, payload);
        toast.success(t("promotions.toast.updated"));
      } else {
        await createPromotion({ outletId, ...payload, isActive: true });
        toast.success(t("promotions.toast.created"));
      }
      setOpen(false);
      setEditing(null);
      setForm(defaultForm());
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("promotions.toast.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setForm(defaultForm());
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> {t("promotions.actions.new")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage={t("promotions.page.empty")}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("promotions.dialog.editTitle") : t("promotions.dialog.newTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("promotions.form.code")}</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t("promotions.form.priority")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("promotions.form.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("promotions.form.description")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("promotions.form.type")}</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as PromotionType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage_order">{t("promotions.types.percentage_order")}</SelectItem>
                  <SelectItem value="percentage_items">{t("promotions.types.percentage_items")}</SelectItem>
                  <SelectItem value="fixed_amount">{t("promotions.types.fixed_amount")}</SelectItem>
                  <SelectItem value="buy_x_get_y">{t("promotions.types.buy_x_get_y")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(form.type === "percentage_order" || form.type === "percentage_items") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("promotions.form.rate")}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.rate}
                    onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("promotions.form.maxDiscount")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.maxDiscount}
                    onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {form.type === "fixed_amount" && (
              <div className="space-y-1">
                <Label>{t("promotions.form.fixedAmount")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.fixedAmount}
                  onChange={(e) => setForm((f) => ({ ...f, fixedAmount: e.target.value }))}
                />
              </div>
            )}

            {form.type === "buy_x_get_y" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t("promotions.form.buyQty")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.buyQty}
                    onChange={(e) => setForm((f) => ({ ...f, buyQty: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("promotions.form.getQty")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.getQty}
                    onChange={(e) => setForm((f) => ({ ...f, getQty: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {(form.type === "percentage_items" || form.type === "buy_x_get_y") && (
              <div className="space-y-2">
                <Label>{t("promotions.form.menuItems")}</Label>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border/60 p-2 space-y-1">
                  {menuItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("promotions.form.noMenuItems")}</p>
                  ) : (
                    menuItems.map((item) => {
                      const id = String(item.id);
                      const checked = form.selectedMenuItemIds.includes(id);
                      return (
                        <label key={id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              setForm((f) => ({
                                ...f,
                                selectedMenuItemIds: value
                                  ? [...f.selectedMenuItemIds, id]
                                  : f.selectedMenuItemIds.filter((entry) => entry !== id),
                              }))
                            }
                          />
                          <span>{item.name}</span>
                          <span className="text-muted-foreground">#{id}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>{t("promotions.form.minSpend")}</Label>
              <Input
                type="number"
                min={0}
                value={form.minSpend}
                onChange={(e) => setForm((f) => ({ ...f, minSpend: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>{t("promotions.form.categories")}</Label>
              <Input
                placeholder={t("promotions.form.categoriesPlaceholder")}
                value={form.categories}
                onChange={(e) => setForm((f) => ({ ...f, categories: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("promotions.form.dayRestriction")}</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => (
                  <label key={day} className="flex items-center gap-1 text-xs">
                    <Checkbox
                      checked={form.dayRestriction.includes(day)}
                      onCheckedChange={(value) =>
                        setForm((f) => ({
                          ...f,
                          dayRestriction: value
                            ? [...f.dayRestriction, day]
                            : f.dayRestriction.filter((entry) => entry !== day),
                        }))
                      }
                    />
                    {t(`promotions.days.${day}` as "promotions.days.Mon")}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("promotions.form.timeStart")}</Label>
                <Input
                  type="time"
                  value={form.timeStart}
                  onChange={(e) => setForm((f) => ({ ...f, timeStart: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("promotions.form.timeEnd")}</Label>
                <Input
                  type="time"
                  value={form.timeEnd}
                  onChange={(e) => setForm((f) => ({ ...f, timeEnd: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>{t("promotions.form.usageLimitPerDay")}</Label>
              <Input
                type="number"
                min={0}
                value={form.usageLimitPerDay}
                onChange={(e) => setForm((f) => ({ ...f, usageLimitPerDay: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("promotions.form.validFrom")}</Label>
                <Input
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("promotions.form.validUntil")}</Label>
                <Input
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("loyalty.actions.cancel")}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !form.code.trim() || !form.name.trim()}>
              {t("loyalty.actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
