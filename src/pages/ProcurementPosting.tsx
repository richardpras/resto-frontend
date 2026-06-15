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
import { useErpTranslation } from "@/i18n/useErpTranslation";
import { formatApiErrorMessage } from "@/i18n/apiErrorMessage";
import type { TFunction } from "i18next";

const statusColors: Record<string, string> = {
  posted: "bg-success/15 text-success border-success/30",
  reversed: "bg-muted text-muted-foreground",
  draft: "bg-warning/15 text-warning border-warning/30",
};

function PostingsTable({
  rows,
  onReverse,
  t,
}: {
  rows: ProcurementPostingApiRow[];
  onReverse: (id: string) => void;
  t: TFunction;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>{t("purchases.posting.columns.source")}</TableHead>
              <TableHead>{t("purchases.posting.columns.documentNo")}</TableHead>
              <TableHead>{t("purchases.shared.supplier")}</TableHead>
              <TableHead>{t("purchases.shared.total")}</TableHead>
              <TableHead>{t("purchases.posting.columns.journalNo")}</TableHead>
              <TableHead>{t("purchases.shared.status")}</TableHead>
              <TableHead>{t("purchases.posting.columns.postedAt")}</TableHead>
              <TableHead className="text-right">{t("purchases.shared.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {t("purchases.posting.empty")}
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{t(`purchases.posting.source.${r.sourceType}`, { defaultValue: r.sourceType })}</TableCell>
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
                  <Badge variant="outline" className={statusColors[r.status] ?? ""}>{t(`purchases.postingStatus.${r.status}`, { defaultValue: r.status })}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.postedAt ? new Date(r.postedAt).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-right">
                  {r.status === "posted" && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => onReverse(r.id)}>
                      <RotateCcw className="h-3 w-3" /> {t("purchases.posting.reverse")}
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
  const { t } = useErpTranslation();
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
      toast.success(t("purchases.posting.reversed"));
      await load();
    } catch (e) {
      toast.error(formatApiErrorMessage(e, t) || t("purchases.posting.reverseFailed"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t("purchases.posting.searchPlaceholder")} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="grn">{t("purchases.posting.tabs.grn")}</TabsTrigger>
          <TabsTrigger value="invoice">{t("purchases.posting.tabs.invoice")}</TabsTrigger>
          <TabsTrigger value="supplier_payment">{t("purchases.posting.tabs.payment")}</TabsTrigger>
        </TabsList>
        <TabsContent value="grn"><PostingsTable rows={filtered} onReverse={onReverse} t={t} /></TabsContent>
        <TabsContent value="invoice"><PostingsTable rows={filtered} onReverse={onReverse} t={t} /></TabsContent>
        <TabsContent value="supplier_payment"><PostingsTable rows={filtered} onReverse={onReverse} t={t} /></TabsContent>
      </Tabs>
    </div>
  );
}
