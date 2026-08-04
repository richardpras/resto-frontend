import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";
import {
  approveDailyStocktake,
  cancelDailyStocktake,
  createDailyStocktakeSession,
  getDailyStocktakeSession,
  saveDailyStocktakeClosing,
  saveDailyStocktakeOpening,
  submitDailyStocktake,
  type DailyStocktakeLine,
  type DailyStocktakeSession,
} from "@/lib/api-integration/dailyStocktakeEndpoints";
import { isNativePosShell } from "@/mobile/platform";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import { loadStocktakeDraft, saveStocktakeDraft } from "@/mobile/offline/offlineStocktakeDraftDb";

type Props = {
  outletId: number;
};

type CountDraft = Record<string, { openingQty: string; closingQty: string }>;

function shouldQueueOffline(): boolean {
  return isNativePosShell() && !useOfflineSyncStore.getState().isOnline;
}

async function shaFingerprint(parts: string[]): Promise<string> {
  const raw = parts.join("|");
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return `fp-${raw}`;
}

function statusBadge(status: string, t: (key: string) => string) {
  if (status === "posted") return <Badge variant="outline">{t("inventory.stocktake.status.posted")}</Badge>;
  if (status === "pending_approval") return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">{t("inventory.stocktake.status.pendingApproval")}</Badge>;
  if (status === "cancelled") return <Badge variant="destructive">{t("inventory.stocktake.status.cancelled")}</Badge>;
  return <Badge variant="secondary">{t("inventory.stocktake.status.draft")}</Badge>;
}

function toDraft(lines: DailyStocktakeLine[] | undefined): CountDraft {
  const draft: CountDraft = {};
  for (const line of lines ?? []) {
    const defaultOpening =
      line.openingQty !== null && line.openingQty !== undefined
        ? String(line.openingQty)
        : String(line.previousClosingQty);
    draft[line.ingredientId] = {
      openingQty: defaultOpening,
      closingQty: line.closingQty !== null && line.closingQty !== undefined ? String(line.closingQty) : "",
    };
  }
  return draft;
}

function linesFromDraft(draft: CountDraft, field: "openingQty" | "closingQty") {
  return Object.entries(draft)
    .filter(([, row]) => row[field] !== "")
    .map(([ingredientId, row]) => ({
      ingredientId: Number(ingredientId),
      [field]: Number(row[field]),
    }));
}

