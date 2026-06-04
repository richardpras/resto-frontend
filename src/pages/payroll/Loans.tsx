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
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load loans");
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  const loadInstallments = useCallback(async (loanId: number) => {
    try {
      const rows = await listEmployeeLoanInstallments(loanId);
      setInstallments(rows);
      setSelectedLoanId(loanId);
      setActiveTab("installments");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load installments");
    }
  }, []);

  useEffect(() => {
    void loadLoans();
  }, [loadLoans]);

  const selectedLoan = useMemo(
    () => loans.find((l) => l.id === selectedLoanId) ?? null,
    [loans, selectedLoanId],
  );

  const empName = (id: number) => employees.find((e) => e.id === id)?.fullName ?? `Employee #${id}`;

  const submitCreate = async () => {
    const principal = Number(form.principalAmount);
    const installment = Number(form.installmentAmount);
    const total = Number(form.totalInstallments);
    if (!form.employeeId || principal <= 0 || installment <= 0 || total < 1) {
      toast.error("Fill all required fields");
      return;
    }
    try {
      await createEmployeeLoan({
        employeeId: Number(form.employeeId),
        principalAmount: principal,
        installmentAmount: installment,
        totalInstallments: total,
      });
      toast.success("Loan created");
      setCreateOpen(false);
      await loadLoans();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to create loan");
    }
  };

  const workflowAction = async (
    action: "approve" | "activate" | "cancel",
    loanId: number,
  ) => {
    try {
      if (action === "approve") await approveEmployeeLoan(loanId);
      if (action === "activate") await activateEmployeeLoan(loanId);
      if (action === "cancel") await cancelEmployeeLoan(loanId);
      toast.success(`Loan ${action}d`);
      await loadLoans();
      if (selectedLoanId === loanId) await loadInstallments(loanId);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : `Failed to ${action} loan`);
    }
  };

  const loanColumns: Column<EmployeeLoanRow>[] = [
    { key: "loanNo", header: "Loan No", sortable: true },
    {
      key: "employee",
      header: "Employee",
      sortable: true,
      render: (l) => l.employee?.fullName ?? empName(l.employeeId),
    },
    { key: "principal", header: "Principal", render: (l) => formatIDR(l.principalAmount) },
    { key: "installment", header: "Installment", render: (l) => formatIDR(l.installmentAmount) },
    {
      key: "progress",
      header: "Paid",
      render: (l) => `${l.paidInstallments}/${l.totalInstallments}`,
    },
    { key: "remaining", header: "Remaining", render: (l) => formatIDR(l.remainingBalance) },
    {
      key: "status",
      header: "Status",
      render: (l) => <Badge variant={loanStatusVariant(l.status)}>{l.status}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (l) => (
        <div className="flex justify-end gap-1 flex-wrap">
          {l.status === "pending" && (
            <Button size="sm" variant="outline" onClick={() => void workflowAction("approve", l.id)}>
              <Check className="h-3 w-3 mr-1" />
              Approve
            </Button>
          )}
          {l.status === "approved" && (
            <Button size="sm" variant="outline" onClick={() => void workflowAction("activate", l.id)}>
              <Play className="h-3 w-3 mr-1" />
              Activate
            </Button>
          )}
          {(l.status === "pending" || l.status === "approved") && (
            <Button size="sm" variant="ghost" onClick={() => void workflowAction("cancel", l.id)}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => void loadInstallments(l.id)}>
            Schedule
          </Button>
        </div>
      ),
    },
  ];

  const installmentColumns: Column<EmployeeLoanInstallmentRow>[] = [
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
        <h2 className="text-lg font-semibold">Employee Loans</h2>
        <div className="flex gap-2 items-center">
          {outlets.length > 1 && (
            <Select
              value={outletId ? String(outletId) : ""}
              onValueChange={(v) => setOutletId(Number(v))}
            >
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
            New Loan
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="installments" disabled={!selectedLoan}>
            Installments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="loans" className="mt-4">
          <DataTable
            data={loans}
            columns={loanColumns}
            rowKey={(l) => l.id}
            searchKeys={["loanNo", "status"]}
            emptyMessage={loading ? "Loading…" : "No loans"}
            defaultPageSize={10}
          />
        </TabsContent>

        <TabsContent value="installments" className="mt-4 space-y-4">
          {selectedLoan && (
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Loan</span>
                  <p className="font-medium">{selectedLoan.loanNo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Employee</span>
                  <p className="font-medium">{selectedLoan.employee?.fullName ?? empName(selectedLoan.employeeId)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining balance</span>
                  <p className="font-medium">{formatIDR(selectedLoan.remainingBalance)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p>
                    <Badge variant={loanStatusVariant(selectedLoan.status)}>{selectedLoan.status}</Badge>
                  </p>
                </div>
              </div>
            </Card>
          )}
          <DataTable
            data={installments}
            columns={installmentColumns}
            rowKey={(i) => i.id}
            emptyMessage="Select a loan and open Schedule, or activate a loan first"
            defaultPageSize={12}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Employee Loan</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Principal amount</Label>
                <Input
                  type="number"
                  value={form.principalAmount}
                  onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
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
              <div className="space-y-2 col-span-2">
                <Label>Total installments (months)</Label>
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
              Cancel
            </Button>
            <Button onClick={() => void submitCreate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
