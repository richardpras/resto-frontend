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
import { DataTable, type Column } from "@/components/DataTable";
import {
  approveOvertimeRequest,
  cancelOvertimeRequest,
  createOvertimeRequest,
  createOvertimeType,
  listOvertimeRequests,
  listOvertimeSummaries,
  listOvertimeTypes,
  rejectOvertimeRequest,
  updateOvertimeType,
  type OvertimeDailySummaryRow,
  type OvertimeRequestRow,
  type OvertimeTypeRow,
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

export default function Overtime() {
  const { t } = useErpTranslation();
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [types, setTypes] = useState<OvertimeTypeRow[]>([]);
  const [requests, setRequests] = useState<OvertimeRequestRow[]>([]);
  const [summaries, setSummaries] = useState<OvertimeDailySummaryRow[]>([]);
  const [employees, setEmployees] = useState<OrganizationEmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [requestOpen, setRequestOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [reqForm, setReqForm] = useState({
    employeeId: "",
    overtimeTypeId: "",
    overtimeDate: "",
    startTime: "18:00",
    endTime: "21:00",
    reason: "",
  });

  const [typeForm, setTypeForm] = useState({
    code: "",
    name: "",
    multiplier: "1.5",
    isActive: true,
  });

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [typeRows, requestRows, summaryRows, emps] = await Promise.all([
        listOvertimeTypes(outletId),
        listOvertimeRequests({ outletId }),
        listOvertimeSummaries({ outletId }),
        listOrganizationEmployees(outletId),
      ]);
      setTypes(typeRows);
      setRequests(requestRows);
      setSummaries(summaryRows);
      setEmployees(emps);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.overtime.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, t]);

  useEffect(() => {
    if (outletId === null && outlets[0]) setOutletId(outlets[0].id);
  }, [outletId, outlets]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTypes = useMemo(() => types.filter((row) => row.isActive), [types]);

  const submitRequest = async () => {
    if (!reqForm.employeeId || !reqForm.overtimeTypeId || !reqForm.overtimeDate || !reqForm.startTime || !reqForm.endTime) {
      return toast.error(t("payroll.shared.fillRequired"));
    }
    try {
      await createOvertimeRequest({
        employeeId: Number(reqForm.employeeId),
        overtimeTypeId: Number(reqForm.overtimeTypeId),
        overtimeDate: reqForm.overtimeDate,
        startTime: reqForm.startTime,
        endTime: reqForm.endTime,
        reason: reqForm.reason || undefined,
      });
      toast.success(t("payroll.overtime.requestCreated"));
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
      await createOvertimeType({
        outletId,
        code: typeForm.code.trim(),
        name: typeForm.name.trim(),
        multiplier: Number(typeForm.multiplier) || 1,
        isActive: typeForm.isActive,
      });
      toast.success(t("payroll.overtime.typeCreated"));
      setTypeOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.leave.createTypeFailed"));
    }
  };

  const requestColumns: Column<OvertimeRequestRow>[] = useMemo(
    () => [
      {
        key: "employee",
        header: t("payroll.shared.employee"),
        sortable: true,
        render: (r) => r.employee?.fullName ?? t("payroll.shared.employeeFallback", { id: r.employeeId }),
      },
      { key: "date", header: t("payroll.shared.date"), sortable: true, render: (r) => r.overtimeDate },
      { key: "hours", header: t("payroll.shared.hours"), sortable: true, render: (r) => r.totalHours },
      {
        key: "type",
        header: t("payroll.shared.type"),
        render: (r) => r.overtimeType?.name ?? "—",
      },
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
                  void approveOvertimeRequest(r.id)
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
                  void cancelOvertimeRequest(r.id)
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
          ) : r.status === "approved" ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() =>
                void cancelOvertimeRequest(r.id)
                  .then(() => {
                    toast.success(t("payroll.shared.cancelled"));
                    return load();
                  })
                  .catch((e) => toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.cancelFailed")))
              }
            >
              {t("payroll.shared.cancel")}
            </Button>
          ) : null,
      },
    ],
    [t, load],
  );

  const summaryColumns: Column<OvertimeDailySummaryRow>[] = useMemo(
    () => [
      {
        key: "employee",
        header: t("payroll.shared.employee"),
        sortable: true,
        render: (r) => r.employee?.fullName ?? t("payroll.shared.employeeFallback", { id: r.employeeId }),
      },
      { key: "date", header: t("payroll.shared.date"), sortable: true, render: (r) => r.overtimeDate },
      { key: "hours", header: t("payroll.overtime.approvedHours"), sortable: true, render: (r) => r.approvedHours },
      { key: "requests", header: t("payroll.overtime.requestsCol"), render: (r) => r.requestCount },
    ],
    [t],
  );

  const typeColumns: Column<OvertimeTypeRow>[] = useMemo(
    () => [
      { key: "code", header: t("payroll.shared.code"), sortable: true },
      { key: "name", header: t("payroll.shared.name"), sortable: true },
      { key: "multiplier", header: t("payroll.shared.multiplier"), render: (row) => row.multiplier },
      {
        key: "active",
        header: t("payroll.shared.active"),
        render: (row) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void updateOvertimeType(row.id, { isActive: !row.isActive })
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
        <h2 className="text-lg font-semibold">{t("payroll.overtime.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("payroll.overtime.subtitle")}</p>
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
          <TabsTrigger value="requests">{t("payroll.overtime.requests")}</TabsTrigger>
          <TabsTrigger value="summary">{t("payroll.overtime.summary")}</TabsTrigger>
          <TabsTrigger value="types">{t("payroll.overtime.types")}</TabsTrigger>
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
            emptyMessage={t("payroll.overtime.emptyRequests")}
            defaultPageSize={25}
          />
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <DataTable
            data={summaries}
            columns={summaryColumns}
            rowKey={(r) => r.id}
            loading={loading}
            emptyMessage={t("payroll.overtime.emptySummary")}
            defaultPageSize={25}
          />
        </TabsContent>

        <TabsContent value="types" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setTypeOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("payroll.shared.addType")}
            </Button>
          </div>
          <DataTable data={types} columns={typeColumns} rowKey={(row) => row.id} loading={loading} emptyMessage={t("payroll.overtime.emptyTypes")} />
        </TabsContent>
      </Tabs>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("payroll.overtime.newRequest")}</DialogTitle>
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
              <Label>{t("payroll.overtime.overtimeType")}</Label>
              <Select value={reqForm.overtimeTypeId} onValueChange={(v) => setReqForm({ ...reqForm, overtimeTypeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.select")} />
                </SelectTrigger>
                <SelectContent>
                  {activeTypes.map((row) => (
                    <SelectItem key={row.id} value={String(row.id)}>
                      {row.name} ({row.multiplier}x)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("payroll.shared.date")}</Label>
              <Input type="date" value={reqForm.overtimeDate} onChange={(e) => setReqForm({ ...reqForm, overtimeDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("payroll.overtime.startTime")}</Label>
                <Input type="time" value={reqForm.startTime} onChange={(e) => setReqForm({ ...reqForm, startTime: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{t("payroll.overtime.endTime")}</Label>
                <Input type="time" value={reqForm.endTime} onChange={(e) => setReqForm({ ...reqForm, endTime: e.target.value })} />
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
            <DialogTitle>{t("payroll.overtime.addType")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>{t("payroll.shared.code")}</Label>
              <Input value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} placeholder="holiday" />
            </div>
            <div className="space-y-1">
              <Label>{t("payroll.shared.name")}</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("payroll.shared.multiplier")}</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={typeForm.multiplier}
                onChange={(e) => setTypeForm({ ...typeForm, multiplier: e.target.value })}
              />
            </div>
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
            <DialogTitle>{t("payroll.overtime.rejectTitle")}</DialogTitle>
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
                void rejectOvertimeRequest(rejectId, rejectReason || undefined)
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
