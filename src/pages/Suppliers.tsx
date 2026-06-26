import { useEffect, useState } from "react";
import { Plus, Pencil, Power, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { dialogScroll, dialogSize } from "@/lib/ui/dialogSizes";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/DataTable";
import { useSupplierStore, type Supplier, type SupplierStatus } from "@/stores/supplierStore";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";
import { useErpTranslation } from "@/i18n/useErpTranslation";

export default function Suppliers() {
  const { t } = useErpTranslation();
  const { suppliers, loading, fetchSuppliers, addSupplier, updateSupplier, toggleStatus } = useSupplierStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | SupplierStatus>("all");
  const emptyForm = () => ({
    name: "",
    contact: "",
    email: "",
    address: "",
    notes: "",
    status: "active" as SupplierStatus,
    paymentTermDays: "" as string,
    leadTimeDays: "" as string,
    taxNumber: "",
    taxName: "",
    taxAddress: "",
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
  });
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSuppliers().catch((e) =>
      toast.error(e instanceof ApiHttpError ? e.message : t("suppliers.loadFailed")),
    );
  }, [fetchSuppliers, t]);

  const filtered = statusFilter === "all" ? suppliers : suppliers.filter((s) => s.status === statusFilter);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      contact: s.contact,
      email: s.email,
      address: s.address,
      notes: s.notes ?? "",
      status: s.status,
      paymentTermDays: s.paymentTermDays != null ? String(s.paymentTermDays) : "",
      leadTimeDays: s.leadTimeDays != null ? String(s.leadTimeDays) : "",
      taxNumber: s.taxNumber ?? "",
      taxName: s.taxName ?? "",
      taxAddress: s.taxAddress ?? "",
      contactPerson: s.contactPerson ?? "",
      contactPhone: s.contactPhone ?? "",
      contactEmail: s.contactEmail ?? "",
    });
    setOpen(true);
  };

  const parseOptionalInt = (value: string): number | null | undefined => {
    if (!value.trim()) return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };
  const handleSave = async () => {
    if (!form.name.trim()) return toast.error(t("suppliers.nameRequired"));
    const paymentTermDays = parseOptionalInt(form.paymentTermDays);
    const leadTimeDays = parseOptionalInt(form.leadTimeDays);
    if (form.paymentTermDays.trim() && paymentTermDays === undefined) return toast.error(t("suppliers.paymentTermsInvalid"));
    if (form.leadTimeDays.trim() && leadTimeDays === undefined) return toast.error(t("suppliers.leadTimeInvalid"));

    const extended = {
      paymentTermDays: paymentTermDays ?? null,
      leadTimeDays: leadTimeDays ?? null,
      taxNumber: form.taxNumber.trim() || null,
      taxName: form.taxName.trim() || null,
      taxAddress: form.taxAddress.trim() || null,
      contactPerson: form.contactPerson.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
    };

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
          ...extended,
        });
        toast.success(t("suppliers.updated"));
      } else {
        await addSupplier({
          name: form.name,
          contact: form.contact,
          email: form.email,
          address: form.address,
          notes: form.notes || undefined,
          status: form.status,
          ...extended,
        });
        toast.success(t("suppliers.added"));
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : t("common:common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Supplier>[] = [
    { key: "name", header: t("suppliers.columns.name"), sortable: true,
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div><p className="font-medium text-foreground">{r.name}</p><p className="text-xs text-muted-foreground">{r.email}</p></div>
        </div>
      ) },
    { key: "contact", header: t("suppliers.columns.contact"), sortable: true,
      render: (r) => (
        <div>
          <p className="text-sm">{r.contactPerson || r.contact || "—"}</p>
          {(r.contactPhone || r.contactEmail) && (
            <p className="text-xs text-muted-foreground">{[r.contactPhone, r.contactEmail].filter(Boolean).join(" · ")}</p>
          )}
        </div>
      ) },
    { key: "leadTimeDays", header: t("suppliers.columns.leadTime"), sortable: true,
      render: (r) => (r.leadTimeDays != null ? t("suppliers.leadTimeDays", { days: r.leadTimeDays }) : "—") },
    { key: "address", header: t("suppliers.columns.address"), className: "max-w-[280px] truncate" },
    { key: "status", header: t("suppliers.columns.status"), sortable: true,
      render: (r) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          r.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
        }`}>{r.status === "active" ? t("common:common.active") : t("common:common.inactive")}</span>
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
                .then(() => toast.success(t("suppliers.statusUpdated")))
                .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : t("suppliers.updateFailed")));
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
          <h1 className="text-2xl font-bold text-foreground">{t("suppliers.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("suppliers.pageSubtitle")}</p>
        </div>
      </div>

      <DataTable
        data={filtered} columns={columns} rowKey={(r) => r.id}
        loading={loading}
        searchPlaceholder={t("suppliers.searchPlaceholder")}
        searchKeys={["name", "contact", "email", "address"]}
        emptyMessage={t("suppliers.empty")}
        emptyAction={{ label: t("suppliers.addSupplier"), onClick: openNew }}
        filterToolbar={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | SupplierStatus)}>
            <SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("suppliers.allStatus")}</SelectItem>
              <SelectItem value="active">{t("common:common.active")}</SelectItem>
              <SelectItem value="inactive">{t("common:common.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        }
        rightToolbar={
          <Button onClick={openNew} className="rounded-xl"><Plus className="h-4 w-4 mr-1" /> {t("suppliers.addSupplier")}</Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`${dialogSize.lg} ${dialogScroll} rounded-2xl`}>
          <DialogHeader><DialogTitle>{editing ? t("suppliers.editSupplier") : t("suppliers.newSupplier")}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>{t("common:common.name")} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("suppliers.paymentTermsDays")}</Label><Input type="number" min={0} value={form.paymentTermDays} onChange={(e) => setForm({ ...form, paymentTermDays: e.target.value })} placeholder={t("suppliers.paymentTermsPlaceholder")} /></div>
              <div><Label>{t("suppliers.leadTimeDaysLabel")}</Label><Input type="number" min={0} value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} placeholder={t("suppliers.leadTimePlaceholder")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("suppliers.phone")}</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
              <div><Label>{t("suppliers.email")}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>{t("suppliers.address")}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <p className="text-xs font-medium text-muted-foreground pt-1">{t("suppliers.taxInfo")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("suppliers.taxNumber")}</Label><Input value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} /></div>
              <div><Label>{t("suppliers.taxName")}</Label><Input value={form.taxName} onChange={(e) => setForm({ ...form, taxName: e.target.value })} /></div>
            </div>
            <div><Label>{t("suppliers.taxAddress")}</Label><Textarea value={form.taxAddress} onChange={(e) => setForm({ ...form, taxAddress: e.target.value })} rows={2} /></div>
            <p className="text-xs font-medium text-muted-foreground pt-1">{t("suppliers.primaryContact")}</p>
            <div><Label>{t("suppliers.contactPerson")}</Label><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("suppliers.contactPhone")}</Label><Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
              <div><Label>{t("suppliers.contactEmail")}</Label><Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
            </div>
            <div><Label>{t("suppliers.notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div><Label>{t("common:common.status")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SupplierStatus })}>
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
              {saving ? t("common:common.saving") : editing ? t("suppliers.saveChanges") : t("suppliers.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
