import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";
import { ApiHttpError, getApiAccessToken } from "@/lib/api-integration/client";
import { patchOutletReceiptSetting } from "@/lib/api-integration/settingsDomainEndpoints";

export default function ReceiptSettings() {
  const { t } = useTranslation("common");
  const outletReceiptRows = useSettingsStore((s) => s.outletReceiptRows);
  const patchOutletReceiptLocal = useSettingsStore((s) => s.patchOutletReceiptLocal);

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

            <div className="bg-muted/30 rounded-2xl p-6 font-mono text-xs space-y-2 border-2 border-dashed">
              <div className="text-center">
                {o.showLogo && <div className="h-10 w-10 mx-auto mb-2 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">LOGO</div>}
                <p className="font-bold">{o.outletName}</p>
                <p className="mt-2">{o.receiptHeader}</p>
              </div>
              <div className="border-t border-dashed my-2" />
              <div className="flex justify-between"><span>Item A x1</span><span>15,000</span></div>
              <div className="flex justify-between"><span>Item B x2</span><span>30,000</span></div>
              <div className="border-t border-dashed my-2" />
              <div className="flex justify-between"><span>Subtotal</span><span>45,000</span></div>
              {o.showTaxBreakdown && <div className="flex justify-between text-muted-foreground"><span>Tax 10%</span><span>4,500</span></div>}
              <div className="flex justify-between font-bold"><span>Total</span><span>49,500</span></div>
              <div className="border-t border-dashed my-2" />
              <p className="text-center whitespace-pre-line">{o.receiptFooter}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
