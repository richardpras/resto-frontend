import { Card } from "@/components/ui/card";

/** Backend does not expose user-management audit trail via API yet. */
export default function AuditLog() {
  return (
    <Card className="rounded-2xl p-10 text-center text-muted-foreground">
      <p className="text-sm">Audit activity is not available through the API yet.</p>
      <p className="text-xs mt-2">Security-sensitive changes should be reviewed on the server when logging is added.</p>
    </Card>
  );
}
