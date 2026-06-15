import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");
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
      toast.error(e instanceof ApiHttpError ? e.message : t("settings.integration.healthLoadFailed"));
    } finally {
      setHealthLoading(false);
    }
  }, [t]);

  useEffect(() => {
    setForm(integration);
  }, [integration]);

  useEffect(() => {
    void loadPaymentHealth();
  }, [loadPaymentHealth]);

  const save = async () => {
    if (!confirm(t("settings.integration.updateConfirm"))) return;
    updateIntegration(form);
    if (!getApiAccessToken()) {
      toast.success(t("settings.integration.savedLocally"));
      return;
    }
    setSaving(true);
    try {
      const saved = await putIntegrationSettings(form);
      updateIntegration(saved);
      setForm(saved);
      toast.success(t("settings.integration.savedToServer"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>{t("settings.integration.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-4 max-w-2xl">
        {paymentHealth ? (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-medium">{t("settings.integration.paymentHealth")}</p>
              <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings/payments/health">{t("settings.integration.fullDashboard")}</Link>
              </Button>
              <Button variant="outline" size="sm" type="button" onClick={() => void loadPaymentHealth()} disabled={healthLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${healthLoading ? "animate-spin" : ""}`} />
                {t("common.refresh")}
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
          <Label>{t("settings.integration.apiKey")}</Label>
          <div className="flex gap-2">
            <Input type={show ? "text" : "password"} value={form.paymentGatewayKey} onChange={(e) => setForm({ ...form, paymentGatewayKey: e.target.value })} placeholder={t("settings.integration.apiKeyPlaceholder")} />
            <Button variant="outline" size="icon" type="button" onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("settings.integration.webhookUrl")}</Label>
          <Input value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} placeholder={t("settings.integration.webhookPlaceholder")} />
        </div>
        <div className="space-y-2">
          <Label>{t("settings.integration.printAgent")}</Label>
          <Input value={form.printAgentUrl} onChange={(e) => setForm({ ...form, printAgentUrl: e.target.value })} placeholder="http://localhost:9100" />
          <p className="text-xs text-muted-foreground">{t("settings.integration.printAgentHint")}</p>
        </div>
        <div className="space-y-2">
          <Label>{t("settings.integration.thirdParty")}</Label>
          <Textarea value={form.thirdPartyNotes} onChange={(e) => setForm({ ...form, thirdPartyNotes: e.target.value })} placeholder={t("settings.integration.notesPlaceholder")} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={() => setForm(integration)} disabled={saving}>{t("common.reset")}</Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>{saving ? t("common.saving") : t("common.saveShort")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
