/**
 * Single source of truth for client environment mode.
 * Vite sets `import.meta.env.DEV` — true for `vite` / `vite build --mode development`, false for production builds.
 */
export const isDevelopmentEnvironment = (): boolean => import.meta.env.DEV === true;
