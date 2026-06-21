import type { NavigateFunction } from "react-router-dom";
import { openQrOrderInPos } from "@/lib/api-integration/qrOrderReviewEndpoints";
import { triggerPosBridgeConsumer } from "@/hooks/pos/consumePosBridge";
import type { QrOrderPosDraftSession, QrOrderPosLoadPayload } from "@/stores/qrOrderPosBridgeStore";

function isPosRoute(pathname: string): boolean {
  return /^\/pos\/?$/.test(pathname);
}

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
  if (isPosRoute(window.location.pathname)) {
    triggerPosBridgeConsumer();
    return;
  }
  navigate("/pos");
}
