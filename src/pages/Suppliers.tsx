import { useEffect, useState } from "react";
import { Plus, Pencil, Power, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import { useSupplierStore, type Supplier, type SupplierStatus } from "@/stores/supplierStore";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";

export default function Suppliers() {
  const { suppliers, loading, fetchSuppliers, addSupplier, updateSupplier, toggleStatus } = useSupplierStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | SupplierStatus>("all");
  const [form, setForm] = useState({ name: "", contact: "", email: "", address: "", notes: "", status: "active" as SupplierStatus });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSuppliers().catch((e) =>
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load suppliers"),
    );
  }, [fetchSuppliers]);

  const filtered = statusFilter === "all" ? suppliers : suppliers.filter((s) => s.status === statusFilter);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", contact: "", email: "", address: "", notes: "", status: "active" });
    setOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, contact: s.contact, email: s.email, address: s.address, notes: s.notes ?? "", status: s.status });
    setOpen(true);
  };
  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      if (editing) {
        await updateSupplier(editing.id, {
          name: form.name,
          contact: form.contact,
          email: form.email,
          address: form.address,
          notes: form.notes || undefined,
          status: form.status,
        });
        toast.success("Supplier updated");
      } else {
        await addSupplier({
          name: form.name,
          contact: form.contact,
          email: form.email,
          address: form.address,
          notes: form.notes || undefined,
          status: form.status,
        });
        toast.success("Supplier added");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Supplier>[] = [
    { key: "name", header: "Name", sortable: true,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div><p className="font-medium text-foreground">{r.name}</p><p className="text-xs text-muted-foreground">{r.email}</p></div>
        </div>
      ) },
    { key: "contact", header: "Contact", sortable: true },
    { key: "address", header: "Address", className: "max-w-[280px] truncate" },
    { key: "status", header: "Status", sortable: true,
      render: (r) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          r.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
        }`}>{r.status}</span>
      ) },
    { key: "actions", header: "", className: "w-28 text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              void toggleStatus(r.id)
                .then(() => toast.success("Status updated"))
                .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Update failed"));
            }}
            className="h-8 w-8"
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ) },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage vendors used across purchase requests, orders and invoices.</p>
        </div>
      </div>

      <DataTable
        data={filtered} columns={columns} rowKey={(r) => r.id}
        loading={loading}
        searchPlaceholder="Search supplier..."
        searchKeys={["name", "contact", "email", "address"]}
        emptyMessage="No suppliers yet"
        emptyAction={{ label: "Add supplier", onClick: openNew }}
        filterToolbar={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | SupplierStatus)}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        }
        rightToolbar={
          <Button onClick={openNew} className="rounded-xl"><Plus className="h-4 w-4 mr-1" /> Add supplier</Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit supplier" : "New supplier"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SupplierStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
