import QRCode from "react-qr-code";

type Props = {
  orderCode: string;
  lookupUrl?: string;
};

export function QrOrderQrCodeDisplay({ orderCode, lookupUrl }: Props) {
  const value = lookupUrl ?? orderCode;

  return (
    <div className="text-center" data-testid="qr-order-qr-code">
      <div className="inline-block rounded-2xl bg-white p-4 shadow-sm border border-border">
        <QRCode value={value} size={160} level="M" />
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Tunjukkan QR ini ke kasir jika diperlukan
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">Show this QR code to cashier</p>
    </div>
  );
}
