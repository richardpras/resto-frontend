import { useCallback, useEffect, useState } from "react";

export type KdsFocusMode = "compact" | "comfortable";

const STORAGE_KEY = "kds.display.focusMode";

function readStoredMode(): KdsFocusMode {
  if (typeof window === "undefined") return "comfortable";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable";
  }
}

function writeStoredMode(mode: KdsFocusMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore quota errors
  }
}

export function useKdsFocusMode() {
  const [focusMode, setFocusModeState] = useState<KdsFocusMode>(() => readStoredMode());

  useEffect(() => {
    writeStoredMode(focusMode);
  }, [focusMode]);

  const setFocusMode = useCallback((mode: KdsFocusMode) => {
    setFocusModeState(mode);
    writeStoredMode(mode);
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusModeState((prev) => {
      const next = prev === "compact" ? "comfortable" : "compact";
      writeStoredMode(next);
      return next;
    });
  }, []);

  return { focusMode, setFocusMode, toggleFocusMode };
}
