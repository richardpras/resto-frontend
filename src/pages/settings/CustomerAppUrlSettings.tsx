import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getCustomerAppUrlSettings,
  patchCustomerAppUrlSettings,
  type CustomerAppUrlSettings,
} from "@/lib/api-integration/customerAppUrlEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";

export default function CustomerAppUrlSettings() {
  const [settings, setSettings] = useState<CustomerAppUrlSettings | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getCustomerAppUrlSettings()
      .then((data) => {
        setSettings(data);
        setValue(data.customerAppUrl ?? "");
      })
      .catch(() => {
        toast.error("Failed to load Customer App URL.");
      });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const next = await patchCustomerAppUrlSettings(value.trim() === "" ? null : value.trim());
      setSettings(next);
      setValue(next.customerAppUrl ?? "");
      toast.success("Customer App URL saved.");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to save Customer App URL.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer App URL</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Public URL customers use to scan table QR codes (e.g. https://order.yourrestaurant.com). Table QR links no longer depend on APP_URL.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="customer-app-url">Customer App URL</Label>
          <Input
            id="customer-app-url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://order.yourrestaurant.com"
            data-testid="customer-app-url-input"
          />
        </div>
        {settings ? (
          <p className="text-xs text-muted-foreground">
            Active source: <span className="font-medium">{settings.source}</span>
            {settings.resolvedCustomerAppUrl ? ` → ${settings.resolvedCustomerAppUrl}` : ""}
          </p>
        ) : null}
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving} data-testid="customer-app-url-save">
          Save Customer App URL
        </Button>
      </CardContent>
    </Card>
  );
}
