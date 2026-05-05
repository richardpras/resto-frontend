import { useState } from "react";
import { Lock, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function LockScreen() {
  const { user, unlock, logout } = useAuthStore();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

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
          setError(user?.pinSet ? "Incorrect PIN" : "PIN not configured — set it under Settings");
          setPin("");
        }
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-sidebar-background/95 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="w-full max-w-sm bg-card rounded-3xl p-8 pos-shadow-md">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">Screen Locked</h2>
            <p className="text-sm text-muted-foreground">{user?.name} · Enter PIN to unlock</p>
          </div>
        </div>

        <div className="flex justify-center gap-3 mb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-full transition-colors ${
                pin.length > i ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <div className="h-5 text-center text-xs text-destructive mb-3">{error}</div>

        <div className="grid grid-cols-3 gap-3">
          {["1","2","3","4","5","6","7","8","9","clear","0","back"].map((k) => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              className="h-14 rounded-2xl bg-muted hover:bg-accent text-lg font-semibold transition-colors active:scale-95"
            >
              {k === "back" ? "⌫" : k === "clear" ? "C" : k}
            </button>
          ))}
        </div>

        <button
          onClick={logout}
          className="mt-5 w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Switch user (logout)
        </button>
      </div>
    </motion.div>
  );
}
