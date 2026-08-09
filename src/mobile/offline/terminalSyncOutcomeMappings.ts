import type { TerminalSyncBatchOperation } from "@/lib/api-integration/terminalSyncEndpoints";
import { saveLocalSessionMapping } from "@/mobile/offline/offlineSessionMapping";
import { saveLocalMemberMapping } from "@/mobile/offline/offlineMemberMapping";
import {
  isLocalReservationRef,
  updateLocalReservationMappingServerIds,
} from "@/mobile/offline/offlineReservationMapping";
import { replaceLocalReservationInCache } from "@/mobile/offline/offlineReservationCacheDb";
import { attachServerIdToQueuedProofs } from "@/mobile/offline/flushReservationProofs";
import { useReservationStore } from "@/stores/reservationStore";
import type { ReservationApi } from "@/lib/api-integration/reservationEndpoints";

/**
 * Apply ID remaps from terminal sync outcome summaries for non-order entities.
 * Order mappings stay in offlineSyncStore for backward compatibility.
 */
export async function applyTerminalSyncOutcomeMappings(
  op: TerminalSyncBatchOperation | undefined,
  summary: Record<string, unknown>,
): Promise<void> {
  if (!op) return;
  const entity = String(summary.entity ?? "");

  if (entity === "pos_session" && typeof summary.sessionId === "number") {
    const localRef = String(op.payload?.clientLocalRef ?? summary.clientLocalRef ?? "");
    if (localRef.startsWith("local-session:")) {
      await saveLocalSessionMapping(localRef, summary.sessionId as number);
    }
  }

  if (entity === "member" && typeof summary.memberId === "number") {
    const localRef = String(op.payload?.clientLocalRef ?? summary.clientLocalRef ?? "");
    if (localRef.startsWith("local-member:")) {
      await saveLocalMemberMapping(localRef, summary.memberId as number);
    }
  }

  if (entity === "reservation" && typeof summary.reservationId === "number") {
    const localRef = String(op.payload?.clientLocalRef ?? summary.clientLocalRef ?? "");
    if (!isLocalReservationRef(localRef)) return;
    const linkedOrderId =
      typeof summary.linkedOrderId === "number" ? summary.linkedOrderId : null;
    const mapping = await updateLocalReservationMappingServerIds(
      localRef,
      summary.reservationId as number,
      linkedOrderId,
    );
    const outletId = Number(op.payload?.outletId ?? 0);
    if (mapping && outletId > 0) {
      const serverRow: ReservationApi = {
        id: summary.reservationId as number,
        outletId,
        tableId: null,
        reservationCode: String(summary.reservationCode ?? mapping.reservationCode),
        customerName: String(op.payload?.customerName ?? ""),
        customerPhone: (op.payload?.customerPhone as string | null | undefined) ?? null,
        memberId: typeof op.payload?.memberId === "number" ? op.payload.memberId : null,
        partySize: Number(op.payload?.partySize ?? 1),
        reservationAt: String(op.payload?.reservationAt ?? new Date().toISOString()),
        confirmedAt: null,
        checkedInAt: null,
        seatedAt: null,
        completedAt: null,
        cancelledAt: null,
        noShowAt: null,
        linkedOrderId,
        serviceStartedAt: null,
        status: (String(summary.status ?? "pending_deposit") as ReservationApi["status"]),
        source: "staff",
        requiredDepositAmount:
          typeof summary.requiredDepositAmount === "number" ? summary.requiredDepositAmount : null,
        approvedDepositAmount: null,
        depositRejectionReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await replaceLocalReservationInCache(outletId, mapping.localNumericId, serverRow);
      useReservationStore.getState().replaceLocalWithServer(mapping.localNumericId, serverRow);
      await attachServerIdToQueuedProofs(outletId, localRef, summary.reservationId as number);
    }
  }
}
