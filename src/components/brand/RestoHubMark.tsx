import markUrl from "@/assets/brand/restohub-mark.png";
import { cn } from "@/lib/utils";

type RestoHubMarkProps = {
  className?: string;
  title?: string;
};

/**
 * App icon mark: Capacitor geometry + template green gradient
 * (rasterized from vector master — sharp at UI sizes).
 */
export function RestoHubMark({ className, title }: RestoHubMarkProps) {
  return (
    <img
      src={markUrl}
      alt={title ?? ""}
      className={cn("shrink-0 object-contain", className)}
      draggable={false}
      aria-hidden={title ? undefined : true}
    />
  );
}
