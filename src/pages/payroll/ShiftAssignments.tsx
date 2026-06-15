import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import {
  createShiftAssignment,
  deactivateShiftAssignment,
  getEmployeeShiftHistory,
  listShiftAssignments,
  updateShiftAssignment,
  type ShiftAssignmentApiRow,
} from "@/lib/api-integration/hrEndpoints";
import { usePayrollStore } from "@/stores/payrollStore";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { History, Plus } from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
  employeeId: "",
  shiftId: "",
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveUntil: "",
  notes: "",
};

function formatRange(from: string, until: string | null, isActive: boolean, presentLabel: string): string {
  const end = until ?? (isActive ? presentLabel : "—");
  return `${from} → ${end}`;
}

export default function ShiftAssignments() {
  const { t } = useErpTranslation();
  const { employees, shifts, refreshEmployeesFromApi, refreshShiftsFromApi } = usePayrollStore();
  const [rows, setRows] = useState<ShiftAssignmentApiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEmployeeId, setHistoryEmployeeId] = useState<number | null>(null);
  const [historyTitle, setHistoryTitle] = useState("");
  const [historyCurrent, setHistoryCurrent] = useState<ShiftAssignmentApiRow | null>(null);
  const [historyRows, setHistoryRows] = useState<ShiftAssignmentApiRow[]>([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const employeeId = filterEmployeeId !== "all" ? Number(filterEmployeeId) : undefined;
      const data = await listShiftAssignments(employeeId ? { employeeId } : undefined);
      setRows(data);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.loadAssignmentsFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterEmployeeId, t]);

  useEffect(() => {
    void Promise.all([refreshEmployeesFromApi(), refreshShiftsFromApi()]).catch(() => undefined);
  }, [refreshEmployeesFromApi, refreshShiftsFromApi]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row: ShiftAssignmentApiRow) => {
    setEditId(row.id);
    setForm({
      employeeId: String(row.employeeId),
      shiftId: String(row.shiftId),
      effectiveFrom: row.effectiveFrom,
      effectiveUntil: row.effectiveUntil ?? "",
      notes: row.notes ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.employeeId || !form.shiftId || !form.effectiveFrom) {
      toast.error(t("payroll.shared.requiredFieldsAssignment"));
      return;
    }
    try {
      const payload = {
        employeeId: Number(form.employeeId),
        shiftId: Number(form.shiftId),
        effectiveFrom: form.effectiveFrom,
        effectiveUntil: form.effectiveUntil.trim() ? form.effectiveUntil : null,
        notes: form.notes || null,
      };
      if (editId) {
        await updateShiftAssignment(editId, payload);
        toast.success(t("payroll.shared.assignmentUpdated"));
      } else {
        await createShiftAssignment(payload);
        toast.success(t("payroll.shared.assignmentCreated"));
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.saveFailed"));
    }
  };

  const deactivate = async (id: number) => {
    try {
      await deactivateShiftAssignment(id);
      toast.success(t("payroll.shared.assignmentDeactivated"));
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.deactivateFailed"));
    }
  };

  const openHistory = async (employeeId: number, label: string) => {
    try {
      const data = await getEmployeeShiftHistory(employeeId);
      setHistoryEmployeeId(employeeId);
      setHistoryTitle(label);
      setHistoryCurrent(data.current);
      setHistoryRows(data.history);
      setHistoryOpen(true);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.historyLoadFailed"));
    }
  };

  const empName = (row: ShiftAssignmentApiRow) =>
    row.employee?.fullName ?? employees.find((e) => e.id === String(row.employeeId))?.name ?? `#${row.employeeId}`;

  const columns: Column<ShiftAssignmentApiRow>[] = useMemo(
    () => [
      {
        key: "employee",
        header: t("payroll.shared.employee"),
        sortable: true,
        render: (r) => <span className="font-medium">{empName(r)}</span>,
      },
      {
        key: "shift",
        header: t("payroll.attendance.shift"),
        sortable: true,
        render: (r) =>
          r.shift ? (
            <span>
              {r.shift.name}{" "}
              <span className="text-muted-foreground text-xs">
                {r.shift.startTime}–{r.shift.endTime}
              </span>
            </span>
          ) : (
            "—"
          ),
      },
      {
        key: "effective",
        header: t("payroll.shared.effectiveLabel"),
        render: (r) => formatRange(r.effectiveFrom, r.effectiveUntil, r.isActive, t("payroll.shared.present")),
      },
      {
        key: "status",
        header: t("payroll.shared.status"),
        render: (r) => (
          <Badge variant={r.isActive ? "default" : "secondary"}>
            {r.isActive ? t("payroll.shared.active") : t("payroll.shared.inactive")}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: t("payroll.shared.actions"),
        className: "text-right",
        render: (r) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => void openHistory(r.employeeId, empName(r))}>
              <History className="h-4 w-4 mr-1" />
              {t("payroll.shared.history")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
              {t("payroll.shared.edit")}
            </Button>
            {r.isActive && (
              <Button variant="outline" size="sm" onClick={() => void deactivate(r.id)}>
                {t("payroll.shared.deactivate")}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, employees],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("payroll.shiftAssignments.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("payroll.shared.subtitleAssignments")}</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {t("payroll.shared.newAssignment")}
        </Button>
      </div>

      <div className="flex gap-3 max-w-xs">
        <Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
          <SelectTrigger>
            <SelectValue placeholder={t("payroll.shared.allEmployees")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("payroll.shared.allEmployees")}</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => String(r.id)}
        loading={loading}
        searchKeys={["notes"]}
        searchPlaceholder={t("payroll.shared.searchNotes")}
        emptyMessage={t("payroll.shared.noShiftAssignments")}
        defaultPageSize={10}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? t("payroll.shared.editAssignment") : t("payroll.shared.newAssignment")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>{t("payroll.shared.employee")}</Label>
              <Select
                value={form.employeeId}
                onValueChange={(v) => setForm({ ...form, employeeId: v })}
                disabled={editId !== null}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.selectEmployee")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.shared.shiftTemplate")}</Label>
              <Select value={form.shiftId} onValueChange={(v) => setForm({ ...form, shiftId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("payroll.shared.selectShift")} />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.startTime}–{s.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("payroll.shared.effectiveFrom")}</Label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("payroll.shared.effectiveTo")}</Label>
                <Input
                  type="date"
                  value={form.effectiveUntil}
                  onChange={(e) => setForm({ ...form, effectiveUntil: e.target.value })}
                  placeholder={t("payroll.shared.openEnded")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.shared.notes")}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void submit()}>{t("payroll.shared.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("payroll.shared.assignmentHistory", { name: historyTitle })}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">{t("payroll.shared.currentShift")}</h3>
              {historyCurrent?.shift ? (
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="font-medium">{historyCurrent.shift.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {historyCurrent.shift.startTime} – {historyCurrent.shift.endTime}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("payroll.shared.effectiveLabel")}:{" "}
                    {formatRange(
                      historyCurrent.effectiveFrom,
                      historyCurrent.effectiveUntil,
                      historyCurrent.isActive,
                      t("payroll.shared.present"),
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("payroll.shared.noActiveAssignment")}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">{t("payroll.shared.history")}</h3>
              <ul className="space-y-3">
                {historyRows.map((h) => (
                  <li key={h.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium">{h.shift?.name ?? t("payroll.attendance.shift")}</span>
                      <Badge variant={h.isActive ? "default" : "secondary"} className="shrink-0">
                        {h.isActive ? t("payroll.shared.active") : t("payroll.shared.inactive")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      {h.shift?.startTime}–{h.shift?.endTime}
                    </p>
                    <p className="text-xs mt-1">
                      {formatRange(h.effectiveFrom, h.effectiveUntil, h.isActive, t("payroll.shared.present"))}
                    </p>
                  </li>
                ))}
                {historyRows.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("payroll.shared.noAssignmentsRecorded")}</p>
                )}
              </ul>
            </div>
            {historyEmployeeId && (
              <Button variant="outline" className="w-full" onClick={() => void openHistory(historyEmployeeId, historyTitle)}>
                {t("payroll.shared.refresh")}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
