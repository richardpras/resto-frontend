import type { NavigateFunction } from "react-router-dom";
import { openQrOrderInPos } from "@/lib/api-integration/qrOrderReviewEndpoints";
import type { QrOrderPosDraftSession, QrOrderPosLoadPayload } from "@/stores/qrOrderPosBridgeStore";

export async function openQrOrderInPosFlow(
  requestId: string | number,
  {
    setFromOpenInPos,
    navigate,
  }: {
    setFromOpenInPos: (draftSession: QrOrderPosDraftSession, loadPayload: QrOrderPosLoadPayload) => void;
    navigate: NavigateFunction;
  },
): Promise<void> {
  const result = await openQrOrderInPos(requestId);
  setFromOpenInPos(result.posSession, result.loadPayload);
  navigate("/pos");
}
