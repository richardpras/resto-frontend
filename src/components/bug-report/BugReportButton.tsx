import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import { Bug } from "lucide-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BugReportModal } from "@/components/bug-report/BugReportModal";

const HIDDEN_ROUTES = ["/login", "/payment-status", "/qr-order"];

function shouldShowBugButton(pathname: string): boolean {
  if (HIDDEN_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return false;
  }
  if (/^\/qr\//.test(pathname)) return false;
  if (/^\/employee/.test(pathname)) return false;
  return true;
}

async function captureViewportScreenshot(): Promise<{ preview: string; blob: Blob } | null> {
  try {
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: false,
      scale: Math.min(window.devicePixelRatio, 2),
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      x: window.scrollX,
      y: window.scrollY,
    });

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          resolve({
            preview: canvas.toDataURL("image/webp", 0.85),
            blob,
          });
        },
        "image/webp",
        0.85,
      );
    });
  } catch {
    return null;
  }
}

export function BugReportButton() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  const handleOpen = useCallback(async () => {
    setCapturing(true);
    try {
      const shot = await captureViewportScreenshot();
      setPreview(shot?.preview ?? null);
      setBlob(shot?.blob ?? null);
      setOpen(true);
    } catch {
      toast.error("Could not capture screenshot");
      setPreview(null);
      setBlob(null);
      setOpen(true);
    } finally {
      setCapturing(false);
    }
  }, []);

  if (!shouldShowBugButton(location.pathname)) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        data-app-chrome
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-lg border border-r-0 border-red-700/30 bg-red-600 px-2.5 py-4 text-white shadow-lg transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80"
        onClick={() => void handleOpen()}
        disabled={capturing}
        aria-label="Report bug"
        title={capturing ? "Capturing screenshot…" : "Report a bug"}
      >
        {capturing ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
        ) : (
          <Bug className="h-5 w-5 shrink-0" aria-hidden />
        )}
        <span
          className="text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          aria-hidden
        >
          {capturing ? "…" : "Report"}
        </span>
      </button>

      <BugReportModal
        open={open}
        onOpenChange={setOpen}
        screenshotPreview={preview}
        screenshotBlob={blob}
        currentRoute={`${location.pathname}${location.search}`}
      />
    </>
  );
}
