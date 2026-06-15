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
import { DataTable, type Column } from "@/components/DataTable";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  importAttendanceCsv,
  listAttendanceRecords,
  patchAttendanceRecord,
  type AttendanceImportPreviewRow,
  type AttendanceRecordApiRow,
  type AttendanceRecordStatus,
} from "@/lib/api-integration/hrEndpoints";
import { listDepartments, listOrganizationEmployees, type DepartmentRow, type OrganizationEmployeeRow } from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Pencil, Upload } from "lucide-react";
import { toast } from "sonner";

const STATUSES: AttendanceRecordStatus[] = ["present", "late", "early_leave", "incomplete", "absent"];

function formatWorked(row: AttendanceRecordApiRow): string {
  if (row.workedMinutes == null) return "—";
  const h = Math.floor(row.workedMinutes / 60);
  const m = row.workedMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "present") return "default";
  if (status === "late" || status === "early_leave") return "secondary";
  if (status === "incomplete") return "outline";
  return "destructive";
}

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 13);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function Attendance() {
  const { t } = useErpTranslation();
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const range = useMemo(() => defaultDateRange(), []);

  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);
  const [departmentId, setDepartmentId] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState(range.from);
  const [toDate, setToDate] = useState(range.to);
  const [rows, setRows] = useState<AttendanceRecordApiRow[]>([]);
  const [employees, setEmployees] = useState<OrganizationEmployeeRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importFilename, setImportFilename] = useState("import.csv");
  const [codeColumn, setCodeColumn] = useState("employee_code");
  const [tsColumn, setTsColumn] = useState("timestamp");
  const [previewRows, setPreviewRows] = useState<AttendanceImportPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecordApiRow | null>(null);
  const [editForm, setEditForm] = useState({ clockIn: "", clockOut: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [emps, deps, records] = await Promise.all([
        listOrganizationEmployees(outletId),
        listDepartments(outletId),
        listAttendanceRecords({
          outletId,
          employeeId: employeeId !== "all" ? Number(employeeId) : undefined,
          departmentId: departmentId !== "all" ? Number(departmentId) : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          fromDate,
          toDate,
        }),
      ]);
      setEmployees(emps);
      setDepartments(deps.filter((d) => d.isActive));
      setRows(records);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.attendance.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, employeeId, departmentId, statusFilter, fromDate, toDate]);

  useEffect(() => {
    if (outletId === null && outlets[0]) setOutletId(outlets[0].id);
  }, [outletId, outlets]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFile = (file: File | null) => {
    if (!file) return;
    setImportFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
      setPreviewRows([]);
    };
    reader.readAsText(file);
  };

  const runImport = async (preview: boolean) => {
    if (!outletId || !csvText.trim()) {
      toast.error(t("payroll.attendance.selectOutletCsv"));
      return;
    }
    setImporting(true);
    try {
      const result = await importAttendanceCsv({
        outletId,
        csv: csvText,
        filename: importFilename,
        employeeCodeColumn: codeColumn,
        timestampColumn: tsColumn,
        preview,
        dryRun: preview,
        overwriteExisting: false,
      });
      setPreviewRows(result.preview);
      if (preview) {
        toast.success(t("payroll.shared.importPreview", { count: result.preview.length }));
      } else {
        toast.success(t("payroll.shared.importedSkipped", { created: result.created, skipped: result.skipped }));
        setImportOpen(false);
        setCsvText("");
        setPreviewRows([]);
        await load();
      }
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.attendance.importFailed"));
    } finally {
      setImporting(false);
    }
  };

  const openEdit = (row: AttendanceRecordApiRow) => {
    setEditing(row);
    setEditForm({
      clockIn: row.clockIn ?? "",
      clockOut: row.clockOut ?? "",
      notes: row.notes ?? "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await patchAttendanceRecord(editing.id, {
        clockIn: editForm.clockIn || null,
        clockOut: editForm.clockOut || null,
        notes: editForm.notes || null,
      });
      toast.success(t("payroll.attendance.updated"));
      setEditOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.attendance.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AttendanceRecordApiRow>[] = [
    {
      key: "employee",
      header: t("payroll.attendance.employee"),
      sortable: true,
      render: (r) => r.employee?.fullName ?? t("payroll.shared.employeeFallback", { id: r.employeeId }),
    },
    { key: "date", header: t("payroll.shared.date"), sortable: true, render: (r) => r.attendanceDate },
    {
      key: "shift",
      header: t("payroll.attendance.shift"),
      render: (r) =>
        r.shift ? `${r.shift.name} (${r.shift.startTime}–${r.shift.endTime})` : "—",
    },
    { key: "clockIn", header: t("payroll.attendance.clockIn"), render: (r) => r.clockIn ?? "—" },
    { key: "clockOut", header: t("payroll.attendance.clockOut"), render: (r) => r.clockOut ?? "—" },
    { key: "worked", header: t("payroll.attendance.worked"), render: (r) => formatWorked(r) },
    {
      key: "status",
      header: t("payroll.attendance.status"),
      sortable: true,
      render: (r) => (
        <Badge variant={statusVariant(r.status)} className="capitalize">
          {t(`payroll.attendance.statuses.${r.status}`, { defaultValue: r.status.replace("_", " ") })}
        </Badge>
      ),
    },
    {
      key: "source",
      header: t("payroll.attendance.source"),
      render: (r) => <span className="capitalize text-xs">{r.source.replace("_", " ")}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-12",
      render: (r) => (
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label={t("payroll.shared.editAttendance")}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-semibold">{t("payroll.attendance.title")}</h2>
        <Button size="sm" onClick={() => setImportOpen(true)} disabled={!outletId}>
          <Upload className="h-4 w-4 mr-1" />
          {t("payroll.attendance.import")}
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {outlets.length > 1 && (
            <div className="space-y-1">
              <Label className="text-xs">{t("payroll.shared.outlet")}</Label>
              <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
                <SelectTrigger>
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
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">{t("payroll.shared.department")}</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("payroll.shared.all")}</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("payroll.shared.employee")}</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("payroll.shared.all")}</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("payroll.shared.status")}</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("payroll.shared.all")}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`payroll.attendance.statuses.${s}`, { defaultValue: s.replace("_", " ") })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("payroll.shared.from")}</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("payroll.shared.to")}</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-0 border-0 shadow-none">
        <DataTable
          data={rows}
          rowKey={(r) => r.id}
          columns={columns}
          loading={loading}
          searchPlaceholder={t("payroll.shared.searchAttendance")}
          searchKeys={["attendanceDate", "status", "source"]}
          emptyMessage={t("payroll.shared.emptyAttendance")}
          defaultPageSize={25}
          pageSizeOptions={[10, 25, 50]}
        />
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("payroll.shared.importTitle")}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="upload">
            <TabsList>
              <TabsTrigger value="upload">{t("payroll.shared.upload")}</TabsTrigger>
              <TabsTrigger value="mapping">{t("payroll.shared.columnMapping")}</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label>{t("payroll.shared.csvFile")}</Label>
                <Input type="file" accept=".csv,text/csv" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">
                  {t("payroll.shared.csvHint")}
                </p>
              </div>
            </TabsContent>
            <TabsContent value="mapping" className="grid grid-cols-2 gap-3 pt-3">
              <div className="space-y-2">
                <Label>{t("payroll.shared.employeeCodeColumn")}</Label>
                <Input value={codeColumn} onChange={(e) => setCodeColumn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("payroll.shared.timestampColumn")}</Label>
                <Input value={tsColumn} onChange={(e) => setTsColumn(e.target.value)} />
              </div>
            </TabsContent>
          </Tabs>

          {previewRows.length > 0 && (
            <div className="border rounded-lg overflow-x-auto max-h-48">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">{t("payroll.shared.employee")}</th>
                    <th className="text-left p-2">{t("payroll.shared.date")}</th>
                    <th className="text-left p-2">{t("payroll.attendance.clockIn")}</th>
                    <th className="text-left p-2">{t("payroll.attendance.clockOut")}</th>
                    <th className="text-left p-2">{t("payroll.attendance.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{p.employeeName}</td>
                      <td className="p-2">{p.date}</td>
                      <td className="p-2">{p.clockIn?.slice(11, 16) ?? p.clockIn ?? "—"}</td>
                      <td className="p-2">{p.clockOut?.slice(11, 16) ?? p.clockOut ?? "—"}</td>
                      <td className="p-2 capitalize">{p.status.replace("_", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button variant="secondary" disabled={importing || !csvText} onClick={() => void runImport(true)}>
              {t("payroll.shared.preview")}
            </Button>
            <Button disabled={importing || !csvText} onClick={() => void runImport(false)}>
              {t("payroll.shared.import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("payroll.shared.correctAttendance")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <p className="text-sm text-muted-foreground">
              {editing.employee?.fullName} · {editing.attendanceDate} · {t("payroll.shared.sourceLabel")}: {editing.source}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("payroll.shared.clockInTime")}</Label>
              <Input type="time" value={editForm.clockIn} onChange={(e) => setEditForm({ ...editForm, clockIn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.shared.clockOutTime")}</Label>
              <Input type="time" value={editForm.clockOut} onChange={(e) => setEditForm({ ...editForm, clockOut: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("payroll.shared.notes")}</Label>
            <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void saveEdit()} disabled={saving}>
              {t("payroll.shared.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
