import * as React from "react";

export const MOBILE_MAX = 767;
export const TABLET_MAX = 1023;
export const DESKTOP_MIN = 1024;

export type Breakpoint = "mobile" | "tablet" | "desktop";

function resolveBreakpoint(width: number): Breakpoint {
  if (width <= MOBILE_MAX) return "mobile";
  if (width <= TABLET_MAX) return "tablet";
  return "desktop";
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>(() =>
    typeof window !== "undefined" ? resolveBreakpoint(window.innerWidth) : "desktop",
  );

  React.useEffect(() => {
    const onResize = () => setBreakpoint(resolveBreakpoint(window.innerWidth));
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return breakpoint;
}

export function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = React.useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(orientation: portrait)").matches
      : true,
  );

  React.useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)");
    const onChange = () => setIsPortrait(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isPortrait;
}

/** Mobile or tablet viewport (< 1024px) — bottom sheet cart, sidebar drawer. */
export function useIsCompactViewport(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === "mobile" || breakpoint === "tablet";
}
