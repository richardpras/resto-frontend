import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RotateCcw, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  listProcurementPostings,
  reverseProcurementPosting,
  type ProcurementPostingApiRow,
} from "@/lib/api-integration/purchaseEndpoints";
import { useOutletStore } from "@/stores/outletStore";

const statusColors: Record<string, string> = {
  posted: "bg-success/15 text-success border-success/30",
  reversed: "bg-muted text-muted-foreground",
  draft: "bg-warning/15 text-warning border-warning/30",
};

const sourceLabel: Record<string, string> = {
  grn: "GRN",
  invoice: "Invoice",
  supplier_payment: "Payment",
};

function PostingsTable({
  rows,
  onReverse,
}: {
  rows: ProcurementPostingApiRow[];
  onReverse: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Source</TableHead>
              <TableHead>Document No</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Journal No</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Posted At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No postings yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{sourceLabel[r.sourceType] ?? r.sourceType}</TableCell>
                <TableCell className="font-mono text-sm">{r.documentNo ?? r.sourceId}</TableCell>
                <TableCell className="text-sm">{r.supplierName ?? "—"}</TableCell>
                <TableCell className="text-sm font-medium">{Number(r.amount).toLocaleString()}</TableCell>
                <TableCell className="font-mono text-sm">
                  {r.journalEntryId ? (
                    <Link to={`/accounting?tab=journal&journalId=${r.journalEntryId}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                      {r.journalNo ?? r.journalEntryId}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[r.status] ?? ""}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.postedAt ? new Date(r.postedAt).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-right">
                  {r.status === "posted" && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => onReverse(r.id)}>
                      <RotateCcw className="h-3 w-3" /> Reverse
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function ProcurementPosting() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [tab, setTab] = useState<"grn" | "invoice" | "supplier_payment">("grn");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ProcurementPostingApiRow[]>([]);

  const load = async () => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      setRows([]);
      return;
    }
    const res = await listProcurementPostings({ outletId: activeOutletId, sourceType: tab });
    setRows(res);
  };

  useEffect(() => {
    void load();
  }, [activeOutletId, tab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.documentNo, r.supplierName, r.postingNo, r.journalNo].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [rows, search]);

  const onReverse = async (id: string) => {
    try {
      await reverseProcurementPosting(id, "Reversed from procurement posting UI");
      toast.success("Posting reversed.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reverse posting.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search document/journal…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="grn">GRN Postings</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Postings</TabsTrigger>
          <TabsTrigger value="supplier_payment">Payment Postings</TabsTrigger>
        </TabsList>
        <TabsContent value="grn"><PostingsTable rows={filtered} onReverse={onReverse} /></TabsContent>
        <TabsContent value="invoice"><PostingsTable rows={filtered} onReverse={onReverse} /></TabsContent>
        <TabsContent value="supplier_payment"><PostingsTable rows={filtered} onReverse={onReverse} /></TabsContent>
      </Tabs>
    </div>
  );
}
