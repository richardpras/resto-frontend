/**
 * Client feature flags — single source of truth for module visibility.
 * Vite replaces `import.meta.env.DEV` at build time (false in production bundles).
 */
export const FEATURES = {
  /** Client-only Promotions admin — development reference only; use Loyalty Programs in production. */
  PROMOTIONS_MODULE: import.meta.env.DEV === true,
} as const;

export function isPromotionsModuleEnabled(): boolean {
  return FEATURES.PROMOTIONS_MODULE;
}
