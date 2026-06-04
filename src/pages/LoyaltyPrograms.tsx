import { useEffect, useMemo, useState } from "react";
import { Gift, Plus, Pencil, Power, Calculator, BarChart3, ListTree, Users, Megaphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/DataTable";
import { LoyaltyAnalyticsDashboard } from "@/components/loyalty/LoyaltyAnalyticsDashboard";
import { useOutletStore } from "@/stores/outletStore";
import {
  useLoyaltyEngineStore,
} from "@/stores/loyaltyEngineStore";
import type {
  LoyaltyProgramRow,
  LoyaltyProgramType,
  LoyaltyRewardRow,
  LoyaltyVoucherRow,
  LoyaltyVoucherType,
  LoyaltyVoucherValueType,
  LoyaltyCampaignAudience,
  LoyaltyCampaignRow,
  LoyaltyCampaignSnapshot,
  LoyaltyCampaignStatus,
  MemberSegmentPreviewMember,
  MemberSegmentRow,
  MemberSegmentType,
  LoyaltyTierQualificationType,
  LoyaltyTierRow,
  LoyaltyAutomationActionType,
  LoyaltyAutomationLogRow,
  LoyaltyAutomationRow,
  LoyaltyAutomationTriggerType,
} from "@/lib/api-integration/loyaltyEngineEndpoints";
import { ApiHttpError } from "@/lib/api-integration/client";
import { toast } from "sonner";

const PROGRAM_TYPES: { value: LoyaltyProgramType; label: string }[] = [
  { value: "spend_based", label: "Spend based" },
  { value: "visit_based", label: "Visit based" },
  { value: "period_spending", label: "Period spending" },
  { value: "percentage_reward", label: "Percentage reward" },
];

const SEGMENT_TYPES: { value: MemberSegmentType; label: string }[] = [
  { value: "vip_spender", label: "VIP spender" },
  { value: "frequent_visitor", label: "Frequent visitor" },
  { value: "birthday_month", label: "Birthday month" },
  { value: "inactive_member", label: "Inactive member" },
  { value: "never_redeemed", label: "Never redeemed" },
  { value: "expiring_soon", label: "Expiring soon" },
];

function defaultSegmentConfig(type: MemberSegmentType): Record<string, unknown> {
  switch (type) {
    case "vip_spender":
      return { minimum_spending: 5000000 };
    case "frequent_visitor":
      return { minimum_visits: 20 };
    case "inactive_member":
      return { inactive_days: 90 };
    case "expiring_soon":
      return { days_before_expiry: 30 };
    default:
      return {};
  }
}

const segmentTypeLabel = (t: string) => SEGMENT_TYPES.find((s) => s.value === t)?.label ?? t;

const TIER_TYPES: { value: LoyaltyTierQualificationType; label: string }[] = [
  { value: "lifetime_points", label: "Lifetime points" },
  { value: "lifetime_spending", label: "Lifetime spending" },
  { value: "visit_count", label: "Visit count" },
];

function defaultTierConfig(type: LoyaltyTierQualificationType): Record<string, unknown> {
  switch (type) {
    case "lifetime_points":
      return { minimum_points: 1000 };
    case "lifetime_spending":
      return { minimum_spending: 5000000 };
    case "visit_count":
      return { minimum_visits: 20 };
  }
}

const tierTypeLabel = (t: string) => TIER_TYPES.find((s) => s.value === t)?.label ?? t;

const AUTOMATION_TRIGGERS: { value: LoyaltyAutomationTriggerType; label: string }[] = [
  { value: "member_birthday", label: "Member birthday" },
  { value: "member_created", label: "Member created" },
  { value: "tier_upgraded", label: "Tier upgraded" },
  { value: "visit_milestone", label: "Visit milestone" },
  { value: "points_milestone", label: "Points milestone" },
  { value: "inactive_member", label: "Inactive member" },
  { value: "voucher_redeemed", label: "Voucher redeemed" },
  { value: "reward_redeemed", label: "Reward redeemed" },
];

const AUTOMATION_ACTIONS: { value: LoyaltyAutomationActionType; label: string }[] = [
  { value: "issue_voucher", label: "Issue voucher" },
  { value: "send_notification", label: "Send notification" },
  { value: "assign_campaign", label: "Assign campaign" },
];

function defaultAutomationCondition(trigger: LoyaltyAutomationTriggerType): Record<string, unknown> {
  switch (trigger) {
    case "member_birthday":
      return { daysBefore: 0 };
    case "visit_milestone":
      return { visitCount: 10 };
    case "points_milestone":
      return { points: 1000 };
    case "inactive_member":
      return { daysInactive: 30 };
    default:
      return {};
  }
}

function defaultAutomationPreset(trigger: LoyaltyAutomationTriggerType): { code: string; name: string } {
  switch (trigger) {
    case "member_birthday":
      return { code: "BDAY_VOUCHER", name: "Birthday Voucher" };
    case "inactive_member":
      return { code: "INACTIVE_VOUCHER", name: "Inactive Customer Voucher" };
    case "tier_upgraded":
      return { code: "TIER_NOTIFY", name: "Tier Upgrade Notification" };
    case "visit_milestone":
      return { code: "VISIT_REWARD", name: "Visit Milestone Reward" };
    case "points_milestone":
      return { code: "POINTS_CAMPAIGN", name: "Points Milestone Campaign" };
    default:
      return { code: "", name: "" };
  }
}

function defaultAutomationActionConfig(action: LoyaltyAutomationActionType): Record<string, unknown> {
  switch (action) {
    case "send_notification":
      return {
        title: "Hello {{member_name}}",
        content: "Thank you for being a loyal member.",
      };
    default:
      return {};
  }
}

const automationTriggerLabel = (t: string) => AUTOMATION_TRIGGERS.find((s) => s.value === t)?.label ?? t;
const automationActionLabel = (t: string) => AUTOMATION_ACTIONS.find((s) => s.value === t)?.label ?? t;

const defaultTierBenefitConfig = () => ({
  priorityCampaign: false,
  exclusiveVoucher: false,
  exclusiveReward: false,
  monthlyVoucher: false,
});

type TierBenefitKey = keyof ReturnType<typeof defaultTierBenefitConfig>;

const TIER_BENEFIT_OPTIONS: { key: TierBenefitKey; label: string }[] = [
  { key: "priorityCampaign", label: "Priority Campaign Access" },
  { key: "exclusiveVoucher", label: "Exclusive Voucher Access" },
  { key: "exclusiveReward", label: "Exclusive Reward Access" },
  { key: "monthlyVoucher", label: "Monthly Voucher Program" },
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
    lastSimulation,
    loadingPrograms,
    loadingRules,
    simulating,
    fetchPrograms,
    createProgram,
    updateProgram,
    setProgramActive,
    fetchRules,
    saveRule,
    removeRule,
    runSimulation,
    rewards,
    loadingRewards,
    fetchRewards,
    createReward,
    updateReward,
    setRewardActive,
    vouchers,
    loadingVouchers,
    fetchVouchers,
    createVoucher,
    updateVoucher,
    setVoucherActive,
    issueCampaignVoucher,
    segments,
    loadingSegments,
    fetchSegments,
    createSegment,
    updateSegment,
    setSegmentActive,
    previewSegment,
    tiers,
    loadingTiers,
    fetchTiers,
    createTier,
    updateTier,
    setTierActive,
    automations,
    loadingAutomations,
    fetchAutomations,
    createAutomation,
    updateAutomation,
    setAutomationActive,
    fetchAutomationLogs,
    campaigns,
    loadingCampaigns,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    updateCampaignStatus,
    fetchCampaignAudience,
    fetchCampaignAudienceSnapshot,
    activateCampaign,
    completeCampaign,
    cancelCampaign,
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
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<LoyaltyVoucherRow | null>(null);
  const [voucherForm, setVoucherForm] = useState({
    code: "",
    name: "",
    description: "",
    voucherType: "manual" as LoyaltyVoucherType,
    valueType: "fixed_amount" as LoyaltyVoucherValueType,
    value: "10000",
    minimumSpend: "0",
    validFrom: "",
    validUntil: "",
  });
  const [issueVoucherOpen, setIssueVoucherOpen] = useState(false);
  const [issueVoucherCampaign, setIssueVoucherCampaign] = useState<LoyaltyCampaignRow | null>(null);
  const [issueVoucherId, setIssueVoucherId] = useState("");
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<MemberSegmentRow | null>(null);
  const [segmentForm, setSegmentForm] = useState({
    code: "",
    name: "",
    description: "",
    segmentType: "vip_spender" as MemberSegmentType,
    configJson: JSON.stringify(defaultSegmentConfig("vip_spender"), null, 2),
    isActive: true,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSegmentRow, setPreviewSegmentRow] = useState<MemberSegmentRow | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [previewMembers, setPreviewMembers] = useState<MemberSegmentPreviewMember[]>([]);
  const [tierOpen, setTierOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTierRow | null>(null);
  const [tierForm, setTierForm] = useState({
    code: "",
    name: "",
    description: "",
    qualificationType: "lifetime_points" as LoyaltyTierQualificationType,
    configJson: JSON.stringify(defaultTierConfig("lifetime_points"), null, 2),
    benefits: defaultTierBenefitConfig(),
    sortOrder: "0",
    isActive: true,
  });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<LoyaltyCampaignRow | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    code: "",
    name: "",
    description: "",
    segmentId: "",
    campaignType: "audience",
    scheduledAt: "",
    status: "draft" as LoyaltyCampaignStatus,
  });
  const [campaignAudienceOpen, setCampaignAudienceOpen] = useState(false);
  const [campaignAudience, setCampaignAudience] = useState<LoyaltyCampaignAudience | null>(null);
  const [campaignAudienceLoading, setCampaignAudienceLoading] = useState(false);
  const [campaignSnapshotOpen, setCampaignSnapshotOpen] = useState(false);
  const [campaignSnapshot, setCampaignSnapshot] = useState<LoyaltyCampaignSnapshot | null>(null);
  const [campaignSnapshotLoading, setCampaignSnapshotLoading] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<LoyaltyAutomationRow | null>(null);
  const [automationForm, setAutomationForm] = useState({
    code: "",
    name: "",
    description: "",
    triggerType: "member_created" as LoyaltyAutomationTriggerType,
    actionType: "send_notification" as LoyaltyAutomationActionType,
    daysBefore: "0",
    visitCount: "10",
    points: "1000",
    daysInactive: "30",
    voucherId: "",
    campaignId: "",
    notificationTitle: "Hello {{member_name}}",
    notificationContent: "Thank you for being a loyal member.",
    isActive: true,
  });
  const [automationLogsOpen, setAutomationLogsOpen] = useState(false);
  const [automationLogsLoading, setAutomationLogsLoading] = useState(false);
  const [automationLogs, setAutomationLogs] = useState<LoyaltyAutomationLogRow[]>([]);
  const [automationLogsTitle, setAutomationLogsTitle] = useState("");

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
    if (tab === "rewards" && activeOutletId) {
      void fetchRewards(activeOutletId).catch((e) =>
        toast.error(e instanceof ApiHttpError ? e.message : "Failed to load rewards"),
      );
    }
  }, [tab, activeOutletId, fetchRewards]);

  useEffect(() => {
    if (tab === "vouchers" && activeOutletId) {
      void fetchVouchers(activeOutletId).catch((e) =>
        toast.error(e instanceof ApiHttpError ? e.message : "Failed to load vouchers"),
      );
    }
  }, [tab, activeOutletId, fetchVouchers]);

  useEffect(() => {
    if (tab === "segments" && activeOutletId) {
      void fetchSegments(activeOutletId).catch((e) =>
        toast.error(e instanceof ApiHttpError ? e.message : "Failed to load segments"),
      );
    }
  }, [tab, activeOutletId, fetchSegments]);

  useEffect(() => {
    if (tab === "tiers" && activeOutletId) {
      void fetchTiers(activeOutletId).catch((e) =>
        toast.error(e instanceof ApiHttpError ? e.message : "Failed to load tiers"),
      );
    }
  }, [tab, activeOutletId, fetchTiers]);

  useEffect(() => {
    if (tab === "automations" && activeOutletId) {
      void fetchAutomations(activeOutletId).catch((e) =>
        toast.error(e instanceof ApiHttpError ? e.message : "Failed to load automations"),
      );
      void fetchVouchers(activeOutletId).catch(() => undefined);
      void fetchCampaigns(activeOutletId).catch(() => undefined);
    }
  }, [tab, activeOutletId, fetchAutomations, fetchVouchers, fetchCampaigns]);

  useEffect(() => {
    if (tab === "campaigns" && activeOutletId) {
      void fetchCampaigns(activeOutletId).catch((e) =>
        toast.error(e instanceof ApiHttpError ? e.message : "Failed to load campaigns"),
      );
      void fetchSegments(activeOutletId).catch(() => undefined);
      void fetchVouchers(activeOutletId).catch(() => undefined);
    }
  }, [tab, activeOutletId, fetchCampaigns, fetchSegments, fetchVouchers]);

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

  const openNewVoucher = () => {
    setEditingVoucher(null);
    setVoucherForm({
      code: "",
      name: "",
      description: "",
      voucherType: "manual",
      valueType: "fixed_amount",
      value: "10000",
      minimumSpend: "0",
      validFrom: "",
      validUntil: "",
    });
    setVoucherOpen(true);
  };

  const openEditVoucher = (v: LoyaltyVoucherRow) => {
    setEditingVoucher(v);
    setVoucherForm({
      code: v.code,
      name: v.name,
      description: v.description ?? "",
      voucherType: v.voucherType,
      valueType: v.valueType,
      value: String(v.value),
      minimumSpend: String(v.minimumSpend),
      validFrom: v.validFrom ? v.validFrom.slice(0, 16) : "",
      validUntil: v.validUntil ? v.validUntil.slice(0, 16) : "",
    });
    setVoucherOpen(true);
  };

  const handleSaveVoucher = async () => {
    if (!activeOutletId || !voucherForm.code.trim() || !voucherForm.name.trim()) {
      return toast.error("Code and name are required");
    }
    setSaving(true);
    try {
      const payload = {
        code: voucherForm.code,
        name: voucherForm.name,
        description: voucherForm.description || undefined,
        voucherType: voucherForm.voucherType,
        valueType: voucherForm.valueType,
        value: Number(voucherForm.value) || 0,
        minimumSpend: Number(voucherForm.minimumSpend) || 0,
        validFrom: voucherForm.validFrom ? new Date(voucherForm.validFrom).toISOString() : null,
        validUntil: voucherForm.validUntil ? new Date(voucherForm.validUntil).toISOString() : null,
      };
      if (editingVoucher) {
        await updateVoucher(editingVoucher.id, payload, activeOutletId);
        toast.success("Voucher updated");
      } else {
        await createVoucher({ outletId: activeOutletId, ...payload });
        toast.success("Voucher created");
      }
      setVoucherOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openIssueVoucher = (campaign: LoyaltyCampaignRow) => {
    setIssueVoucherCampaign(campaign);
    setIssueVoucherId(vouchers.find((v) => v.isActive)?.id ?? "");
    setIssueVoucherOpen(true);
  };

  const handleIssueVoucher = async () => {
    if (!activeOutletId || !issueVoucherCampaign || !issueVoucherId) {
      return toast.error("Select a voucher");
    }
    setSaving(true);
    try {
      const result = await issueCampaignVoucher(
        issueVoucherCampaign.id,
        Number(issueVoucherId),
        activeOutletId,
      );
      toast.success(`Issued ${result.issuedCount} voucher(s), skipped ${result.skippedCount}`);
      setIssueVoucherOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Issue failed");
    } finally {
      setSaving(false);
    }
  };

  const openNewSegment = () => {
    setEditingSegment(null);
    setSegmentForm({
      code: "",
      name: "",
      description: "",
      segmentType: "vip_spender",
      configJson: JSON.stringify(defaultSegmentConfig("vip_spender"), null, 2),
      isActive: true,
    });
    setSegmentOpen(true);
  };

  const openEditSegment = (s: MemberSegmentRow) => {
    setEditingSegment(s);
    setSegmentForm({
      code: s.code,
      name: s.name,
      description: s.description ?? "",
      segmentType: s.segmentType,
      configJson: JSON.stringify(s.config ?? {}, null, 2),
      isActive: s.isActive,
    });
    setSegmentOpen(true);
  };

  const handleSaveSegment = async () => {
    if (!activeOutletId || !segmentForm.code.trim() || !segmentForm.name.trim()) {
      return toast.error("Code and name are required");
    }
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(segmentForm.configJson) as Record<string, unknown>;
    } catch {
      return toast.error("Config must be valid JSON");
    }
    setSaving(true);
    try {
      if (editingSegment) {
        await updateSegment(
          editingSegment.id,
          {
            code: segmentForm.code,
            name: segmentForm.name,
            description: segmentForm.description || null,
            segmentType: segmentForm.segmentType,
            config,
          },
          activeOutletId,
        );
        if (editingSegment.isActive !== segmentForm.isActive) {
          await setSegmentActive(editingSegment.id, segmentForm.isActive, activeOutletId);
        }
        toast.success("Segment updated");
      } else {
        await createSegment({
          outletId: activeOutletId,
          code: segmentForm.code,
          name: segmentForm.name,
          description: segmentForm.description || undefined,
          segmentType: segmentForm.segmentType,
          config,
          isActive: segmentForm.isActive,
        });
        toast.success("Segment created");
      }
      setSegmentOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openNewTier = () => {
    setEditingTier(null);
    setTierForm({
      code: "",
      name: "",
      description: "",
      qualificationType: "lifetime_points",
      configJson: JSON.stringify(defaultTierConfig("lifetime_points"), null, 2),
      benefits: defaultTierBenefitConfig(),
      sortOrder: "0",
      isActive: true,
    });
    setTierOpen(true);
  };

  const openEditTier = (t: LoyaltyTierRow) => {
    setEditingTier(t);
    setTierForm({
      code: t.code,
      name: t.name,
      description: t.description ?? "",
      qualificationType: t.qualificationType,
      configJson: JSON.stringify(t.qualificationConfig ?? {}, null, 2),
      benefits: {
        ...defaultTierBenefitConfig(),
        ...(t.benefitConfig ?? {}),
      },
      sortOrder: String(t.sortOrder ?? 0),
      isActive: t.isActive,
    });
    setTierOpen(true);
  };

  const handleSaveTier = async () => {
    if (!activeOutletId || !tierForm.code.trim() || !tierForm.name.trim()) {
      return toast.error("Code and name are required");
    }
    let qualificationConfig: Record<string, unknown>;
    try {
      qualificationConfig = JSON.parse(tierForm.configJson) as Record<string, unknown>;
    } catch {
      return toast.error("Qualification config must be valid JSON");
    }
    setSaving(true);
    try {
      const sortOrder = Number(tierForm.sortOrder) || 0;
      if (editingTier) {
        await updateTier(
          editingTier.id,
          {
            code: tierForm.code,
            name: tierForm.name,
            description: tierForm.description || null,
            qualificationType: tierForm.qualificationType,
            qualificationConfig,
            benefitConfig: tierForm.benefits,
            sortOrder,
          },
          activeOutletId,
        );
        if (editingTier.isActive !== tierForm.isActive) {
          await setTierActive(editingTier.id, tierForm.isActive, activeOutletId);
        }
        toast.success("Tier updated");
      } else {
        await createTier({
          outletId: activeOutletId,
          code: tierForm.code,
          name: tierForm.name,
          description: tierForm.description || undefined,
          qualificationType: tierForm.qualificationType,
          qualificationConfig,
          benefitConfig: tierForm.benefits,
          sortOrder,
          isActive: tierForm.isActive,
        });
        toast.success("Tier created");
      }
      setTierOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openNewAutomation = () => {
    const triggerType = "member_created" as LoyaltyAutomationTriggerType;
    const preset = defaultAutomationPreset(triggerType);
    setEditingAutomation(null);
    setAutomationForm({
      code: preset.code,
      name: preset.name || "Welcome Notification",
      description: "",
      triggerType,
      actionType: "send_notification",
      daysBefore: "0",
      visitCount: "10",
      points: "1000",
      daysInactive: "30",
      voucherId: vouchers[0]?.id ?? "",
      campaignId: campaigns[0]?.id ?? "",
      notificationTitle: "Welcome {{member_name}}",
      notificationContent: "Thanks for joining our loyalty program.",
      isActive: true,
    });
    setAutomationOpen(true);
  };

  const openEditAutomation = (row: LoyaltyAutomationRow) => {
    const condition = row.condition ?? {};
    const actionConfig = row.actionConfig ?? {};
    setEditingAutomation(row);
    setAutomationForm({
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      triggerType: row.triggerType,
      actionType: row.actionType,
      daysBefore: String(condition.daysBefore ?? 0),
      visitCount: String(condition.visitCount ?? 10),
      points: String(condition.points ?? 1000),
      daysInactive: String(condition.daysInactive ?? 30),
      voucherId: String(actionConfig.voucherId ?? vouchers[0]?.id ?? ""),
      campaignId: String(actionConfig.campaignId ?? campaigns[0]?.id ?? ""),
      notificationTitle: String(actionConfig.title ?? "Hello {{member_name}}"),
      notificationContent: String(actionConfig.content ?? row.description ?? row.name),
      isActive: row.isActive,
    });
    setAutomationOpen(true);
  };

  const buildAutomationCondition = (): Record<string, unknown> => {
    switch (automationForm.triggerType) {
      case "member_birthday":
        return { daysBefore: Number(automationForm.daysBefore) || 0 };
      case "visit_milestone":
        return { visitCount: Number(automationForm.visitCount) || 0 };
      case "points_milestone":
        return { points: Number(automationForm.points) || 0 };
      case "inactive_member":
        return { daysInactive: Number(automationForm.daysInactive) || 0 };
      default:
        return {};
    }
  };

  const buildAutomationActionConfig = (): Record<string, unknown> => {
    switch (automationForm.actionType) {
      case "issue_voucher":
        return { voucherId: Number(automationForm.voucherId) || 0 };
      case "assign_campaign":
        return { campaignId: Number(automationForm.campaignId) || 0 };
      case "send_notification":
        return {
          title: automationForm.notificationTitle,
          content: automationForm.notificationContent,
        };
      default:
        return {};
    }
  };

  const handleSaveAutomation = async () => {
    if (!activeOutletId || !automationForm.code.trim() || !automationForm.name.trim()) {
      return toast.error("Code and name are required");
    }
    setSaving(true);
    try {
      const payload = {
        code: automationForm.code,
        name: automationForm.name,
        description: automationForm.description || undefined,
        triggerType: automationForm.triggerType,
        condition: buildAutomationCondition(),
        actionType: automationForm.actionType,
        actionConfig: buildAutomationActionConfig(),
        isActive: automationForm.isActive,
      };
      if (editingAutomation) {
        await updateAutomation(editingAutomation.id, payload, activeOutletId);
        if (editingAutomation.isActive !== automationForm.isActive) {
          await setAutomationActive(editingAutomation.id, automationForm.isActive, activeOutletId);
        }
        toast.success("Automation updated");
      } else {
        await createAutomation({ outletId: activeOutletId, ...payload });
        toast.success("Automation created");
      }
      setAutomationOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleViewAutomationLogs = async (row: LoyaltyAutomationRow) => {
    setAutomationLogsTitle(row.name);
    setAutomationLogsOpen(true);
    setAutomationLogsLoading(true);
    setAutomationLogs([]);
    try {
      const logs = await fetchAutomationLogs(row.id, 50);
      setAutomationLogs(logs);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to load logs");
    } finally {
      setAutomationLogsLoading(false);
    }
  };

  const handlePreviewSegment = async (segment: MemberSegmentRow) => {
    setPreviewSegmentRow(segment);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const result = await previewSegment(segment.id, 50);
      setPreviewCount(result.count);
      setPreviewMembers(result.members);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Preview failed");
      setPreviewCount(0);
      setPreviewMembers([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const openNewCampaign = () => {
    setEditingCampaign(null);
    setCampaignForm({
      code: "",
      name: "",
      description: "",
      segmentId: segments[0]?.id ?? "",
      campaignType: "audience",
      scheduledAt: "",
      status: "draft",
    });
    setCampaignOpen(true);
  };

  const openEditCampaign = (c: LoyaltyCampaignRow) => {
    setEditingCampaign(c);
    setCampaignForm({
      code: c.code,
      name: c.name,
      description: c.description ?? "",
      segmentId: c.segmentId,
      campaignType: c.campaignType,
      scheduledAt: c.scheduledAt ? c.scheduledAt.slice(0, 16) : "",
      status: c.status,
    });
    setCampaignOpen(true);
  };

  const handleSaveCampaign = async () => {
    if (!activeOutletId || !campaignForm.code.trim() || !campaignForm.name.trim() || !campaignForm.segmentId) {
      return toast.error("Code, name, and segment are required");
    }
    setSaving(true);
    try {
      const scheduledAt = campaignForm.scheduledAt
        ? new Date(campaignForm.scheduledAt).toISOString()
        : null;
      if (editingCampaign) {
        await updateCampaign(
          editingCampaign.id,
          {
            code: campaignForm.code,
            name: campaignForm.name,
            description: campaignForm.description || null,
            segmentId: Number(campaignForm.segmentId),
            campaignType: campaignForm.campaignType,
            scheduledAt,
          },
          activeOutletId,
        );
        if (editingCampaign.status !== campaignForm.status) {
          await updateCampaignStatus(editingCampaign.id, campaignForm.status, activeOutletId);
        }
        toast.success("Campaign updated");
      } else {
        await createCampaign({
          outletId: activeOutletId,
          code: campaignForm.code,
          name: campaignForm.name,
          description: campaignForm.description || undefined,
          segmentId: Number(campaignForm.segmentId),
          campaignType: campaignForm.campaignType,
          scheduledAt,
        });
        toast.success("Campaign created");
      }
      setCampaignOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCampaignAudience = async (campaign: LoyaltyCampaignRow) => {
    setCampaignAudienceOpen(true);
    setCampaignAudienceLoading(true);
    setCampaignAudience(null);
    try {
      const data = await fetchCampaignAudience(campaign.id, 50);
      setCampaignAudience(data);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Audience preview failed");
    } finally {
      setCampaignAudienceLoading(false);
    }
  };

  const handleCampaignSnapshot = async (campaign: LoyaltyCampaignRow) => {
    setCampaignSnapshotOpen(true);
    setCampaignSnapshotLoading(true);
    setCampaignSnapshot(null);
    try {
      const data = await fetchCampaignAudienceSnapshot(campaign.id, 50);
      setCampaignSnapshot(data);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Snapshot load failed");
    } finally {
      setCampaignSnapshotLoading(false);
    }
  };

  const handleActivateCampaign = async (campaign: LoyaltyCampaignRow) => {
    if (!activeOutletId) return;
    try {
      await activateCampaign(campaign.id, activeOutletId);
      toast.success("Campaign activated");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Activation failed");
    }
  };

  const handleCompleteCampaign = async (campaign: LoyaltyCampaignRow) => {
    if (!activeOutletId) return;
    try {
      await completeCampaign(campaign.id, activeOutletId);
      toast.success("Campaign completed");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Complete failed");
    }
  };

  const handleCancelCampaign = async (campaign: LoyaltyCampaignRow) => {
    if (!activeOutletId) return;
    try {
      await cancelCampaign(campaign.id, activeOutletId);
      toast.success("Campaign cancelled");
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Cancel failed");
    }
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

  const voucherColumns: Column<LoyaltyVoucherRow>[] = [
    { key: "code", header: "Code", sortable: true },
    { key: "name", header: "Name", sortable: true },
    { key: "voucherType", header: "Type", render: (r) => r.voucherType.replace(/_/g, " ") },
    {
      key: "value",
      header: "Value",
      render: (r) =>
        r.valueType === "percentage"
          ? `${r.value}%`
          : r.valueType === "free_item"
            ? "Free item"
            : r.value.toLocaleString(),
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
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => openEditVoucher(r)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              void setVoucherActive(r.id, !r.isActive, activeOutletId!)
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

  const segmentColumns: Column<MemberSegmentRow>[] = [
    { key: "code", header: "Code", sortable: true },
    { key: "name", header: "Name", sortable: true },
    { key: "segmentType", header: "Type", render: (r) => segmentTypeLabel(r.segmentType) },
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
          <Button size="icon" variant="ghost" onClick={() => void handlePreviewSegment(r)} aria-label="Preview">
            <Users className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => openEditSegment(r)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              void setSegmentActive(r.id, !r.isActive, activeOutletId!)
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

  const tierColumns: Column<LoyaltyTierRow>[] = [
    { key: "code", header: "Code", sortable: true },
    { key: "name", header: "Name", sortable: true },
    { key: "qualificationType", header: "Qualification", render: (r) => tierTypeLabel(r.qualificationType) },
    { key: "sortOrder", header: "Order", sortable: true },
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
          <Button size="icon" variant="ghost" onClick={() => openEditTier(r)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              void setTierActive(r.id, !r.isActive, activeOutletId!)
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

  const automationColumns: Column<LoyaltyAutomationRow>[] = [
    { key: "code", header: "Code", sortable: true },
    { key: "name", header: "Name", sortable: true },
    { key: "triggerType", header: "Trigger", render: (r) => automationTriggerLabel(r.triggerType) },
    { key: "actionType", header: "Action", render: (r) => automationActionLabel(r.actionType) },
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
          <Button size="icon" variant="ghost" onClick={() => void handleViewAutomationLogs(r)} aria-label="Logs">
            <ListTree className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => openEditAutomation(r)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              void setAutomationActive(r.id, !r.isActive, activeOutletId!)
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

  const campaignColumns: Column<LoyaltyCampaignRow>[] = [
    { key: "name", header: "Campaign", sortable: true },
    {
      key: "segment",
      header: "Segment",
      render: (r) => r.segment?.name ?? segments.find((s) => s.id === r.segmentId)?.name ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <span className="capitalize">{r.status}</span>,
    },
    {
      key: "audienceCount",
      header: "Audience",
      render: (r) => (r.audienceCount ?? 0).toLocaleString(),
    },
    {
      key: "capturedCount",
      header: "Captured",
      render: (r) => (r.capturedCount ?? 0).toLocaleString(),
    },
    {
      key: "issuedVoucherCount",
      header: "Issued",
      render: (r) => (r.issuedVoucherCount ?? 0).toLocaleString(),
    },
    {
      key: "scheduledAt",
      header: "Scheduled",
      render: (r) => (r.scheduledAt ? new Date(r.scheduledAt).toLocaleString() : "—"),
    },
    {
      key: "activatedAt",
      header: "Activated",
      render: (r) => (r.activatedAt ? new Date(r.activatedAt).toLocaleString() : "—"),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1 justify-end flex-wrap">
          <Button size="icon" variant="ghost" onClick={() => void handleCampaignAudience(r)} aria-label="Live audience">
            <Users className="h-4 w-4" />
          </Button>
          {(r.status === "active" || r.status === "completed" || (r.capturedCount ?? 0) > 0) && (
            <Button size="icon" variant="ghost" onClick={() => void handleCampaignSnapshot(r)} aria-label="Snapshot">
              <ListTree className="h-4 w-4" />
            </Button>
          )}
          {(r.status === "active" || r.status === "completed") && (r.capturedCount ?? 0) > 0 && (
            <Button size="sm" variant="outline" onClick={() => openIssueVoucher(r)}>
              Issue voucher
            </Button>
          )}
          {(r.status === "draft" || r.status === "scheduled") && (
            <Button size="sm" variant="outline" onClick={() => void handleActivateCampaign(r)}>
              Activate
            </Button>
          )}
          {r.status === "active" && (
            <Button size="sm" variant="outline" onClick={() => void handleCompleteCampaign(r)}>
              Complete
            </Button>
          )}
          {(r.status === "draft" || r.status === "scheduled" || r.status === "active") && (
            <Button size="sm" variant="ghost" onClick={() => void handleCancelCampaign(r)}>
              Cancel
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => openEditCampaign(r)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
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
        {tab === "vouchers" && (
          <Button onClick={openNewVoucher}>
            <Plus className="h-4 w-4 mr-1" /> New voucher
          </Button>
        )}
        {tab === "segments" && (
          <Button onClick={openNewSegment}>
            <Plus className="h-4 w-4 mr-1" /> New segment
          </Button>
        )}
        {tab === "tiers" && (
          <Button onClick={openNewTier}>
            <Plus className="h-4 w-4 mr-1" /> New tier
          </Button>
        )}
        {tab === "campaigns" && (
          <Button onClick={openNewCampaign}>
            <Plus className="h-4 w-4 mr-1" /> New campaign
          </Button>
        )}
        {tab === "automations" && (
          <Button onClick={openNewAutomation}>
            <Plus className="h-4 w-4 mr-1" /> New automation
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
          <TabsTrigger value="rewards">Loyalty Rewards</TabsTrigger>
          <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="tiers">Membership Tiers</TabsTrigger>
          <TabsTrigger value="campaigns">Loyalty Campaigns</TabsTrigger>
          <TabsTrigger value="automations">Automation</TabsTrigger>
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

        <TabsContent value="vouchers" className="mt-4">
          <DataTable
            columns={voucherColumns}
            data={vouchers}
            rowKey={(r) => r.id}
            loading={loadingVouchers}
            emptyMessage="No vouchers defined for this outlet."
          />
        </TabsContent>

        <TabsContent value="segments" className="mt-4">
          <DataTable
            columns={segmentColumns}
            data={segments}
            rowKey={(r) => r.id}
            loading={loadingSegments}
            emptyMessage="No member segments defined for this outlet."
          />
        </TabsContent>

        <TabsContent value="tiers" className="mt-4">
          <DataTable
            columns={tierColumns}
            data={tiers}
            rowKey={(r) => r.id}
            loading={loadingTiers}
            emptyMessage="No membership tiers defined for this outlet."
          />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <DataTable
            columns={campaignColumns}
            data={campaigns}
            rowKey={(r) => r.id}
            loading={loadingCampaigns}
            emptyMessage="No loyalty campaigns for this outlet."
          />
        </TabsContent>

        <TabsContent value="automations" className="mt-4">
          <DataTable
            columns={automationColumns}
            data={automations}
            rowKey={(r) => r.id}
            loading={loadingAutomations}
            emptyMessage="No loyalty automations for this outlet."
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
          {activeOutletId ? (
            <LoyaltyAnalyticsDashboard outletId={activeOutletId} />
          ) : (
            <p className="text-sm text-muted-foreground">Select an outlet to view loyalty analytics.</p>
          )}
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

      <Dialog open={segmentOpen} onOpenChange={setSegmentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSegment ? "Edit segment" : "New member segment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={segmentForm.code}
                onChange={(e) => setSegmentForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={segmentForm.name} onChange={(e) => setSegmentForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={segmentForm.description}
                onChange={(e) => setSegmentForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Segment type</Label>
              <Select
                value={segmentForm.segmentType}
                onValueChange={(v) => {
                  const type = v as MemberSegmentType;
                  setSegmentForm((f) => ({
                    ...f,
                    segmentType: type,
                    configJson: JSON.stringify(defaultSegmentConfig(type), null, 2),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Config (JSON)</Label>
              <Textarea
                className="font-mono text-sm min-h-[120px]"
                value={segmentForm.configJson}
                onChange={(e) => setSegmentForm((f) => ({ ...f, configJson: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={segmentForm.isActive ? "active" : "inactive"}
                onValueChange={(v) => setSegmentForm((f) => ({ ...f, isActive: v === "active" }))}
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
            <Button variant="outline" onClick={() => setSegmentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveSegment()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tierOpen} onOpenChange={setTierOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTier ? "Edit tier" : "New membership tier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={tierForm.code}
                onChange={(e) => setTierForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={tierForm.name} onChange={(e) => setTierForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={tierForm.description}
                onChange={(e) => setTierForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Qualification type</Label>
              <Select
                value={tierForm.qualificationType}
                onValueChange={(v) => {
                  const type = v as LoyaltyTierQualificationType;
                  setTierForm((f) => ({
                    ...f,
                    qualificationType: type,
                    configJson: JSON.stringify(defaultTierConfig(type), null, 2),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Qualification config (JSON)</Label>
              <Textarea
                className="font-mono text-sm min-h-[120px]"
                value={tierForm.configJson}
                onChange={(e) => setTierForm((f) => ({ ...f, configJson: e.target.value }))}
              />
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Benefits</p>
              <p className="text-xs text-muted-foreground">Informational privileges for this tier. No automatic actions.</p>
              <div className="space-y-2">
                {TIER_BENEFIT_OPTIONS.map((option) => (
                  <label key={option.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={tierForm.benefits[option.key]}
                      onCheckedChange={(checked) =>
                        setTierForm((f) => ({
                          ...f,
                          benefits: { ...f.benefits, [option.key]: checked === true },
                        }))
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Sort order</Label>
              <Input
                type="number"
                min={0}
                value={tierForm.sortOrder}
                onChange={(e) => setTierForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={tierForm.isActive ? "active" : "inactive"}
                onValueChange={(v) => setTierForm((f) => ({ ...f, isActive: v === "active" }))}
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
            <Button variant="outline" onClick={() => setTierOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveTier()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={automationOpen} onOpenChange={setAutomationOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAutomation ? "Edit automation" : "New automation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={automationForm.code}
                onChange={(e) => setAutomationForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={automationForm.name}
                onChange={(e) => setAutomationForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={automationForm.description}
                onChange={(e) => setAutomationForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Trigger</Label>
              <Select
                value={automationForm.triggerType}
                onValueChange={(v) => {
                  const triggerType = v as LoyaltyAutomationTriggerType;
                  const preset = defaultAutomationPreset(triggerType);
                  setAutomationForm((f) => ({
                    ...f,
                    triggerType,
                    code: f.code || preset.code,
                    name: f.name || preset.name,
                    ...Object.fromEntries(
                      Object.entries(defaultAutomationCondition(triggerType)).map(([key, value]) => {
                        if (key === "daysBefore") return ["daysBefore", String(value)];
                        if (key === "visitCount") return ["visitCount", String(value)];
                        if (key === "points") return ["points", String(value)];
                        if (key === "daysInactive") return ["daysInactive", String(value)];
                        return [key, String(value)];
                      }),
                    ),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_TRIGGERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {automationForm.triggerType === "member_birthday" && (
              <div className="space-y-1">
                <Label>Days before birthday</Label>
                <Input
                  type="number"
                  min={0}
                  value={automationForm.daysBefore}
                  onChange={(e) => setAutomationForm((f) => ({ ...f, daysBefore: e.target.value }))}
                />
              </div>
            )}
            {automationForm.triggerType === "visit_milestone" && (
              <div className="space-y-1">
                <Label>Visit count</Label>
                <Input
                  type="number"
                  min={1}
                  value={automationForm.visitCount}
                  onChange={(e) => setAutomationForm((f) => ({ ...f, visitCount: e.target.value }))}
                />
              </div>
            )}
            {automationForm.triggerType === "points_milestone" && (
              <div className="space-y-1">
                <Label>Points threshold</Label>
                <Input
                  type="number"
                  min={1}
                  value={automationForm.points}
                  onChange={(e) => setAutomationForm((f) => ({ ...f, points: e.target.value }))}
                />
              </div>
            )}
            {automationForm.triggerType === "inactive_member" && (
              <div className="space-y-1">
                <Label>Days inactive</Label>
                <Input
                  type="number"
                  min={1}
                  value={automationForm.daysInactive}
                  onChange={(e) => setAutomationForm((f) => ({ ...f, daysInactive: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>Action</Label>
              <Select
                value={automationForm.actionType}
                onValueChange={(v) => {
                  const actionType = v as LoyaltyAutomationActionType;
                  const defaults = defaultAutomationActionConfig(actionType);
                  setAutomationForm((f) => ({
                    ...f,
                    actionType,
                    notificationTitle: String(defaults.title ?? f.notificationTitle),
                    notificationContent: String(defaults.content ?? f.notificationContent),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {automationForm.actionType === "issue_voucher" && (
              <div className="space-y-1">
                <Label>Voucher</Label>
                <Select
                  value={automationForm.voucherId}
                  onValueChange={(v) => setAutomationForm((f) => ({ ...f, voucherId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select voucher" />
                  </SelectTrigger>
                  <SelectContent>
                    {vouchers.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {automationForm.actionType === "assign_campaign" && (
              <div className="space-y-1">
                <Label>Campaign</Label>
                <Select
                  value={automationForm.campaignId}
                  onValueChange={(v) => setAutomationForm((f) => ({ ...f, campaignId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {automationForm.actionType === "send_notification" && (
              <>
                <div className="space-y-1">
                  <Label>Notification title</Label>
                  <Input
                    value={automationForm.notificationTitle}
                    onChange={(e) => setAutomationForm((f) => ({ ...f, notificationTitle: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Notification content</Label>
                  <Textarea
                    value={automationForm.notificationContent}
                    onChange={(e) => setAutomationForm((f) => ({ ...f, notificationContent: e.target.value }))}
                  />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={automationForm.isActive ? "active" : "inactive"}
                onValueChange={(v) => setAutomationForm((f) => ({ ...f, isActive: v === "active" }))}
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
            <Button variant="outline" onClick={() => setAutomationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveAutomation()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={automationLogsOpen} onOpenChange={setAutomationLogsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execution logs — {automationLogsTitle}</DialogTitle>
          </DialogHeader>
          {automationLogsLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!automationLogsLoading && automationLogs.length === 0 && (
            <p className="text-sm text-muted-foreground">No execution logs yet.</p>
          )}
          {!automationLogsLoading && automationLogs.length > 0 && (
            <div className="space-y-2">
              {automationLogs.map((log) => (
                <div key={log.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium capitalize">{log.status}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.executedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Member #{log.memberId} · {automationTriggerLabel(log.triggerType)} →{" "}
                    {automationActionLabel(log.actionType)}
                  </p>
                  {Object.keys(log.result ?? {}).length > 0 && (
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(log.result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Preview: {previewSegmentRow?.name ?? "Segment"}
            </DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <p className="text-sm text-muted-foreground">Loading preview…</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Matching members: </span>
                <span className="font-semibold">{previewCount.toLocaleString()}</span>
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {previewMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No members match this segment.</p>
                ) : (
                  previewMembers.map((m) => (
                    <div key={m.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">{m.fullName}</p>
                        <p className="text-xs text-muted-foreground">{m.phone}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{m.memberNo ?? m.id}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? "Edit campaign" : "New loyalty campaign"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={campaignForm.code}
                onChange={(e) => setCampaignForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={campaignForm.name} onChange={(e) => setCampaignForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={campaignForm.description}
                onChange={(e) => setCampaignForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Segment</Label>
              <Select
                value={campaignForm.segmentId}
                onValueChange={(v) => setCampaignForm((f) => ({ ...f, segmentId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select segment" />
                </SelectTrigger>
                <SelectContent>
                  {segments.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Scheduled at</Label>
              <Input
                type="datetime-local"
                value={campaignForm.scheduledAt}
                onChange={(e) => setCampaignForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
            {editingCampaign && (editingCampaign.status === "draft" || editingCampaign.status === "scheduled") && (
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={campaignForm.status}
                  onValueChange={(v) => setCampaignForm((f) => ({ ...f, status: v as LoyaltyCampaignStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveCampaign()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={campaignSnapshotOpen} onOpenChange={setCampaignSnapshotOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Captured audience: {campaignSnapshot?.campaign.name ?? "Campaign"}
            </DialogTitle>
          </DialogHeader>
          {campaignSnapshotLoading ? (
            <p className="text-sm text-muted-foreground">Loading snapshot…</p>
          ) : campaignSnapshot ? (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Captured at activation: </span>
                <span className="font-semibold">{campaignSnapshot.capturedCount.toLocaleString()}</span>
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {campaignSnapshot.members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No captured members.</p>
                ) : (
                  campaignSnapshot.members.map((m) => (
                    <div key={m.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">{m.fullName}</p>
                        <p className="text-xs text-muted-foreground">{m.phone}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{m.memberNo ?? m.id}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignSnapshotOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={campaignAudienceOpen} onOpenChange={setCampaignAudienceOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Live audience: {campaignAudience?.campaign.name ?? "Campaign"}
            </DialogTitle>
          </DialogHeader>
          {campaignAudienceLoading ? (
            <p className="text-sm text-muted-foreground">Loading audience…</p>
          ) : campaignAudience ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Segment: {campaignAudience.segment.name} (current segment rules)
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Live audience size: </span>
                <span className="font-semibold">{campaignAudience.memberCount.toLocaleString()}</span>
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {campaignAudience.members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No members in audience.</p>
                ) : (
                  campaignAudience.members.map((m) => (
                    <div key={m.id} className="flex justify-between text-sm border rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">{m.fullName}</p>
                        <p className="text-xs text-muted-foreground">{m.phone}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{m.memberNo ?? m.id}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignAudienceOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={voucherOpen} onOpenChange={setVoucherOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVoucher ? "Edit voucher" : "New voucher"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={voucherForm.code}
                onChange={(e) => setVoucherForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={voucherForm.name} onChange={(e) => setVoucherForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={voucherForm.description}
                onChange={(e) => setVoucherForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={voucherForm.voucherType}
                  onValueChange={(v) => setVoucherForm((f) => ({ ...f, voucherType: v as LoyaltyVoucherType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="campaign">Campaign</SelectItem>
                    <SelectItem value="reward">Reward</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Value type</Label>
                <Select
                  value={voucherForm.valueType}
                  onValueChange={(v) => setVoucherForm((f) => ({ ...f, valueType: v as LoyaltyVoucherValueType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed_amount">Fixed amount</SelectItem>
                    <SelectItem value="free_item">Free item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Value</Label>
                <Input
                  type="number"
                  value={voucherForm.value}
                  onChange={(e) => setVoucherForm((f) => ({ ...f, value: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Minimum spend</Label>
                <Input
                  type="number"
                  value={voucherForm.minimumSpend}
                  onChange={(e) => setVoucherForm((f) => ({ ...f, minimumSpend: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoucherOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSaveVoucher()} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={issueVoucherOpen} onOpenChange={setIssueVoucherOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue voucher to campaign audience</DialogTitle>
          </DialogHeader>
          {issueVoucherCampaign && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Campaign: {issueVoucherCampaign.name} · Audience captured:{" "}
                {(issueVoucherCampaign.capturedCount ?? 0).toLocaleString()} · Already issued:{" "}
                {(issueVoucherCampaign.issuedVoucherCount ?? 0).toLocaleString()}
              </p>
              <div className="space-y-1">
                <Label>Voucher</Label>
                <Select value={issueVoucherId} onValueChange={setIssueVoucherId}>
                  <SelectTrigger><SelectValue placeholder="Select voucher" /></SelectTrigger>
                  <SelectContent>
                    {vouchers.filter((v) => v.isActive).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name} ({v.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueVoucherOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleIssueVoucher()} disabled={saving}>Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
