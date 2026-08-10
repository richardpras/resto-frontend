import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";
import { parseQrOrderCode } from "@/lib/qrOrderCodeParser";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
};

async function resolveCameraId(): Promise<string | { facingMode: string }> {
  try {
    const cameras = await Html5Qrcode.getCameras();
    if (cameras.length === 0) {
      return { facingMode: "environment" };
    }
    const back = cameras.find((c) => /back|rear|environment|world/i.test(c.label));
    return (back ?? cameras[cameras.length - 1]).id;
  } catch {
    return { facingMode: "environment" };
  }
}

export function QrOrderScannerModal({ open, onClose, onScan }: Props) {
  const { t } = useOpsTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onCloseRef = useRef(onClose);
  const onScanRef = useRef(onScan);
  const tRef = useRef(t);
  const [error, setError] = useState<string | null>(null);

  onCloseRef.current = onClose;
  onScanRef.current = onScan;
  tRef.current = t;

  // Only restart camera when `open` flips — parent inline callbacks / i18n must not remount scanner.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    const start = async () => {
      setError(null);
      // Wait one frame so #qr-order-scanner-region is mounted.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (cancelled || !document.getElementById("qr-order-scanner-region")) return;

      try {
        const cameraConfig = await resolveCameraId();
        if (cancelled) return;

        scanner = new Html5Qrcode("qr-order-scanner-region");
        scannerRef.current = scanner;

        await scanner.start(
          cameraConfig,
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            const code = parseQrOrderCode(decoded);
            if (!code || cancelled || !scanner) return;
            cancelled = true;
            void scanner
              .stop()
              .catch(() => undefined)
              .finally(() => {
                scannerRef.current = null;
                onScanRef.current(code);
                onCloseRef.current();
              });
          },
          () => undefined,
        );
      } catch {
        if (!cancelled) {
          setError(tRef.current("qrStaff.scanner.cameraFailed"));
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      const current = scannerRef.current;
      scannerRef.current = null;
      if (current) {
        void current
          .stop()
          .catch(() => undefined)
          .finally(() => {
            try {
              current.clear();
            } catch {
              // region may already be unmounted
            }
          });
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4" data-testid="qr-order-scanner-modal">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">{t("qrStaff.scanner.title")}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted" aria-label={t("qrStaff.scanner.closeAria")}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          <div id="qr-order-scanner-region" className="w-full min-h-[240px] overflow-hidden rounded-xl bg-black/80" />
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
          <p className="text-xs text-muted-foreground mt-3">{t("qrStaff.scanner.hint")}</p>
        </div>
      </div>
    </div>
  );
}
