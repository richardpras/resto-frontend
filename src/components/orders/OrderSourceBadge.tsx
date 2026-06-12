import { formatOrderSourceLabel, orderSourceBadgeClass, type OrderSourceLink } from "@/features/orders/orderSource";

type OrderSourceBadgeProps = {
  source: OrderSourceLink | null | undefined;
  className?: string;
  testId?: string;
};

export function OrderSourceBadge({ source, className = "", testId }: OrderSourceBadgeProps) {
  const label = formatOrderSourceLabel(source);
  const type = source?.type ?? "direct_pos";

  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${orderSourceBadgeClass(type)} ${className}`}
    >
      {label}
    </span>
  );
}
