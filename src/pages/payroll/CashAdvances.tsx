import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import {
  activateCashAdvance,
  approveCashAdvance,
  cancelCashAdvance,
  createCashAdvance,
  listCashAdvanceInstallments,
  listCashAdvances,
  type EmployeeCashAdvanceInstallmentRow,
  type EmployeeCashAdvanceRow,
} from "@/lib/api-integration/hrEndpoints";
import { listOrganizationEmployees, type OrganizationEmployeeRow } from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Check, Play, Plus, X } from "lucide-react";
import { toast } from "sonner";

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value,
  );
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active" || status === "completed") return "default";
  if (status === "pending" || status === "approved") return "secondary";
  if (status === "cancelled") return "destructive";
  return "outline";
}

export default function CashAdvances() {
  const { t } = useErpTranslation();
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [advances, setAdvances] = useState<EmployeeCashAdvanceRow[]>([]);
  const [employees, setEmployees] = useState<OrganizationEmployeeRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [installments, setInstallments] = useState<EmployeeCashAdvanceInstallmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("advances");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    amount: "",
    repaymentType: "next_payroll" as "next_payroll" | "installment",
    installmentCount: "3",
    installmentAmount: "",
  });

  const loadAdvances = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [rows, emps] = await Promise.all([
        listCashAdvances({ outletId }),
        listOrganizationEmployees(outletId),
      ]);
      setAdvances(rows);
      setEmployees(emps);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.loadAdvancesFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, t]);

  const loadInstallments = useCallback(
    async (advanceId: number) => {
      try {
        const rows = await listCashAdvanceInstallments(advanceId);
        setInstallments(rows);
        setSelectedId(advanceId);
        setActiveTab("installments");
      } catch (e) {
        toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.loadInstallmentsFailed"));
      }
    },
    [t],
  );

  useEffect(() => {
    void loadAdvances();
  }, [loadAdvances]);

  const selected = useMemo(() => advances.find((a) => a.id === selectedId) ?? null, [advances, selectedId]);

  const empName = useCallback(
    (id: number) => employees.find((e) => e.id === id)?.fullName ?? t("payroll.shared.employeeFallback", { id }),
    [employees, t],
  );

  const submitCreate = async () => {
    const amount = Number(form.amount);
    if (!form.employeeId || amount <= 0) {
      toast.error(t("payroll.shared.fillRequired"));
      return;
    }
    try {
      const payload = {
        employeeId: Number(form.employeeId),
        amount,
        repaymentType: form.repaymentType,
        ...(form.repaymentType === "installment"
          ? {
              installmentCount: Number(form.installmentCount),
              installmentAmount: Number(form.installmentAmount),
            }
          : {}),
      };
      await createCashAdvance(payload);
      toast.success(t("payroll.shared.advanceCreated"));
      setCreateOpen(false);
      await loadAdvances();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.saveFailed"));
    }
  };

  const workflowAction = async (action: "approve" | "activate" | "cancel", id: number) => {
    try {
      if (action === "approve") await approveCashAdvance(id);
      if (action === "activate") await activateCashAdvance(id);
      if (action === "cancel") await cancelCashAdvance(id);
      toast.success(t("payroll.shared.advanceActioned", { action }));
      await loadAdvances();
      if (selectedId === id) await loadInstallments(id);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.actionFailed"));
    }
  };

  const advanceColumns: Column<EmployeeCashAdvanceRow>[] = useMemo(
    () => [
      { key: "advanceNo", header: t("payroll.shared.advanceNo"), sortable: true },
      {
        key: "employee",
        header: t("payroll.shared.employee"),
        render: (a) => a.employee?.fullName ?? empName(a.employeeId),
      },
      { key: "amount", header: t("payroll.shared.amount"), render: (a) => formatIDR(a.amount) },
      {
        key: "repayment",
        header: t("payroll.shared.repayment"),
        render: (a) =>
          a.repaymentType === "next_payroll"
            ? t("payroll.shared.nextPayrollShort")
            : t("payroll.shared.installmentNx", { count: a.installmentCount }),
      },
      { key: "remaining", header: t("payroll.shared.remaining"), render: (a) => formatIDR(a.remainingAmount) },
      {
        key: "status",
        header: t("payroll.shared.status"),
        render: (a) => (
          <Badge variant={statusVariant(a.status)}>
            {t(`payroll.shared.${a.status}`, { defaultValue: a.status })}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: t("payroll.shared.actions"),
        className: "text-right",
        render: (a) => (
          <div className="flex justify-end gap-1 flex-wrap">
            {a.status === "pending" && (
              <Button size="sm" variant="outline" onClick={() => void workflowAction("approve", a.id)}>
                <Check className="h-3 w-3 mr-1" />
                {t("payroll.shared.approve")}
              </Button>
            )}
            {a.status === "approved" && (
              <Button size="sm" variant="outline" onClick={() => void workflowAction("activate", a.id)}>
                <Play className="h-3 w-3 mr-1" />
                {t("payroll.shared.activate")}
              </Button>
            )}
            {(a.status === "pending" || a.status === "approved") && (
              <Button size="sm" variant="ghost" onClick={() => void workflowAction("cancel", a.id)}>
                <X className="h-3 w-3 mr-1" />
                {t("payroll.shared.cancel")}
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => void loadInstallments(a.id)}>
              {t("payroll.shared.schedule")}
            </Button>
          </div>
        ),
      },
    ],
    [t, empName, loadInstallments],
  );

  const installmentColumns: Column<EmployeeCashAdvanceInstallmentRow>[] = useMemo(
    () => [
      { key: "no", header: "#", render: (i) => i.installmentNo },
      { key: "due", header: t("payroll.shared.dueDate"), sortable: true, render: (i) => i.dueDate },
      { key: "amount", header: t("payroll.shared.amount"), render: (i) => formatIDR(i.amount) },
      {
        key: "status",
        header: t("payroll.shared.status"),
        render: (i) => (
          <Badge variant={i.status === "deducted" ? "default" : "secondary"}>
            {t(`payroll.shared.${i.status}`, { defaultValue: i.status })}
          </Badge>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-lg font-semibold">{t("payroll.cashAdvances.title")}</h2>
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
            {t("payroll.shared.newAdvance")}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="advances">{t("payroll.cashAdvances.tab")}</TabsTrigger>
          <TabsTrigger value="installments" disabled={!selected}>
            {t("payroll.shared.installments")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="advances" className="mt-4">
          <DataTable
            data={advances}
            columns={advanceColumns}
            rowKey={(a) => a.id}
            searchKeys={["advanceNo", "status"]}
            emptyMessage={loading ? t("payroll.shared.loading") : t("payroll.shared.noAdvances")}
            defaultPageSize={10}
          />
        </TabsContent>

        <TabsContent value="installments" className="mt-4 space-y-4">
          {selected && (
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("payroll.shared.advance")}</span>
                  <p className="font-medium">{selected.advanceNo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("payroll.shared.deducted")}</span>
                  <p className="font-medium">{formatIDR(selected.deductedAmount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("payroll.shared.remaining")}</span>
                  <p className="font-medium">{formatIDR(selected.remainingAmount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("payroll.shared.status")}</span>
                  <p>
                    <Badge variant={statusVariant(selected.status)}>
                      {t(`payroll.shared.${selected.status}`, { defaultValue: selected.status })}
                    </Badge>
                  </p>
                </div>
              </div>
            </Card>
          )}
          <DataTable
            data={installments}
            columns={installmentColumns}
            rowKey={(i) => i.id}
            emptyMessage={t("payroll.shared.selectAdvanceSchedule")}
            defaultPageSize={12}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("payroll.shared.newCashAdvance")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("payroll.shared.employee")}</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.selectEmployee")} />
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
            <div className="space-y-2">
              <Label>{t("payroll.shared.amount")}</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.shared.repaymentType")}</Label>
              <Select
                value={form.repaymentType}
                onValueChange={(v) => setForm({ ...form, repaymentType: v as "next_payroll" | "installment" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next_payroll">{t("payroll.shared.nextPayroll")}</SelectItem>
                  <SelectItem value="installment">{t("payroll.shared.installmentMonthly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.repaymentType === "installment" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("payroll.shared.installmentCount")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.installmentCount}
                    onChange={(e) => setForm({ ...form, installmentCount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("payroll.shared.installmentAmount")}</Label>
                  <Input
                    type="number"
                    value={form.installmentAmount}
                    onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })}
                  />
                </div>
              </div>
            )}
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
