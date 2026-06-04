import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DataTable, type Column } from "@/components/DataTable";
import { ApiHttpError } from "@/lib/api-integration/client";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
  type DepartmentRow,
} from "@/lib/api-integration/organizationEndpoints";
import { useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";
import { toast } from "sonner";

export default function Departments() {
  const { user } = useAuthStore();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const outlets = user?.assignedOutlets ?? [];
  const [outletId, setOutletId] = useState<number | null>(activeOutletId);
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "", isActive: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      setRows(await listDepartments(outletId));
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    if (outletId === null && activeOutletId) setOutletId(activeOutletId);
    else if (outletId === null && outlets[0]) setOutletId(outlets[0].id);
  }, [activeOutletId, outletId, outlets]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ code: "", name: "", description: "", isActive: true });
    setOpen(true);
  };

  const openEdit = (row: DepartmentRow) => {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      isActive: row.isActive,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!outletId || !form.code.trim() || !form.name.trim()) {
      return toast.error("Code and name are required");
    }
    setSaving(true);
    try {
      if (editing) {
        await updateDepartment(editing.id, {
          code: form.code,
          name: form.name,
          description: form.description || undefined,
          isActive: form.isActive,
        });
        toast.success("Department updated");
      } else {
        await createDepartment({
          outletId,
          code: form.code,
          name: form.name,
          description: form.description || undefined,
          isActive: form.isActive,
        });
        toast.success("Department created");
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<DepartmentRow>[] = [
    { key: "code", header: "Code", sortable: true },
    { key: "name", header: "Name", sortable: true },
    {
      key: "isActive",
      header: "Status",
      render: (r) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              void deleteDepartment(r.id)
                .then(() => load())
                .then(() => toast.success("Deleted"))
                .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Delete failed"));
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Departments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organize teams by department per outlet.</p>
        </div>
        {outlets.length > 0 && (
          <Select value={outletId ? String(outletId) : ""} onValueChange={(v) => setOutletId(Number(v))}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder="Outlet" />
            </SelectTrigger>
            <SelectContent>
              {outlets.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        searchPlaceholder="Search department..."
        searchKeys={["code", "name", "description"]}
        emptyMessage="No departments yet"
        emptyAction={{ label: "Add department", onClick: openNew }}
        rightToolbar={
          <Button onClick={openNew} className="rounded-xl" disabled={!outletId}>
            <Plus className="h-4 w-4 mr-1" /> Add department
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit department" : "New department"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
