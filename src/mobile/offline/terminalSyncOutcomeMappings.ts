import type { TerminalSyncBatchOperation } from "@/lib/api-integration/terminalSyncEndpoints";
import { saveLocalSessionMapping } from "@/mobile/offline/offlineSessionMapping";
import { saveLocalMemberMapping } from "@/mobile/offline/offlineMemberMapping";

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
}
