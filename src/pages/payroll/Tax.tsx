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
import { ApiHttpError } from "@/lib/api-integration/client";
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
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load tax data");
    } finally {
      setLoading(false);
    }
  }, [outletId]);

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
      toast.error("Effective date is required");
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
      toast.success("PPh21 configuration saved");
      setConfigOpen(false);
      await loadData();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to save configuration");
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
      toast.error("Select an employee");
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
      toast.success("Tax profile saved");
      setProfileOpen(false);
      await loadData();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to save tax profile");
    }
  };

  const configColumns: Column<Pph21ConfigRow>[] = [
    { key: "effectiveDate", header: "Effective", sortable: true },
    { key: "ptkpTk0", header: "TK/0", render: (r) => formatIDR(r.ptkpTk0) },
    { key: "ptkpK0", header: "K/0", render: (r) => formatIDR(r.ptkpK0) },
    {
      key: "brackets",
      header: "Brackets",
      render: (r) => `${r.brackets?.length ?? 0} tiers`,
    },
    {
      key: "isActive",
      header: "Status",
      render: (r) => <Badge variant={r.isActive ? "default" : "secondary"}>{r.isActive ? "active" : "inactive"}</Badge>,
    },
  ];

  type EnrollmentRow = { employee: OrganizationEmployeeRow; profile: EmployeeTaxProfileRow | null };

  const enrollmentRows = useMemo(
    () => employees.map((e) => ({ employee: e, profile: profileByEmployee.get(e.id) ?? null })),
    [employees, profileByEmployee],
  );

  const enrollColumns: Column<EnrollmentRow>[] = [
    { key: "employee", header: "Employee", render: (r) => r.employee.fullName, sortable: true },
    { key: "npwp", header: "NPWP", render: (r) => r.profile?.npwpNumber ?? "—" },
    { key: "ptkp", header: "PTKP", render: (r) => r.profile?.ptkpStatus ?? "—" },
    {
      key: "enabled",
      header: "PPh21",
      render: (r) =>
        r.profile?.pph21Enabled ? (
          <Badge variant="outline">Enabled</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">Disabled</span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Button size="sm" variant="ghost" onClick={() => openProfile(r.employee, r.profile)}>
          <Pencil className="h-3.5 w-3.5 mr-1" />
          {r.profile ? "Edit" : "Setup"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">PPh21 Tax</h2>
          <p className="text-sm text-muted-foreground">
            Configure PTKP and progressive brackets; maintain employee NPWP and PTKP status.
          </p>
        </div>
        {outlets.length > 1 && (
          <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
            <SelectTrigger className="w-[200px]">
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
        )}
      </div>

      <Tabs defaultValue="configuration">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="profiles">Employee Tax Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setConfigOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New tax schedule
            </Button>
          </div>
          <DataTable columns={configColumns} data={configs} loading={loading} emptyMessage="No PPh21 configurations yet." />
        </TabsContent>

        <TabsContent value="profiles" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openProfile()}>
              <Plus className="h-4 w-4 mr-1" />
              Setup employee
            </Button>
          </div>
          <DataTable
            columns={enrollColumns}
            data={enrollmentRows}
            loading={loading}
            emptyMessage="No employees for this outlet."
          />
        </TabsContent>
      </Tabs>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New PPh21 configuration</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Effective date</Label>
              <Input
                type="date"
                value={configForm.effectiveDate}
                onChange={(e) => setConfigForm((f) => ({ ...f, effectiveDate: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">PTKP values (IDR per year)</p>
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
            <p className="text-xs text-muted-foreground">
              Default progressive brackets (5%–35%) will be applied automatically.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitConfig()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editProfile ? "Edit tax profile" : "Employee tax profile"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Employee</Label>
              <Select
                value={profileForm.employeeId}
                onValueChange={(v) => setProfileForm((f) => ({ ...f, employeeId: v }))}
                disabled={!!editProfile}
              >
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
            <div>
              <Label>NPWP number</Label>
              <Input
                value={profileForm.npwpNumber}
                onChange={(e) => setProfileForm((f) => ({ ...f, npwpNumber: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label>PTKP status</Label>
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
              Enable PPh21 deduction
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitProfile()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
