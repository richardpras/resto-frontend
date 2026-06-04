import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  copyRosters,
  createRoster,
  generateRosters,
  listRosters,
  publishRosters,
  updateRoster,
  type RosterApiRow,
} from "@/lib/api-integration/hrEndpoints";
import { listDepartments, type DepartmentRow } from "@/lib/api-integration/organizationEndpoints";
import { listOrganizationEmployees, type OrganizationEmployeeRow } from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { usePayrollStore } from "@/stores/payrollStore";
import { CalendarPlus, Copy, Send } from "lucide-react";
import { toast } from "sonner";

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekDates(weekStart: string): { date: string; label: string }[] {
  const start = new Date(weekStart + "T12:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      label: d.toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" }),
    };
  });
}

export default function Scheduling() {
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const { shifts, refreshShiftsFromApi } = usePayrollStore();

  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date().toISOString().slice(0, 10)));
  const [employees, setEmployees] = useState<OrganizationEmployeeRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [rosters, setRosters] = useState<RosterApiRow[]>([]);
  const [meta, setMeta] = useState({ draftCount: 0, publishedCount: 0 });
  const [loading, setLoading] = useState(false);

  const [genOpen, setGenOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [cellOpen, setCellOpen] = useState(false);
  const [cellRoster, setCellRoster] = useState<RosterApiRow | null>(null);
  const [cellEmployeeId, setCellEmployeeId] = useState<number | null>(null);
  const [cellDate, setCellDate] = useState("");
  const [cellShiftId, setCellShiftId] = useState<string>("off");

  const [genForm, setGenForm] = useState({ fromDate: "", toDate: "", overwrite: false });
  const [copyForm, setCopyForm] = useState({
    sourceFrom: "",
    sourceTo: "",
    destFrom: "",
    destTo: "",
  });

  const weekEnd = addDays(weekStart, 6);
  const columns = useMemo(() => weekDates(weekStart), [weekStart]);

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [emps, deps, rosterRes] = await Promise.all([
        listOrganizationEmployees(outletId),
        listDepartments(outletId),
        listRosters({ outletId, fromDate: weekStart, toDate: weekEnd }),
      ]);
      setEmployees(emps);
      setDepartments(deps.filter((d) => d.isActive));
      setRosters(rosterRes.rows);
      setMeta(rosterRes.meta);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, [outletId, weekStart, weekEnd]);

  useEffect(() => {
    void refreshShiftsFromApi();
  }, [refreshShiftsFromApi]);

  useEffect(() => {
    if (outletId === null && outlets[0]) setOutletId(outlets[0].id);
  }, [outletId, outlets]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (departmentId !== "all") {
      list = list.filter((e) => e.departmentId === Number(departmentId));
    }
    if (employeeFilter !== "all") {
      list = list.filter((e) => e.id === Number(employeeFilter));
    }
    return list;
  }, [employees, departmentId, employeeFilter]);

  const rosterMap = useMemo(() => {
    const m = new Map<string, RosterApiRow>();
    for (const r of rosters) {
      m.set(`${r.employeeId}-${r.rosterDate}`, r);
    }
    return m;
  }, [rosters]);

  const openCell = (empId: number, date: string) => {
    const key = `${empId}-${date}`;
    const existing = rosterMap.get(key) ?? null;
    setCellRoster(existing);
    setCellEmployeeId(empId);
    setCellDate(date);
    setCellShiftId(existing?.shiftId ? String(existing.shiftId) : "off");
    setCellOpen(true);
  };

  const saveCell = async () => {
    if (!cellEmployeeId || !cellDate) return;
    const shiftId = cellShiftId === "off" ? null : Number(cellShiftId);
    try {
      if (cellRoster) {
        await updateRoster(cellRoster.id, { shiftId });
        toast.success("Schedule updated");
      } else {
        await createRoster({
          employeeId: cellEmployeeId,
          rosterDate: cellDate,
          shiftId,
        });
        toast.success("Schedule entry created");
      }
      setCellOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    }
  };

  const runGenerate = async () => {
    if (!outletId || !genForm.fromDate || !genForm.toDate) {
      toast.error("Outlet and date range required");
      return;
    }
    try {
      const stats = await generateRosters({
        outletId,
        fromDate: genForm.fromDate,
        toDate: genForm.toDate,
        overwriteExisting: genForm.overwrite,
      });
      toast.success(`Created ${stats.created}, skipped ${stats.skipped}, updated ${stats.updated}`);
      setGenOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Generate failed");
    }
  };

  const runCopy = async () => {
    if (!outletId) return;
    try {
      const stats = await copyRosters({ outletId, ...copyForm });
      toast.success(`Copied ${stats.copied}, skipped ${stats.skipped}`);
      setCopyOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Copy failed");
    }
  };

  const runPublish = async () => {
    if (!outletId) return;
    try {
      const stats = await publishRosters({ outletId, fromDate: weekStart, toDate: weekEnd });
      toast.success(`Published ${stats.published} entries`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Publish failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h2 className="text-lg font-semibold">Scheduling</h2>
          <p className="text-sm text-muted-foreground">Weekly roster board — assignments are defaults only.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setGenOpen(true)}>
            <CalendarPlus className="h-4 w-4 mr-1" />
            Generate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCopyOpen(true)}>
            <Copy className="h-4 w-4 mr-1" />
            Copy week
          </Button>
          <Button size="sm" onClick={() => void runPublish()}>
            <Send className="h-4 w-4 mr-1" />
            Publish week
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        {outlets.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Outlet</Label>
            <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
              <SelectTrigger className="w-40">
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
        <div className="space-y-1">
          <Label className="text-xs">Department</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="w-36">
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
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-44">
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
          <Label className="text-xs">Week starting</Label>
          <Input
            type="date"
            className="w-40"
            value={weekStart}
            onChange={(e) => setWeekStart(mondayOf(e.target.value))}
          />
        </div>
        <div className="flex gap-2 text-sm pb-1">
          <Badge variant="secondary">Draft: {meta.draftCount}</Badge>
          <Badge variant="default">Published: {meta.publishedCount}</Badge>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium sticky left-0 bg-muted/50 min-w-[140px]">Employee</th>
              {columns.map((col) => (
                <th key={col.date} className="p-2 text-center font-medium min-w-[100px]">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  No employees for this outlet.
                </td>
              </tr>
            )}
            {!loading &&
              filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-b hover:bg-muted/30">
                  <td className="p-2 font-medium sticky left-0 bg-background">{emp.fullName}</td>
                  {columns.map((col) => {
                    const roster = rosterMap.get(`${emp.id}-${col.date}`);
                    return (
                      <td key={col.date} className="p-1 align-top">
                        <button
                          type="button"
                          className="w-full min-h-[52px] rounded-md border border-dashed p-1 text-left text-xs hover:bg-muted/50 transition-colors"
                          onClick={() => openCell(emp.id, col.date)}
                        >
                          {roster?.shift ? (
                            <>
                              <span className="font-medium block">{roster.shift.name}</span>
                              <span className="text-muted-foreground">
                                {roster.shift.startTime}–{roster.shift.endTime}
                              </span>
                              {roster.status === "draft" && (
                                <span className="text-[10px] text-amber-600">Draft</span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Off</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={cellOpen} onOpenChange={setCellOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Day schedule</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{cellDate}</p>
          <Select value={cellShiftId} onValueChange={setCellShiftId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off (no shift)</SelectItem>
              {shifts.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.startTime}–{s.endTime})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCellOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveCell()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate from assignments</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Creates draft roster rows from active shift assignments (SHIFT-01). Skips existing days unless overwrite is enabled.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From date</Label>
              <Input
                type="date"
                value={genForm.fromDate}
                onChange={(e) => setGenForm({ ...genForm, fromDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>To date</Label>
              <Input
                type="date"
                value={genForm.toDate}
                onChange={(e) => setGenForm({ ...genForm, toDate: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={genForm.overwrite}
              onCheckedChange={(c) => setGenForm({ ...genForm, overwrite: c === true })}
            />
            Overwrite existing roster rows
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void runGenerate()}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy schedule</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Duplicate roster rows to another period (same span length).</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source from</Label>
              <Input
                type="date"
                value={copyForm.sourceFrom}
                onChange={(e) => setCopyForm({ ...copyForm, sourceFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Source to</Label>
              <Input
                type="date"
                value={copyForm.sourceTo}
                onChange={(e) => setCopyForm({ ...copyForm, sourceTo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Destination from</Label>
              <Input
                type="date"
                value={copyForm.destFrom}
                onChange={(e) => setCopyForm({ ...copyForm, destFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Destination to</Label>
              <Input
                type="date"
                value={copyForm.destTo}
                onChange={(e) => setCopyForm({ ...copyForm, destTo: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void runCopy()}>Copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
