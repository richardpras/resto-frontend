import { useEffect, useState } from "react";
import { Plus, Pencil, Power, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import { useMemberStore, type Member, type MemberStatus } from "@/stores/memberStore";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";

export default function Members() {
  const { members, loading, fetchMembers, addMember, updateMember, toggleStatus } = useMemberStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
  const [form, setForm] = useState({ name: "", phone: "", email: "", birthday: "", notes: "", status: "active" as MemberStatus });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchMembers().catch((e) =>
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load members"),
    );
  }, [fetchMembers]);

  const filtered = statusFilter === "all" ? members : members.filter((m) => m.status === statusFilter);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", birthday: "", notes: "", status: "active" });
    setOpen(true);
  };
  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({ name: m.name, phone: m.phone, email: m.email ?? "", birthday: m.birthday ?? "", notes: m.notes ?? "", status: m.status });
    setOpen(true);
  };
  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Name and phone are required");
    setSaving(true);
    try {
      if (editing) {
        await updateMember(editing.id, {
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          birthday: form.birthday || undefined,
          notes: form.notes || undefined,
          status: form.status,
        });
        toast.success("Member updated");
      } else {
        await addMember({
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          birthday: form.birthday || undefined,
          notes: form.notes || undefined,
          status: form.status,
        });
        toast.success("Member added");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Member>[] = [
    { key: "name", header: "Name", sortable: true,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-accent-foreground" />
          </div>
          <div><p className="font-medium text-foreground">{r.name}</p><p className="text-xs text-muted-foreground">{r.email || "—"}</p></div>
        </div>
      ) },
    { key: "phone", header: "Phone", sortable: true },
    { key: "points", header: "Points", sortable: true,
      render: (r) => <span className="font-semibold text-primary">{r.points.toLocaleString()}</span> },
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Members</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Loyalty members usable at checkout for points & promo eligibility.</p>
      </div>

      <DataTable
        data={filtered} columns={columns} rowKey={(r) => r.id}
        loading={loading}
        searchPlaceholder="Search by name or phone..."
        searchKeys={["name", "phone", "email"]}
        emptyMessage="No members yet"
        emptyAction={{ label: "Add member", onClick: openNew }}
        filterToolbar={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | MemberStatus)}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        }
        rightToolbar={
          <Button onClick={openNew} className="rounded-xl"><Plus className="h-4 w-4 mr-1" /> Add member</Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit member" : "New member"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>Birthday</Label><Input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as MemberStatus })}>
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
