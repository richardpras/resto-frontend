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
  activateEmployeeLoan,
  approveEmployeeLoan,
  cancelEmployeeLoan,
  createEmployeeLoan,
  listEmployeeLoanInstallments,
  listEmployeeLoans,
  type EmployeeLoanInstallmentRow,
  type EmployeeLoanRow,
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

function loanStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active" || status === "completed") return "default";
  if (status === "pending" || status === "approved") return "secondary";
  if (status === "cancelled") return "destructive";
  return "outline";
}

export default function Loans() {
  const { t } = useErpTranslation();
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [loans, setLoans] = useState<EmployeeLoanRow[]>([]);
  const [employees, setEmployees] = useState<OrganizationEmployeeRow[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [installments, setInstallments] = useState<EmployeeLoanInstallmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("loans");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    principalAmount: "",
    installmentAmount: "",
    totalInstallments: "12",
  });

  const loadLoans = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [loanRows, emps] = await Promise.all([
        listEmployeeLoans({ outletId }),
        listOrganizationEmployees(outletId),
      ]);
      setLoans(loanRows);
      setEmployees(emps);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.loadLoansFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, t]);

  const loadInstallments = useCallback(async (loanId: number) => {
    try {
      const rows = await listEmployeeLoanInstallments(loanId);
      setInstallments(rows);
      setSelectedLoanId(loanId);
      setActiveTab("installments");
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.loadInstallmentsFailed"));
    }
  }, [t]);

  useEffect(() => {
    void loadLoans();
  }, [loadLoans]);

  const selectedLoan = useMemo(
    () => loans.find((l) => l.id === selectedLoanId) ?? null,
    [loans, selectedLoanId],
  );

  const empName = useCallback(
    (id: number) => employees.find((e) => e.id === id)?.fullName ?? t("payroll.shared.employeeFallback", { id }),
    [employees, t],
  );

  const submitCreate = async () => {
    const principal = Number(form.principalAmount);
    const installment = Number(form.installmentAmount);
    const total = Number(form.totalInstallments);
    if (!form.employeeId || principal <= 0 || installment <= 0 || total < 1) {
      toast.error(t("payroll.shared.fillAllRequired"));
      return;
    }
    try {
      await createEmployeeLoan({
        employeeId: Number(form.employeeId),
        principalAmount: principal,
        installmentAmount: installment,
        totalInstallments: total,
      });
      toast.success(t("payroll.shared.loanCreated"));
      setCreateOpen(false);
      await loadLoans();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.saveFailed"));
    }
  };

  const workflowAction = useCallback(
    async (action: "approve" | "activate" | "cancel", loanId: number) => {
      try {
        if (action === "approve") await approveEmployeeLoan(loanId);
        if (action === "activate") await activateEmployeeLoan(loanId);
        if (action === "cancel") await cancelEmployeeLoan(loanId);
        toast.success(t("payroll.shared.loanActioned", { action }));
        await loadLoans();
        if (selectedLoanId === loanId) await loadInstallments(loanId);
      } catch (e) {
        toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.loanActionFailed", { action }));
      }
    },
    [loadInstallments, loadLoans, selectedLoanId, t],
  );

  const loanColumns: Column<EmployeeLoanRow>[] = useMemo(
    () => [
      { key: "loanNo", header: t("payroll.shared.loanNo"), sortable: true },
      {
        key: "employee",
        header: t("payroll.shared.employee"),
        sortable: true,
        render: (l) => l.employee?.fullName ?? empName(l.employeeId),
      },
      { key: "principal", header: t("payroll.shared.principal"), render: (l) => formatIDR(l.principalAmount) },
      { key: "installment", header: t("payroll.shared.installment"), render: (l) => formatIDR(l.installmentAmount) },
      {
        key: "progress",
        header: t("payroll.shared.progressPaid"),
        render: (l) => `${l.paidInstallments}/${l.totalInstallments}`,
      },
      { key: "remaining", header: t("payroll.shared.remaining"), render: (l) => formatIDR(l.remainingBalance) },
      {
        key: "status",
        header: t("payroll.shared.status"),
        render: (l) => (
          <Badge variant={loanStatusVariant(l.status)}>
            {t(`payroll.shared.${l.status}`, { defaultValue: l.status })}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: t("payroll.shared.actions"),
        className: "text-right",
        render: (l) => (
          <div className="flex justify-end gap-1 flex-wrap">
            {l.status === "pending" && (
              <Button size="sm" variant="outline" onClick={() => void workflowAction("approve", l.id)}>
                <Check className="h-3 w-3 mr-1" />
                {t("payroll.shared.approve")}
              </Button>
            )}
            {l.status === "approved" && (
              <Button size="sm" variant="outline" onClick={() => void workflowAction("activate", l.id)}>
                <Play className="h-3 w-3 mr-1" />
                {t("payroll.shared.activate")}
              </Button>
            )}
            {(l.status === "pending" || l.status === "approved") && (
              <Button size="sm" variant="ghost" onClick={() => void workflowAction("cancel", l.id)}>
                <X className="h-3 w-3 mr-1" />
                {t("payroll.shared.cancel")}
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => void loadInstallments(l.id)}>
              {t("payroll.shared.schedule")}
            </Button>
          </div>
        ),
      },
    ],
    [empName, loadInstallments, t, workflowAction],
  );

  const installmentColumns: Column<EmployeeLoanInstallmentRow>[] = useMemo(
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
        <h2 className="text-lg font-semibold">{t("payroll.loans.title")}</h2>
        <div className="flex gap-2 items-center">
          {outlets.length > 1 && (
            <Select
              value={outletId ? String(outletId) : ""}
              onValueChange={(v) => setOutletId(Number(v))}
            >
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
            {t("payroll.shared.newLoan")}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="loans">{t("payroll.loans.tab")}</TabsTrigger>
          <TabsTrigger value="installments" disabled={!selectedLoan}>
            {t("payroll.shared.installments")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="loans" className="mt-4">
          <DataTable
            data={loans}
            columns={loanColumns}
            rowKey={(l) => l.id}
            searchKeys={["loanNo", "status"]}
            emptyMessage={loading ? t("payroll.shared.loading") : t("payroll.shared.noLoans")}
            defaultPageSize={10}
          />
        </TabsContent>

        <TabsContent value="installments" className="mt-4 space-y-4">
          {selectedLoan && (
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("payroll.shared.loan")}</span>
                  <p className="font-medium">{selectedLoan.loanNo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("payroll.shared.employee")}</span>
                  <p className="font-medium">{selectedLoan.employee?.fullName ?? empName(selectedLoan.employeeId)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("payroll.shared.remainingBalance")}</span>
                  <p className="font-medium">{formatIDR(selectedLoan.remainingBalance)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("payroll.shared.status")}</span>
                  <p>
                    <Badge variant={loanStatusVariant(selectedLoan.status)}>
                      {t(`payroll.shared.${selectedLoan.status}`, { defaultValue: selectedLoan.status })}
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
            emptyMessage={t("payroll.shared.selectLoanSchedule")}
            defaultPageSize={12}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("payroll.shared.newEmployeeLoan")}</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("payroll.shared.principal")}</Label>
                <Input
                  type="number"
                  value={form.principalAmount}
                  onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
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
              <div className="space-y-2 col-span-2">
                <Label>{t("payroll.shared.totalInstallments")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.totalInstallments}
                  onChange={(e) => setForm({ ...form, totalInstallments: e.target.value })}
                />
              </div>
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
