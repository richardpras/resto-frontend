import {
  buildCustomerReceiptLines,
  buildSettingsReceiptPreviewSnapshot,
} from "@/domain/thermalReceiptLayout";

type Props = {
  outletName: string;
  header: string;
  footer: string;
  showLogo?: boolean;
  logoUrl?: string | null;
  showTaxBreakdown: boolean;
  widthCh: number;
};

export function ReceiptThermalPreview({
  outletName,
  header,
  footer,
  showLogo = false,
  logoUrl,
  showTaxBreakdown,
  widthCh,
}: Props) {
  const lines = buildCustomerReceiptLines(
    buildSettingsReceiptPreviewSnapshot({
      outletName,
      header,
      footer,
      showTaxBreakdown,
    }),
    widthCh,
  );

  return (
    <div
      className="bg-muted/30 rounded-2xl p-6 font-mono text-xs border-2 border-dashed mx-auto overflow-x-auto"
      style={{ maxWidth: `${widthCh + 50}ch` }}
      data-testid="receipt-thermal-preview"
    >
      {showLogo && logoUrl ? (
        <img
          src={logoUrl}
          alt={`${outletName} logo`}
          className="mx-auto mb-1 max-h-16 max-w-[70%] object-contain"
          data-testid="receipt-preview-logo"
        />
      ) : showLogo ? (
        <div className="h-10 w-10 mx-auto mb-1 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">
          LOGO
        </div>
      ) : null}

      <div className="space-y-0.5">
        {lines.map((line, index) => {
          const isBlank = !line.text.trim();
          if (isBlank) {
            return <div key={`feed-${index}`} aria-hidden className="h-3" />;
          }
          return (
            <div
              key={`${index}-${line.text.slice(0, 12)}`}
              className={[
                "whitespace-pre leading-relaxed",
                line.align === "center" ? "text-center" : "",
                line.bold ? "font-bold" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
