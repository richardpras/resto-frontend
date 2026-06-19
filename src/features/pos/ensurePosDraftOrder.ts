import type { CreateOrderPayload, UpdateOrderPayload } from "@/lib/api-integration/endpoints";
import type { Order } from "@/stores/orderStore";
import { shouldUpdateOpenBill, syncCartToOpenBill } from "./posOpenBillSync";

export class EnsurePosDraftOrderError extends Error {
  constructor(
    message: string,
    readonly code: "EMPTY_CART" | "CREATE_FAILED",
  ) {
    super(message);
    this.name = "EnsurePosDraftOrderError";
  }
}

export type EnsurePosDraftOrderParams = {
  cartLength: number;
  currentOrderId: string | null;
  currentOpenOrder: Order | null | undefined;
  createOrderRemote: (payload: CreateOrderPayload) => Promise<{ order: Order; resumed: boolean }>;
  updateOrderRemote: (id: string, payload: UpdateOrderPayload) => Promise<Order>;
  buildCartUpdate: () => UpdateOrderPayload;
  buildCreatePayload: () => CreateOrderPayload;
};

export async function ensurePosDraftOrder(params: EnsurePosDraftOrderParams): Promise<string> {
  if (params.cartLength <= 0) {
    throw new EnsurePosDraftOrderError("Cart is empty.", "EMPTY_CART");
  }

  if (params.currentOrderId && shouldUpdateOpenBill(params.currentOrderId, params.currentOpenOrder)) {
    const order = await syncCartToOpenBill(
      params.currentOrderId,
      params.updateOrderRemote,
      params.buildCartUpdate(),
    );
    return order.id;
  }

  if (params.currentOrderId) {
    return params.currentOrderId;
  }

  const { order } = await params.createOrderRemote(params.buildCreatePayload());
  if (!order?.id) {
    throw new EnsurePosDraftOrderError("Failed to create draft order.", "CREATE_FAILED");
  }

  return order.id;
}
