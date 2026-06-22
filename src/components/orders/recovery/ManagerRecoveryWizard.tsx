import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OrderApi, OrderItemRecoveryEventApi } from "@/lib/api-integration/endpoints";
import type { OrdersExplorerUiCaps } from "@/stores/ordersExplorerCapabilities";
import { RecoveryDecisionStep } from "./RecoveryDecisionStep";
import { RecoveryDoneStep } from "./RecoveryDoneStep";
import { RecoveryExecuteRefundStep } from "./RecoveryExecuteRefundStep";
import { RecoveryRefundSlip } from "./RecoveryRefundSlip";
import { RecoveryReviewStep } from "./RecoveryReviewStep";
import { RecoverySettlementStep } from "./RecoverySettlementStep";
import {
  lineHasRefundExecuted,
  lineHasSettlementRecorded,
  type PendingRecoveryLine,
  type WizardStep,
} from "./recoveryShared";

type Props = {
  orderId: string;
  order: OrderApi;
  pendingLines: PendingRecoveryLine[];
  recoveryEvents: OrderItemRecoveryEventApi[];
  caps: OrdersExplorerUiCaps;
  onRefresh: () => void;
  managerName?: string | null;
};

const STEP_ORDER: WizardStep[] = ["review", "decide", "settle", "execute", "done"];

export function ManagerRecoveryWizard({ orderId, order, pendingLines, recoveryEvents, caps, onRefresh, managerName }: Props) {
  const { t } = useTranslation("ops");
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [step, setStep] = useState<WizardStep>("review");

  const activeLine = pendingLines[activeLineIndex] ?? pendingLines[0];
  const lineId = activeLine ? String(activeLine.orderItemId ?? activeLine.id) : "";

  const settlementRecorded = useMemo(
    () => (activeLine ? lineHasSettlementRecorded(recoveryEvents, lineId) : false),
    [activeLine, recoveryEvents, lineId],
  );
  const refundExecuted = useMemo(
    () => (activeLine ? lineHasRefundExecuted(recoveryEvents, lineId) : false),
    [activeLine, recoveryEvents, lineId],
  );

  const settlementEvent = recoveryEvents.find(
    (ev) => ev.eventCode === "recovery_settlement_recorded" && String(ev.orderItemId) === lineId,
  );
  const settlementPayload = settlementEvent?.payload as Record<string, unknown> | undefined;
  const suggestedRefund = Number(settlementPayload?.partialRefundCapped ?? settlementPayload?.partialRefundAmount ?? 0);
  const refundEvent = recoveryEvents.find(
    (ev) => ev.eventCode === "refund_executed" && String(ev.orderItemId) === lineId,
  );
  const executedAmount = refundEvent
    ? Number((refundEvent.payload as Record<string, unknown> | undefined)?.amount ?? 0)
    : 0;

  if (!activeLine || pendingLines.length === 0) {
    return null;
  }

  const stepIndex = STEP_ORDER.indexOf(step);
  const visibleSteps = caps.canExecuteRefund ? STEP_ORDER : STEP_ORDER.filter((s) => s !== "execute");

  const goNext = () => {
    const idx = visibleSteps.indexOf(step);
    if (idx >= 0 && idx < visibleSteps.length - 1) {
      setStep(visibleSteps[idx + 1]!);
    }
  };

  const handleLineComplete = () => {
    onRefresh();
    if (step === "settle" && caps.canExecuteRefund && !refundExecuted) {
      setStep("execute");
      return;
    }
    setStep("done");
  };

  const handleExecuteComplete = () => {
    onRefresh();
    setStep("done");
  };

  const handleNextLine = () => {
    if (activeLineIndex + 1 < pendingLines.length) {
      setActiveLineIndex(activeLineIndex + 1);
      setStep("review");
    } else {
      setStep("done");
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 space-y-3" data-testid="manager-recovery-wizard">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">
          {t("managerRecovery.wizard.title", "Manager recovery wizard")}
          {pendingLines.length > 1 ? ` (${activeLineIndex + 1}/${pendingLines.length})` : ""}
        </p>
        <div className="flex gap-1">
          {visibleSteps.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 w-4 rounded-full ${visibleSteps.indexOf(step) >= i ? "bg-primary" : "bg-muted"}`}
              aria-hidden
            />
          ))}
        </div>
      </div>

      {step === "review" ? (
        <>
          <RecoveryReviewStep order={order} line={activeLine} events={recoveryEvents} />
          <button type="button" className="text-[11px] text-primary font-medium" onClick={() => setStep("decide")}>
            {t("managerRecovery.wizard.continue", "Continue")} →
          </button>
        </>
      ) : null}

      {step === "decide" ? (
        <RecoveryDecisionStep orderId={orderId} line={activeLine} onComplete={() => setStep("settle")} />
      ) : null}

      {step === "settle" ? (
        <RecoverySettlementStep
          orderId={orderId}
          orderItemId={activeLine.orderItemId ?? activeLine.id}
          paymentStatus={String(order.paymentStatus)}
          onComplete={handleLineComplete}
        />
      ) : null}

      {step === "execute" && caps.canExecuteRefund && settlementRecorded && !refundExecuted ? (
        <RecoveryExecuteRefundStep
          orderId={orderId}
          orderItemId={activeLine.orderItemId ?? activeLine.id}
          defaultAmount={suggestedRefund}
          onComplete={handleExecuteComplete}
        />
      ) : null}

      {step === "done" ? (
        <>
          {executedAmount > 0 ? (
            <RecoveryRefundSlip order={order} line={activeLine} amount={executedAmount} managerName={managerName} />
          ) : null}
          <RecoveryDoneStep
            line={activeLine}
            onClose={() => {
              setStep("review");
              onRefresh();
            }}
            onNextLine={activeLineIndex + 1 < pendingLines.length ? handleNextLine : undefined}
            hasMorePending={activeLineIndex + 1 < pendingLines.length}
          />
        </>
      ) : null}

      {step !== "review" && step !== "done" && stepIndex > 0 ? (
        <button type="button" className="text-[10px] text-muted-foreground underline" onClick={() => setStep("review")}>
          {t("managerRecovery.wizard.back", "Back to review")}
        </button>
      ) : null}
    </div>
  );
}
