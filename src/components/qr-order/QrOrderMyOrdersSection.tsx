import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchQrOrderPublic } from "@/lib/api-integration/qrOrderPublicEndpoints";
import { getActiveOrderCodes } from "@/lib/qrOrderSession";

type OrderSummary = {
  orderCode: string;
  customerStatusLabel: string;
};

type Props = {
  tableToken: string;
};

export function QrOrderMyOrdersSection({ tableToken }: Props) {
  const [orders, setOrders] = useState<OrderSummary[]>([]);

  useEffect(() => {
    let active = true;
    const codes = getActiveOrderCodes(tableToken);
    if (codes.length === 0) {
      setOrders([]);
      return;
    }

    const load = async () => {
      const results = await Promise.all(
        codes.map(async (code) => {
          try {
            const data = await fetchQrOrderPublic(code);
            return { orderCode: data.orderCode, customerStatusLabel: data.customerStatusLabel };
          } catch {
            return null;
          }
        }),
      );
      if (!active) return;
      setOrders(results.filter((row): row is OrderSummary => row !== null));
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, 10_000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [tableToken]);

  if (orders.length === 0) return null;

  return (
    <div className="mb-4 bg-card rounded-2xl p-4 border border-border" data-testid="qr-my-orders">
      <h2 className="text-sm font-semibold text-foreground mb-2">My Orders / Pesanan Saya</h2>
      <ul className="space-y-2">
        {orders.map((order, index) => (
          <li key={order.orderCode}>
            <Link
              to={`/qr/order/${encodeURIComponent(order.orderCode)}`}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 bg-muted/50 hover:bg-muted text-sm transition-colors"
            >
              <span className="font-medium text-foreground">{order.orderCode}</span>
              <span className="text-xs text-muted-foreground text-right">
                {index > 0 ? (
                  <span className="block text-primary/80">Pesanan Tambahan</span>
                ) : null}
                {order.customerStatusLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