export function DailyStocktakePanel({ outletId }: Props) {
  const { t } = useOpsTranslation();
  const queryClient = useQueryClient();
  const [businessDate, setBusinessDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [draft, setDraft] = useState<CountDraft>({});
  const offline = shouldQueueOffline();

  const sessionQ = useQuery({
    queryKey: ["daily-stocktake-session", sessionId],
    queryFn: () => getDailyStocktakeSession(sessionId!),
    enabled: sessionId !== null && !offline,
  });

  const session = sessionQ.data;
  const lines = session?.lines ?? [];
  const isEditable = offline ? true : session?.status === "draft";
  const canApprove = !offline && session?.status === "pending_approval";

  useEffect(() => {
    if (session?.lines) {
      setDraft(toDraft(session.lines));
    }
  }, [session?.id, session?.status]);

  useEffect(() => {
    void loadStocktakeDraft(outletId, businessDate).then((row) => {
      if (!row) return;
      if (row.sessionId) setSessionId(row.sessionId);
      setDraft(row.draft);
    });
  }, [outletId, businessDate]);

  useEffect(() => {
    void saveStocktakeDraft({
      outletId,
      businessDate,
      sessionId,
      draft,
      updatedAt: new Date().toISOString(),
    });
  }, [outletId, businessDate, sessionId, draft]);

  const createMutation = useMutation({
    mutationFn: () => createDailyStocktakeSession(outletId, businessDate),
    onSuccess: (data) => {
      setSessionId(data.id);
      setDraft(toDraft(data.lines));
      void queryClient.invalidateQueries({ queryKey: ["daily-stocktake-session", data.id] });
    },
  });

  const openingMutation = useMutation({
    mutationFn: async () => {
      if (offline) {
        const fp = await shaFingerprint([
          "inventory.stocktake.save_opening",
          String(outletId),
          businessDate,
          JSON.stringify(linesFromDraft(draft, "openingQty")),
        ]);
        await useOfflineSyncStore.getState().enqueueReplayableOperation({
          outletId,
          fingerprint: fp,
          operationType: "inventory.stocktake.save_opening",
          payload: {
            outletId,
            businessDate,
            sessionId: sessionId ?? 0,
            lines: linesFromDraft(draft, "openingQty"),
          },
        });
        return { id: sessionId ?? 0 } as DailyStocktakeSession;
      }
      return saveDailyStocktakeOpening(sessionId!, linesFromDraft(draft, "openingQty"));
    },
    onSuccess: (data) => {
      if (data.id) void queryClient.setQueryData(["daily-stocktake-session", data.id], data);
      toast({ title: t("inventory.stocktake.openingSaved") });
    },
  });

  const closingMutation = useMutation({
    mutationFn: async () => {
      if (offline) {
        const fp = await shaFingerprint([
          "inventory.stocktake.save_closing",
          String(outletId),
          businessDate,
          JSON.stringify(linesFromDraft(draft, "closingQty")),
        ]);
        await useOfflineSyncStore.getState().enqueueReplayableOperation({
          outletId,
          fingerprint: fp,
          operationType: "inventory.stocktake.save_closing",
          payload: {
            outletId,
            businessDate,
            sessionId: sessionId ?? 0,
            lines: linesFromDraft(draft, "closingQty"),
          },
        });
        return { id: sessionId ?? 0 } as DailyStocktakeSession;
      }
      return saveDailyStocktakeClosing(sessionId!, linesFromDraft(draft, "closingQty"));
    },
    onSuccess: (data) => {
      if (data.id) void queryClient.setQueryData(["daily-stocktake-session", data.id], data);
      toast({ title: t("inventory.stocktake.closingSaved") });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (offline) {
        const fp = await shaFingerprint(["inventory.stocktake.submit", String(outletId), businessDate]);
        await useOfflineSyncStore.getState().enqueueReplayableOperation({
          outletId,
          fingerprint: fp,
          operationType: "inventory.stocktake.submit",
          payload: { outletId, businessDate, sessionId: sessionId ?? 0 },
        });
        return { id: sessionId ?? 0, status: "pending_approval" } as DailyStocktakeSession;
      }
      return submitDailyStocktake(sessionId!);
    },
    onSuccess: (data) => {
      if (data.id) void queryClient.setQueryData(["daily-stocktake-session", data.id], data);
      toast({ title: t("inventory.stocktake.submitted") });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => {
      if (offline) {
        throw new Error(
          t("mobile.requiresInternet", { defaultValue: "This menu requires an internet connection." }),
        );
      }
      return approveDailyStocktake(sessionId!);
    },
    onSuccess: (data) => {
      void queryClient.setQueryData(["daily-stocktake-session", data.id], data);
      toast({ title: t("inventory.stocktake.approved") });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (offline) {
        throw new Error(
          t("mobile.requiresInternet", { defaultValue: "This menu requires an internet connection." }),
        );
      }
      return cancelDailyStocktake(sessionId!);
    },
    onSuccess: (data) => {
      void queryClient.setQueryData(["daily-stocktake-session", data.id], data);
      toast({ title: t("inventory.stocktake.cancelled") });
    },
  });

  const summary = useMemo(() => {
    const overnight = lines.reduce((sum, line) => sum + Math.max(0, line.overnightVarianceQty), 0);
    const operationalWaste = lines.reduce((sum, line) => sum + Math.max(0, line.operationalVarianceQty), 0);
    const operationalSurplus = lines.reduce((sum, line) => sum + Math.max(0, -line.operationalVarianceQty), 0);
    return { overnight, operationalWaste, operationalSurplus };
  }, [lines]);

  async function handleOpenSession() {
    try {
      if (offline) {
        setSessionId(null);
        toast({ title: t("inventory.stocktake.sessionOpened") });
        return;
      }
      await createMutation.mutateAsync();
      toast({ title: t("inventory.stocktake.sessionOpened") });
    } catch (error) {
      toast({
        title: t("inventory.stocktake.loadFailed"),
        description: error instanceof Error ? error.message : t("shared.somethingWrong"),
        variant: "destructive",
      });
    }
  }

  async function runMutation(action: () => Promise<DailyStocktakeSession>, failTitle: string) {
    try {
      await action();
    } catch (error) {
      toast({
        title: failTitle,
        description: error instanceof Error ? error.message : t("shared.somethingWrong"),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t("inventory.stocktake.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("inventory.stocktake.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={businessDate}
            onChange={(e) => setBusinessDate(e.target.value)}
            className="w-40"
            disabled={sessionId !== null && session?.status === "posted"}
          />
          <Button variant="outline" size="sm" onClick={() => void sessionQ.refetch()} disabled={!sessionId || sessionQ.isFetching}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("inventory.stocktake.refresh")}
          </Button>
          {!sessionId ? (
            <Button size="sm" onClick={() => void handleOpenSession()} disabled={createMutation.isPending}>
              {t("inventory.stocktake.openSession")}
            </Button>
          ) : null}
        </div>
      </div>

      {offline ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {t("mobile.apiUnreachable", { defaultValue: "API unreachable" })} — draft counts queue until sync. Approve stays online-only.
        </p>
      ) : null}

      {offline ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={openingMutation.isPending}
            onClick={() => void runMutation(() => openingMutation.mutateAsync(), t("inventory.stocktake.openingFailed"))}
          >
            {t("inventory.stocktake.saveOpening")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={closingMutation.isPending}
            onClick={() => void runMutation(() => closingMutation.mutateAsync(), t("inventory.stocktake.closingFailed"))}
          >
            {t("inventory.stocktake.saveClosing")}
          </Button>
          <Button
            size="sm"
            disabled={submitMutation.isPending}
            onClick={() => void runMutation(() => submitMutation.mutateAsync(), t("inventory.stocktake.submitFailed"))}
          >
            {t("inventory.stocktake.submitForApproval")}
          </Button>
        </div>
      ) : null}

      {session ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {statusBadge(session.status, t)}
          <span className="text-muted-foreground">{t("inventory.stocktake.businessDate", { date: session.businessDate })}</span>
        </div>
      ) : null}

      {session && lines.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2">{t("inventory.stocktake.columns.ingredient")}</th>
                <th className="text-right p-2">{t("inventory.stocktake.columns.prevClosing")}</th>
                <th className="text-right p-2">{t("inventory.stocktake.columns.opening")}</th>
                <th className="text-right p-2">{t("inventory.stocktake.columns.purchases")}</th>
                <th className="text-right p-2">{t("inventory.stocktake.columns.closing")}</th>
                <th className="text-right p-2">{t("inventory.stocktake.columns.theoretical")}</th>
                <th className="text-right p-2">{t("inventory.stocktake.columns.overnight")}</th>
                <th className="text-right p-2">{t("inventory.stocktake.columns.operational")}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-t">
                  <td className="p-2">
                    <div className="font-medium">{line.ingredientName ?? line.ingredientId}</div>
                    <div className="text-xs text-muted-foreground">{line.ingredientUnit}</div>
                  </td>
                  <td className="p-2 text-right tabular-nums">{line.previousClosingQty}</td>
                  <td className="p-2 text-right">
                    {isEditable ? (
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="w-24 ml-auto text-right"
                        value={draft[line.ingredientId]?.openingQty ?? ""}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [line.ingredientId]: {
                              openingQty: e.target.value,
                              closingQty: prev[line.ingredientId]?.closingQty ?? "",
                            },
                          }))
                        }
                      />
                    ) : (
                      <span className="tabular-nums">{line.openingQty ?? "—"}</span>
                    )}
                  </td>
                  <td className="p-2 text-right tabular-nums">{line.purchasesQty}</td>
                  <td className="p-2 text-right">
                    {isEditable && session.openingSubmittedAt ? (
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="w-24 ml-auto text-right"
                        value={draft[line.ingredientId]?.closingQty ?? ""}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [line.ingredientId]: {
                              openingQty: prev[line.ingredientId]?.openingQty ?? "",
                              closingQty: e.target.value,
                            },
                          }))
                        }
                      />
                    ) : (
                      <span className="tabular-nums">{line.closingQty ?? "—"}</span>
                    )}
                  </td>
                  <td className="p-2 text-right tabular-nums">{line.theoreticalUsageQty}</td>
                  <td className="p-2 text-right tabular-nums text-amber-700">{line.overnightVarianceQty}</td>
                  <td className={`p-2 text-right tabular-nums ${line.operationalVarianceQty < 0 ? "text-emerald-700" : line.operationalVarianceQty > 0 ? "text-rose-700" : ""}`}>
                    {line.operationalVarianceQty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : sessionId && sessionQ.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("inventory.stocktake.loading")}</p>
      ) : null}

      {session?.closingSubmittedAt ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">{t("inventory.stocktake.summary.overnight")}</p>
            <p className="text-lg font-semibold tabular-nums">{summary.overnight.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">{t("inventory.stocktake.summary.operationalWaste")}</p>
            <p className="text-lg font-semibold tabular-nums">{summary.operationalWaste.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">{t("inventory.stocktake.summary.operationalSurplus")}</p>
            <p className="text-lg font-semibold tabular-nums">{summary.operationalSurplus.toFixed(2)}</p>
          </div>
        </div>
      ) : null}

      {session ? (
        <div className="flex flex-wrap gap-2">
          {isEditable ? (
            <>
              <Button
                variant="outline"
                disabled={openingMutation.isPending}
                onClick={() => void runMutation(() => openingMutation.mutateAsync(), t("inventory.stocktake.openingFailed"))}
              >
                {t("inventory.stocktake.saveOpening")}
              </Button>
              <Button
                variant="outline"
                disabled={!session.openingSubmittedAt || closingMutation.isPending}
                onClick={() => void runMutation(() => closingMutation.mutateAsync(), t("inventory.stocktake.closingFailed"))}
              >
                {t("inventory.stocktake.saveClosing")}
              </Button>
              <Button
                disabled={!session.closingSubmittedAt || submitMutation.isPending}
                onClick={() => void runMutation(() => submitMutation.mutateAsync(), t("inventory.stocktake.submitFailed"))}
              >
                {t("inventory.stocktake.submitForApproval")}
              </Button>
              <Button
                variant="ghost"
                disabled={session.status === "posted" || cancelMutation.isPending}
                onClick={() => void runMutation(() => cancelMutation.mutateAsync(), t("inventory.stocktake.cancelFailed"))}
              >
                {t("inventory.stocktake.cancel")}
              </Button>
            </>
          ) : null}
          {canApprove ? (
            <Button
              onClick={() => {
                if (!window.confirm(t("inventory.stocktake.approveConfirm"))) return;
                void runMutation(() => approveMutation.mutateAsync(), t("inventory.stocktake.approveFailed"));
              }}
              disabled={approveMutation.isPending}
            >
              {t("inventory.stocktake.approveAndPost")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
