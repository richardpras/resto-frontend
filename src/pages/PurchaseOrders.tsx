import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PurchaseItemTable, PurchaseLineItem } from "@/components/PurchaseItemTable";
import { usePurchaseStore, POStatus } from "@/stores/purchaseStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { Plus, FileText, Send, Search, Package } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<POStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-info/15 text-info border-info/30",
  partial: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-success/15 text-success border-success/30",
};

export default function PurchaseOrders() {
  const { purchaseOrders, addPO, updatePO, suppliers } = usePurchaseStore();
  const { ingredients } = useInventoryStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [referencePR, setReferencePR] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseLineItem[]>([]);

  const resetForm = () => {
    setEditId(null);
    setSupplierId("");
    setDate(new Date().toISOString().slice(0, 10));
    setReferencePR("");
    setNotes("");
    setItems([]);
  };

  const openNew = () => { resetForm(); setFormOpen(true); };

  const openEdit = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;
    setEditId(poId);
    setSupplierId(po.supplierId);
    setDate(po.date);
    setReferencePR(po.referencePR ?? "");
    setNotes(po.notes ?? "");
    setItems(po.items.map((i) => ({ inventoryItemId: i.inventoryItemId, qty: i.qty, unit: i.unit, price: i.price })));
    setFormOpen(true);
  };

  const handleSave = (status: POStatus) => {
    if (!supplierId) { toast.error("Select a supplier"); return; }
    if (items.length === 0 || items.some((i) => !i.inventoryItemId)) { toast.error("Add valid items"); return; }
    const poItems = items.map((i) => ({ inventoryItemId: i.inventoryItemId, qty: i.qty, unit: i.unit, price: i.price, receivedQty: 0 }));
    if (editId) {
      updatePO(editId, { supplierId, date, referencePR: referencePR || undefined, notes, items: poItems, status });
      toast.success("PO updated");
    } else {
      addPO({ supplierId, date, referencePR: referencePR || undefined, notes, items: poItems, status });
      toast.success(status === "draft" ? "PO saved as draft" : "PO sent");
    }
    setFormOpen(false);
    resetForm();
  };

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";
  const getTotal = (po: typeof purchaseOrders[0]) => po.items.reduce((s, i) => s + i.qty * i.price, 0);

  const filtered = purchaseOrders.filter(
    (po) => po.poNumber.toLowerCase().includes(search.toLowerCase()) || getSupplierName(po.supplierId).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Manage orders to suppliers</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New PO</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search PO…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />No purchase orders yet
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((po) => (
                <TableRow key={po.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openEdit(po.id)}>
                  <TableCell className="font-mono font-semibold text-sm">{po.poNumber}</TableCell>
                  <TableCell className="text-sm">{getSupplierName(po.supplierId)}</TableCell>
                  <TableCell className="text-sm">{po.date}</TableCell>
                  <TableCell className="text-sm">{po.items.length} items</TableCell>
                  <TableCell className="text-sm font-medium">Rp {getTotal(po).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[po.status]}>{po.status}</Badge>
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
            <DialogTitle>{editId ? "Edit Purchase Order" : "New Purchase Order"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Supplier *</label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reference PR</label>
                <Input value={referencePR} onChange={(e) => setReferencePR(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Items</label>
              <PurchaseItemTable items={items} onChange={setItems} showPrice />
            </div>
            {items.length > 0 && (
              <div className="text-right text-sm font-semibold text-foreground">
                Total: Rp {items.reduce((s, i) => s + i.qty * i.price, 0).toLocaleString()}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button variant="secondary" onClick={() => handleSave("draft")}>Save Draft</Button>
              <Button onClick={() => handleSave("sent")} className="gap-1"><Send className="h-3.5 w-3.5" /> Send</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
