import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { getOutletTaxAssignments, putOutletTaxAssignments } from "@/lib/api-integration/settingsDomainEndpoints";

export default function OutletTaxAssignmentSettings() {
  const { t } = useTranslation("common");
  const outlets = useSettingsStore((s) => s.outlets);
  const taxes = useSettingsStore((s) => s.taxes);
  const ensureSectionsLoaded = useSettingsStore((s) => s.ensureSectionsLoaded);
  const [outletId, setOutletId] = useState<number | null>(outlets[0]?.id ?? null);
  const [assignedTaxIds, setAssignedTaxIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void ensureSectionsLoaded(["outlets", "taxes"]);
  }, [ensureSectionsLoaded]);

  useEffect(() => {
    if (outletId === null && outlets.length > 0) {
      setOutletId(outlets[0].id);
    }
  }, [outletId, outlets]);

  useEffect(() => {
    if (outletId === null || !getApiAccessToken()) {
      setAssignedTaxIds([]);
      return;
    }
    let active = true;
    setLoading(true);
    void getOutletTaxAssignments(outletId)
      .then((res) => {
        if (!active) return;
        setAssignedTaxIds(res.taxIds);
      })
      .catch(() => {
        if (!active) return;
        setAssignedTaxIds([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [outletId]);

  const toggleTax = (taxId: string, checked: boolean) => {
    setAssignedTaxIds((prev) => {
      if (checked) return prev.includes(taxId) ? prev : [...prev, taxId];
      return prev.filter((id) => id !== taxId);
    });
  };

  const save = async () => {
    if (outletId === null) return;
    if (!getApiAccessToken()) {
      toast.success(t("settings.taxes.outletAssignmentsSavedLocally"));
      return;
    }
    setSaving(true);
    try {
      const saved = await putOutletTaxAssignments(outletId, assignedTaxIds);
      setAssignedTaxIds(saved.taxIds);
      toast.success(t("settings.taxes.outletAssignmentsSaved"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("settings.taxes.outletAssignmentsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("settings.taxes.outletAssignmentsDesc")}</p>
        <div className="space-y-2 max-w-sm">
          <Label>{t("settings.printers.outlet")}</Label>
          <Select
            value={outletId !== null ? String(outletId) : ""}
            onValueChange={(v) => setOutletId(Number(v))}
          >
            <SelectTrigger><SelectValue placeholder={t("settings.printers.selectOutlet")} /></SelectTrigger>
            <SelectContent>
              {outlets.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="space-y-2">
            {taxes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("settings.taxes.noTaxRules")}</p>
            ) : (
              taxes.map((tax) => (
                <label key={tax.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={assignedTaxIds.includes(tax.id)}
                    onCheckedChange={(v) => toggleTax(tax.id, !!v)}
                  />
                  <span>
                    {tax.name}
                    {tax.type === "percentage" ? ` (${tax.value}%)` : ""}
                  </span>
                </label>
              ))
            )}
          </div>
        )}
        <Button type="button" onClick={() => void save()} disabled={saving || outletId === null}>
          {saving ? t("common.saving") : t("common.saveShort")}
        </Button>
      </CardContent>
    </Card>
  );
}
