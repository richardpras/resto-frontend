import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createSalaryProfile,
  listSalaryProfiles,
  updateSalaryProfile,
  type EmployeeSalaryProfileRow,
  type OvertimeRateType,
} from "@/lib/api-integration/hrEndpoints";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import { toast } from "sonner";

type EmployeeSalaryTabProps = {
  employeeId: number;
  outletId: number;
};

const emptyForm = {
  basicSalary: 0,
  defaultAllowance: 0,
  defaultDeduction: 0,
  overtimeRateType: "fixed_hourly" as OvertimeRateType,
  overtimeRateValue: 0,
  unpaidLeaveDeductionEnabled: false,
  attendanceDeductionEnabled: false,
  attendanceDeductionPerDay: 0,
};

export function EmployeeSalaryTab({ employeeId, outletId }: EmployeeSalaryTabProps) {
  const { t } = useErpTranslation();
  const [profile, setProfile] = useState<EmployeeSalaryProfileRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listSalaryProfiles({ outletId, employeeId });
      const row = rows[0] ?? null;
      setProfile(row);
      if (row) {
        setForm({
          basicSalary: row.basicSalary,
          defaultAllowance: row.defaultAllowance,
          defaultDeduction: row.defaultDeduction,
          overtimeRateType: row.overtimeRateType,
          overtimeRateValue: row.overtimeRateValue,
          unpaidLeaveDeductionEnabled: row.unpaidLeaveDeductionEnabled,
          attendanceDeductionEnabled: row.attendanceDeductionEnabled,
          attendanceDeductionPerDay: row.attendanceDeductionPerDay ?? 0,
        });
      } else {
        setForm(emptyForm);
      }
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("hr.employees.salaryLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [employeeId, outletId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      if (profile) {
        const updated = await updateSalaryProfile(profile.id, form);
        setProfile(updated);
        toast.success(t("hr.employees.salaryUpdated"));
      } else {
        const created = await createSalaryProfile({ employeeId, ...form });
        setProfile(created);
        toast.success(t("hr.employees.salaryCreated"));
      }
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("hr.employees.salarySaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("common.actions.loading")}</p>;
  }

  return (
    <div className="grid gap-3 pt-3">
      <p className="text-xs text-muted-foreground">{t("hr.employees.salaryTabHint")}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("payroll.employees.baseSalaryIdr")}</Label>
          <Input
            type="number"
            min={0}
            value={form.basicSalary}
            onChange={(e) => setForm({ ...form, basicSalary: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>{t("hr.employees.defaultAllowance")}</Label>
          <Input
            type="number"
            min={0}
            value={form.defaultAllowance}
            onChange={(e) => setForm({ ...form, defaultAllowance: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>{t("hr.employees.defaultDeduction")}</Label>
          <Input
            type="number"
            min={0}
            value={form.defaultDeduction}
            onChange={(e) => setForm({ ...form, defaultDeduction: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>{t("hr.employees.overtimeRateType")}</Label>
          <Select
            value={form.overtimeRateType}
            onValueChange={(v) => setForm({ ...form, overtimeRateType: v as OvertimeRateType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed_hourly">{t("hr.employees.overtimeFixedHourly")}</SelectItem>
              <SelectItem value="multiplier_hourly_salary">
                {t("hr.employees.overtimeMultiplier")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("hr.employees.overtimeRateValue")}</Label>
          <Input
            type="number"
            min={0}
            value={form.overtimeRateValue}
            onChange={(e) => setForm({ ...form, overtimeRateValue: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>{t("hr.employees.attendanceDeductionPerDay")}</Label>
          <Input
            type="number"
            min={0}
            value={form.attendanceDeductionPerDay}
            onChange={(e) =>
              setForm({ ...form, attendanceDeductionPerDay: Number(e.target.value) })
            }
            disabled={!form.attendanceDeductionEnabled}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={form.unpaidLeaveDeductionEnabled}
            onCheckedChange={(v) => setForm({ ...form, unpaidLeaveDeductionEnabled: v })}
          />
          <Label>{t("hr.employees.unpaidLeaveDeduction")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={form.attendanceDeductionEnabled}
            onCheckedChange={(v) => setForm({ ...form, attendanceDeductionEnabled: v })}
          />
          <Label>{t("hr.employees.attendanceDeduction")}</Label>
        </div>
      </div>
      <div>
        <Button onClick={() => void save()} disabled={saving}>
          {t("hr.employees.saveSalary")}
        </Button>
      </div>
    </div>
  );
}
