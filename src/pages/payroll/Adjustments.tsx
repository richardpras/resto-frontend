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
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  approvePayrollAdjustment,
  cancelPayrollAdjustment,
  createPayrollAdjustment,
  listPayrollAdjustments,
  type PayrollAdjustmentRow,
} from "@/lib/api-integration/hrEndpoints";
import { listOrganizationEmployees, type OrganizationEmployeeRow } from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
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
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load adjustments");
    } finally {
      setLoading(false);
    }
  }, [outletId, filterEmployeeId, filterCategory, filterType, filterStatus, filterPeriodFrom, filterPeriodTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const empName = (id: number) => employees.find((e) => e.id === id)?.fullName ?? `Employee #${id}`;

  const submitCreate = async () => {
    const amount = Number(form.amount);
    if (!form.employeeId || amount <= 0 || !form.effectiveFrom) {
      toast.error("Fill required fields");
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
      toast.success("Adjustment created");
      setCreateOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to create adjustment");
    }
  };

  const workflow = async (action: "approve" | "cancel", id: number) => {
    try {
      if (action === "approve") await approvePayrollAdjustment(id);
      else await cancelPayrollAdjustment(id);
      toast.success(`Adjustment ${action}d`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : `Failed to ${action}`);
    }
  };

  const columns: Column<PayrollAdjustmentRow>[] = useMemo(
    () => [
      { key: "no", header: "No", sortable: true, render: (r) => r.adjustmentNo },
      { key: "employee", header: "Employee", render: (r) => r.employee?.fullName ?? empName(r.employeeId) },
      {
        key: "type",
        header: "Type",
        render: (r) => (
          <Badge variant={r.type === "earning" ? "default" : "destructive"}>{r.type}</Badge>
        ),
      },
      { key: "category", header: "Category", sortable: true, render: (r) => r.category },
      {
        key: "amount",
        header: "Amount",
        render: (r) => (
          <span className={r.type === "earning" ? "text-green-600" : "text-destructive"}>
            {r.type === "earning" ? "+" : "-"}
            {formatIDR(r.amount)}
          </span>
        ),
      },
      {
        key: "period",
        header: "Period",
        render: (r) => `${r.effectiveFrom} → ${r.effectiveTo}`,
      },
      {
        key: "status",
        header: "Status",
        render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (r) => (
          <div className="flex justify-end gap-1 flex-wrap">
            {r.status === "draft" && (
              <Button size="sm" variant="outline" onClick={() => void workflow("approve", r.id)}>
                <Check className="h-3 w-3 mr-1" />
                Approve
              </Button>
            )}
            {(r.status === "draft" || r.status === "approved") && (
              <Button size="sm" variant="ghost" onClick={() => void workflow("cancel", r.id)}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        ),
      },
    ],
    [employees],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-lg font-semibold">Payroll Adjustments</h2>
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
            New Adjustment
          </Button>
        </div>
      </div>

      <Tabs defaultValue="adjustments">
        <TabsList>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
        </TabsList>

        <TabsContent value="adjustments" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Employee</Label>
              <Select value={filterEmployeeId || "__all__"} onValueChange={(v) => setFilterEmployeeId(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={filterCategory || "__all__"} onValueChange={(v) => setFilterCategory(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={filterType || "__all__"} onValueChange={(v) => setFilterType(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="earning">Earning</SelectItem>
                  <SelectItem value="deduction">Deduction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus || "__all__"} onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Period from</Label>
              <Input type="date" value={filterPeriodFrom} onChange={(e) => setFilterPeriodFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Period to</Label>
              <Input type="date" value={filterPeriodTo} onChange={(e) => setFilterPeriodTo(e.target.value)} />
            </div>
          </div>

          <DataTable
            data={rows}
            columns={columns}
            rowKey={(r) => r.id}
            searchKeys={["adjustmentNo", "category", "status", "description"]}
            emptyMessage={loading ? "Loading…" : "No adjustments"}
            defaultPageSize={15}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Payroll Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
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
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as "earning" | "deduction" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">Earning</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
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
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effective from</Label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Effective to</Label>
                <Input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
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
