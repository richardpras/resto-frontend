/** Default idle minutes before screen lock (env `VITE_IDLE_LOCK_MINUTES`, fallback 10). */
export function getDefaultIdleLockMinutes(): number {
  const raw = import.meta.env.VITE_IDLE_LOCK_MINUTES;
  const parsed = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 10;
}
