import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { patchOutletReceiptSetting } from "@/lib/api-integration/settingsDomainEndpoints";
import { ReceiptThermalPreview } from "@/components/receipts/ReceiptThermalPreview";
import { resolveReceiptPreviewWidthCh } from "@/domain/receiptPreviewUtils";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function ReceiptSettings() {
  const { t } = useTranslation("common");
  const outletReceiptRows = useSettingsStore((s) => s.outletReceiptRows);
  const patchOutletReceiptLocal = useSettingsStore((s) => s.patchOutletReceiptLocal);
  const printers = useSettingsStore((s) => s.printers);

  const saveOne = async (row: (typeof outletReceiptRows)[number]) => {
    if (!getApiAccessToken()) {
      toast.success(t("settings.receipt.savedLocally", { outletName: row.outletName }));
      return;
    }
    try {
      const saved = await patchOutletReceiptSetting(row.outletId, {
        receiptHeader: row.receiptHeader,
        receiptFooter: row.receiptFooter,
        showLogo: row.showLogo,
        showTaxBreakdown: row.showTaxBreakdown,
      });
      patchOutletReceiptLocal(row.outletId, saved);
      toast.success(t("settings.receipt.saved", { outletName: row.outletName }));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("common.saveFailed"));
    }
  };

  return (
    <div className="space-y-6">
      {outletReceiptRows.map((o) => (
        <Card key={o.outletId}>
          <CardHeader><CardTitle className="text-base">{o.outletName}</CardTitle></CardHeader>
          <CardContent className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("settings.receipt.header")}</Label>
                <Input
                  value={o.receiptHeader}
                  onChange={(e) => patchOutletReceiptLocal(o.outletId, { receiptHeader: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("settings.receipt.footer")}</Label>
                <Textarea
                  value={o.receiptFooter}
                  onChange={(e) => patchOutletReceiptLocal(o.outletId, { receiptFooter: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div><Label className="text-sm">{t("settings.receipt.showLogo")}</Label><p className="text-xs text-muted-foreground">{t("settings.receipt.showLogoDesc")}</p></div>
                <Switch
                  checked={o.showLogo}
                  onCheckedChange={(v) => patchOutletReceiptLocal(o.outletId, { showLogo: v })}
                />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div><Label className="text-sm">{t("settings.receipt.showTax")}</Label><p className="text-xs text-muted-foreground">{t("settings.receipt.showTaxDesc")}</p></div>
                <Switch
                  checked={o.showTaxBreakdown}
                  onCheckedChange={(v) => patchOutletReceiptLocal(o.outletId, { showTaxBreakdown: v })}
                />
              </div>
              <Button type="button" onClick={() => void saveOne(o)}>{t("common.saveShort")}</Button>
            </div>

            <ReceiptThermalPreview
              outletName={o.outletName}
              header={o.receiptHeader}
              footer={o.receiptFooter}
              showLogo={o.showLogo}
              logoUrl={o.logoUrl}
              showTaxBreakdown={o.showTaxBreakdown}
              widthCh={resolveReceiptPreviewWidthCh(o.outletId, printers)}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
