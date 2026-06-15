import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import {
  approvePayrollAdjustment,
  cancelPayrollAdjustment,
  createPayrollAdjustment,
  listPayrollAdjustments,
  type PayrollAdjustmentRow,
} from "@/lib/api-integration/hrEndpoints";
import { listOrganizationEmployees, type OrganizationEmployeeRow } from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value,
  );
}

const CATEGORIES = [
  "bonus",
  "incentive",
  "commission",
  "allowance",
  "penalty",
  "correction",
  "other",
] as const;

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "draft") return "secondary";
  if (status === "cancelled") return "destructive";
  return "outline";
}

export default function Adjustments() {
  const { t } = useErpTranslation();
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [rows, setRows] = useState<PayrollAdjustmentRow[]>([]);
  const [employees, setEmployees] = useState<OrganizationEmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPeriodFrom, setFilterPeriodFrom] = useState("");
  const [filterPeriodTo, setFilterPeriodTo] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    type: "earning" as "earning" | "deduction",
    category: "bonus" as (typeof CATEGORIES)[number],
    amount: "",
    effectiveFrom: "",
    effectiveTo: "",
    description: "",
  });

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [adj, emps] = await Promise.all([
        listPayrollAdjustments({
          outletId,
          employeeId: filterEmployeeId ? Number(filterEmployeeId) : undefined,
          category: filterCategory || undefined,
          type: filterType || undefined,
          status: filterStatus || undefined,
          periodFrom: filterPeriodFrom || undefined,
          periodTo: filterPeriodTo || undefined,
        }),
        listOrganizationEmployees(outletId),
      ]);
      setRows(adj);
      setEmployees(emps);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.loadAdjustmentsFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, filterEmployeeId, filterCategory, filterType, filterStatus, filterPeriodFrom, filterPeriodTo, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const empName = useCallback(
    (id: number) => employees.find((e) => e.id === id)?.fullName ?? t("payroll.shared.employeeFallback", { id }),
    [employees, t],
  );

  const submitCreate = async () => {
    const amount = Number(form.amount);
    if (!form.employeeId || amount <= 0 || !form.effectiveFrom) {
      toast.error(t("payroll.shared.fillRequired"));
      return;
    }
    try {
      await createPayrollAdjustment({
        employeeId: Number(form.employeeId),
        type: form.type,
        category: form.category,
        amount,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || form.effectiveFrom,
        description: form.description || undefined,
      });
      toast.success(t("payroll.shared.adjustmentCreated"));
      setCreateOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.createAdjustmentFailed"));
    }
  };

  const workflow = useCallback(
    async (action: "approve" | "cancel", id: number) => {
      try {
        if (action === "approve") await approvePayrollAdjustment(id);
        else await cancelPayrollAdjustment(id);
        toast.success(t("payroll.shared.adjustmentActioned", { action }));
        await load();
      } catch (e) {
        toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.actionFailed"));
      }
    },
    [load, t],
  );

  const columns: Column<PayrollAdjustmentRow>[] = useMemo(
    () => [
      { key: "no", header: t("payroll.shared.adjustmentNo"), sortable: true, render: (r) => r.adjustmentNo },
      { key: "employee", header: t("payroll.shared.employee"), render: (r) => r.employee?.fullName ?? empName(r.employeeId) },
      {
        key: "type",
        header: t("payroll.shared.type"),
        render: (r) => (
          <Badge variant={r.type === "earning" ? "default" : "destructive"}>
            {t(`payroll.shared.${r.type}`, { defaultValue: r.type })}
          </Badge>
        ),
      },
      {
        key: "category",
        header: t("payroll.shared.category"),
        sortable: true,
        render: (r) => t(`payroll.shared.categories.${r.category}`, { defaultValue: r.category }),
      },
      {
        key: "amount",
        header: t("payroll.shared.amount"),
        render: (r) => (
          <span className={r.type === "earning" ? "text-green-600" : "text-destructive"}>
            {r.type === "earning" ? "+" : "-"}
            {formatIDR(r.amount)}
          </span>
        ),
      },
      {
        key: "period",
        header: t("payroll.shared.period"),
        render: (r) => `${r.effectiveFrom} → ${r.effectiveTo}`,
      },
      {
        key: "status",
        header: t("payroll.shared.status"),
        render: (r) => (
          <Badge variant={statusVariant(r.status)}>
            {t(`payroll.shared.${r.status}`, { defaultValue: r.status })}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: t("payroll.shared.actions"),
        className: "text-right",
        render: (r) => (
          <div className="flex justify-end gap-1 flex-wrap">
            {r.status === "draft" && (
              <Button size="sm" variant="outline" onClick={() => void workflow("approve", r.id)}>
                <Check className="h-3 w-3 mr-1" />
                {t("payroll.shared.approve")}
              </Button>
            )}
            {(r.status === "draft" || r.status === "approved") && (
              <Button size="sm" variant="ghost" onClick={() => void workflow("cancel", r.id)}>
                <X className="h-3 w-3 mr-1" />
                {t("payroll.shared.cancel")}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [empName, t, workflow],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-lg font-semibold">{t("payroll.adjustments.title")}</h2>
        <div className="flex gap-2 items-center">
          {outlets.length > 1 && (
            <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("payroll.shared.outlet")} />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("payroll.shared.newAdjustment")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="adjustments">
        <TabsList>
          <TabsTrigger value="adjustments">{t("payroll.adjustments.tab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="adjustments" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("payroll.shared.employee")}</Label>
              <Select value={filterEmployeeId || "__all__"} onValueChange={(v) => setFilterEmployeeId(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("payroll.shared.all")}</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("payroll.shared.category")}</Label>
              <Select value={filterCategory || "__all__"} onValueChange={(v) => setFilterCategory(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("payroll.shared.all")}</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`payroll.shared.categories.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("payroll.shared.type")}</Label>
              <Select value={filterType || "__all__"} onValueChange={(v) => setFilterType(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("payroll.shared.all")}</SelectItem>
                  <SelectItem value="earning">{t("payroll.shared.earning")}</SelectItem>
                  <SelectItem value="deduction">{t("payroll.shared.deduction")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("payroll.shared.status")}</Label>
              <Select value={filterStatus || "__all__"} onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("payroll.shared.all")}</SelectItem>
                  <SelectItem value="draft">{t("payroll.shared.draft")}</SelectItem>
                  <SelectItem value="approved">{t("payroll.shared.approved")}</SelectItem>
                  <SelectItem value="cancelled">{t("payroll.shared.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("payroll.shared.periodFrom")}</Label>
              <Input type="date" value={filterPeriodFrom} onChange={(e) => setFilterPeriodFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("payroll.shared.periodTo")}</Label>
              <Input type="date" value={filterPeriodTo} onChange={(e) => setFilterPeriodTo(e.target.value)} />
            </div>
          </div>

          <DataTable
            data={rows}
            columns={columns}
            rowKey={(r) => r.id}
            searchKeys={["adjustmentNo", "category", "status", "description"]}
            emptyMessage={loading ? t("payroll.shared.loading") : t("payroll.shared.noAdjustments")}
            defaultPageSize={15}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("payroll.shared.newPayrollAdjustment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("payroll.shared.employee")}</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.select")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("payroll.shared.type")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as "earning" | "deduction" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">{t("payroll.shared.earning")}</SelectItem>
                    <SelectItem value="deduction">{t("payroll.shared.deduction")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("payroll.shared.category")}</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as (typeof CATEGORIES)[number] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`payroll.shared.categories.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.shared.amount")}</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("payroll.shared.effectiveFrom")}</Label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("payroll.shared.effectiveToLabel")}</Label>
                <Input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.shared.description")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void submitCreate()}>{t("payroll.shared.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
