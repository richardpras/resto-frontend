import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";

export default function SystemSettings() {
  const { system, updateSystem } = useSettingsStore();

  const Row = ({ k, label, desc }: { k: keyof typeof system; label: string; desc: string }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="space-y-1">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={system[k]} onCheckedChange={(v) => { updateSystem({ [k]: v } as never); toast.success(`${label} ${v ? "enabled" : "disabled"}`); }} />
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle>System Preferences</CardTitle></CardHeader>
      <CardContent>
        <Row k="enableSplitBill" label="Split Bill" desc="Allow splitting a single order across multiple payments." />
        <Row k="enableMultiPayment" label="Multi Payment" desc="Combine multiple payment methods on a single order." />
        <Row k="confirmBeforePayment" label="Order Confirmation Before Payment" desc="Require staff confirmation before opening payment screen." />
        <Row k="enableQROrdering" label="QR Ordering" desc="Allow customers to scan and order from their device." />
      </CardContent>
    </Card>
  );
}
