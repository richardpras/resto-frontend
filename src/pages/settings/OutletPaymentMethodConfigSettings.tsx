import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  listOutletPaymentMethodConfigs,
  syncOutletPaymentMethodConfigs,
  uploadOutletStaticQrisImage,
  type OutletPaymentMethodConfigApi,
} from "@/lib/api-integration/outletPaymentMethodEndpoints";
import ChartAccountSelect from "@/components/settings/ChartAccountSelect";
import { useOutletStore } from "@/stores/outletStore";
import { useSettingsStore } from "@/stores/settingsStore";

export default function OutletPaymentMethodConfigSettings() {
  const outlets = useSettingsStore((s) => s.outlets);
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [outletId, setOutletId] = useState<number | null>(
    typeof activeOutletId === "number" ? activeOutletId : null,
  );
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["outlet-payment-method-configs", outletId],
    queryFn: () => listOutletPaymentMethodConfigs(outletId as number),
    enabled: typeof outletId === "number" && outletId >= 1,
  });

  const manualQris = useMemo(
    () => configs.find((c) => c.paymentMethodCode === "manual_qris"),
    [configs],
  );

  const draft = useMemo(() => {
    if (manualQris?.settings?.instructions && !instructions) {
      return manualQris.settings.instructions as string;
    }
    return instructions || (manualQris?.settings?.instructions as string) || "";
  }, [manualQris, instructions]);

  const toggleEnabled = async (row: OutletPaymentMethodConfigApi, enabled: boolean) => {
    if (!outletId) return;
    setSaving(true);
    try {
      await syncOutletPaymentMethodConfigs(outletId, [
        { paymentMethodCode: row.paymentMethodCode, enabled },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["outlet-payment-method-configs", outletId] });
      await queryClient.invalidateQueries({ queryKey: ["outlet-checkout-methods", outletId] });
      toast.success(`${row.label} ${enabled ? "enabled" : "disabled"}`);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const saveInstructions = async () => {
    if (!outletId) return;
    setSaving(true);
    try {
      await syncOutletPaymentMethodConfigs(outletId, [
        {
          paymentMethodCode: "manual_qris",
          enabled: manualQris?.enabled ?? true,
          settings: { instructions: draft },
        },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["outlet-payment-method-configs", outletId] });
      toast.success("Static QRIS instructions saved");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveChartAccount = async (row: OutletPaymentMethodConfigApi, chartAccountId: number | null) => {
    if (!outletId) return;
    setSaving(true);
    try {
      await syncOutletPaymentMethodConfigs(outletId, [
        { paymentMethodCode: row.paymentMethodCode, chartAccountId },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["outlet-payment-method-configs", outletId] });
      toast.success("GL account updated");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const onUploadImage = async (file: File) => {
    if (!outletId) return;
    setSaving(true);
    try {
      await uploadOutletStaticQrisImage(outletId, file);
      await queryClient.invalidateQueries({ queryKey: ["outlet-payment-method-configs", outletId] });
      await queryClient.invalidateQueries({ queryKey: ["outlet-checkout-methods", outletId] });
      toast.success("Static QRIS image uploaded");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Outlet Payment Settings</h2>
          <p className="text-sm text-muted-foreground">
            Enable or disable accepted payment methods per outlet. Configure static QRIS and customer payment instructions.
          </p>
        </div>

        <div className="max-w-xs space-y-2">
          <Label>Outlet</Label>
          <Select
            value={outletId ? String(outletId) : ""}
            onValueChange={(v) => setOutletId(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select outlet" />
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

        {!outletId ? (
          <p className="text-sm text-muted-foreground">Select an outlet to configure payment methods.</p>
        ) : isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-4">
            {configs.map((row) => {
              const isManualQris = row.paymentMethodCode === "manual_qris";

              return (
                <div
                  key={row.paymentMethodCode}
                  className="rounded-lg border border-border p-3 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{row.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.paymentMethodCode} · {row.type}
                        {row.provider ? ` · ${row.provider}` : ""}
                      </p>
                    </div>
                    <Switch
                      checked={row.enabled}
                      disabled={saving}
                      onCheckedChange={(checked) => void toggleEnabled(row, checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>GL Account</Label>
                    <ChartAccountSelect
                      value={row.chartAccountId ?? null}
                      onChange={(chartAccountId) => void saveChartAccount(row, chartAccountId)}
                      disabled={saving}
                    />
                  </div>

                  {isManualQris && row.enabled ? (
                    <div className="space-y-3 border-t border-border pt-3">
                      <h3 className="font-medium text-sm">Static QRIS</h3>
                      {manualQris?.settings?.qr_image_url ? (
                        <img
                          src={String(manualQris.settings.qr_image_url)}
                          alt="Static QRIS"
                          className="max-h-40 rounded-md border border-border"
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground">No QR image uploaded yet.</p>
                      )}
                      <div>
                        <Label htmlFor="static-qris-file">Upload QR image</Label>
                        <Input
                          id="static-qris-file"
                          type="file"
                          accept="image/*"
                          disabled={saving}
                          className="mt-1"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void onUploadImage(file);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="static-qris-instructions">Payment instructions</Label>
                        <Input
                          id="static-qris-instructions"
                          value={draft}
                          onChange={(e) => setInstructions(e.target.value)}
                          placeholder="e.g. Scan QRIS and send proof to cashier"
                        />
                        <Button type="button" size="sm" disabled={saving} onClick={() => void saveInstructions()}>
                          Save instructions
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
