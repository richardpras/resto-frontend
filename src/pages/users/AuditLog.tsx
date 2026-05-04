import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserStore } from "@/stores/userStore";

const actionColor: Record<string, string> = {
  create: "bg-primary/15 text-primary",
  update: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  deactivate: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  activate: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  delete: "bg-destructive/15 text-destructive",
};

export default function AuditLog() {
  const { logs } = useUserStore();
  return (
    <Card className="rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Target</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                No audit entries. Server-side audit API is not wired yet.
              </TableCell>
            </TableRow>
          )}
          {logs.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-sm text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</TableCell>
              <TableCell className="font-medium">{l.actor}</TableCell>
              <TableCell><Badge className={actionColor[l.action]}>{l.action}</Badge></TableCell>
              <TableCell className="capitalize">{l.entity}</TableCell>
              <TableCell>{l.targetName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
