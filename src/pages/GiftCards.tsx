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

function idempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function GiftCards() {
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
      toast.error("Enter a valid code and amount.");
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
      toast.success(result.idempotent ? "Gift card already issued (idempotent)." : "Gift card issued.");
      setLookupResult(result.issuance);
      setLookupCode(issueCode.trim());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Issue failed");
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
      toast.error(e instanceof Error ? e.message : "Lookup failed");
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
      toast.error("Enter settlement reference and one or more settlement IDs.");
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
      toast.success("Settlements processed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Settlement failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!outletReady) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select an outlet to manage gift cards.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6" /> Gift Cards & Store Credit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Issue, lookup by code, and settle redemptions. Listing all cards requires a backend list API (not available).
        </p>
      </div>
      <Tabs defaultValue="issue">
        <TabsList>
          <TabsTrigger value="issue">Issue</TabsTrigger>
          <TabsTrigger value="lookup">Lookup</TabsTrigger>
          <TabsTrigger value="settle">Settle</TabsTrigger>
        </TabsList>
        <TabsContent value="issue" className="mt-4">
          <Card className="p-4 space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={issueType} onValueChange={(v) => setIssueType(v as "gift_card" | "store_credit")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gift_card">Gift Card</SelectItem>
                  <SelectItem value="store_credit">Store Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Code</Label>
              <Input value={issueCode} onChange={(e) => setIssueCode(e.target.value)} placeholder="GC-001" />
            </div>
            <div>
              <Label>Initial Amount</Label>
              <Input type="number" value={issueAmount} onChange={(e) => setIssueAmount(e.target.value)} />
            </div>
            <Button onClick={() => void handleIssue()} disabled={submitting}>Issue</Button>
          </Card>
        </TabsContent>
        <TabsContent value="lookup" className="mt-4">
          <Card className="p-4 space-y-3">
            <div className="flex gap-2">
              <Input value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} placeholder="Card code" />
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
              <Label>Settlement Reference</Label>
              <Input value={settlementRef} onChange={(e) => setSettlementRef(e.target.value)} />
            </div>
            <div>
              <Label>Redeem Settlement IDs (comma-separated)</Label>
              <Input value={settlementIds} onChange={(e) => setSettlementIds(e.target.value)} placeholder="1, 2, 3" />
            </div>
            <Button onClick={() => void handleSettle()} disabled={submitting}>Process Settlement</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
