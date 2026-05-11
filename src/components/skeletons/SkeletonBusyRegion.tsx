import { cn } from "@/lib/utils";

type Props = {
  busy: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Screen reader label while busy */
  label?: string;
};

/**
 * Wraps async content regions with `aria-busy` and an optional polite live region.
 */
export function SkeletonBusyRegion({ busy, children, className, style, label = "Loading" }: Props) {
  return (
    <div
      className={cn(className)}
      style={style}
      aria-busy={busy}
      aria-live={busy ? "polite" : undefined}
    >
      {busy ? <span className="sr-only">{label}</span> : null}
      {children}
    </div>
  );
}
