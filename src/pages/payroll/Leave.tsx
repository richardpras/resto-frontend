import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type Column } from "@/components/DataTable";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  createLeaveType,
  listEmployeeLeaveBalances,
  listLeaveRequests,
  listLeaveTypes,
  rejectLeaveRequest,
  updateEmployeeLeaveBalances,
  updateLeaveType,
  type LeaveRequestRow,
  type LeaveTypeRow,
  type EmployeeLeaveBalanceRow,
} from "@/lib/api-integration/hrEndpoints";
import { listOrganizationEmployees, type OrganizationEmployeeRow } from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

function requestStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "pending") return "secondary";
  if (status === "rejected") return "destructive";
  return "outline";
}

export default function Leave() {
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [types, setTypes] = useState<LeaveTypeRow[]>([]);
  const [requests, setRequests] = useState<LeaveRequestRow[]>([]);
  const [employees, setEmployees] = useState<OrganizationEmployeeRow[]>([]);
  const [balances, setBalances] = useState<EmployeeLeaveBalanceRow[]>([]);
  const [balanceEmployeeId, setBalanceEmployeeId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [requestOpen, setRequestOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [reqForm, setReqForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [typeForm, setTypeForm] = useState({
    code: "",
    name: "",
    requiresAttachment: false,
    deductLeaveBalance: true,
    paidLeave: true,
    isActive: true,
  });

  const [allocEdits, setAllocEdits] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [t, r, emps] = await Promise.all([
        listLeaveTypes(outletId),
        listLeaveRequests({ outletId }),
        listOrganizationEmployees(outletId),
      ]);
      setTypes(t);
      setRequests(r);
      setEmployees(emps);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load leave data");
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  const loadBalances = useCallback(async (empId: number) => {
    try {
      const rows = await listEmployeeLeaveBalances(empId);
      setBalances(rows);
      const edits: Record<number, string> = {};
      for (const b of rows) edits[b.leaveTypeId] = String(b.allocatedDays);
      for (const t of types) {
        if (edits[t.id] === undefined) edits[t.id] = "0";
      }
      setAllocEdits(edits);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load balances");
    }
  }, [types]);

  useEffect(() => {
    if (outletId === null && outlets[0]) setOutletId(outlets[0].id);
  }, [outletId, outlets]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (balanceEmployeeId) void loadBalances(Number(balanceEmployeeId));
    else setBalances([]);
  }, [balanceEmployeeId, loadBalances]);

  const activeTypes = useMemo(() => types.filter((t) => t.isActive), [types]);

  const submitRequest = async () => {
    if (!reqForm.employeeId || !reqForm.leaveTypeId || !reqForm.startDate || !reqForm.endDate) {
      return toast.error("Fill required fields");
    }
    try {
      await createLeaveRequest({
        employeeId: Number(reqForm.employeeId),
        leaveTypeId: Number(reqForm.leaveTypeId),
        startDate: reqForm.startDate,
        endDate: reqForm.endDate,
        reason: reqForm.reason || undefined,
      });
      toast.success("Leave request created");
      setRequestOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to create request");
    }
  };

  const submitType = async () => {
    if (!outletId || !typeForm.code.trim() || !typeForm.name.trim()) {
      return toast.error("Code and name required");
    }
    try {
      await createLeaveType({
        outletId,
        code: typeForm.code.trim(),
        name: typeForm.name.trim(),
        requiresAttachment: typeForm.requiresAttachment,
        deductLeaveBalance: typeForm.deductLeaveBalance,
        paidLeave: typeForm.paidLeave,
        isActive: typeForm.isActive,
      });
      toast.success("Leave type created");
      setTypeOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to create type");
    }
  };

  const saveBalances = async () => {
    if (!balanceEmployeeId) return toast.error("Select an employee");
    try {
      const payload = Object.entries(allocEdits).map(([leaveTypeId, allocatedDays]) => ({
        leaveTypeId: Number(leaveTypeId),
        allocatedDays: Number(allocatedDays),
      }));
      await updateEmployeeLeaveBalances(Number(balanceEmployeeId), payload);
      toast.success("Balances updated");
      await loadBalances(Number(balanceEmployeeId));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to update balances");
    }
  };

  const requestColumns: Column<LeaveRequestRow>[] = [
    {
      key: "employee",
      header: "Employee",
      sortable: true,
      render: (r) => r.employee?.fullName ?? `#${r.employeeId}`,
    },
    {
      key: "type",
      header: "Type",
      render: (r) => r.leaveType?.name ?? "—",
    },
    {
      key: "range",
      header: "Date Range",
      render: (r) => `${r.startDate} → ${r.endDate}`,
    },
    { key: "days", header: "Days", render: (r) => r.totalDays },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => (
        <Badge variant={requestStatusVariant(r.status)} className="capitalize">
          {r.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) =>
        r.status === "pending" ? (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                void approveLeaveRequest(r.id)
                  .then(() => {
                    toast.success("Approved");
                    return load();
                  })
                  .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Approve failed"))
              }
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setRejectId(r.id);
                setRejectReason("");
                setRejectOpen(true);
              }}
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() =>
                void cancelLeaveRequest(r.id)
                  .then(() => {
                    toast.success("Cancelled");
                    return load();
                  })
                  .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Cancel failed"))
              }
            >
              Cancel
            </Button>
          </div>
        ) : null,
    },
  ];

  const typeColumns: Column<LeaveTypeRow>[] = [
    { key: "code", header: "Code", sortable: true },
    { key: "name", header: "Name", sortable: true },
    {
      key: "deduct",
      header: "Deduct balance",
      render: (t) => (t.deductLeaveBalance ? "Yes" : "No"),
    },
    {
      key: "active",
      header: "Active",
      render: (t) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void updateLeaveType(t.id, { isActive: !t.isActive })
              .then(() => load())
              .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Update failed"))
          }
        >
          {t.isActive ? "Active" : "Inactive"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Leave</h2>
        <p className="text-sm text-muted-foreground">Leave types, requests, and balances.</p>
      </div>

      <Card className="p-4">
        {outlets.length > 1 && (
          <div className="max-w-xs space-y-1">
            <Label className="text-xs">Outlet</Label>
            <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </Card>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Leave Requests</TabsTrigger>
          <TabsTrigger value="balances">Leave Balances</TabsTrigger>
          <TabsTrigger value="types">Leave Types</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setRequestOpen(true)} disabled={activeTypes.length === 0}>
              <Plus className="h-4 w-4 mr-1" />
              New request
            </Button>
          </div>
          <DataTable
            data={requests}
            columns={requestColumns}
            rowKey={(r) => r.id}
            loading={loading}
            emptyMessage="No leave requests"
            defaultPageSize={25}
          />
        </TabsContent>

        <TabsContent value="balances" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 min-w-[200px]">
              <Label className="text-xs">Employee</Label>
              <Select value={balanceEmployeeId} onValueChange={setBalanceEmployeeId}>
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
            <Button onClick={() => void saveBalances()} disabled={!balanceEmployeeId}>
              Save allocations
            </Button>
          </div>
          {balanceEmployeeId && (
            <div className="space-y-3">
              {types.map((t) => (
                <div key={t.id} className="flex items-center gap-4 rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.code}</p>
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Allocated</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={allocEdits[t.id] ?? "0"}
                      onChange={(e) => setAllocEdits({ ...allocEdits, [t.id]: e.target.value })}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground w-24">
                    Used: {balances.find((b) => b.leaveTypeId === t.id)?.usedDays ?? 0}
                  </div>
                  <div className="text-sm w-24">
                    Left: {balances.find((b) => b.leaveTypeId === t.id)?.remainingDays ?? allocEdits[t.id] ?? 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="types" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setTypeOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add type
            </Button>
          </div>
          <DataTable data={types} columns={typeColumns} rowKey={(t) => t.id} loading={loading} emptyMessage="No leave types" />
        </TabsContent>
      </Tabs>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New leave request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Employee</Label>
              <Select value={reqForm.employeeId} onValueChange={(v) => setReqForm({ ...reqForm, employeeId: v })}>
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
            <div className="space-y-1">
              <Label>Leave type</Label>
              <Select value={reqForm.leaveTypeId} onValueChange={(v) => setReqForm({ ...reqForm, leaveTypeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {activeTypes.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start</Label>
                <Input type="date" value={reqForm.startDate} onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>End</Label>
                <Input type="date" value={reqForm.endDate} onChange={(e) => setReqForm({ ...reqForm, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Textarea value={reqForm.reason} onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitRequest()}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add leave type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} placeholder="annual_leave" />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={typeForm.deductLeaveBalance} onCheckedChange={(c) => setTypeForm({ ...typeForm, deductLeaveBalance: !!c })} />
              Deduct leave balance
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={typeForm.requiresAttachment} onCheckedChange={(c) => setTypeForm({ ...typeForm, requiresAttachment: !!c })} />
              Requires attachment
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitType()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject leave request</DialogTitle>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (optional)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectId === null) return;
                void rejectLeaveRequest(rejectId, rejectReason || undefined)
                  .then(() => {
                    toast.success("Rejected");
                    setRejectOpen(false);
                    return load();
                  })
                  .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Reject failed"));
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
