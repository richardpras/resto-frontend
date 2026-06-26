import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Power, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import { useOutletStore } from "@/stores/outletStore";
import { useMemberStore, type Member, type MemberStatus } from "@/stores/memberStore";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";
import { useErpTranslation } from "@/i18n/useErpTranslation";

export default function Members() {
  const { t } = useErpTranslation();
  const navigate = useNavigate();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const { members, loading, fetchMembers, addMember, updateMember, toggleStatus } = useMemberStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
  const [form, setForm] = useState({ name: "", phone: "", email: "", birthday: "", notes: "", status: "active" as MemberStatus });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchMembers({ outletId: activeOutletId ?? undefined, force: true }).catch((e) =>
      toast.error(e instanceof ApiHttpError ? e.message : t("members.loadFailed")),
    );
  }, [fetchMembers, activeOutletId, t]);

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
    if (!form.name.trim() || !form.phone.trim()) return toast.error(t("members.namePhoneRequired"));
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
        toast.success(t("members.updated"));
      } else {
        await addMember({
          outletId: activeOutletId ?? undefined,
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          birthday: form.birthday || undefined,
          notes: form.notes || undefined,
          status: form.status,
        });
        toast.success(t("members.added"));
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("common:common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Member>[] = [
    { key: "name", header: t("members.columns.name"), sortable: true,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-accent-foreground" />
          </div>
          <div><p className="font-medium text-foreground">{r.name}</p><p className="text-xs text-muted-foreground">{r.email || "—"}</p></div>
        </div>
      ) },
    { key: "phone", header: t("members.columns.phone"), sortable: true },
    { key: "memberNo", header: t("members.columns.memberNo"), sortable: true,
      render: (r) => <span className="text-sm text-muted-foreground">{r.memberNo ?? "—"}</span> },
    { key: "points", header: t("members.columns.points"), sortable: true,
      render: (r) => <span className="text-sm font-medium">{r.points}</span> },
    { key: "giftCardBalance", header: t("members.columns.giftCard"), sortable: true,
      render: (r) => <span className="text-sm">Rp {(r.giftCardBalance ?? 0).toLocaleString("id-ID")}</span> },
    { key: "status", header: t("members.columns.status"), sortable: true,
      render: (r) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          r.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
        }`}>{r.status === "active" ? t("common:common.active") : t("common:common.inactive")}</span>
      ) },
    { key: "actions", header: "", className: "w-28 text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/members/${r.id}`)}>{t("members.profile")}</Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)} className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              void toggleStatus(r.id)
                .then(() => toast.success(t("members.statusUpdated")))
                .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : t("members.updateFailed")));
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
        <h1 className="text-2xl font-bold text-foreground">{t("members.pageTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("members.pageSubtitle")}</p>
      </div>

      <DataTable
        data={filtered} columns={columns} rowKey={(r) => r.id}
        loading={loading}
        searchPlaceholder={t("members.searchPlaceholder")}
        searchKeys={["name", "phone", "email"]}
        emptyMessage={t("members.empty")}
        emptyAction={{ label: t("members.addMember"), onClick: openNew }}
        filterToolbar={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | MemberStatus)}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("members.allStatus")}</SelectItem>
              <SelectItem value="active">{t("common:common.active")}</SelectItem>
              <SelectItem value="inactive">{t("common:common.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        }
        rightToolbar={
          <Button onClick={openNew} className="rounded-xl"><Plus className="h-4 w-4 mr-1" /> {t("members.addMember")}</Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll} rounded-2xl`}>
          <DialogHeader><DialogTitle>{editing ? t("members.editMember") : t("members.newMember")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{t("common:common.name")} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("members.columns.phone")} *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>{t("suppliers.email")}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>{t("members.birthday")}</Label><Input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></div>
            <div><Label>{t("members.notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div><Label>{t("common:common.status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as MemberStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("common:common.active")}</SelectItem>
                  <SelectItem value="inactive">{t("common:common.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common:common.cancel")}</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? t("common:common.saving") : editing ? t("members.saveChanges") : t("members.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
