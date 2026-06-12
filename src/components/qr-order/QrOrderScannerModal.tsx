import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";
import { parseQrOrderCode } from "@/lib/qrOrderCodeParser";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
};

export function QrOrderScannerModal({ open, onClose, onScan }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let active = true;
    const scanner = new Html5Qrcode("qr-order-scanner-region");
    scannerRef.current = scanner;
    setError(null);

    void scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          const code = parseQrOrderCode(decoded);
          if (!code || !active) return;
          void scanner.stop().finally(() => {
            onScan(code);
            onClose();
          });
        },
        () => undefined,
      )
      .catch(() => {
        if (active) setError("Camera access failed. Use manual search or USB scanner.");
      });

    return () => {
      active = false;
      if (scannerRef.current?.isScanning) {
        void scannerRef.current.stop().catch(() => undefined);
      }
      scannerRef.current = null;
    };
  }, [open, onClose, onScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4" data-testid="qr-order-scanner-modal">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Scan QR</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Close scanner">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          <div id="qr-order-scanner-region" className="w-full overflow-hidden rounded-xl" />
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
          <p className="text-xs text-muted-foreground mt-3">Point camera at customer order QR code.</p>
        </div>
      </div>
    </div>
  );
}
