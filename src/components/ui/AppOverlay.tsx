import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type AppOverlayLayer = "overlay" | "modal" | "paymentGateway";

const LAYER_CLASS: Record<AppOverlayLayer, string> = {
  overlay: "z-overlay",
  modal: "z-modal",
  paymentGateway: "z-paymentGateway",
};

export type AppOverlayProps = {
  open: boolean;
  onClose?: () => void;
  layer?: AppOverlayLayer;
  /** When false, backdrop clicks do not call onClose. */
  dismissible?: boolean;
  /** Align panel: center (default) or bottom sheet style on compact viewports. */
  align?: "center" | "bottom";
  className?: string;
  panelClassName?: string;
  children: React.ReactNode;
  "data-testid"?: string;
};

export function AppOverlay({
  open,
  onClose,
  layer = "modal",
  dismissible = true,
  align = "center",
  className,
  panelClassName,
  children,
  "data-testid": testId,
}: AppOverlayProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="app-overlay-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 bg-foreground/40 backdrop-blur-sm flex p-4",
            LAYER_CLASS[layer],
            align === "bottom" ? "items-end sm:items-center" : "items-center justify-center",
            className,
          )}
          data-testid={testId}
          onClick={() => {
            if (dismissible && onClose) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: align === "bottom" ? 24 : 0 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: align === "bottom" ? 24 : 0 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "bg-card w-full max-w-md sm:max-w-lg max-h-[85dvh] overflow-y-auto pos-shadow-md safe-area-pb",
              align === "bottom" ? "rounded-t-2xl sm:rounded-2xl" : "rounded-2xl",
              panelClassName,
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
