import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PurchaseItemTable, PurchaseLineItem } from "@/components/PurchaseItemTable";
import { usePurchaseStore, PRStatus } from "@/stores/purchaseStore";
import { useSupplierStore } from "@/stores/supplierStore";
import { useOutletStore } from "@/stores/outletStore";
import { Plus, FileText, Send, ArrowRight, Search, Check, X, Ban, Eye } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<PRStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-info/15 text-info border-info/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  converted: "bg-primary/15 text-primary border-primary/30",
  cancelled: "bg-muted text-muted-foreground line-through",
};

const STATUS_TABS: Array<"all" | PRStatus> = ["all", "draft", "submitted", "approved", "converted", "rejected"];

export default function PurchaseRequests() {
  const navigate = useNavigate();
  const {
    purchaseRequests,
    addPR,
    updatePR,
    submitPR,
    approvePR,
    rejectPR,
    cancelPR,
    convertPRToPO,
    fetchPurchaseRequests,
  } = usePurchaseStore();
  const { suppliers, fetchSuppliers } = useSupplierStore();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);

  useEffect(() => {
    void Promise.all([fetchPurchaseRequests(), fetchSuppliers()]);
  }, [fetchPurchaseRequests, fetchSuppliers]);

  const [formOpen, setFormOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | PRStatus>("all");

  const [requestedBy, setRequestedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseLineItem[]>([]);

  const [convertId, setConvertId] = useState<string | null>(null);
  const [convertSupplierId, setConvertSupplierId] = useState("");

  const resetForm = () => {
    setEditId(null);
    setRequestedBy("");
    setNotes("");
    setItems([]);
  };

  const openNew = () => {
    if (!activeOutletId || activeOutletId < 1) {
      toast.error("Select an active outlet first");
      return;
    }
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (prId: string) => {
    const pr = purchaseRequests.find((p) => p.id === prId);
    if (!pr || pr.status !== "draft") return;
    setEditId(prId);
    setRequestedBy(pr.requestedBy);
    setNotes(pr.notes ?? "");
    setItems(pr.items.map((i) => ({
      inventoryItemId: i.inventoryItemId,
      qty: i.qty,
      unit: i.unit,
      price: i.estimatedCost ?? 0,
      notes: i.notes,
    })));
    setFormOpen(true);
  };

  const openView = (prId: string) => setViewId(prId);

  const mapItems = () =>
    items.map((i) => ({
      inventoryItemId: i.inventoryItemId,
      qty: i.qty,
      unit: i.unit,
      estimatedCost: i.price > 0 ? i.price : undefined,
      notes: i.notes,
    }));

  const handleSaveDraft = async () => {
    if (!requestedBy.trim()) { toast.error("Requester is required"); return; }
    if (items.length === 0 || items.some((i) => !i.inventoryItemId)) {
      toast.error("Add at least one valid item");
      return;
    }
    const prItems = mapItems();
    if (editId) {
      await updatePR(editId, { requestedBy, notes, items: prItems });
      toast.success("PR updated");
    } else {
      await addPR({ date: new Date().toISOString().slice(0, 10), outlet: "", requestedBy, notes, items: prItems, status: "draft" });
      toast.success("PR saved as draft");
    }
    setFormOpen(false);
    resetForm();
  };

  const handleSubmitNew = async () => {
    if (!requestedBy.trim()) { toast.error("Requester is required"); return; }
    if (items.length === 0 || items.some((i) => !i.inventoryItemId)) {
      toast.error("Add at least one valid item");
      return;
    }
    const payload = { date: new Date().toISOString().slice(0, 10), outlet: "", requestedBy, notes, items: mapItems(), status: "draft" as const };
    const id = editId ?? await addPR(payload);
    if (editId) {
      await updatePR(editId, { requestedBy, notes, items: mapItems() });
    }
    await submitPR(id);
    toast.success("PR submitted");
    setFormOpen(false);
    resetForm();
  };

  const handleWorkflow = async (action: "submit" | "approve" | "reject" | "cancel", prId: string) => {
    try {
      if (action === "submit") await submitPR(prId);
      if (action === "approve") await approvePR(prId);
      if (action === "reject") await rejectPR(prId);
      if (action === "cancel") await cancelPR(prId);
      toast.success(`PR ${action}${action.endsWith("e") ? "d" : "ed"}`);
      setViewId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  const handleConvertToPO = async () => {
    if (!convertId || !convertSupplierId) { toast.error("Select a supplier"); return; }
    try {
      const poId = await convertPRToPO(convertId, convertSupplierId);
      toast.success("PO created from PR");
      setConvertId(null);
      setConvertSupplierId("");
      setViewId(null);
      navigate(`/purchases?tab=po&poId=${poId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    }
  };

  const filtered = useMemo(() => purchaseRequests.filter((pr) => {
    const matchesSearch =
      pr.prNumber.toLowerCase().includes(search.toLowerCase()) ||
      pr.requestedBy.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusTab === "all" || pr.status === statusTab;
    return matchesSearch && matchesStatus;
  }), [purchaseRequests, search, statusTab]);

  const viewed = viewId ? purchaseRequests.find((p) => p.id === viewId) : null;
  const isReadOnly = (status: PRStatus) => ["submitted", "approved", "rejected", "converted", "cancelled"].includes(status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Requests</h1>
          <p className="text-sm text-muted-foreground">Internal demand requests before purchase orders</p>
        </div>
        <Button onClick={openNew} className="gap-2" disabled={!activeOutletId || activeOutletId < 1}>
          <Plus className="h-4 w-4" /> New PR
        </Button>
      </div>

      {(!activeOutletId || activeOutletId < 1) && (
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-900 dark:text-amber-100">
          Select an outlet in the header to create and list purchase requests for that outlet.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={statusTab === tab ? "default" : "outline"}
            onClick={() => setStatusTab(tab)}
            className="rounded-full capitalize"
          >
            {tab === "all" ? "All" : tab}
          </Button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search PR…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>PR No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Outlet</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    No purchase requests yet
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((pr) => (
                <TableRow key={pr.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono font-semibold text-sm">{pr.prNumber}</TableCell>
                  <TableCell className="text-sm">{pr.date}</TableCell>
                  <TableCell className="text-sm">{pr.outlet}</TableCell>
                  <TableCell className="text-sm">{pr.requestedBy}</TableCell>
                  <TableCell className="text-sm">{pr.items.length}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[pr.status]}>{pr.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => openView(pr.id)}><Eye className="h-3.5 w-3.5" /></Button>
                      {pr.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => openEdit(pr.id)}>Edit</Button>
                      )}
                      {pr.status === "approved" && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setConvertId(pr.id); setConvertSupplierId(""); }}>
                          <ArrowRight className="h-3 w-3" /> Convert
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Purchase Request" : "New Purchase Request"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Requested By *</label>
              <Input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} placeholder="Name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Items</label>
              <PurchaseItemTable items={items} onChange={setItems} showNotes showPrice />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button variant="secondary" onClick={() => void handleSaveDraft()}>Save Draft</Button>
              <Button onClick={() => void handleSubmitNew()} className="gap-1">
                <Send className="h-3.5 w-3.5" /> Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewed} onOpenChange={(o) => { if (!o) setViewId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewed?.prNumber}</DialogTitle>
          </DialogHeader>
          {viewed && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline" className={statusColors[viewed.status]}>{viewed.status}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Outlet</span><span>{viewed.outlet}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Requester</span><span>{viewed.requestedBy}</span></div>
              {viewed.notes && <p className="text-muted-foreground">{viewed.notes}</p>}
              <div className="border rounded-lg divide-y">
                {viewed.items.map((item, idx) => (
                  <div key={item.id ?? idx} className="px-3 py-2 flex justify-between gap-2">
                    <span>Item #{item.inventoryItemId} · {item.qty} {item.unit}</span>
                    {item.estimatedCost != null && <span>Rp {item.estimatedCost.toLocaleString()}</span>}
                  </div>
                ))}
              </div>
              {!isReadOnly(viewed.status) && viewed.status === "draft" && (
                <div className="flex gap-2 justify-end pt-2">
                  <Button size="sm" variant="outline" onClick={() => void handleWorkflow("cancel", viewed.id)}><Ban className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
                  <Button size="sm" onClick={() => void handleWorkflow("submit", viewed.id)}><Send className="h-3.5 w-3.5 mr-1" /> Submit</Button>
                </div>
              )}
              {viewed.status === "submitted" && (
                <div className="flex gap-2 justify-end pt-2">
                  <Button size="sm" variant="outline" onClick={() => void handleWorkflow("reject", viewed.id)}><X className="h-3.5 w-3.5 mr-1" /> Reject</Button>
                  <Button size="sm" onClick={() => void handleWorkflow("approve", viewed.id)}><Check className="h-3.5 w-3.5 mr-1" /> Approve</Button>
                  <Button size="sm" variant="ghost" onClick={() => void handleWorkflow("cancel", viewed.id)}>Cancel</Button>
                </div>
              )}
              {viewed.status === "approved" && (
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={() => { setConvertId(viewed.id); setConvertSupplierId(""); setViewId(null); }}>
                    <ArrowRight className="h-3.5 w-3.5 mr-1" /> Convert to PO
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!convertId} onOpenChange={(o) => { if (!o) setConvertId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert to Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Select Supplier *</label>
              <Select value={convertSupplierId} onValueChange={setConvertSupplierId}>
                <SelectTrigger><SelectValue placeholder="Choose supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.filter((s) => s.status === "active").map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConvertId(null)}>Cancel</Button>
              <Button onClick={() => void handleConvertToPO()}>Convert to PO</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
