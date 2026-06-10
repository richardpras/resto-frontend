import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import { Bug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="fixed bottom-6 right-6 z-40 shadow-lg gap-2 rounded-full h-11 px-4"
        onClick={() => void handleOpen()}
        disabled={capturing}
        aria-label="Report bug"
      >
        <Bug className="h-4 w-4" />
        <span className="hidden sm:inline">{capturing ? "Capturing…" : "Report Bug"}</span>
      </Button>

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
