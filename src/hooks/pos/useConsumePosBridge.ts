import { useCallback, useEffect, useMemo, useRef } from "react";
import { consumePosBridge, registerPosBridgeConsumer, type ConsumePosBridgeDeps } from "./consumePosBridge";

export function useConsumePosBridge(deps: ConsumePosBridgeDeps) {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const runConsume = useCallback(async () => {
    if (typeof depsRef.current.activeOutletId !== "number" || depsRef.current.activeOutletId < 1) {
      return;
    }
    await consumePosBridge(depsRef.current);
  }, []);

  useEffect(() => {
    registerPosBridgeConsumer(() => {
      void runConsume();
    });
    return () => registerPosBridgeConsumer(null);
  }, [runConsume]);

  useEffect(() => {
    if (typeof deps.activeOutletId !== "number" || deps.activeOutletId < 1) return;
    void runConsume();
  }, [deps.activeOutletId, runConsume]);

  return useMemo(() => ({ runConsume }), [runConsume]);
}

export { triggerPosBridgeConsumer } from "./consumePosBridge";
