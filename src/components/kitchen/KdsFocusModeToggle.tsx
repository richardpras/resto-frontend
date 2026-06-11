import type { KdsFocusMode } from "@/hooks/useKdsFocusMode";
import { cn } from "@/lib/utils";

type Props = {
  focusMode: KdsFocusMode;
  onFocusModeChange: (mode: KdsFocusMode) => void;
};

export function KdsFocusModeToggle({ focusMode, onFocusModeChange }: Props) {
  return (
    <div
      className="inline-flex rounded-xl border border-kds-card-border bg-kds-card p-0.5"
      data-testid="kds-focus-mode-toggle"
      role="group"
      aria-label="Kitchen focus mode"
    >
      {(["compact", "comfortable"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          data-testid={`kds-focus-mode-${mode}`}
          aria-pressed={focusMode === mode}
          onClick={() => onFocusModeChange(mode)}
          className={cn(
            "px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold capitalize min-h-[40px] transition-colors",
            focusMode === mode
              ? "bg-kds-accent text-kds-accent-fg"
              : "text-kds-muted-fg hover:text-kds-fg",
          )}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
