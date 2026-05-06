import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePurchaseStore, GRNStatus } from "@/stores/purchaseStore";
import { Plus, PackageCheck, Search, Check } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<GRNStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  received: "bg-success/15 text-success border-success/30",
};

export default function GoodsReceipts() {
  const {
    goodsReceipts,
    addGRN,
    confirmGRN,
    purchaseOrders,
    fetchGoodsReceipts,
    fetchPurchaseOrders,
  } = usePurchaseStore();
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedPO, setSelectedPO] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    void Promise.all([fetchGoodsReceipts(), fetchPurchaseOrders()]);
  }, [fetchGoodsReceipts, fetchPurchaseOrders]);

  const sentPOs = purchaseOrders.filter((po) => po.status === "sent" || po.status === "partial");

  const openNew = () => {
    setSelectedPO("");
    setDate(new Date().toISOString().slice(0, 10));
    setReceivedQtys({});
    setFormOpen(true);
  };

  const handlePOSelect = (poId: string) => {
    setSelectedPO(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      const qtys: Record<string, number> = {};
      po.items.forEach((i) => { qtys[i.inventoryItemId] = Math.max(0, i.qty - i.receivedQty); });
      setReceivedQtys(qtys);
    }
  };

  const handleConfirm = async () => {
    const po = purchaseOrders.find((p) => p.id === selectedPO);
    if (!po) { toast.error("Select a PO"); return; }
    const grnItems = po.items.map((i) => ({
      inventoryItemId: i.inventoryItemId,
      orderedQty: i.qty,
      receivedQty: receivedQtys[i.inventoryItemId] ?? 0,
      unit: i.unit,
    })).filter((i) => i.receivedQty > 0);

    if (grnItems.length === 0) { toast.error("Enter received quantities"); return; }

    const id = await addGRN({ poReference: po.poNumber, date, status: "pending", items: grnItems });
    await confirmGRN(id);
    toast.success("Goods received & stock updated");
    setFormOpen(false);
  };

  const getItemName = (id: string) => `Item #${id}`;
  const filtered = goodsReceipts.filter((g) => g.grnNumber.toLowerCase().includes(search.toLowerCase()) || g.poReference.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Goods Receipt</h1>
          <p className="text-sm text-muted-foreground">Receive goods and update stock</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> New GRN</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search GRN…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>GRN Number</TableHead>
                <TableHead>PO Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <PackageCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />No goods receipts yet
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((grn) => (
                <TableRow key={grn.id}>
                  <TableCell className="font-mono font-semibold text-sm">{grn.grnNumber}</TableCell>
                  <TableCell className="text-sm font-mono">{grn.poReference}</TableCell>
                  <TableCell className="text-sm">{grn.date}</TableCell>
                  <TableCell className="text-sm">{grn.items.length} items</TableCell>
                  <TableCell><Badge variant="outline" className={statusColors[grn.status]}>{grn.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Receive Goods</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">PO Reference *</label>
                <Select value={selectedPO} onValueChange={handlePOSelect}>
                  <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                  <SelectContent>
                    {sentPOs.map((po) => <SelectItem key={po.id} value={po.id}>{po.poNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            {selectedPO && (() => {
              const po = purchaseOrders.find((p) => p.id === selectedPO);
              if (!po) return null;
              return (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Item</TableHead>
                        <TableHead className="w-24">Ordered</TableHead>
                        <TableHead className="w-24">Already Rcvd</TableHead>
                        <TableHead className="w-24">Remaining</TableHead>
                        <TableHead className="w-28">Receive Now</TableHead>
                        <TableHead className="w-16">Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {po.items.map((item) => {
                        const remaining = Math.max(0, item.qty - item.receivedQty);
                        return (
                          <TableRow key={item.inventoryItemId}>
                            <TableCell className="text-sm font-medium">{getItemName(item.inventoryItemId)}</TableCell>
                            <TableCell className="text-sm">{item.qty}</TableCell>
                            <TableCell className="text-sm">{item.receivedQty}</TableCell>
                            <TableCell className="text-sm font-medium">{remaining}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={remaining}
                                className="h-9 w-24"
                                value={receivedQtys[item.inventoryItemId] ?? 0}
                                onChange={(e) => setReceivedQtys((prev) => ({ ...prev, [item.inventoryItemId]: Math.min(Number(e.target.value), remaining) }))}
                              />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.unit}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirm} className="gap-1"><Check className="h-3.5 w-3.5" /> Confirm Receiving</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
