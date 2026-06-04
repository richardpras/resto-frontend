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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import { ApiHttpError } from "@/lib/api-integration/client";
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
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load cash advances");
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  const loadInstallments = useCallback(async (advanceId: number) => {
    try {
      const rows = await listCashAdvanceInstallments(advanceId);
      setInstallments(rows);
      setSelectedId(advanceId);
      setActiveTab("installments");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load installments");
    }
  }, []);

  useEffect(() => {
    void loadAdvances();
  }, [loadAdvances]);

  const selected = useMemo(() => advances.find((a) => a.id === selectedId) ?? null, [advances, selectedId]);

  const empName = (id: number) => employees.find((e) => e.id === id)?.fullName ?? `Employee #${id}`;

  const submitCreate = async () => {
    const amount = Number(form.amount);
    if (!form.employeeId || amount <= 0) {
      toast.error("Fill required fields");
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
      toast.success("Cash advance created");
      setCreateOpen(false);
      await loadAdvances();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to create cash advance");
    }
  };

  const workflowAction = async (action: "approve" | "activate" | "cancel", id: number) => {
    try {
      if (action === "approve") await approveCashAdvance(id);
      if (action === "activate") await activateCashAdvance(id);
      if (action === "cancel") await cancelCashAdvance(id);
      toast.success(`Cash advance ${action}d`);
      await loadAdvances();
      if (selectedId === id) await loadInstallments(id);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : `Failed to ${action}`);
    }
  };

  const advanceColumns: Column<EmployeeCashAdvanceRow>[] = [
    { key: "advanceNo", header: "Advance No", sortable: true },
    {
      key: "employee",
      header: "Employee",
      render: (a) => a.employee?.fullName ?? empName(a.employeeId),
    },
    { key: "amount", header: "Amount", render: (a) => formatIDR(a.amount) },
    {
      key: "repayment",
      header: "Repayment",
      render: (a) => (a.repaymentType === "next_payroll" ? "Next payroll" : `Installment (${a.installmentCount}x)`),
    },
    { key: "remaining", header: "Remaining", render: (a) => formatIDR(a.remainingAmount) },
    {
      key: "status",
      header: "Status",
      render: (a) => <Badge variant={statusVariant(a.status)}>{a.status}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (a) => (
        <div className="flex justify-end gap-1 flex-wrap">
          {a.status === "pending" && (
            <Button size="sm" variant="outline" onClick={() => void workflowAction("approve", a.id)}>
              <Check className="h-3 w-3 mr-1" />
              Approve
            </Button>
          )}
          {a.status === "approved" && (
            <Button size="sm" variant="outline" onClick={() => void workflowAction("activate", a.id)}>
              <Play className="h-3 w-3 mr-1" />
              Activate
            </Button>
          )}
          {(a.status === "pending" || a.status === "approved") && (
            <Button size="sm" variant="ghost" onClick={() => void workflowAction("cancel", a.id)}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => void loadInstallments(a.id)}>
            Schedule
          </Button>
        </div>
      ),
    },
  ];

  const installmentColumns: Column<EmployeeCashAdvanceInstallmentRow>[] = [
    { key: "no", header: "#", render: (i) => i.installmentNo },
    { key: "due", header: "Due Date", sortable: true, render: (i) => i.dueDate },
    { key: "amount", header: "Amount", render: (i) => formatIDR(i.amount) },
    {
      key: "status",
      header: "Status",
      render: (i) => <Badge variant={i.status === "deducted" ? "default" : "secondary"}>{i.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-lg font-semibold">Cash Advances</h2>
        <div className="flex gap-2 items-center">
          {outlets.length > 1 && (
            <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Outlet" />
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
            New Advance
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="advances">Advances</TabsTrigger>
          <TabsTrigger value="installments" disabled={!selected}>
            Installments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="advances" className="mt-4">
          <DataTable
            data={advances}
            columns={advanceColumns}
            rowKey={(a) => a.id}
            searchKeys={["advanceNo", "status"]}
            emptyMessage={loading ? "Loading…" : "No cash advances"}
            defaultPageSize={10}
          />
        </TabsContent>

        <TabsContent value="installments" className="mt-4 space-y-4">
          {selected && (
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Advance</span>
                  <p className="font-medium">{selected.advanceNo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Deducted</span>
                  <p className="font-medium">{formatIDR(selected.deductedAmount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining</span>
                  <p className="font-medium">{formatIDR(selected.remainingAmount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p>
                    <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
                  </p>
                </div>
              </div>
            </Card>
          )}
          <DataTable
            data={installments}
            columns={installmentColumns}
            rowKey={(i) => i.id}
            emptyMessage="Select an advance and open Schedule"
            defaultPageSize={12}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Cash Advance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
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
              <Label>Amount</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Repayment type</Label>
              <Select
                value={form.repaymentType}
                onValueChange={(v) => setForm({ ...form, repaymentType: v as "next_payroll" | "installment" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next_payroll">Next payroll (single deduction)</SelectItem>
                  <SelectItem value="installment">Installment (monthly)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.repaymentType === "installment" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Installment count</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.installmentCount}
                    onChange={(e) => setForm({ ...form, installmentCount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Installment amount</Label>
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
              Cancel
            </Button>
            <Button onClick={() => void submitCreate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
