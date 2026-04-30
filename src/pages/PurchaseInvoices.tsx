import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePurchaseStore, InvoiceStatus } from "@/stores/purchaseStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { Plus, Receipt, Search, Check } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<InvoiceStatus, string> = {
  unpaid: "bg-destructive/15 text-destructive border-destructive/30",
  paid: "bg-success/15 text-success border-success/30",
};

export default function PurchaseInvoices() {
  const { invoices, addInvoice, updateInvoice, purchaseOrders, suppliers } = usePurchaseStore();
  const { ingredients } = useInventoryStore();
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedPO, setSelectedPO] = useState("");
  const [invNumber, setInvNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [tax, setTax] = useState(0);

  const openNew = () => {
    setSelectedPO("");
    setInvNumber("");
    setDate(new Date().toISOString().slice(0, 10));
    setTax(0);
    setFormOpen(true);
  };

  const handleSave = () => {
    const po = purchaseOrders.find((p) => p.id === selectedPO);
    if (!po) { toast.error("Select a PO"); return; }
    const items = po.items.map((i) => ({ inventoryItemId: i.inventoryItemId, qty: i.qty, unit: i.unit, price: i.price }));
    addInvoice({
      supplierId: po.supplierId,
      poReference: po.poNumber,
      date,
      status: "unpaid",
      tax,
      items,
    });
    toast.success("Invoice created");
    setFormOpen(false);
  };

  const markPaid = (id: string) => {
    updateInvoice(id, { status: "paid" });
    toast.success("Invoice marked as paid");
  };

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";
  const getTotal = (inv: typeof invoices[0]) => inv.items.reduce((s, i) => s + i.qty * i.price, 0) + inv.tax;
  const getItemName = (id: string) => ingredients.find((i) => i.id === id)?.name ?? "—";

  const filtered = invoices.filter((inv) =>
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || inv.poReference.toLowerCase().includes(search.toLowerCase())
  );

  const eligiblePOs = purchaseOrders.filter((po) => po.status !== "draft");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Invoices</h1>
          <p className="text-sm text-muted-foreground">Track supplier invoices and payments</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New Invoice</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search invoice…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Invoice #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>PO Ref</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />No invoices yet
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-semibold text-sm">{inv.invoiceNumber}</TableCell>
                  <TableCell className="text-sm">{getSupplierName(inv.supplierId)}</TableCell>
                  <TableCell className="text-sm font-mono">{inv.poReference}</TableCell>
                  <TableCell className="text-sm">{inv.date}</TableCell>
                  <TableCell className="text-sm font-medium">Rp {getTotal(inv).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColors[inv.status]}>{inv.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {inv.status === "unpaid" && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => markPaid(inv.id)}>
                        <Check className="h-3 w-3" /> Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">PO Reference *</label>
                <Select value={selectedPO} onValueChange={setSelectedPO}>
                  <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                  <SelectContent>
                    {eligiblePOs.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.poNumber} — {getSupplierName(po.supplierId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Invoice Number</label>
                <Input value={invNumber} onChange={(e) => setInvNumber(e.target.value)} placeholder="Supplier invoice #" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tax</label>
                <Input type="number" min={0} value={tax} onChange={(e) => setTax(Number(e.target.value))} />
              </div>
            </div>

            {selectedPO && (() => {
              const po = purchaseOrders.find((p) => p.id === selectedPO);
              if (!po) return null;
              const subtotal = po.items.reduce((s, i) => s + i.qty * i.price, 0);
              return (
                <div className="space-y-3">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Item</TableHead>
                          <TableHead className="w-20">Qty</TableHead>
                          <TableHead className="w-16">Unit</TableHead>
                          <TableHead className="w-24">Price</TableHead>
                          <TableHead className="w-28">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {po.items.map((item) => (
                          <TableRow key={item.inventoryItemId}>
                            <TableCell className="text-sm">{getItemName(item.inventoryItemId)}</TableCell>
                            <TableCell className="text-sm">{item.qty}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.unit}</TableCell>
                            <TableCell className="text-sm">{item.price.toLocaleString()}</TableCell>
                            <TableCell className="text-sm font-medium">{(item.qty * item.price).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="text-right space-y-1 text-sm">
                    <div>Subtotal: Rp {subtotal.toLocaleString()}</div>
                    <div>Tax: Rp {tax.toLocaleString()}</div>
                    <div className="font-bold text-base">Total: Rp {(subtotal + tax).toLocaleString()}</div>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Invoice</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
