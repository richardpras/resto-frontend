import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initDiagnosticsBuffer } from "@/lib/diagnostics/diagnosticsBuffer";
import { setUnauthorizedHandler } from "@/lib/api-integration/client";
import { useAuthStore } from "@/stores/authStore";

initDiagnosticsBuffer();
setUnauthorizedHandler(() => {
  useAuthStore.getState().logout();
});

createRoot(document.getElementById("root")!).render(<App />);
