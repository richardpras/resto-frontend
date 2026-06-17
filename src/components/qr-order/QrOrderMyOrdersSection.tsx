import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGuestSessionOrders } from "@/lib/api-integration/qrOrderPublicEndpoints";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

type OrderSummary = {
  orderCode: string;
  customerStatusLabel: string;
};

type Props = {
  guestSessionToken: string;
};

export function QrOrderMyOrdersSection({ guestSessionToken }: Props) {
  const { t, i18n } = useOpsTranslation();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const apiLang = i18n.language.startsWith("id") ? "id" : "en";

  useEffect(() => {
    let active = true;
    if (!guestSessionToken.trim()) {
      setOrders([]);
      return;
    }

    const load = async () => {
      try {
        const data = await fetchGuestSessionOrders(guestSessionToken, { lang: apiLang });
        if (!active) return;
        setOrders(
          data.map((row) => ({
            orderCode: row.orderCode,
            customerStatusLabel: row.customerStatusLabel,
          })),
        );
      } catch {
        if (!active) return;
        setOrders([]);
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, 10_000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [guestSessionToken, apiLang]);

  if (orders.length === 0) return null;

  return (
    <div className="mb-4 bg-card rounded-2xl p-4 border border-border" data-testid="qr-my-orders">
      <h2 className="text-sm font-semibold text-foreground mb-2">{t("qrStaff.myOrders")}</h2>
      <ul className="space-y-2">
        {orders.map((order) => (
          <li key={order.orderCode} className="flex items-center justify-between gap-2 text-sm">
            <Link
              to={`/qr/order/${encodeURIComponent(order.orderCode)}`}
              className="font-medium text-primary hover:underline truncate"
            >
              {order.orderCode}
            </Link>
            <span className="text-xs text-muted-foreground shrink-0">{order.customerStatusLabel}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
