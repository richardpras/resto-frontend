import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getOutletReservationSettings,
  patchOutletReservationSettings,
  type OutletReservationSettingRow,
} from "@/lib/api-integration/settingsDomainEndpoints";

type Props = {
  outletId: number;
  outletName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function OutletReservationSettingsDialog({
  outletId,
  outletName,
  open,
  onOpenChange,
}: Props) {
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<OutletReservationSettingRow | null>(null);

  useEffect(() => {
    if (!open || outletId < 1) return;
    let active = true;
    setLoading(true);
    getOutletReservationSettings(outletId)
      .then((row) => {
        if (active) setForm(row);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : t("settings.outletReservation.loadFailed"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, outletId, t]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const saved = await patchOutletReservationSettings(outletId, {
        publicEnabled: form.publicEnabled,
        publicSlug: form.publicSlug,
        depositMode: form.depositMode,
        depositPercent: form.depositPercent,
        depositFlatAmount: form.depositFlatAmount,
        preorderRequired: form.preorderRequired,
        depositInstructions: form.depositInstructions,
        depositReviewTimeoutHours: form.depositReviewTimeoutHours,
      });
      setForm(saved);
      toast.success(t("settings.outletReservation.saved"));
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("settings.outletReservation.title", { name: outletName })}</DialogTitle>
        </DialogHeader>
        {loading || !form ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="public-enabled">{t("settings.outletReservation.publicEnabled")}</Label>
              <Switch
                id="public-enabled"
                checked={form.publicEnabled}
                onCheckedChange={(checked) => setForm({ ...form, publicEnabled: checked })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("settings.outletReservation.publicSlug")}</Label>
              <Input
                value={form.publicSlug}
                onChange={(e) => setForm({ ...form, publicSlug: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.outletReservation.publicUrl", { path: form.publicUrlPath })}
              </p>
            </div>
            <div className="space-y-1">
              <Label>{t("settings.outletReservation.depositMode")}</Label>
              <Select
                value={form.depositMode}
                onValueChange={(value: "percent" | "flat") => setForm({ ...form, depositMode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">{t("settings.outletReservation.modePercent")}</SelectItem>
                  <SelectItem value="flat">{t("settings.outletReservation.modeFlat")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.depositMode === "percent" ? (
              <div className="space-y-1">
                <Label>{t("settings.outletReservation.depositPercent")}</Label>
                <Input
                  type="number"
                  min={0.01}
                  max={100}
                  value={form.depositPercent ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, depositPercent: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label>{t("settings.outletReservation.depositFlatAmount")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.depositFlatAmount ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, depositFlatAmount: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="preorder-required">{t("settings.outletReservation.preorderRequired")}</Label>
              <Switch
                id="preorder-required"
                checked={form.preorderRequired}
                onCheckedChange={(checked) => setForm({ ...form, preorderRequired: checked })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("settings.outletReservation.depositInstructions")}</Label>
              <Textarea
                value={form.depositInstructions ?? ""}
                onChange={(e) => setForm({ ...form, depositInstructions: e.target.value })}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={saving || loading || !form} onClick={() => void save()}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
