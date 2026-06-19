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
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type Column } from "@/components/DataTable";
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
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

function requestStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "pending") return "secondary";
  if (status === "rejected") return "destructive";
  return "outline";
}

export default function Leave() {
  const { t } = useErpTranslation();
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
      const [typeRows, requestRows, emps] = await Promise.all([
        listLeaveTypes(outletId),
        listLeaveRequests({ outletId }),
        listOrganizationEmployees(outletId),
      ]);
      setTypes(typeRows);
      setRequests(requestRows);
      setEmployees(emps);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.leave.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, t]);

  const loadBalances = useCallback(async (empId: number) => {
    try {
      const rows = await listEmployeeLeaveBalances(empId);
      setBalances(rows);
      const edits: Record<number, string> = {};
      for (const b of rows) edits[b.leaveTypeId] = String(b.allocatedDays);
      for (const lt of types) {
        if (edits[lt.id] === undefined) edits[lt.id] = "0";
      }
      setAllocEdits(edits);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.leave.loadBalancesFailed"));
    }
  }, [types, t]);

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

  const activeTypes = useMemo(() => types.filter((lt) => lt.isActive), [types]);

  const submitRequest = async () => {
    if (!reqForm.employeeId || !reqForm.leaveTypeId || !reqForm.startDate || !reqForm.endDate) {
      return toast.error(t("payroll.shared.fillRequired"));
    }
    try {
      await createLeaveRequest({
        employeeId: Number(reqForm.employeeId),
        leaveTypeId: Number(reqForm.leaveTypeId),
        startDate: reqForm.startDate,
        endDate: reqForm.endDate,
        reason: reqForm.reason || undefined,
      });
      toast.success(t("payroll.leave.requestCreated"));
      setRequestOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.leave.createRequestFailed"));
    }
  };

  const submitType = async () => {
    if (!outletId || !typeForm.code.trim() || !typeForm.name.trim()) {
      return toast.error(t("payroll.leave.codeNameRequired"));
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
      toast.success(t("payroll.leave.typeCreated"));
      setTypeOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.leave.createTypeFailed"));
    }
  };

  const saveBalances = async () => {
    if (!balanceEmployeeId) return toast.error(t("payroll.leave.selectEmployeeBalances"));
    try {
      const payload = Object.entries(allocEdits).map(([leaveTypeId, allocatedDays]) => ({
        leaveTypeId: Number(leaveTypeId),
        allocatedDays: Number(allocatedDays),
      }));
      await updateEmployeeLeaveBalances(Number(balanceEmployeeId), payload);
      toast.success(t("payroll.leave.balancesUpdated"));
      await loadBalances(Number(balanceEmployeeId));
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.leave.updateBalancesFailed"));
    }
  };

  const requestColumns: Column<LeaveRequestRow>[] = useMemo(
    () => [
      {
        key: "employee",
        header: t("payroll.shared.employee"),
        sortable: true,
        render: (r) => r.employee?.fullName ?? t("payroll.shared.employeeFallback", { id: r.employeeId }),
      },
      {
        key: "type",
        header: t("payroll.shared.type"),
        render: (r) => r.leaveType?.name ?? "—",
      },
      {
        key: "range",
        header: t("payroll.shared.dateRange"),
        render: (r) => `${r.startDate} → ${r.endDate}`,
      },
      { key: "days", header: t("payroll.shared.days"), render: (r) => r.totalDays },
      {
        key: "status",
        header: t("payroll.shared.status"),
        sortable: true,
        render: (r) => (
          <Badge variant={requestStatusVariant(r.status)} className="capitalize">
            {t(`payroll.shared.${r.status}`, { defaultValue: r.status })}
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
                      toast.success(t("payroll.shared.approved"));
                      return load();
                    })
                    .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.approveFailed")))
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
                      toast.success(t("payroll.shared.cancelled"));
                      return load();
                    })
                    .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.cancelFailed")))
                }
              >
                {t("payroll.shared.cancel")}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, load],
  );

  const typeColumns: Column<LeaveTypeRow>[] = useMemo(
    () => [
      { key: "code", header: t("payroll.shared.code"), sortable: true },
      { key: "name", header: t("payroll.shared.name"), sortable: true },
      {
        key: "deduct",
        header: t("payroll.shared.deductBalance"),
        render: (row) => (row.deductLeaveBalance ? t("payroll.shared.yes") : t("payroll.shared.no")),
      },
      {
        key: "active",
        header: t("payroll.shared.active"),
        render: (row) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void updateLeaveType(row.id, { isActive: !row.isActive })
                .then(() => load())
                .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.saveFailed")))
            }
          >
            {row.isActive ? t("payroll.shared.active") : t("payroll.shared.inactive")}
          </Button>
        ),
      },
    ],
    [t, load],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("payroll.leave.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("payroll.leave.subtitle")}</p>
      </div>

      <Card className="p-4">
        {outlets.length > 1 && (
          <div className="max-w-xs space-y-1">
            <Label className="text-xs">{t("payroll.shared.outlet")}</Label>
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
          <TabsTrigger value="requests">{t("payroll.leave.requests")}</TabsTrigger>
          <TabsTrigger value="balances">{t("payroll.leave.balances")}</TabsTrigger>
          <TabsTrigger value="types">{t("payroll.leave.types")}</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setRequestOpen(true)} disabled={activeTypes.length === 0}>
              <Plus className="h-4 w-4 mr-1" />
              {t("payroll.shared.newRequest")}
            </Button>
          </div>
          <DataTable
            data={requests}
            columns={requestColumns}
            rowKey={(r) => r.id}
            loading={loading}
            emptyMessage={t("payroll.leave.emptyRequests")}
            defaultPageSize={25}
          />
        </TabsContent>

        <TabsContent value="balances" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 min-w-[200px]">
              <Label className="text-xs">{t("payroll.shared.employee")}</Label>
              <Select value={balanceEmployeeId} onValueChange={setBalanceEmployeeId}>
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
            <Button onClick={() => void saveBalances()} disabled={!balanceEmployeeId}>
              {t("payroll.shared.saveAllocations")}
            </Button>
          </div>
          {balanceEmployeeId && (
            <div className="space-y-3">
              {types.map((lt) => (
                <div key={lt.id} className="flex items-center gap-4 rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{lt.name}</p>
                    <p className="text-xs text-muted-foreground">{lt.code}</p>
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">{t("payroll.shared.allocated")}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={allocEdits[lt.id] ?? "0"}
                      onChange={(e) => setAllocEdits({ ...allocEdits, [lt.id]: e.target.value })}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground w-24">
                    {t("payroll.shared.used")}: {balances.find((b) => b.leaveTypeId === lt.id)?.usedDays ?? 0}
                  </div>
                  <div className="text-sm w-24">
                    {t("payroll.shared.left")}: {balances.find((b) => b.leaveTypeId === lt.id)?.remainingDays ?? allocEdits[lt.id] ?? 0}
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
              {t("payroll.shared.addType")}
            </Button>
          </div>
          <DataTable data={types} columns={typeColumns} rowKey={(row) => row.id} loading={loading} emptyMessage={t("payroll.leave.emptyTypes")} />
        </TabsContent>
      </Tabs>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("payroll.leave.newRequest")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>{t("payroll.shared.employee")}</Label>
              <Select value={reqForm.employeeId} onValueChange={(v) => setReqForm({ ...reqForm, employeeId: v })}>
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
            <div className="space-y-1">
              <Label>{t("payroll.leave.leaveType")}</Label>
              <Select value={reqForm.leaveTypeId} onValueChange={(v) => setReqForm({ ...reqForm, leaveTypeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.select")} />
                </SelectTrigger>
                <SelectContent>
                  {activeTypes.map((lt) => (
                    <SelectItem key={lt.id} value={String(lt.id)}>
                      {lt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("payroll.shared.startDate")}</Label>
                <Input type="date" value={reqForm.startDate} onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{t("payroll.shared.endDate")}</Label>
                <Input type="date" value={reqForm.endDate} onChange={(e) => setReqForm({ ...reqForm, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("payroll.shared.reason")}</Label>
              <Textarea value={reqForm.reason} onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void submitRequest()}>{t("payroll.shared.submit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("payroll.leave.addType")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>{t("payroll.shared.code")}</Label>
              <Input value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} placeholder="annual_leave" />
            </div>
            <div className="space-y-1">
              <Label>{t("payroll.shared.name")}</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={typeForm.deductLeaveBalance} onCheckedChange={(c) => setTypeForm({ ...typeForm, deductLeaveBalance: !!c })} />
              {t("payroll.shared.deductBalance")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={typeForm.requiresAttachment} onCheckedChange={(c) => setTypeForm({ ...typeForm, requiresAttachment: !!c })} />
              {t("payroll.shared.requiresAttachment")}
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void submitType()}>{t("payroll.shared.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("payroll.leave.rejectTitle")}</DialogTitle>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={t("payroll.leave.reasonOptional")} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectId === null) return;
                void rejectLeaveRequest(rejectId, rejectReason || undefined)
                  .then(() => {
                    toast.success(t("payroll.shared.rejected"));
                    setRejectOpen(false);
                    return load();
                  })
                  .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.rejectFailed")));
              }}
            >
              {t("payroll.shared.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
