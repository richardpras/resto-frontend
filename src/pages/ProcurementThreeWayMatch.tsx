import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import {
  listProcurementMatchResults,
  revalidateProcurementMatchResult,
  type ProcurementMatchResultApiRow,
  type ProcurementMatchStatus,
} from "@/lib/api-integration/purchaseEndpoints";
import { useOutletStore } from "@/stores/outletStore";

const matchLabel: Record<ProcurementMatchStatus, string> = {
  matched: "Matched",
  matched_with_tolerance: "Matched (Tol.)",
  mismatch: "Mismatch",
  blocked: "Blocked",
};

const matchColors: Record<ProcurementMatchStatus, string> = {
  matched: "bg-success/15 text-success border-success/30",
  matched_with_tolerance: "bg-info/15 text-info border-info/30",
  mismatch: "bg-destructive/15 text-destructive border-destructive/30",
  blocked: "bg-muted text-muted-foreground",
};

function ResultsTable({
  rows,
  onRevalidate,
}: {
  rows: ProcurementMatchResultApiRow[];
  onRevalidate: (invoiceId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>PO</TableHead>
              <TableHead>GRN</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Qty Diff</TableHead>
              <TableHead>Price Diff</TableHead>
              <TableHead>Amount Diff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No match results.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.poReference ?? r.purchaseOrderId}</TableCell>
                <TableCell className="font-mono text-sm">{r.grReference ?? r.goodsReceiptId}</TableCell>
                <TableCell className="font-mono text-sm">{r.invoiceNumber ?? r.invoiceId}</TableCell>
                <TableCell className="text-sm">{Number(r.qtyDifference ?? 0).toLocaleString()}</TableCell>
                <TableCell className="text-sm">{Number(r.priceDifference ?? 0).toLocaleString()}%</TableCell>
                <TableCell className="text-sm">{Number(r.amountDifference ?? 0).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={matchColors[r.matchStatus]}>
                    {matchLabel[r.matchStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => onRevalidate(r.invoiceId)}>
                    <RefreshCw className="h-3 w-3" /> Revalidate
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function ProcurementThreeWayMatch() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [tab, setTab] = useState<"matched" | "mismatch" | "blocked">("matched");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ProcurementMatchResultApiRow[]>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const fields = [r.poReference, r.grReference, r.invoiceNumber, r.purchaseOrderId, r.goodsReceiptId, r.invoiceId].filter(Boolean).join(" ");
      return fields.toLowerCase().includes(q);
    });
  }, [rows, search]);

  const load = async () => {
    if (typeof activeOutletId !== "number" || activeOutletId < 1) {
      setRows([]);
      return;
    }
    const status: ProcurementMatchStatus | undefined = tab === "matched" ? undefined : tab;
    const res = await listProcurementMatchResults({ outletId: activeOutletId, status });
    setRows(res);
  };

  useEffect(() => {
    void load();
  }, [activeOutletId, tab]);

  const onRevalidate = async (invoiceId: string) => {
    try {
      await revalidateProcurementMatchResult({ invoiceId });
      toast.success("Revalidated.");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to revalidate.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search PO/GRN/Invoice…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="matched">Matched</TabsTrigger>
          <TabsTrigger value="mismatch">Mismatch</TabsTrigger>
          <TabsTrigger value="blocked">Blocked</TabsTrigger>
        </TabsList>
        <TabsContent value="matched">
          <ResultsTable rows={filtered.filter((r) => r.matchStatus === "matched" || r.matchStatus === "matched_with_tolerance")} onRevalidate={onRevalidate} />
        </TabsContent>
        <TabsContent value="mismatch">
          <ResultsTable rows={filtered.filter((r) => r.matchStatus === "mismatch")} onRevalidate={onRevalidate} />
        </TabsContent>
        <TabsContent value="blocked">
          <ResultsTable rows={filtered.filter((r) => r.matchStatus === "blocked")} onRevalidate={onRevalidate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

