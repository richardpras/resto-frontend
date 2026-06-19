import { useCallback, useEffect, useState } from "react";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { Plus, Pencil, UserRound, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabsList } from "@/components/ui/scrollable-tabs-list";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import { cn } from "@/lib/utils";
import { DataTable, type Column } from "@/components/DataTable";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  assignEmployeeUser,
  createOrganizationEmployee,
  listDepartments,
  listOrganizationEmployees,
  listPositions,
  removeEmployeeUser,
  updateOrganizationEmployee,
  type DepartmentRow,
  type OrganizationEmployeeRow,
  type PositionRow,
} from "@/lib/api-integration/organizationEndpoints";
import { listUsers, type UserApiRow } from "@/lib/api-integration/userManagementEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";
import { toast } from "sonner";
import { EmployeeAttendanceHistory } from "@/components/hr/EmployeeAttendanceHistory";
import { EmployeePayslipHistory } from "@/components/hr/EmployeePayslipHistory";
import { EmployeeCurrentShiftCard } from "@/components/hr/EmployeeCurrentShiftCard";
import { EmployeeCurrentWeekSchedule } from "@/components/hr/EmployeeCurrentWeekSchedule";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getEmployeeShiftHistory,
  type ShiftAssignmentApiRow,
} from "@/lib/api-integration/hrEndpoints";

const STATUSES = ["active", "inactive", "resigned", "terminated"] as const;

