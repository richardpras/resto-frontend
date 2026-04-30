import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PurchaseItemTable, PurchaseLineItem } from "@/components/PurchaseItemTable";
import { usePurchaseStore, PRStatus } from "@/stores/purchaseStore";
import { Plus, FileText, Send, ArrowRight, Search } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<PRStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-info/15 text-info border-info/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function PurchaseRequests() {
  const { purchaseRequests, addPR, updatePR, suppliers, createPOFromPR } = usePurchaseStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [outlet, setOutlet] = useState("Main Outlet");
  const [requestedBy, setRequestedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseLineItem[]>([]);

  // convert PO dialog
  const [convertId, setConvertId] = useState<string | null>(null);
  const [convertSupplierId, setConvertSupplierId] = useState("");

  const resetForm = () => {
    setEditId(null);
    setDate(new Date().toISOString().slice(0, 10));
    setOutlet("Main Outlet");
    setRequestedBy("");
    setNotes("");
    setItems([]);
  };

  const openNew = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (prId: string) => {
    const pr = purchaseRequests.find((p) => p.id === prId);
    if (!pr) return;
    setEditId(prId);
    setDate(pr.date);
    setOutlet(pr.outlet);
    setRequestedBy(pr.requestedBy);
    setNotes(pr.notes ?? "");
    setItems(pr.items.map((i) => ({ ...i, price: 0 })));
    setFormOpen(true);
  };

  const handleSave = (status: PRStatus) => {
    if (!requestedBy.trim()) { toast.error("Requested by is required"); return; }
    if (items.length === 0 || items.some((i) => !i.inventoryItemId)) {
      toast.error("Add at least one valid item");
      return;
    }
    const prItems = items.map((i) => ({ inventoryItemId: i.inventoryItemId, qty: i.qty, unit: i.unit, notes: i.notes }));
    if (editId) {
      updatePR(editId, { date, outlet, requestedBy, notes, items: prItems, status });
      toast.success("PR updated");
    } else {
      addPR({ date, outlet, requestedBy, notes, items: prItems, status });
      toast.success(status === "draft" ? "PR saved as draft" : "PR submitted");
    }
    setFormOpen(false);
    resetForm();
  };

  const handleConvertToPO = () => {
    if (!convertId || !convertSupplierId) { toast.error("Select a supplier"); return; }
    createPOFromPR(convertId, convertSupplierId);
    updatePR(convertId, { status: "approved" });
    toast.success("PO created from PR");
    setConvertId(null);
    setConvertSupplierId("");
  };

  const filtered = purchaseRequests.filter(
    (pr) => pr.prNumber.toLowerCase().includes(search.toLowerCase()) || pr.requestedBy.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Requests</h1>
          <p className="text-sm text-muted-foreground">Create and manage purchase requisitions</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> New PR
        </Button>
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
                <TableHead>PR Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Outlet</TableHead>
                <TableHead>Requested By</TableHead>
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
                <TableRow key={pr.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openEdit(pr.id)}>
                  <TableCell className="font-mono font-semibold text-sm">{pr.prNumber}</TableCell>
                  <TableCell className="text-sm">{pr.date}</TableCell>
                  <TableCell className="text-sm">{pr.outlet}</TableCell>
                  <TableCell className="text-sm">{pr.requestedBy}</TableCell>
                  <TableCell className="text-sm">{pr.items.length} items</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[pr.status]}>{pr.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {pr.status === "submitted" && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setConvertId(pr.id); setConvertSupplierId(""); }}>
                        <ArrowRight className="h-3 w-3" /> Create PO
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Purchase Request" : "New Purchase Request"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Outlet</label>
                <Input value={outlet} onChange={(e) => setOutlet(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Requested By *</label>
                <Input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} placeholder="Name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Items</label>
              <PurchaseItemTable items={items} onChange={setItems} showNotes />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button variant="secondary" onClick={() => handleSave("draft")}>Save Draft</Button>
              <Button onClick={() => handleSave("submitted")} className="gap-1">
                <Send className="h-3.5 w-3.5" /> Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert to PO dialog */}
      <Dialog open={!!convertId} onOpenChange={(o) => { if (!o) setConvertId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create PO from PR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Select Supplier</label>
              <Select value={convertSupplierId} onValueChange={setConvertSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConvertId(null)}>Cancel</Button>
              <Button onClick={handleConvertToPO}>Create PO</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
