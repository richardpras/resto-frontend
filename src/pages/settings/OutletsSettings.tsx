import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useSettingsStore, Outlet } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const empty: Outlet = {
  id: 0,
  code: "",
  name: "",
  address: "",
  phone: "",
  manager: "",
  status: "active",
};

export default function OutletsSettings() {
  const outlets = useSettingsStore((s) => s.outlets);
  const outletsSubmitting = useSettingsStore((s) => s.outletsSubmitting);
  const saveOutlet = useSettingsStore((s) => s.saveOutlet);
  const deleteOutletById = useSettingsStore((s) => s.deleteOutletById);
  const canManageOutletSettings = useAuthStore((s) => s.canManageOutletSettings);
  const canCreateOutlet = canManageOutletSettings();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Outlet>(empty);

  const openNew = () => {
    setForm({ ...empty });
    setOpen(true);
  };
  const openEdit = (o: Outlet) => {
    setForm(o);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Outlet name required");
    try {
      await saveOutlet(form);
      toast.success("Outlet saved");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm("Delete outlet?")) return;
    try {
      await deleteOutletById(id);
      toast.success("Outlet deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Outlets</h2>
          {canCreateOutlet && (
            <Button type="button" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Outlet
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outlets.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="text-muted-foreground font-mono text-xs">{o.id}</TableCell>
                <TableCell className="font-mono text-xs">{o.code}</TableCell>
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell className="text-muted-foreground">{o.address}</TableCell>
                <TableCell>{o.phone}</TableCell>
                <TableCell>{o.manager}</TableCell>
                <TableCell>
                  <Badge variant={o.status === "active" ? "default" : "secondary"}>{o.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {canManageOutletSettings(o.id) && (
                      <>
                        <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(o)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => void onDelete(o.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id > 0 && outlets.some((o) => o.id === form.id) ? "Edit" : "New"} Outlet</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Leave <strong>Code</strong> empty to auto-generate (<code>OUT-{"{id}"}</code>) after save.
              </p>
              <div className="space-y-2">
                <Label>Code (optional)</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. o-main"
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Manager</Label>
                  <Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: "active" | "inactive") => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={outletsSubmitting}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void save()} disabled={outletsSubmitting}>
                {outletsSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
