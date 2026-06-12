import { useEffect, useRef, useState } from "react";
import {
  fetchQrOrderPublic,
  type QrOrderPublicLookup,
} from "@/lib/api-integration/qrOrderPublicEndpoints";

const POLL_INTERVAL_MS = 10_000;
const TERMINAL_STATUSES = new Set(["served", "completed", "cancelled"]);

const NOTIFY_STATUSES = new Set(["confirmed", "ready", "served"]);

export function useQrOrderPolling(orderCode: string | undefined) {
  const [order, setOrder] = useState<QrOrderPublicLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const orderRef = useRef<QrOrderPublicLookup | null>(null);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    if (!orderCode || orderCode.trim() === "") {
      setLoading(false);
      setError("Order not found or expired");
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const data = await fetchQrOrderPublic(orderCode);
        if (!active) return;
        const previousStatus = orderRef.current?.customerStatus;
        setOrder(data);
        setError(null);
        setLoading(false);

        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted" &&
          previousStatus &&
          previousStatus !== data.customerStatus &&
          NOTIFY_STATUSES.has(data.customerStatus)
        ) {
          const title =
            data.customerStatus === "confirmed"
              ? "Order Confirmed"
              : data.customerStatus === "ready"
                ? "Order Ready"
                : "Order Delivered";
          new Notification(title, { body: data.customerStatusLabel });
        }

        if (!data.isTerminal && !TERMINAL_STATUSES.has(data.customerStatus)) {
          timer = setTimeout(() => {
            void load();
          }, POLL_INTERVAL_MS);
        }
      } catch {
        if (!active) return;
        setError("Order not found or expired");
        setOrder(null);
        setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      if (timer !== null) clearTimeout(timer);
    };
  }, [orderCode]);

  return { order, loading, error, refresh: () => fetchQrOrderPublic(orderCode ?? "").then(setOrder) };
}
