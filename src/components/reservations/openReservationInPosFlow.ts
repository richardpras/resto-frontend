import type { NavigateFunction } from "react-router-dom";
import { openReservationInPos } from "@/lib/api-integration/reservationEndpoints";
import type {
  ReservationPosDraftSession,
  ReservationPosLoadPayload,
} from "@/stores/reservationPosBridgeStore";
import {
  applyReservationPosPayload,
  type ApplyReservationPosPayloadDeps,
} from "@/components/reservations/applyReservationPosPayload";

type NavigateOptions = {
  mode?: "navigate";
  setFromOpenInPos: (draftSession: ReservationPosDraftSession, loadPayload: ReservationPosLoadPayload) => void;
  navigate: NavigateFunction;
};

type InPlaceOptions = {
  mode: "inPlace";
  apply: ApplyReservationPosPayloadDeps;
};

export async function openReservationInPosFlow(
  reservationId: number,
  options: NavigateOptions | InPlaceOptions,
): Promise<void> {
  const result = await openReservationInPos(reservationId);

  if (options.mode === "inPlace") {
    await applyReservationPosPayload(result.loadPayload, options.apply);
    return;
  }

  options.setFromOpenInPos(result.posSession, result.loadPayload);
  options.navigate("/pos");
}
