import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { putIntegrationSettings } from "@/lib/api-integration/settingsDomainEndpoints";
import { getPaymentHealth, type PaymentHealthReport } from "@/lib/api-integration/paymentEndpoints";

export default function IntegrationSettings() {
  const { integration, updateIntegration } = useSettingsStore();
  const [form, setForm] = useState(integration);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentHealth, setPaymentHealth] = useState<PaymentHealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const loadPaymentHealth = useCallback(async () => {
    if (!getApiAccessToken()) return;
    setHealthLoading(true);
    try {
      setPaymentHealth(await getPaymentHealth());
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load payment health");
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    setForm(integration);
  }, [integration]);

  useEffect(() => {
    void loadPaymentHealth();
  }, [loadPaymentHealth]);

  const save = async () => {
    if (!confirm("Update sensitive integration settings?")) return;
    updateIntegration(form);
    if (!getApiAccessToken()) {
      toast.success("Integrations saved locally (sign in to sync)");
      return;
    }
    setSaving(true);
    try {
      const saved = await putIntegrationSettings(form);
      updateIntegration(saved);
      setForm(saved);
      toast.success("Integrations saved to server");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Integrations</CardTitle></CardHeader>
      <CardContent className="space-y-4 max-w-2xl">
        {paymentHealth ? (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-medium">Payment Gateway Health</p>
              <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings/payments/health">Full Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" type="button" onClick={() => void loadPaymentHealth()} disabled={healthLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${healthLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="capitalize">{paymentHealth.provider}</span>
              <Badge variant="outline">{paymentHealth.mode}</Badge>
              <Badge variant={paymentHealth.status === "healthy" ? "default" : paymentHealth.status === "warning" ? "secondary" : "destructive"}>
                {paymentHealth.status.toUpperCase()}
              </Badge>
            </div>
            {paymentHealth.missing.length > 0 ? (
              <div className="text-sm text-destructive">
                <p className="font-medium">Missing:</p>
                <ul className="list-disc pl-5">
                  {paymentHealth.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {paymentHealth.warnings.length > 0 ? (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Warnings:</p>
                <ul className="list-disc pl-5">
                  {paymentHealth.warnings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-2">
          <Label>Payment Gateway API Key</Label>
          <div className="flex gap-2">
            <Input type={show ? "text" : "password"} value={form.paymentGatewayKey} onChange={(e) => setForm({ ...form, paymentGatewayKey: e.target.value })} placeholder="sk_live_..." />
            <Button variant="outline" size="icon" type="button" onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <Input value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} placeholder="https://api.example.com/webhook" />
        </div>
        <div className="space-y-2">
          <Label>Print Agent URL</Label>
          <Input value={form.printAgentUrl} onChange={(e) => setForm({ ...form, printAgentUrl: e.target.value })} placeholder="http://localhost:9100" />
          <p className="text-xs text-muted-foreground">Local Print Agent endpoint for LAN/IP thermal printers.</p>
        </div>
        <div className="space-y-2">
          <Label>Third-party Notes</Label>
          <Textarea value={form.thirdPartyNotes} onChange={(e) => setForm({ ...form, thirdPartyNotes: e.target.value })} placeholder="GoFood, GrabFood, ShopeeFood configurations..." />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={() => setForm(integration)} disabled={saving}>Reset</Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
