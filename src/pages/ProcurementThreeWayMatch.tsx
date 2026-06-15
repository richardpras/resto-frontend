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
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import type { TFunction } from "i18next";

const matchColors: Record<ProcurementMatchStatus, string> = {
  matched: "bg-success/15 text-success border-success/30",
  matched_with_tolerance: "bg-info/15 text-info border-info/30",
  mismatch: "bg-destructive/15 text-destructive border-destructive/30",
  blocked: "bg-muted text-muted-foreground",
};

function ResultsTable({
  rows,
  onRevalidate,
  t,
}: {
  rows: ProcurementMatchResultApiRow[];
  onRevalidate: (invoiceId: string) => void;
  t: TFunction;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>{t("purchases.match.columns.po")}</TableHead>
              <TableHead>{t("purchases.match.columns.grn")}</TableHead>
              <TableHead>{t("purchases.match.columns.invoice")}</TableHead>
              <TableHead>{t("purchases.match.columns.qtyDiff")}</TableHead>
              <TableHead>{t("purchases.match.columns.priceDiff")}</TableHead>
              <TableHead>{t("purchases.match.columns.amountDiff")}</TableHead>
              <TableHead>{t("purchases.shared.status")}</TableHead>
              <TableHead className="text-right">{t("purchases.shared.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {t("purchases.match.empty")}
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
                    {t(`purchases.matchStatus.${r.matchStatus}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => onRevalidate(r.invoiceId)}>
                    <RefreshCw className="h-3 w-3" /> {t("purchases.match.revalidate")}
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
  const { t } = useErpTranslation();
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
      toast.success(t("purchases.match.revalidated"));
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("purchases.match.revalidateFailed"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t("purchases.match.searchPlaceholder")} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="matched">{t("purchases.match.tabs.matched")}</TabsTrigger>
          <TabsTrigger value="mismatch">{t("purchases.match.tabs.mismatch")}</TabsTrigger>
          <TabsTrigger value="blocked">{t("purchases.match.tabs.blocked")}</TabsTrigger>
        </TabsList>
        <TabsContent value="matched">
          <ResultsTable rows={filtered.filter((r) => r.matchStatus === "matched" || r.matchStatus === "matched_with_tolerance")} onRevalidate={onRevalidate} t={t} />
        </TabsContent>
        <TabsContent value="mismatch">
          <ResultsTable rows={filtered.filter((r) => r.matchStatus === "mismatch")} onRevalidate={onRevalidate} t={t} />
        </TabsContent>
        <TabsContent value="blocked">
          <ResultsTable rows={filtered.filter((r) => r.matchStatus === "blocked")} onRevalidate={onRevalidate} t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
