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
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load attendance");
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
      toast.error("Select outlet and upload a CSV file");
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
        toast.success(`Preview: ${result.preview.length} row(s)`);
      } else {
        toast.success(`Imported ${result.created}, skipped ${result.skipped}`);
        setImportOpen(false);
        setCsvText("");
        setPreviewRows([]);
        await load();
      }
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Import failed");
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
      toast.success("Attendance updated");
      setEditOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AttendanceRecordApiRow>[] = [
    {
      key: "employee",
      header: "Employee",
      sortable: true,
      render: (r) => r.employee?.fullName ?? `Employee #${r.employeeId}`,
    },
    { key: "date", header: "Date", sortable: true, render: (r) => r.attendanceDate },
    {
      key: "shift",
      header: "Shift",
      render: (r) =>
        r.shift ? `${r.shift.name} (${r.shift.startTime}–${r.shift.endTime})` : "—",
    },
    { key: "clockIn", header: "Clock In", render: (r) => r.clockIn ?? "—" },
    { key: "clockOut", header: "Clock Out", render: (r) => r.clockOut ?? "—" },
    { key: "worked", header: "Worked", render: (r) => formatWorked(r) },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => (
        <Badge variant={statusVariant(r.status)} className="capitalize">
          {r.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (r) => <span className="capitalize text-xs">{r.source.replace("_", " ")}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-12",
      render: (r) => (
        <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Edit attendance">
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-semibold">Attendance</h2>
        <Button size="sm" onClick={() => setImportOpen(true)} disabled={!outletId}>
          <Upload className="h-4 w-4 mr-1" />
          Import CSV
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {outlets.length > 1 && (
            <div className="space-y-1">
              <Label className="text-xs">Outlet</Label>
              <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
                <SelectTrigger>
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
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
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
          searchPlaceholder="Search employee, date, status..."
          searchKeys={["attendanceDate", "status", "source"]}
          emptyMessage="No attendance records in this range"
          defaultPageSize={25}
          pageSizeOptions={[10, 25, 50]}
        />
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import fingerprint / attendance CSV</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="upload">
            <TabsList>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="mapping">Column mapping</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label>CSV file</Label>
                <Input type="file" accept=".csv,text/csv" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">
                  Minimum columns: employee code and timestamp. Multiple punches per day are grouped (earliest = in,
                  latest = out).
                </p>
              </div>
            </TabsContent>
            <TabsContent value="mapping" className="grid grid-cols-2 gap-3 pt-3">
              <div className="space-y-2">
                <Label>Employee code column</Label>
                <Input value={codeColumn} onChange={(e) => setCodeColumn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Timestamp column</Label>
                <Input value={tsColumn} onChange={(e) => setTsColumn(e.target.value)} />
              </div>
            </TabsContent>
          </Tabs>

          {previewRows.length > 0 && (
            <div className="border rounded-lg overflow-x-auto max-h-48">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Employee</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Clock In</th>
                    <th className="text-left p-2">Clock Out</th>
                    <th className="text-left p-2">Status</th>
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
              Cancel
            </Button>
            <Button variant="secondary" disabled={importing || !csvText} onClick={() => void runImport(true)}>
              Preview
            </Button>
            <Button disabled={importing || !csvText} onClick={() => void runImport(false)}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct attendance</DialogTitle>
          </DialogHeader>
          {editing && (
            <p className="text-sm text-muted-foreground">
              {editing.employee?.fullName} · {editing.attendanceDate} · Source: {editing.source}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clock in (HH:MM)</Label>
              <Input type="time" value={editForm.clockIn} onChange={(e) => setEditForm({ ...editForm, clockIn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Clock out (HH:MM)</Label>
              <Input type="time" value={editForm.clockOut} onChange={(e) => setEditForm({ ...editForm, clockOut: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
