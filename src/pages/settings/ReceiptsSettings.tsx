import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";

export default function ReceiptSettings() {
  const { outlets, upsertOutlet } = useSettingsStore();

  return (
    <div className="space-y-6">
      {outlets.map((o) => (
        <Card key={o.id}>
          <CardHeader><CardTitle className="text-base">{o.name}</CardTitle></CardHeader>
          <CardContent className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Header Text</Label>
                <Input value={o.receiptHeader || ""} onChange={(e) => upsertOutlet({ ...o, receiptHeader: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Footer Text</Label>
                <Textarea value={o.receiptFooter || ""} onChange={(e) => upsertOutlet({ ...o, receiptFooter: e.target.value })} />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div><Label className="text-sm">Show Logo</Label><p className="text-xs text-muted-foreground">Print outlet logo at the top</p></div>
                <Switch checked={o.showLogo ?? false} onCheckedChange={(v) => upsertOutlet({ ...o, showLogo: v })} />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div><Label className="text-sm">Show Tax Breakdown</Label><p className="text-xs text-muted-foreground">List taxes separately on receipt</p></div>
                <Switch checked={o.showTaxBreakdown ?? false} onCheckedChange={(v) => upsertOutlet({ ...o, showTaxBreakdown: v })} />
              </div>
              <Button onClick={() => toast.success(`${o.name} receipt saved`)}>Save</Button>
            </div>

            <div className="bg-muted/30 rounded-2xl p-6 font-mono text-xs space-y-2 border-2 border-dashed">
              <div className="text-center">
                {o.showLogo && <div className="h-10 w-10 mx-auto mb-2 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">LOGO</div>}
                <p className="font-bold">{o.name}</p>
                <p className="text-muted-foreground text-[10px]">{o.address}</p>
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
