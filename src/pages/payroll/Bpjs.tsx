import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  createBpjsConfig,
  listBpjsConfigs,
  listBpjsProfiles,
  updateBpjsProfile,
  upsertBpjsProfile,
  type BpjsConfigRow,
  type BpjsProfileRow,
} from "@/lib/api-integration/hrEndpoints";
import { listOrganizationEmployees, type OrganizationEmployeeRow } from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

function formatIDR(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default function Bpjs() {
  const { t } = useErpTranslation();
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [configs, setConfigs] = useState<BpjsConfigRow[]>([]);
  const [profiles, setProfiles] = useState<BpjsProfileRow[]>([]);
  const [employees, setEmployees] = useState<OrganizationEmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [configOpen, setConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    effectiveDate: "",
    kesehatanEmployeeRate: "1",
    kesehatanCompanyRate: "4",
    jhtEmployeeRate: "2",
    jhtCompanyRate: "3.7",
    jpEmployeeRate: "1",
    jpCompanyRate: "2",
    jkkCompanyRate: "0.24",
    jkmCompanyRate: "0.3",
    status: "active",
  });

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<BpjsProfileRow | null>(null);
  const [enrollForm, setEnrollForm] = useState({
    employeeId: "",
    bpjsKesehatanNo: "",
    bpjsTkNo: "",
    bpjsKesehatanEnabled: true,
    bpjsTkEnabled: true,
    bpjsSalaryBase: "",
  });

  const loadData = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [cfg, prof, emps] = await Promise.all([
        listBpjsConfigs(),
        listBpjsProfiles({ outletId }),
        listOrganizationEmployees(outletId),
      ]);
      setConfigs(cfg);
      setProfiles(prof);
      setEmployees(emps);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.loadBpjsFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const profileByEmployee = useMemo(() => {
    const map = new Map<number, BpjsProfileRow>();
    for (const p of profiles) map.set(p.employeeId, p);
    return map;
  }, [profiles]);

  const submitConfig = async () => {
    if (!configForm.effectiveDate) {
      toast.error(t("payroll.shared.effectiveRequired"));
      return;
    }
    try {
      await createBpjsConfig({
        effectiveDate: configForm.effectiveDate,
        kesehatanEmployeeRate: Number(configForm.kesehatanEmployeeRate),
        kesehatanCompanyRate: Number(configForm.kesehatanCompanyRate),
        jhtEmployeeRate: Number(configForm.jhtEmployeeRate),
        jhtCompanyRate: Number(configForm.jhtCompanyRate),
        jpEmployeeRate: Number(configForm.jpEmployeeRate),
        jpCompanyRate: Number(configForm.jpCompanyRate),
        jkkCompanyRate: Number(configForm.jkkCompanyRate),
        jkmCompanyRate: Number(configForm.jkmCompanyRate),
        status: configForm.status,
      });
      toast.success(t("payroll.bpjs.configSaved"));
      setConfigOpen(false);
      await loadData();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.configSaveFailed"));
    }
  };

  const openEnroll = (employee?: OrganizationEmployeeRow, existing?: BpjsProfileRow | null) => {
    setEditProfile(existing ?? null);
    setEnrollForm({
      employeeId: employee ? String(employee.id) : existing ? String(existing.employeeId) : "",
      bpjsKesehatanNo: existing?.bpjsKesehatanNo ?? "",
      bpjsTkNo: existing?.bpjsTkNo ?? "",
      bpjsKesehatanEnabled: existing?.bpjsKesehatanEnabled ?? true,
      bpjsTkEnabled: existing?.bpjsTkEnabled ?? true,
      bpjsSalaryBase: existing?.bpjsSalaryBase != null ? String(existing.bpjsSalaryBase) : "",
    });
    setEnrollOpen(true);
  };

  const submitEnroll = async () => {
    if (!enrollForm.employeeId) {
      toast.error(t("payroll.shared.selectEmployeeRequired"));
      return;
    }
    const payload = {
      employeeId: Number(enrollForm.employeeId),
      bpjsKesehatanNo: enrollForm.bpjsKesehatanNo || undefined,
      bpjsTkNo: enrollForm.bpjsTkNo || undefined,
      bpjsKesehatanEnabled: enrollForm.bpjsKesehatanEnabled,
      bpjsTkEnabled: enrollForm.bpjsTkEnabled,
      bpjsSalaryBase: enrollForm.bpjsSalaryBase ? Number(enrollForm.bpjsSalaryBase) : undefined,
    };
    try {
      if (editProfile) {
        await updateBpjsProfile(editProfile.id, payload);
      } else {
        await upsertBpjsProfile(payload);
      }
      toast.success(t("payroll.bpjs.enrollmentSaved"));
      setEnrollOpen(false);
      await loadData();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.enrollmentSaveFailed"));
    }
  };

  const configColumns: Column<BpjsConfigRow>[] = useMemo(
    () => [
      { key: "effectiveDate", header: t("payroll.shared.effectiveLabel"), sortable: true },
      {
        key: "kesehatanEmployeeRate",
        header: t("payroll.shared.kesehatanEeEr"),
        render: (r) => `${r.kesehatanEmployeeRate} / ${r.kesehatanCompanyRate}`,
      },
      {
        key: "jhtEmployeeRate",
        header: t("payroll.shared.jhtEeEr"),
        render: (r) => `${r.jhtEmployeeRate} / ${r.jhtCompanyRate}`,
      },
      {
        key: "jpEmployeeRate",
        header: t("payroll.shared.jpEeEr"),
        render: (r) => `${r.jpEmployeeRate} / ${r.jpCompanyRate}`,
      },
      {
        key: "jkkCompanyRate",
        header: t("payroll.shared.jkkJkm"),
        render: (r) => `${r.jkkCompanyRate} / ${r.jkmCompanyRate}`,
      },
      {
        key: "status",
        header: t("payroll.shared.status"),
        render: (r) => (
          <Badge variant={r.status === "active" ? "default" : "secondary"}>
            {t(`payroll.shared.${r.status}`, { defaultValue: r.status })}
          </Badge>
        ),
      },
    ],
    [t],
  );

  const enrollmentRows = useMemo(() => {
    return employees.map((e) => {
      const p = profileByEmployee.get(e.id);
      return { employee: e, profile: p ?? null };
    });
  }, [employees, profileByEmployee]);

  type EnrollmentRow = { employee: OrganizationEmployeeRow; profile: BpjsProfileRow | null };

  const enrollColumns: Column<EnrollmentRow>[] = useMemo(
    () => [
      { key: "employee", header: t("payroll.shared.employee"), render: (r) => r.employee.fullName, sortable: true },
      { key: "bpjsKesehatanNo", header: t("payroll.shared.bpjsKesehatanNo"), render: (r) => r.profile?.bpjsKesehatanNo ?? "—" },
      { key: "bpjsTkNo", header: t("payroll.shared.bpjsTkNo"), render: (r) => r.profile?.bpjsTkNo ?? "—" },
      {
        key: "flags",
        header: t("payroll.shared.programs"),
        render: (r) => (
          <span className="flex gap-1 flex-wrap">
            {r.profile?.bpjsKesehatanEnabled && <Badge variant="outline">Kesehatan</Badge>}
            {r.profile?.bpjsTkEnabled && <Badge variant="outline">TK</Badge>}
            {!r.profile?.bpjsKesehatanEnabled && !r.profile?.bpjsTkEnabled && (
              <span className="text-muted-foreground text-xs">{t("payroll.shared.notEnrolled")}</span>
            )}
          </span>
        ),
      },
      {
        key: "bpjsSalaryBase",
        header: t("payroll.shared.salaryBase"),
        render: (r) => formatIDR(r.profile?.bpjsSalaryBase ?? null),
      },
      {
        key: "actions",
        header: "",
        render: (r) => (
          <Button size="sm" variant="ghost" onClick={() => openEnroll(r.employee, r.profile)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {r.profile ? t("payroll.shared.edit") : t("payroll.shared.enroll")}
          </Button>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("payroll.bpjs.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("payroll.bpjs.subtitle")}</p>
        </div>
        {outlets.length > 1 && (
          <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
            <SelectTrigger className="w-[200px]">
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
        )}
      </div>

      <Tabs defaultValue="configuration">
        <TabsList>
          <TabsTrigger value="configuration">{t("payroll.shared.configuration")}</TabsTrigger>
          <TabsTrigger value="enrollment">{t("payroll.shared.employeeEnrollment")}</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setConfigOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("payroll.shared.newRateSchedule")}
            </Button>
          </div>
          <DataTable
            columns={configColumns}
            data={configs}
            rowKey={(r) => String(r.id)}
            loading={loading}
            emptyMessage={t("payroll.shared.noBpjsConfigs")}
          />
        </TabsContent>

        <TabsContent value="enrollment" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openEnroll()}>
              <Plus className="h-4 w-4 mr-1" />
              {t("payroll.shared.enrollEmployee")}
            </Button>
          </div>
          <DataTable
            columns={enrollColumns}
            data={enrollmentRows}
            rowKey={(r) => String(r.employee.id)}
            loading={loading}
            emptyMessage={t("payroll.shared.noEmployeesOutlet")}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("payroll.shared.newBpjsSchedule")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("payroll.shared.effectiveDate")}</Label>
              <Input
                type="date"
                value={configForm.effectiveDate}
                onChange={(e) => setConfigForm((f) => ({ ...f, effectiveDate: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{t("payroll.shared.kesehatanEmployeePct")}</Label>
                <Input
                  value={configForm.kesehatanEmployeeRate}
                  onChange={(e) => setConfigForm((f) => ({ ...f, kesehatanEmployeeRate: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t("payroll.shared.kesehatanCompanyPct")}</Label>
                <Input
                  value={configForm.kesehatanCompanyRate}
                  onChange={(e) => setConfigForm((f) => ({ ...f, kesehatanCompanyRate: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t("payroll.shared.jhtEmployeePct")}</Label>
                <Input value={configForm.jhtEmployeeRate} onChange={(e) => setConfigForm((f) => ({ ...f, jhtEmployeeRate: e.target.value }))} />
              </div>
              <div>
                <Label>{t("payroll.shared.jhtCompanyPct")}</Label>
                <Input value={configForm.jhtCompanyRate} onChange={(e) => setConfigForm((f) => ({ ...f, jhtCompanyRate: e.target.value }))} />
              </div>
              <div>
                <Label>{t("payroll.shared.jpEmployeePct")}</Label>
                <Input value={configForm.jpEmployeeRate} onChange={(e) => setConfigForm((f) => ({ ...f, jpEmployeeRate: e.target.value }))} />
              </div>
              <div>
                <Label>{t("payroll.shared.jpCompanyPct")}</Label>
                <Input value={configForm.jpCompanyRate} onChange={(e) => setConfigForm((f) => ({ ...f, jpCompanyRate: e.target.value }))} />
              </div>
              <div>
                <Label>{t("payroll.shared.jkkCompanyPct")}</Label>
                <Input value={configForm.jkkCompanyRate} onChange={(e) => setConfigForm((f) => ({ ...f, jkkCompanyRate: e.target.value }))} />
              </div>
              <div>
                <Label>{t("payroll.shared.jkmCompanyPct")}</Label>
                <Input value={configForm.jkmCompanyRate} onChange={(e) => setConfigForm((f) => ({ ...f, jkmCompanyRate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>{t("payroll.shared.status")}</Label>
              <Select value={configForm.status} onValueChange={(v) => setConfigForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("payroll.shared.active")}</SelectItem>
                  <SelectItem value="inactive">{t("payroll.shared.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void submitConfig()}>{t("payroll.shared.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editProfile ? t("payroll.shared.editBpjsEnrollment") : t("payroll.shared.enrollEmployee")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("payroll.shared.employee")}</Label>
              <Select
                value={enrollForm.employeeId}
                onValueChange={(v) => setEnrollForm((f) => ({ ...f, employeeId: v }))}
                disabled={!!editProfile}
              >
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
            <div>
              <Label>{t("payroll.shared.bpjsKesehatanNo")}</Label>
              <Input
                value={enrollForm.bpjsKesehatanNo}
                onChange={(e) => setEnrollForm((f) => ({ ...f, bpjsKesehatanNo: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t("payroll.shared.bpjsTkNo")}</Label>
              <Input value={enrollForm.bpjsTkNo} onChange={(e) => setEnrollForm((f) => ({ ...f, bpjsTkNo: e.target.value }))} />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enrollForm.bpjsKesehatanEnabled}
                  onChange={(e) => setEnrollForm((f) => ({ ...f, bpjsKesehatanEnabled: e.target.checked }))}
                />
                {t("payroll.shared.kesehatanEnabled")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enrollForm.bpjsTkEnabled}
                  onChange={(e) => setEnrollForm((f) => ({ ...f, bpjsTkEnabled: e.target.checked }))}
                />
                {t("payroll.shared.tkEnabled")}
              </label>
            </div>
            <div>
              <Label>{t("payroll.shared.salaryBaseOverride")}</Label>
              <Input
                type="number"
                placeholder={t("payroll.shared.salaryBasePlaceholder")}
                value={enrollForm.bpjsSalaryBase}
                onChange={(e) => setEnrollForm((f) => ({ ...f, bpjsSalaryBase: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void submitEnroll()}>{t("payroll.shared.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
