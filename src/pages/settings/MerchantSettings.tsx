import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { canManagePlatformSettings } from "@/domain/permissionGates";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { patchMerchantSettings } from "@/lib/api-integration/settingsDomainEndpoints";
import { applyAppLocale, normalizeAppLocale } from "@/i18n";
import { Store, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MerchantSettings() {
  const { t } = useTranslation("common");
  const { merchant, updateMerchant } = useSettingsStore();
  const authUser = useAuthStore((s) => s.user);
  const canEditMerchant = canManagePlatformSettings(authUser);
  const [form, setForm] = useState(merchant);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(merchant);
  }, [merchant]);

  const save = async () => {
    if (!canEditMerchant) return;
    if (!form.name.trim()) return toast.error(t("settings.merchant.nameRequired"));
    if (!form.email.includes("@")) return toast.error(t("settings.merchant.emailInvalid"));
    updateMerchant(form);
    applyAppLocale(normalizeAppLocale(form.language));
    if (!getApiAccessToken()) {
      toast.success(t("settings.merchant.savedLocally"));
      return;
    }
    setSaving(true);
    try {
      const saved = await patchMerchantSettings(form);
      updateMerchant(saved);
      applyAppLocale(normalizeAppLocale(saved.language));
      toast.success(t("settings.merchant.savedToServer"));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("settings.merchant.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>{t("settings.merchant.title")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{t("settings.merchant.merchantName")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canEditMerchant} /></div>
            <div className="space-y-2">
              <Label>{t("settings.merchant.businessType")}</Label>
              <Select value={form.businessType} onValueChange={(v) => setForm({ ...form, businessType: v })} disabled={!canEditMerchant}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Restaurant">Restaurant</SelectItem>
                  <SelectItem value="Cafe">Cafe</SelectItem>
                  <SelectItem value="Bar">Bar</SelectItem>
                  <SelectItem value="Bakery">Bakery</SelectItem>
                  <SelectItem value="Food Truck">Food Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>{t("settings.merchant.address")}</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={!canEditMerchant} /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{t("settings.merchant.phone")}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canEditMerchant} /></div>
            <div className="space-y-2"><Label>{t("settings.merchant.email")}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!canEditMerchant} /></div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 pt-2 border-t">
            <div className="space-y-2">
              <Label>{t("settings.merchant.currency")}</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })} disabled={!canEditMerchant}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR (Rp)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="SGD">SGD (S$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.merchant.timezone")}</Label>
              <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })} disabled={!canEditMerchant}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Jakarta">Asia/Jakarta</SelectItem>
                  <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                  <SelectItem value="Asia/Bangkok">Asia/Bangkok</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.merchant.language")}</Label>
              <Select
                value={form.language}
                onValueChange={(v) => {
                  setForm({ ...form, language: v });
                  applyAppLocale(normalizeAppLocale(v));
                }}
                disabled={!canEditMerchant}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("language.en")}</SelectItem>
                  <SelectItem value="id">{t("language.id")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {canEditMerchant ? (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setForm(merchant)} disabled={saving}>
                {t("common.reset")}
              </Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground pt-2">{t("settings.merchant.readOnlyHint")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("settings.merchant.logoTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-square rounded-2xl bg-muted/30 border-2 border-dashed flex flex-col items-center justify-center gap-2">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-medium">{form.name}</p>
            <p className="text-xs text-muted-foreground">{form.businessType}</p>
          </div>
          <Button variant="outline" className="w-full" disabled={!canEditMerchant}><Upload className="h-4 w-4 mr-2" />{t("settings.merchant.uploadLogo")}</Button>
          <p className="text-xs text-muted-foreground text-center">{t("settings.merchant.logoHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
