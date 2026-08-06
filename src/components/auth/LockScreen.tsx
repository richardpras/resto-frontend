import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Lock, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";
import { useOfflineSyncStore } from "@/stores/offlineSyncStore";
import {
  hasCachedPasswordVerifier,
  hasCachedScreenPinVerifier,
} from "@/mobile/offline/offlineScreenPin";
import { isNativePosShell } from "@/mobile/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const DISMISS_OVERLAYS_EVENT = "resto:dismiss-overlays";

export function dispatchDismissOverlays(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DISMISS_OVERLAYS_EVENT));
}

export function LockScreen() {
  const { user, unlock, unlockWithPassword, logout } = useAuthStore();
  const isOnline = useOfflineSyncStore((s) => s.isOnline);
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [hasLocalPin, setHasLocalPin] = useState(false);
  const [hasLocalPassword, setHasLocalPassword] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const nativeShell = isNativePosShell();
  const apiOffline = !isOnline;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Clear Radix body pointer-events lock so the portaled keypad receives taps.
    const previous = document.body.style.pointerEvents;
    document.body.style.pointerEvents = "";
    dispatchDismissOverlays();
    return () => {
      document.body.style.pointerEvents = previous;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const userId = user?.id ?? "";
    void Promise.all([
      hasCachedScreenPinVerifier(userId),
      hasCachedPasswordVerifier(userId),
    ]).then(([pinOk, passOk]) => {
      if (cancelled) return;
      setHasLocalPin(pinOk);
      setHasLocalPassword(passOk);
      if (apiOffline && !pinOk && passOk) {
        setUsePassword(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, apiOffline]);

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
      void unlock(next).then((ok) => {
        setChecking(false);
        if (!ok) {
          if (!user?.pinSet) {
            setError("PIN not configured — set it under Settings");
          } else if (apiOffline && !hasLocalPin) {
            setError(
              hasLocalPassword
                ? "PIN not cached yet — unlock with login password"
                : "Offline unlock needs login on this device first",
            );
            if (hasLocalPassword) setUsePassword(true);
          } else {
            setError("Incorrect PIN");
          }
          setPin("");
        }
      });
    }
  };

  const submitPassword = () => {
    if (checking || !password.trim()) return;
    setChecking(true);
    setError("");
    void unlockWithPassword(password).then((ok) => {
      setChecking(false);
      if (!ok) {
        setError("Incorrect password");
        setPassword("");
      }
    });
  };

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="lock-screen"
      className={cn(
        "pointer-events-auto fixed inset-0 z-systemLock flex items-center justify-center p-6",
        nativeShell ? "bg-sidebar" : "bg-sidebar/95",
      )}
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-3xl bg-card p-8 pos-shadow-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">Screen Locked</h2>
            <p className="text-sm text-muted-foreground">
              {user?.name} · {usePassword ? "Enter login password" : "Enter PIN to unlock"}
            </p>
            {apiOffline && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                {hasLocalPin
                  ? "Offline — unlock with your PIN"
                  : hasLocalPassword
                    ? "Offline — use login password (PIN not cached yet)"
                    : "Offline — unlock once online first, or re-login when network returns"}
              </p>
            )}
          </div>
        </div>

        {usePassword ? (
          <div className="mb-3 space-y-3">
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Login password"
              value={password}
              disabled={checking}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitPassword();
              }}
            />
            <div className="h-5 text-center text-xs text-destructive">{error}</div>
            <Button type="button" className="w-full" disabled={checking || !password.trim()} onClick={submitPassword}>
              Unlock
            </Button>
            {(hasLocalPin || !apiOffline) && (
              <button
                type="button"
                className="w-full touch-manipulation text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setUsePassword(false);
                  setError("");
                  setPassword("");
                }}
              >
                Use PIN instead
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-2 flex justify-center gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full transition-colors ${
                    pin.length > i ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <div className="mb-3 h-5 text-center text-xs text-destructive">{error}</div>

            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKey(k)}
                  className="h-14 touch-manipulation rounded-2xl bg-muted text-lg font-semibold transition-colors hover:bg-accent active:scale-95"
                >
                  {k === "back" ? "⌫" : k === "clear" ? "C" : k}
                </button>
              ))}
            </div>
            {apiOffline && hasLocalPassword && (
              <button
                type="button"
                className="mt-3 w-full touch-manipulation text-xs text-primary hover:underline"
                onClick={() => {
                  setUsePassword(true);
                  setError("");
                }}
              >
                Unlock with login password
              </button>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => {
            const ok =
              typeof window !== "undefined"
                ? window.confirm("Log out? You will need network to sign in again.")
                : true;
            if (ok) logout();
          }}
          className="mt-5 flex w-full touch-manipulation items-center justify-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Switch user (logout)
        </button>
        {apiOffline && (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Logout offline: you cannot sign in again until the API is reachable.
          </p>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}
