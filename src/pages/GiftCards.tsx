import { useState } from "react";
import { Gift, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useOutletStore } from "@/stores/outletStore";
import {
  checkGiftCard,
  issueGiftCard,
  settleGiftCardRedemptions,
  type GiftCardIssuanceApi,
} from "@/lib/api-integration/giftCardEndpoints";
import { useErpTranslation } from "@/i18n/useErpTranslation";

function idempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function GiftCards() {
  const { t } = useErpTranslation();
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const outletReady = typeof activeOutletId === "number" && activeOutletId >= 1;

  const [issueCode, setIssueCode] = useState("");
  const [issueAmount, setIssueAmount] = useState("");
  const [issueType, setIssueType] = useState<"gift_card" | "store_credit">("gift_card");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState<GiftCardIssuanceApi | null>(null);
  const [settlementIds, setSettlementIds] = useState("");
  const [settlementRef, setSettlementRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleIssue = async () => {
    if (!outletReady) return;
    const amount = Number(issueAmount);
    if (!issueCode.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error(t("giftCards.validationCodeAmount"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await issueGiftCard({
        outletId: activeOutletId,
        instrumentType: issueType,
        code: issueCode.trim(),
        initialAmount: amount,
        idempotencyKey: idempotencyKey("issue"),
      });
      toast.success(result.idempotent ? t("giftCards.issuedIdempotent") : t("giftCards.issued"));
      setLookupResult(result.issuance);
      setLookupCode(issueCode.trim());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("giftCards.issueFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async () => {
    if (!outletReady || !lookupCode.trim()) return;
    setSubmitting(true);
    try {
      const data = await checkGiftCard(activeOutletId, lookupCode.trim());
      setLookupResult(data);
    } catch (e) {
      setLookupResult(null);
      toast.error(e instanceof Error ? e.message : t("giftCards.lookupFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async () => {
    if (!outletReady) return;
    const ids = settlementIds
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0 || !settlementRef.trim()) {
      toast.error(t("giftCards.settlementValidation"));
      return;
    }
    setSubmitting(true);
    try {
      await settleGiftCardRedemptions({
        outletId: activeOutletId,
        idempotencyKey: idempotencyKey("settle"),
        settlementReference: settlementRef.trim(),
        settlementStatus: "settled",
        redeemSettlementIds: ids,
      });
      toast.success(t("giftCards.settlementsProcessed"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("giftCards.settlementFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!outletReady) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{t("giftCards.noOutlet")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6" /> {t("giftCards.pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("giftCards.pageSubtitle")}</p>
      </div>
      <Tabs defaultValue="issue">
        <TabsList>
          <TabsTrigger value="issue">{t("giftCards.tabs.issue")}</TabsTrigger>
          <TabsTrigger value="lookup">{t("giftCards.tabs.lookup")}</TabsTrigger>
          <TabsTrigger value="settle">{t("giftCards.tabs.settle")}</TabsTrigger>
        </TabsList>
        <TabsContent value="issue" className="mt-4">
          <Card className="p-4 space-y-3">
            <div>
              <Label>{t("giftCards.type")}</Label>
              <Select value={issueType} onValueChange={(v) => setIssueType(v as "gift_card" | "store_credit")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gift_card">{t("giftCards.giftCard")}</SelectItem>
                  <SelectItem value="store_credit">{t("giftCards.storeCredit")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("giftCards.code")}</Label>
              <Input value={issueCode} onChange={(e) => setIssueCode(e.target.value)} placeholder={t("giftCards.codePlaceholder")} />
            </div>
            <div>
              <Label>{t("giftCards.initialAmount")}</Label>
              <Input type="number" value={issueAmount} onChange={(e) => setIssueAmount(e.target.value)} />
            </div>
            <Button onClick={() => void handleIssue()} disabled={submitting}>{t("giftCards.issue")}</Button>
          </Card>
        </TabsContent>
        <TabsContent value="lookup" className="mt-4">
          <Card className="p-4 space-y-3">
            <div className="flex gap-2">
              <Input value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} placeholder={t("giftCards.lookupPlaceholder")} />
              <Button variant="outline" onClick={() => void handleLookup()} disabled={submitting}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {lookupResult && (
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">{JSON.stringify(lookupResult, null, 2)}</pre>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="settle" className="mt-4">
          <Card className="p-4 space-y-3">
            <div>
              <Label>{t("giftCards.settlementReference")}</Label>
              <Input value={settlementRef} onChange={(e) => setSettlementRef(e.target.value)} />
            </div>
            <div>
              <Label>{t("giftCards.settlementIds")}</Label>
              <Input value={settlementIds} onChange={(e) => setSettlementIds(e.target.value)} placeholder={t("giftCards.settlementIdsPlaceholder")} />
            </div>
            <Button onClick={() => void handleSettle()} disabled={submitting}>{t("giftCards.processSettlement")}</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
