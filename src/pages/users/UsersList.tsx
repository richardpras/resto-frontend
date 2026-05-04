import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Power } from "lucide-react";
import { useUserStore, AppUser } from "@/stores/userStore";
import { UserFormModal } from "@/components/UserFormModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function UsersList() {
  const { users, roles, outlets } = useUserStore();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [outletFilter, setOutletFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AppUser | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (roleFilter !== "all" && !u.roleIds.includes(roleFilter)) return false;
      if (outletFilter !== "all" && !u.outletIds.includes(outletFilter)) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, q, roleFilter, outletFilter, statusFilter]);

  const roleBadges = (ids: string[]) =>
    ids.length === 0 ? (
      <span className="text-muted-foreground text-sm">—</span>
    ) : (
      <div className="flex flex-wrap gap-1">
        {ids.map((id) => (
          <Badge key={id} variant="secondary">
            {roles.find((r) => r.id === id)?.name ?? id}
          </Badge>
        ))}
      </div>
    );

  const outletNames = (ids: string[]) =>
    ids.length === 0 ? (
      <span className="text-muted-foreground text-sm">No outlets (API)</span>
    ) : (
      ids.map((id) => outlets.find((o) => o.id === id)?.name).filter(Boolean).join(", ") || "—"
    );

  return (
    <div className="space-y-4">
      <Card className="p-4 rounded-2xl">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={outletFilter} onValueChange={setOutletFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              {outlets.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Add User
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Outlets</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No users found</TableCell></TableRow>
            )}
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>{roleBadges(u.roleIds)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{outletNames(u.outletIds)}</TableCell>
                <TableCell>
                  <Badge className={u.status === "active" ? "bg-primary/15 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground"}>
                    {u.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(u); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeactivateTarget(u)}>
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <UserFormModal open={open} onOpenChange={setOpen} editing={editing} />

      <AlertDialog open={!!deactivateTarget} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change user status?</AlertDialogTitle>
            <AlertDialogDescription>
              User active/inactive status is not stored by the API yet. Use your identity provider or a future API update.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast.info("User status changes require API support.");
                setDeactivateTarget(null);
              }}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
