import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function IntegrationSettings() {
  const { integration, updateIntegration } = useSettingsStore();
  const [form, setForm] = useState(integration);
  const [show, setShow] = useState(false);

  const save = () => {
    if (!confirm("Update sensitive integration settings?")) return;
    updateIntegration(form);
    toast.success("Integrations saved");
  };

  return (
    <Card>
      <CardHeader><CardTitle>Integrations</CardTitle></CardHeader>
      <CardContent className="space-y-4 max-w-2xl">
        <div className="space-y-2">
          <Label>Payment Gateway API Key</Label>
          <div className="flex gap-2">
            <Input type={show ? "text" : "password"} value={form.paymentGatewayKey} onChange={(e) => setForm({ ...form, paymentGatewayKey: e.target.value })} placeholder="sk_live_..." />
            <Button variant="outline" size="icon" onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
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
          <Button variant="outline" onClick={() => setForm(integration)}>Reset</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}
