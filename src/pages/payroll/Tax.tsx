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
  PTKP_STATUSES,
  createPph21Config,
  listEmployeeTaxProfiles,
  listPph21Configs,
  updateEmployeeTaxProfile,
  upsertEmployeeTaxProfile,
  type EmployeeTaxProfileRow,
  type Pph21ConfigRow,
} from "@/lib/api-integration/hrEndpoints";
import { listOrganizationEmployees, type OrganizationEmployeeRow } from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

const DEFAULT_BRACKETS = [
  { incomeFrom: 0, incomeTo: 60000000, taxRate: 5 },
  { incomeFrom: 60000000, incomeTo: 250000000, taxRate: 15 },
  { incomeFrom: 250000000, incomeTo: 500000000, taxRate: 25 },
  { incomeFrom: 500000000, incomeTo: 5000000000, taxRate: 30 },
  { incomeFrom: 5000000000, incomeTo: null, taxRate: 35 },
];

export default function Tax() {
  const { t } = useErpTranslation();
  const { user } = useAuthStore();
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);

  const [configs, setConfigs] = useState<Pph21ConfigRow[]>([]);
  const [profiles, setProfiles] = useState<EmployeeTaxProfileRow[]>([]);
  const [employees, setEmployees] = useState<OrganizationEmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [configOpen, setConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    effectiveDate: "",
    ptkpTk0: "54000000",
    ptkpTk1: "58500000",
    ptkpTk2: "63000000",
    ptkpTk3: "67500000",
    ptkpK0: "58500000",
    ptkpK1: "63000000",
    ptkpK2: "67500000",
    ptkpK3: "72000000",
    isActive: true,
  });

  const [profileOpen, setProfileOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<EmployeeTaxProfileRow | null>(null);
  const [profileForm, setProfileForm] = useState({
    employeeId: "",
    npwpNumber: "",
    ptkpStatus: "TK0",
    pph21Enabled: true,
  });

  const loadData = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const [cfg, prof, emps] = await Promise.all([
        listPph21Configs(),
        listEmployeeTaxProfiles({ outletId }),
        listOrganizationEmployees(outletId),
      ]);
      setConfigs(cfg);
      setProfiles(prof);
      setEmployees(emps);
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.loadTaxFailed"));
    } finally {
      setLoading(false);
    }
  }, [outletId, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const profileByEmployee = useMemo(() => {
    const map = new Map<number, EmployeeTaxProfileRow>();
    for (const p of profiles) map.set(p.employeeId, p);
    return map;
  }, [profiles]);

  const submitConfig = async () => {
    if (!configForm.effectiveDate) {
      toast.error(t("payroll.shared.effectiveRequired"));
      return;
    }
    try {
      await createPph21Config({
        effectiveDate: configForm.effectiveDate,
        ptkpTk0: Number(configForm.ptkpTk0),
        ptkpTk1: Number(configForm.ptkpTk1),
        ptkpTk2: Number(configForm.ptkpTk2),
        ptkpTk3: Number(configForm.ptkpTk3),
        ptkpK0: Number(configForm.ptkpK0),
        ptkpK1: Number(configForm.ptkpK1),
        ptkpK2: Number(configForm.ptkpK2),
        ptkpK3: Number(configForm.ptkpK3),
        isActive: configForm.isActive,
        brackets: DEFAULT_BRACKETS,
      });
      toast.success(t("payroll.tax.configSaved"));
      setConfigOpen(false);
      await loadData();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.configSaveFailed"));
    }
  };

  const openProfile = (employee?: OrganizationEmployeeRow, existing?: EmployeeTaxProfileRow | null) => {
    setEditProfile(existing ?? null);
    setProfileForm({
      employeeId: employee ? String(employee.id) : existing ? String(existing.employeeId) : "",
      npwpNumber: existing?.npwpNumber ?? "",
      ptkpStatus: existing?.ptkpStatus ?? "TK0",
      pph21Enabled: existing?.pph21Enabled ?? true,
    });
    setProfileOpen(true);
  };

  const submitProfile = async () => {
    if (!profileForm.employeeId) {
      toast.error(t("payroll.shared.selectEmployeeRequired"));
      return;
    }
    const payload = {
      employeeId: Number(profileForm.employeeId),
      npwpNumber: profileForm.npwpNumber || undefined,
      ptkpStatus: profileForm.ptkpStatus,
      pph21Enabled: profileForm.pph21Enabled,
    };
    try {
      if (editProfile) {
        await updateEmployeeTaxProfile(editProfile.id, payload);
      } else {
        await upsertEmployeeTaxProfile(payload);
      }
      toast.success(t("payroll.shared.taxProfileSaved"));
      setProfileOpen(false);
      await loadData();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("payroll.shared.taxProfileSaveFailed"));
    }
  };

  const configColumns: Column<Pph21ConfigRow>[] = useMemo(
    () => [
      { key: "effectiveDate", header: t("payroll.shared.effectiveLabel"), sortable: true },
      { key: "ptkpTk0", header: "TK/0", render: (r) => formatIDR(r.ptkpTk0) },
      { key: "ptkpK0", header: "K/0", render: (r) => formatIDR(r.ptkpK0) },
      {
        key: "brackets",
        header: t("payroll.shared.brackets"),
        render: (r) => t("payroll.shared.tiers", { count: r.brackets?.length ?? 0 }),
      },
      {
        key: "isActive",
        header: t("payroll.shared.status"),
        render: (r) => (
          <Badge variant={r.isActive ? "default" : "secondary"}>
            {r.isActive ? t("payroll.shared.active") : t("payroll.shared.inactive")}
          </Badge>
        ),
      },
    ],
    [t],
  );

  type EnrollmentRow = { employee: OrganizationEmployeeRow; profile: EmployeeTaxProfileRow | null };

  const enrollmentRows = useMemo(
    () => employees.map((e) => ({ employee: e, profile: profileByEmployee.get(e.id) ?? null })),
    [employees, profileByEmployee],
  );

  const enrollColumns: Column<EnrollmentRow>[] = useMemo(
    () => [
      { key: "employee", header: t("payroll.shared.employee"), render: (r) => r.employee.fullName, sortable: true },
      { key: "npwp", header: t("payroll.shared.npwp"), render: (r) => r.profile?.npwpNumber ?? "—" },
      { key: "ptkp", header: t("payroll.shared.ptkp"), render: (r) => r.profile?.ptkpStatus ?? "—" },
      {
        key: "enabled",
        header: t("payroll.engine.pph21"),
        render: (r) =>
          r.profile?.pph21Enabled ? (
            <Badge variant="outline">{t("payroll.shared.enabled")}</Badge>
          ) : (
            <span className="text-muted-foreground text-xs">{t("payroll.shared.disabled")}</span>
          ),
      },
      {
        key: "actions",
        header: "",
        render: (r) => (
          <Button size="sm" variant="ghost" onClick={() => openProfile(r.employee, r.profile)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {r.profile ? t("payroll.shared.edit") : t("payroll.shared.setup")}
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
          <h2 className="text-lg font-semibold">{t("payroll.tax.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("payroll.tax.subtitle")}</p>
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
          <TabsTrigger value="profiles">{t("payroll.shared.employeeTaxProfiles")}</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setConfigOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("payroll.shared.newTaxSchedule")}
            </Button>
          </div>
          <DataTable
            columns={configColumns}
            data={configs}
            rowKey={(r) => String(r.id)}
            loading={loading}
            emptyMessage={t("payroll.shared.noPph21Configs")}
          />
        </TabsContent>

        <TabsContent value="profiles" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openProfile()}>
              <Plus className="h-4 w-4 mr-1" />
              {t("payroll.shared.setupEmployee")}
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
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>{t("payroll.shared.newPph21Config")}</DialogTitle>
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
            <p className="text-xs text-muted-foreground">{t("payroll.shared.ptkpValuesHint")}</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["ptkpTk0", "TK0"],
                  ["ptkpTk1", "TK1"],
                  ["ptkpTk2", "TK2"],
                  ["ptkpTk3", "TK3"],
                  ["ptkpK0", "K0"],
                  ["ptkpK1", "K1"],
                  ["ptkpK2", "K2"],
                  ["ptkpK3", "K3"],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <Label>{label}</Label>
                  <Input
                    value={configForm[field]}
                    onChange={(e) => setConfigForm((f) => ({ ...f, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("payroll.shared.bracketsHint")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void submitConfig()}>{t("payroll.shared.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll}`}>
          <DialogHeader>
            <DialogTitle>
              {editProfile ? t("payroll.shared.editTaxProfile") : t("payroll.shared.employeeTaxProfile")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{t("payroll.shared.employee")}</Label>
              <Select
                value={profileForm.employeeId}
                onValueChange={(v) => setProfileForm((f) => ({ ...f, employeeId: v }))}
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
              <Label>{t("payroll.shared.npwpNumber")}</Label>
              <Input
                value={profileForm.npwpNumber}
                onChange={(e) => setProfileForm((f) => ({ ...f, npwpNumber: e.target.value }))}
                placeholder={t("payroll.shared.optional")}
              />
            </div>
            <div>
              <Label>{t("payroll.shared.ptkpStatus")}</Label>
              <Select
                value={profileForm.ptkpStatus}
                onValueChange={(v) => setProfileForm((f) => ({ ...f, ptkpStatus: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PTKP_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profileForm.pph21Enabled}
                onChange={(e) => setProfileForm((f) => ({ ...f, pph21Enabled: e.target.checked }))}
              />
              {t("payroll.shared.enablePph21")}
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>
              {t("payroll.shared.cancel")}
            </Button>
            <Button onClick={() => void submitProfile()}>{t("payroll.shared.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
