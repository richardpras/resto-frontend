import type { NavigateFunction } from "react-router-dom";
import { openReservationInPos } from "@/lib/api-integration/reservationEndpoints";
import { triggerPosBridgeConsumer } from "@/hooks/pos/consumePosBridge";
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

function isPosRoute(pathname: string): boolean {
  return /^\/pos\/?$/.test(pathname);
}

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
  if (isPosRoute(window.location.pathname)) {
    triggerPosBridgeConsumer();
    return;
  }
  options.navigate("/pos");
}
