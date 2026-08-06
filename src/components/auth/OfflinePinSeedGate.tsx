import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import { hasCachedScreenPinVerifier } from "@/mobile/offline/offlineScreenPin";
import { cn } from "@/lib/utils";

const SKIP_KEY_PREFIX = "resto.offline-pin-seed.skip.";

function skipKey(userId: string): string {
  return `${SKIP_KEY_PREFIX}${userId}`;
}

function wasSkippedThisSession(userId: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(skipKey(userId)) === "1";
}

function markSkippedThisSession(userId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(skipKey(userId), "1");
}

/**
 * After login / session restore: if the user has a screen PIN but this device
 * has no local PIN verifier yet, confirm the PIN once while online so offline
 * lock unlock works without waiting for the first manual lock+unlock cycle.
 */
export function OfflinePinSeedGate() {
  const user = useAuthStore((s) => s.user);
  const locked = useAuthStore((s) => s.locked);
  const seedScreenPinForOffline = useAuthStore((s) => s.seedScreenPinForOffline);
  const isOnline = useOfflineSyncStore((s) => s.isOnline);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const userId = user?.id;
    if (!userId || !user?.pinSet || locked || !isOnline) {
      setOpen(false);
      return;
    }
    if (wasSkippedThisSession(userId)) {
      setOpen(false);
      return;
    }
    void hasCachedScreenPinVerifier(userId).then((hasPin) => {
      if (cancelled) return;
      setOpen(!hasPin);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.pinSet, locked, isOnline]);

  const handleKey = (digit: string) => {
    setError("");
    if (checking) return;
    if (digit === "back") return setPin((p) => p.slice(0, -1));
    if (digit === "clear") return setPin("");
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      setChecking(true);
      void seedScreenPinForOffline(next).then((result) => {
        setChecking(false);
        if (result.ok) {
          toast.success("Offline PIN unlock ready on this device");
          setOpen(false);
          setPin("");
          return;
        }
        setError(result.error ?? "Incorrect PIN");
        setPin("");
      });
    }
  };

  const skip = () => {
    if (!user?.id) return;
    markSkippedThisSession(user.id);
    setOpen(false);
    setPin("");
    setError("");
  };

  if (!mounted || !open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="offline-pin-seed-gate"
      className="pointer-events-auto fixed inset-0 z-systemLock flex items-center justify-center bg-sidebar/80 p-6 backdrop-blur-sm"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-3xl bg-card p-8 pos-shadow-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Enable offline unlock</h2>
          <p className="text-sm text-muted-foreground">
            Enter your screen PIN once so this device can unlock when the API is offline.
          </p>
        </div>

        <div className="mb-2 flex justify-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-3 w-3 rounded-full transition-colors",
                pin.length > i ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
        <div className="mb-3 h-5 text-center text-xs text-destructive">{error}</div>

        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map((k) => (
            <button
              key={k}
              type="button"
              disabled={checking}
              onClick={() => handleKey(k)}
              className="h-14 touch-manipulation rounded-2xl bg-muted text-lg font-semibold transition-colors hover:bg-accent active:scale-95 disabled:opacity-50"
            >
              {k === "back" ? "⌫" : k === "clear" ? "C" : k}
            </button>
          ))}
        </div>

        <Button type="button" variant="ghost" className="mt-4 w-full text-xs" onClick={skip} disabled={checking}>
          Skip for now (use login password offline)
        </Button>
      </div>
    </motion.div>,
    document.body,
  );
}
