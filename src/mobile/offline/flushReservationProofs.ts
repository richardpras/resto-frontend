import { uploadReservationDepositProof } from "@/lib/api-integration/reservationEndpoints";
import {
  deleteReservationProof,
  listQueuedReservationProofs,
  listReservationProofsForOutlet,
  saveReservationProof,
  type ReservationProofRecord,
} from "@/mobile/offline/offlineReservationProofDb";
import {
  isLocalReservationRef,
  loadLocalReservationMapping,
} from "@/mobile/offline/offlineReservationMapping";
import { createDeviceUuid } from "@/mobile/offline/createDeviceUuid";

export async function queueReservationProofFile(input: {
  outletId: number;
  localRef: string;
  serverReservationId: number | null;
  file: File;
}): Promise<ReservationProofRecord> {
  const record: ReservationProofRecord = {
    id: `proof-${createDeviceUuid()}`,
    outletId: input.outletId,
    localRef: input.localRef,
    serverReservationId: input.serverReservationId,
    fileName: input.file.name || "deposit-proof.jpg",
    mime: input.file.type || "application/octet-stream",
    blob: input.file,
    status: "queued",
    errorMessage: null,
    updatedAt: new Date().toISOString(),
  };
  await saveReservationProof(record);
  return record;
}

export async function attachServerIdToQueuedProofs(
  outletId: number,
  localRef: string,
  serverReservationId: number,
): Promise<void> {
  const rows = await listReservationProofsForOutlet(outletId);
  for (const row of rows) {
    if (row.localRef !== localRef) continue;
    if (row.status === "uploaded") continue;
    await saveReservationProof({
      ...row,
      serverReservationId,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function flushPendingReservationProofs(outletId: number): Promise<void> {
  if (outletId < 1) return;
  const rows = await listQueuedReservationProofs(outletId);
  for (const row of rows) {
    let serverId = row.serverReservationId;
    if ((!serverId || serverId < 1) && isLocalReservationRef(row.localRef)) {
      const mapping = await loadLocalReservationMapping(row.localRef);
      serverId = mapping?.serverReservationId ?? null;
    }
    if (!serverId || serverId < 1) continue;

    const uploading: ReservationProofRecord = {
      ...row,
      serverReservationId: serverId,
      status: "uploading",
      updatedAt: new Date().toISOString(),
    };
    await saveReservationProof(uploading);

    try {
      const file = new File([row.blob], row.fileName, { type: row.mime });
      await uploadReservationDepositProof(serverId, file);
      await deleteReservationProof(row.id);
    } catch (error) {
      await saveReservationProof({
        ...uploading,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Upload failed",
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