export default function Employees() {
  const { t } = useErpTranslation();
  const { user } = useAuthStore();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(activeOutletId);
  const [rows, setRows] = useState<OrganizationEmployeeRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [users, setUsers] = useState<UserApiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationEmployeeRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<ShiftAssignmentApiRow[]>([]);
  const [historyCurrent, setHistoryCurrent] = useState<ShiftAssignmentApiRow | null>(null);
  const [historyLabel, setHistoryLabel] = useState("");
  const [form, setForm] = useState({
    employeeNo: "",
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    birthDate: "",
    hireDate: "",
    status: "active" as (typeof STATUSES)[number],
    positionId: "",
    departmentId: "",
    notes: "",
    userId: "",
  });

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [emps, deps, pos, us] = await Promise.all([
        listOrganizationEmployees(outletId),
        listDepartments(outletId),
        listPositions(outletId),
        listUsers(),
      ]);
      setRows(emps);
      setDepartments(deps.filter((d) => d.isActive));
      setPositions(pos.filter((p) => p.isActive));
      setUsers(us);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("hr.employees.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    if (outletId === null && activeOutletId) setOutletId(activeOutletId);
    else if (outletId === null && outlets[0]) setOutletId(outlets[0].id);
  }, [activeOutletId, outletId, outlets]);

  useEffect(() => {
    void load();
  }, [load]);

  const outletLabel = (id: number) => outlets.find((o) => o.id === id)?.name ?? String(id);

  const openNew = () => {
    setEditing(null);
    setForm({
      employeeNo: "",
      fullName: "",
      email: "",
      phone: "",
      gender: "",
      birthDate: "",
      hireDate: "",
      status: "active",
      positionId: "",
      departmentId: "",
      notes: "",
      userId: "",
    });
    setOpen(true);
  };

  const openShiftHistory = async (row: OrganizationEmployeeRow) => {
    try {
      const data = await getEmployeeShiftHistory(row.id);
      setHistoryLabel(row.fullName);
      setHistoryCurrent(data.current);
      setHistoryRows(data.history);
      setHistoryOpen(true);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("hr.employees.shiftHistoryFailed"));
    }
  };

  const openEdit = (row: OrganizationEmployeeRow) => {
    setEditing(row);
    setForm({
      employeeNo: row.employeeNo,
      fullName: row.fullName,
      email: row.email ?? "",
      phone: row.phone ?? "",
      gender: row.gender ?? "",
      birthDate: row.birthDate ?? "",
      hireDate: row.hireDate ?? "",
      status: (row.status as (typeof STATUSES)[number]) || "active",
      positionId: row.positionId ? String(row.positionId) : "",
      departmentId: row.departmentId ? String(row.departmentId) : "",
      notes: row.notes ?? "",
      userId: row.userId ? String(row.userId) : "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!outletId || !form.fullName.trim()) {
      return toast.error(t("hr.employees.fullNameRequired"));
    }
    setSaving(true);
    try {
      const payload = {
        employeeNo: form.employeeNo || undefined,
        fullName: form.fullName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        gender: form.gender || undefined,
        birthDate: form.birthDate || undefined,
        hireDate: form.hireDate || undefined,
        status: form.status,
        positionId: form.positionId ? Number(form.positionId) : null,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        notes: form.notes || undefined,
      };
      let saved: OrganizationEmployeeRow;
      if (editing) {
        saved = await updateOrganizationEmployee(editing.id, payload);
        if (form.userId && Number(form.userId) !== (editing.userId ?? 0)) {
          saved = await assignEmployeeUser(editing.id, Number(form.userId));
        } else if (!form.userId && editing.userId) {
          saved = await removeEmployeeUser(editing.id);
        }
        toast.success(t("hr.employees.updated"));
      } else {
        saved = await createOrganizationEmployee({ outletId, ...payload });
        if (form.userId) {
          saved = await assignEmployeeUser(saved.id, Number(form.userId));
        }
        toast.success(t("hr.employees.created"));
      }
      void saved;
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("hr.employees.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<OrganizationEmployeeRow>[] = [
    { key: "employeeNo", header: t("hr.employees.columns.employeeNo"), sortable: true },
    { key: "fullName", header: t("hr.employees.columns.name"), sortable: true },
    { key: "positionName", header: t("hr.employees.columns.position"), render: (r) => r.positionName ?? "—" },
    {
      key: "departmentId",
      header: t("hr.employees.columns.department"),
      render: (r) => r.department?.name ?? departments.find((d) => d.id === r.departmentId)?.name ?? "—",
    },
    { key: "outletId", header: t("hr.employees.columns.outlet"), render: (r) => r.outlet?.name ?? outletLabel(r.outletId) },
    {
      key: "status",
      header: t("hr.employees.columns.status"),
      render: (r) => (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-muted capitalize">
          {t(`hr.employees.statuses.${r.status}`, { defaultValue: r.status })}
        </span>
      ),
    },
    {
      key: "linkedUser",
      header: t("hr.employees.columns.linkedUser"),
      render: (r) => (r.linkedUser ? `${r.linkedUser.name} (${r.linkedUser.email})` : "—"),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-right",
      render: (r) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UserRound className="h-7 w-7 text-primary" /> {t("hr.employees.pageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("hr.employees.pageSubtitle")}</p>
        </div>
        {outlets.length > 0 && (
          <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder={t("payroll.employees.outlet")} />
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
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        searchPlaceholder={t("hr.employees.searchPlaceholder")}
        searchKeys={["fullName", "employeeNo", "email", "phone"]}
        emptyMessage={t("hr.employees.empty")}
        emptyAction={{ label: t("hr.employees.addEmployee"), onClick: openNew }}
        rightToolbar={
          <Button onClick={openNew} className="rounded-xl" disabled={!outletId}>
            <Plus className="h-4 w-4 mr-1" /> {t("hr.employees.addEmployee")}
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn("rounded-2xl", dialogSize.tabbed, dialogScroll)}>
          <DialogHeader>
            <DialogTitle>{editing ? t("hr.employees.editEmployee") : t("hr.employees.newEmployee")}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general">
            <ScrollableTabsList>
              <TabsTrigger value="general">{t("hr.employees.tabs.general")}</TabsTrigger>
              <TabsTrigger value="employment">{t("hr.employees.tabs.employment")}</TabsTrigger>
              <TabsTrigger value="shift">{t("hr.employees.tabs.shift")}</TabsTrigger>
              <TabsTrigger value="schedule">{t("hr.employees.tabs.schedule")}</TabsTrigger>
              <TabsTrigger value="attendance">{t("hr.employees.tabs.attendance")}</TabsTrigger>
              <TabsTrigger value="payslips">{t("hr.employees.tabs.payslips")}</TabsTrigger>
              <TabsTrigger value="account">{t("hr.employees.tabs.account")}</TabsTrigger>
            </ScrollableTabsList>
            <TabsContent value="general" className="grid gap-3 pt-3">
              <div>
                <Label>{t("payroll.employees.employeeNo")}</Label>
                <Input
                  value={form.employeeNo}
                  onChange={(e) => setForm({ ...form, employeeNo: e.target.value })}
                  placeholder={t("hr.employees.employeeNoPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("payroll.employees.fullName")} *</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("payroll.employees.email")}</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>{t("payroll.employees.phone")}</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("hr.employees.gender")}</Label>
                  <Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
                </div>
                <div>
                  <Label>{t("hr.employees.birthDate")}</Label>
                  <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="employment" className="grid gap-3 pt-3">
              <div>
                <Label>{t("payroll.employees.department")}</Label>
                <Select value={form.departmentId || "none"} onValueChange={(v) => setForm({ ...form, departmentId: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("hr.employees.none")}</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("payroll.employees.position")}</Label>
                <Select value={form.positionId || "none"} onValueChange={(v) => setForm({ ...form, positionId: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("hr.employees.none")}</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("payroll.employees.hireDate")}</Label>
                  <Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
                </div>
                <div>
                  <Label>{t("hr.employees.columns.status")}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as (typeof STATUSES)[number] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`hr.employees.statuses.${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t("hr.employees.notes")}</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </TabsContent>
            <TabsContent value="shift" className="grid gap-3 pt-3">
              {editing ? (
                <>
                  <EmployeeCurrentShiftCard employeeId={editing.id} />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => void openShiftHistory(editing)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    {t("hr.employees.viewShiftHistory")}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t("hr.employees.shiftManageHint")}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("hr.employees.saveFirstShift")}</p>
              )}
            </TabsContent>
            <TabsContent value="schedule" className="grid gap-3 pt-3">
              {editing ? (
                <>
                  <EmployeeCurrentWeekSchedule employeeId={editing.id} />
                  <p className="text-xs text-muted-foreground">{t("hr.employees.scheduleReadOnlyHint")}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("hr.employees.saveFirstSchedule")}</p>
              )}
            </TabsContent>
            <TabsContent value="attendance" className="grid gap-3 pt-3">
              {editing ? (
                <>
                  <EmployeeAttendanceHistory employeeId={editing.id} limit={30} />
                  <p className="text-xs text-muted-foreground">
                    {t("hr.employees.attendanceReadOnlyHint")}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("hr.employees.saveFirstAttendance")}</p>
              )}
            </TabsContent>
            <TabsContent value="payslips" className="grid gap-3 pt-3">
              {editing ? (
                <>
                  <EmployeePayslipHistory employeeId={editing.id} />
                  <p className="text-xs text-muted-foreground">{t("hr.employees.payslipReadOnlyHint")}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("hr.employees.saveFirstPayslips")}</p>
              )}
            </TabsContent>
            <TabsContent value="account" className="grid gap-3 pt-3">
              <p className="text-sm text-muted-foreground">
                {t("hr.employees.accountLinkHint")}
              </p>
              <div>
                <Label>{t("hr.employees.userAccount")}</Label>
                <Select value={form.userId || "none"} onValueChange={(v) => setForm({ ...form, userId: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("hr.employees.noLink")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("hr.employees.noLinkOption")}</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("hr.employees.cancel")}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {t("hr.employees.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("hr.employees.shiftHistoryTitle", { name: historyLabel })}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {historyCurrent?.shift ? (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">{t("hr.employees.current")}</p>
                <p className="font-medium">{historyCurrent.shift.name}</p>
                <p className="text-sm text-muted-foreground">
                  {historyCurrent.shift.startTime} – {historyCurrent.shift.endTime}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("hr.employees.noCurrentAssignment")}</p>
            )}
            <ul className="space-y-2">
              {historyRows.map((h) => (
                <li key={h.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{h.shift?.name ?? t("hr.employees.shiftFallback")}</p>
                  <p className="text-muted-foreground text-xs">
                    {h.effectiveFrom} → {h.effectiveUntil ?? (h.isActive ? t("hr.employees.present") : "—")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
