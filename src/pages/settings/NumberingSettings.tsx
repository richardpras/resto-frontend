import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSettingsStore, persistOutletPrefixesFromStore } from "@/stores/settingsStore";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { patchNumberingSettings } from "@/lib/api-integration/settingsDomainEndpoints";

export default function NumberingSettings() {
  const numbering = useSettingsStore((s) => s.numbering);
  const updateNumbering = useSettingsStore((s) => s.updateNumbering);
  const outlets = useSettingsStore((s) => s.outlets);
  const upsertOutlet = useSettingsStore((s) => s.upsertOutlet);
  const [form, setForm] = useState(numbering);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(numbering);
  }, [numbering]);

  const save = async () => {
    updateNumbering(form);
    if (!getApiAccessToken()) {
      toast.success("Numbering format saved locally");
      return;
    }
    setSaving(true);
    try {
      const saved = await patchNumberingSettings(form);
      updateNumbering(saved);
      setForm(saved);
      await persistOutletPrefixesFromStore();
      toast.success("Numbering format saved");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>Global Numbering Format</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Invoice Format</Label>
            <Input value={form.invoiceFormat} onChange={(e) => setForm({ ...form, invoiceFormat: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Order Format</Label>
            <Input value={form.orderFormat} onChange={(e) => setForm({ ...form, orderFormat: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">Tokens: <code>{"{YYYY}"}</code>, <code>{"{MM}"}</code>, <code>{"{DD}"}</code>, <code>{"{0000}"}</code> running counter.</p>
          <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Per-Outlet Prefixes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {outlets.map((o) => (
            <div key={o.id} className="space-y-2 pb-4 border-b last:border-0 last:pb-0">
              <p className="font-medium text-sm">{o.name}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Invoice Prefix</Label>
                  <Input value={o.invoicePrefix || ""} onChange={(e) => upsertOutlet({ ...o, invoicePrefix: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Order Prefix</Label>
                  <Input value={o.orderPrefix || ""} onChange={(e) => upsertOutlet({ ...o, orderPrefix: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
