import { useEffect, useMemo, useState } from "react";
import { Gift, Plus, Pencil, Power, Calculator, BarChart3, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/DataTable";
import { useOutletStore } from "@/stores/outletStore";
import {
  useLoyaltyEngineStore,
} from "@/stores/loyaltyEngineStore";
import type {
  LoyaltyProgramRow,
  LoyaltyProgramType,
  LoyaltyRewardRow,
} from "@/lib/api-integration/loyaltyEngineEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";

const PROGRAM_TYPES: { value: LoyaltyProgramType; label: string }[] = [
  { value: "spend_based", label: "Spend based" },
  { value: "visit_based", label: "Visit based" },
  { value: "period_spending", label: "Period spending" },
  { value: "percentage_reward", label: "Percentage reward" },
];

const typeLabel = (t: string) => PROGRAM_TYPES.find((p) => p.value === t)?.label ?? t;

function defaultRuleConfig(type: string): Record<string, unknown> {
  switch (type) {
    case "visit_based":
      return { visit_threshold: 10, points_awarded: 100 };
    case "period_spending":
      return { period: "monthly", minimum_spend: 0, reward_percent: 5 };
    case "percentage_reward":
      return { percentage: 5 };
    default:
      return { earnPerAmount: 10000, pointsEarned: 1 };
  }
}

export default function LoyaltyPrograms() {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const {
    programs,
    rules,
    analytics,
    lastSimulation,
    loadingPrograms,
    loadingRules,
    loadingAnalytics,
    simulating,
    fetchPrograms,
    createProgram,
    updateProgram,
    setProgramActive,
    fetchRules,
    saveRule,
    removeRule,
    runSimulation,
    fetchAnalytics,
    rewards,
    loadingRewards,
    fetchRewards,
    createReward,
    updateReward,
    setRewardActive,
  } = useLoyaltyEngineStore();

  const [tab, setTab] = useState("programs");
  const [programOpen, setProgramOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<LoyaltyProgramRow | null>(null);
  const [programForm, setProgramForm] = useState({
    code: "",
    name: "",
    description: "",
    type: "spend_based" as LoyaltyProgramType,
    effectiveFrom: "",
    effectiveUntil: "",
    isActive: true,
    expiryEnabled: false,
    expiryDays: "365",
  });
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [ruleConfigJson, setRuleConfigJson] = useState("");
  const [simForm, setSimForm] = useState({
    programId: "",
    spendingAmount: "100000",
    visitCount: "1",
    simulationDate: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyRewardRow | null>(null);
  const [rewardForm, setRewardForm] = useState({
    code: "",
    name: "",
    description: "",
    pointsCost: "500",
    sortOrder: "",
  });

  const outletPrograms = useMemo(
    () =>
      programs.filter(
        (p) =>
          activeOutletId == null ||
          p.outletId === activeOutletId ||
          p.outletId == null,
      ),
    [programs, activeOutletId],
  );

  const selectedProgram = outletPrograms.find((p) => p.id === selectedProgramId) ?? outletPrograms[0];

  useEffect(() => {
    if (!activeOutletId) return;
    void fetchPrograms(activeOutletId).catch((e) =>
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load programs"),
    );
  }, [activeOutletId, fetchPrograms]);

  useEffect(() => {
    if (tab === "analytics" && activeOutletId) {
      void fetchAnalytics(activeOutletId).catch((e) =>
        toast.error(e instanceof ApiHttpError ? e.message : "Failed to load analytics"),
      );
    }
  }, [tab, activeOutletId, fetchAnalytics]);

  useEffect(() => {
    if (tab === "rewards" && activeOutletId) {
      void fetchRewards(activeOutletId).catch((e) =>
        toast.error(e instanceof ApiHttpError ? e.message : "Failed to load rewards"),
      );
    }
  }, [tab, activeOutletId, fetchRewards]);

  useEffect(() => {
    if (!selectedProgram?.id && outletPrograms[0]?.id) {
      setSelectedProgramId(outletPrograms[0].id);
    }
  }, [outletPrograms, selectedProgram?.id]);

  useEffect(() => {
    if (tab !== "rules" || !selectedProgramId) return;
    void fetchRules(selectedProgramId).catch((e) =>
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load rules"),
    );
  }, [tab, selectedProgramId, fetchRules]);

  useEffect(() => {
    if (!selectedProgram) return;
    const rule = rules[0];
    const cfg = rule?.config ?? defaultRuleConfig(selectedProgram.type);
    setRuleConfigJson(JSON.stringify(cfg, null, 2));
  }, [selectedProgram, rules]);

  const openNewProgram = () => {
    setEditingProgram(null);
    setProgramForm({
      code: "",
      name: "",
      description: "",
      type: "spend_based",
      effectiveFrom: "",
      effectiveUntil: "",
      isActive: true,
      expiryEnabled: false,
      expiryDays: "365",
    });
    setProgramOpen(true);
  };

  const openEditProgram = (p: LoyaltyProgramRow) => {
    setEditingProgram(p);
    setProgramForm({
      code: p.code,
      name: p.name,
      description: p.description ?? "",
      type: p.type,
      effectiveFrom: p.effectiveFrom ?? "",
      effectiveUntil: p.effectiveUntil ?? "",
      isActive: p.isActive,
      expiryEnabled: p.expiryEnabled ?? false,
      expiryDays: p.expiryDays != null ? String(p.expiryDays) : "365",
    });
    setProgramOpen(true);
  };

  const handleSaveProgram = async () => {
    if (!programForm.code.trim() || !programForm.name.trim()) {
      return toast.error("Code and name are required");
    }
    if (!activeOutletId && !editingProgram) {
      return toast.error("Select an outlet first");
    }
    if (programForm.expiryEnabled) {
      const days = Number(programForm.expiryDays);
      if (!Number.isFinite(days) || days < 1) {
        return toast.error("Expiry days must be at least 1 when expiry is enabled");
      }
    }
    setSaving(true);
    try {
      const expiryPayload = {
        expiryEnabled: programForm.expiryEnabled,
        expiryDays: programForm.expiryEnabled ? Number(programForm.expiryDays) : null,
      };
      if (editingProgram) {
        await updateProgram(editingProgram.id, {
          name: programForm.name,
          description: programForm.description || null,
          effectiveFrom: programForm.effectiveFrom || null,
          effectiveUntil: programForm.effectiveUntil || null,
          ...expiryPayload,
        });
        if (editingProgram.isActive !== programForm.isActive) {
          await setProgramActive(editingProgram.id, programForm.isActive);
        }
        toast.success("Program updated");
      } else {
        await createProgram({
          outletId: activeOutletId ?? undefined,
          code: programForm.code,
          name: programForm.name,
          description: programForm.description || undefined,
          type: programForm.type,
          isActive: programForm.isActive,
          effectiveFrom: programForm.effectiveFrom || undefined,
          effectiveUntil: programForm.effectiveUntil || undefined,
          ...expiryPayload,
        });
        toast.success("Program created");
      }
      setProgramOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRule = async () => {
    if (!selectedProgram || !activeOutletId) return;
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(ruleConfigJson) as Record<string, unknown>;
    } catch {
      return toast.error("Rule config must be valid JSON");
    }
    setSaving(true);
    try {
      const existing = rules[0];
      await saveRule(selectedProgram.id, selectedProgram.type, config, existing?.id);
      toast.success("Rule saved");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Rule save failed");
    } finally {
      setSaving(false);
    }
  };

  const openNewReward = () => {
    setEditingReward(null);
    setRewardForm({ code: "", name: "", description: "", pointsCost: "500", sortOrder: "" });
    setRewardOpen(true);
  };

  const openEditReward = (r: LoyaltyRewardRow) => {
    setEditingReward(r);
    setRewardForm({
      code: r.code,
      name: r.name,
      description: r.description ?? "",
      pointsCost: String(r.pointsCost),
      sortOrder: r.sortOrder != null ? String(r.sortOrder) : "",
    });
    setRewardOpen(true);
  };

  const handleSaveReward = async () => {
    if (!activeOutletId || !rewardForm.code.trim() || !rewardForm.name.trim()) {
      return toast.error("Code and name are required");
    }
    const pointsCost = Number(rewardForm.pointsCost);
    if (!Number.isFinite(pointsCost) || pointsCost < 1) {
      return toast.error("Points cost must be at least 1");
    }
    setSaving(true);
    try {
      const sortOrder = rewardForm.sortOrder.trim() ? Number(rewardForm.sortOrder) : undefined;
      if (editingReward) {
        await updateReward(editingReward.id, {
          code: rewardForm.code,
          name: rewardForm.name,
          description: rewardForm.description || null,
          pointsCost,
          sortOrder: sortOrder ?? null,
        });
        toast.success("Reward updated");
      } else {
        await createReward({
          outletId: activeOutletId,
          code: rewardForm.code,
          name: rewardForm.name,
          description: rewardForm.description || undefined,
          pointsCost,
          sortOrder,
        });
        toast.success("Reward created");
      }
      setRewardOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const rewardColumns: Column<LoyaltyRewardRow>[] = [
    { key: "code", header: "Code", sortable: true },
    { key: "name", header: "Name", sortable: true },
    { key: "pointsCost", header: "Points", render: (r) => r.pointsCost.toLocaleString() },
    {
      key: "isActive",
      header: "Status",
      render: (r) => (
        <span className={r.isActive ? "text-emerald-600" : "text-muted-foreground"}>
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => openEditReward(r)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              void setRewardActive(r.id, !r.isActive, activeOutletId!)
                .then(() => toast.success(r.isActive ? "Deactivated" : "Activated"))
                .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Failed"))
            }
            aria-label="Toggle active"
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleSimulate = async () => {
    if (!activeOutletId || !simForm.programId) {
      return toast.error("Select outlet and program");
    }
    try {
      await runSimulation({
        outletId: activeOutletId,
        programId: Number(simForm.programId),
        spendingAmount: Number(simForm.spendingAmount) || 0,
        visitCount: Number(simForm.visitCount) || 0,
        simulationDate: simForm.simulationDate,
      });
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Simulation failed");
    }
  };

  const programColumns: Column<LoyaltyProgramRow>[] = [
    { key: "code", header: "Code", sortable: true },
    { key: "name", header: "Name", sortable: true },
    { key: "type", header: "Type", render: (r) => typeLabel(r.type) },
    {
      key: "effective",
      header: "Effective",
      render: (r) =>
        [r.effectiveFrom, r.effectiveUntil].filter(Boolean).join(" → ") || "Always",
    },
    {
      key: "isActive",
      header: "Status",
      render: (r) => (
        <span className={r.isActive ? "text-emerald-600" : "text-muted-foreground"}>
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    { key: "rulesCount", header: "Rules" },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => openEditProgram(r)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              void setProgramActive(r.id, !r.isActive)
                .then(() => toast.success(r.isActive ? "Deactivated" : "Activated"))
                .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Failed"))
            }
            aria-label="Toggle active"
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (!activeOutletId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Loyalty Programs</h1>
        <p className="text-sm text-muted-foreground mt-2">Select an outlet to manage loyalty programs.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gift className="h-6 w-6" /> Loyalty Programs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure outlet programs, rules, and preview point accrual without changing live earning logic.
          </p>
        </div>
        {tab === "programs" && (
          <Button onClick={openNewProgram}>
            <Plus className="h-4 w-4 mr-1" /> New program
          </Button>
        )}
        {tab === "rewards" && (
          <Button onClick={openNewReward}>
            <Plus className="h-4 w-4 mr-1" /> New reward
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
          <TabsTrigger value="rewards">Loyalty Rewards</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="mt-4">
          <DataTable
            columns={programColumns}
            data={outletPrograms}
            rowKey={(r) => r.id}
            loading={loadingPrograms}
            emptyMessage="No loyalty programs for this outlet."
          />
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 min-w-[200px]">
              <Label>Program</Label>
              <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {outletPrograms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProgram && (
              <p className="text-sm text-muted-foreground pb-2">
                Rule type: <strong>{typeLabel(selectedProgram.type)}</strong>
              </p>
            )}
          </div>
          {selectedProgram && (
            <>
              <Textarea
                className="font-mono text-sm min-h-[160px]"
                value={ruleConfigJson}
                onChange={(e) => setRuleConfigJson(e.target.value)}
                disabled={loadingRules}
              />
              <p className="text-xs text-muted-foreground">
                spend_based: earnPerAmount, pointsEarned · visit_based: visit_threshold, points_awarded ·
                period_spending: period (monthly|weekly|yearly), minimum_spend, reward_percent · percentage_reward:
                percentage
              </p>
              <div className="flex gap-2">
                <Button onClick={() => void handleSaveRule()} disabled={saving || loadingRules}>
                  Save rule
                </Button>
                {rules[0] && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      void removeRule(rules[0].id, selectedProgram.id)
                        .then(() => toast.success("Rule removed"))
                        .catch((e) => toast.error(e instanceof ApiHttpError ? e.message : "Delete failed"))
                    }
                  >
                    Delete rule
                  </Button>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="rewards" className="mt-4">
          <DataTable
            columns={rewardColumns}
            data={rewards}
            rowKey={(r) => r.id}
            loading={loadingRewards}
            emptyMessage="No rewards defined for this outlet."
          />
        </TabsContent>

        <TabsContent value="simulator" className="mt-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-1">
              <Label>Program</Label>
              <Select
                value={simForm.programId}
                onValueChange={(v) => setSimForm((f) => ({ ...f, programId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {outletPrograms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Simulation date</Label>
              <Input
                type="date"
                value={simForm.simulationDate}
                onChange={(e) => setSimForm((f) => ({ ...f, simulationDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Spending amount</Label>
              <Input
                type="number"
                min={0}
                value={simForm.spendingAmount}
                onChange={(e) => setSimForm((f) => ({ ...f, spendingAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Visit count</Label>
              <Input
                type="number"
                min={0}
                value={simForm.visitCount}
                onChange={(e) => setSimForm((f) => ({ ...f, visitCount: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={() => void handleSimulate()} disabled={simulating}>
            <Calculator className="h-4 w-4 mr-1" />
            {simulating ? "Simulating…" : "Run simulation"}
          </Button>
          {lastSimulation && (
            <div className="rounded-lg border p-4 space-y-2 bg-card">
              <p className="font-semibold">
                Expected points: <span className="text-primary">{lastSimulation.expectedPoints}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {lastSimulation.programName} · effective: {lastSimulation.isEffective ? "yes" : "no"} · active:{" "}
                {lastSimulation.isActive ? "yes" : "no"}
              </p>
              {lastSimulation.triggeredRules.length > 0 && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <ListTree className="h-4 w-4" /> Triggered rules
                  </p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(lastSimulation.triggeredRules, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-sm font-medium">Breakdown</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(lastSimulation.breakdown, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          {loadingAnalytics && <p className="text-sm text-muted-foreground">Loading…</p>}
          {analytics && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Active members", value: analytics.activeMembers, icon: BarChart3 },
                { label: "Points issued", value: analytics.totalPointsIssued, icon: Gift },
                { label: "Visit rewards", value: analytics.visitRewardPoints ?? 0, icon: Gift },
                { label: "Period rewards", value: analytics.periodRewardPoints ?? 0, icon: Calculator },
                { label: "Redeemed points", value: analytics.redeemedPoints ?? 0, icon: Gift },
                { label: "Redeem transactions", value: analytics.redeemTransactions ?? 0, icon: ListTree },
                { label: "Active rewards", value: analytics.activeRewards ?? 0, icon: Gift },
                { label: "Reward redemptions", value: analytics.rewardRedemptions ?? 0, icon: Gift },
                { label: "Points on rewards", value: analytics.pointsSpentOnRewards ?? 0, icon: Calculator },
                { label: "Points adjusted", value: analytics.totalPointsAdjusted, icon: Calculator },
                { label: "Expired transactions", value: analytics.expiredTransactions ?? 0, icon: ListTree },
                { label: "Expired points", value: analytics.expiredPoints ?? 0, icon: Gift },
                { label: "Member balances", value: analytics.totalMemberBalances, icon: ListTree },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">Read-only snapshot for the selected outlet.</p>
        </TabsContent>
      </Tabs>

      <Dialog open={programOpen} onOpenChange={setProgramOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProgram ? "Edit program" : "New loyalty program"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editingProgram && (
              <>
                <div className="space-y-1">
                  <Label>Code</Label>
                  <Input value={programForm.code} onChange={(e) => setProgramForm((f) => ({ ...f, code: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select
                    value={programForm.type}
                    onValueChange={(v) => setProgramForm((f) => ({ ...f, type: v as LoyaltyProgramType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROGRAM_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={programForm.name} onChange={(e) => setProgramForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={programForm.description}
                onChange={(e) => setProgramForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Effective from</Label>
                <Input
                  type="date"
                  value={programForm.effectiveFrom}
                  onChange={(e) => setProgramForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Effective until</Label>
                <Input
                  type="date"
                  value={programForm.effectiveUntil}
                  onChange={(e) => setProgramForm((f) => ({ ...f, effectiveUntil: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="expiry-enabled"
                checked={programForm.expiryEnabled}
                onCheckedChange={(checked) =>
                  setProgramForm((f) => ({ ...f, expiryEnabled: checked === true }))
                }
              />
              <Label htmlFor="expiry-enabled" className="font-normal cursor-pointer">
                Enable expiry
              </Label>
            </div>
            {programForm.expiryEnabled && (
              <div className="space-y-1">
                <Label>Expiry days</Label>
                <Input
                  type="number"
                  min={1}
                  value={programForm.expiryDays}
                  onChange={(e) => setProgramForm((f) => ({ ...f, expiryDays: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Points from earn, visit, and period rewards expire after this many days.
                </p>
              </div>
            )}
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={programForm.isActive ? "active" : "inactive"}
                onValueChange={(v) => setProgramForm((f) => ({ ...f, isActive: v === "active" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgramOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveProgram()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rewardOpen} onOpenChange={setRewardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReward ? "Edit reward" : "New loyalty reward"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={rewardForm.code}
                onChange={(e) => setRewardForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={rewardForm.name} onChange={(e) => setRewardForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={rewardForm.description}
                onChange={(e) => setRewardForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Points cost</Label>
                <Input
                  type="number"
                  min={1}
                  value={rewardForm.pointsCost}
                  onChange={(e) => setRewardForm((f) => ({ ...f, pointsCost: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  min={0}
                  value={rewardForm.sortOrder}
                  onChange={(e) => setRewardForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRewardOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveReward()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
