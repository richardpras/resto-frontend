type VisibilityAwareInterval = {
  clear: () => void;
};

export function createVisibilityAwareInterval(callback: () => void, intervalMs: number): VisibilityAwareInterval {
  if (typeof document === "undefined") {
    const timer = setInterval(callback, intervalMs);
    return { clear: () => clearInterval(timer) };
  }

  let timer: ReturnType<typeof setInterval> | null = null;

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    if (document.hidden) return;
    timer = setInterval(callback, intervalMs);
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      stopTimer();
      return;
    }
    callback();
    startTimer();
  };

  if (!document.hidden) {
    timer = setInterval(callback, intervalMs);
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  return {
    clear: () => {
      stopTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
