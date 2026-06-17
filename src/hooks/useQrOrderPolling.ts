import { useEffect, useRef, useState } from "react";
import {
  fetchQrOrderPublic,
  type QrOrderPublicLookup,
} from "@/lib/api-integration/qrOrderPublicEndpoints";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

const POLL_INTERVAL_MS = 5_000;

const NOTIFY_STATUSES = new Set(["confirmed", "ready", "served", "completed"]);

export function useQrOrderPolling(orderCode: string | undefined) {
  const { t, i18n } = useOpsTranslation();
  const apiLang = i18n.language.startsWith("id") ? "id" : "en";
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
      setError(t("qrCustomer.orderNotFound"));
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const data = await fetchQrOrderPublic(orderCode, { lang: apiLang });
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
              ? t("qrCustomer.notificationConfirmed")
              : data.customerStatus === "ready"
                ? t("qrCustomer.notificationReady")
                : data.customerStatus === "completed"
                  ? t("qrCustomer.notificationCompleted")
                  : t("qrCustomer.notificationDelivered");
          new Notification(title, { body: data.customerStatusLabel });
        }

        if (!data.isTerminal) {
          timer = setTimeout(() => {
            void load();
          }, POLL_INTERVAL_MS);
        }
      } catch {
        if (!active) return;
        setError(t("qrCustomer.orderNotFound"));
        setOrder(null);
        setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      if (timer !== null) clearTimeout(timer);
    };
  }, [orderCode, apiLang, t]);

  return {
    order,
    loading,
    error,
    refresh: () => fetchQrOrderPublic(orderCode ?? "", { lang: apiLang }).then(setOrder),
  };
}
