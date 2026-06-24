import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: { '/api': 'http://127.0.0.1:8000' }
  },
  plugins: [
    react(),
    VitePWA({
      injectRegister: false,
      manifest: false,
      workbox: {
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/qr/, /^\/payment-status/, /^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "staff-images",
              expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === "script" || request.destination === "style" || request.destination === "font",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "staff-static-assets" },
          },
        ],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
