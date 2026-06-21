import { formatPreviewColumns, formatPreviewMoney } from "@/domain/receiptPreviewUtils";

type Props = {
  outletName: string;
  header: string;
  footer: string;
  showLogo?: boolean;
  logoUrl?: string | null;
  showTaxBreakdown: boolean;
  widthCh: number;
};

const SAMPLE_ITEMS = [
  { name: "Item A", qty: 1, price: 15000 },
  { name: "Item B", qty: 2, price: 15000 },
] as const;

const SAMPLE_SUBTOTAL = 45000;
const SAMPLE_TAX = 4500;
const SAMPLE_TOTAL = 49500;

function MetaRow({ label, value, widthCh }: { label: string; value: string; widthCh: number }) {
  return (
    <div className="whitespace-pre font-mono text-xs leading-relaxed">
      {formatPreviewColumns(label, value, widthCh)}
    </div>
  );
}

export function ReceiptThermalPreview({
  outletName,
  header,
  footer,
  showLogo = false,
  logoUrl,
  showTaxBreakdown,
  widthCh,
}: Props) {
  const divider = "-".repeat(widthCh);
  const now = new Date();
  const timeLabel = now.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(",", "");

  return (
    <div
      className="bg-muted/30 rounded-2xl p-6 font-mono text-xs border-2 border-dashed mx-auto overflow-x-auto"
      style={{ maxWidth: `${widthCh+50}ch` }}
      data-testid="receipt-thermal-preview"
    >
      <div className="text-center space-y-1">
        {showLogo && logoUrl ? (
          <img
            src={logoUrl}
            alt={`${outletName} logo`}
            className="mx-auto mb-2 max-h-16 max-w-[70%] object-contain"
            data-testid="receipt-preview-logo"
          />
        ) : showLogo ? (
          <div className="h-10 w-10 mx-auto mb-2 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">
            LOGO
          </div>
        ) : null}
        <p className="font-bold">{outletName}</p>
        {header ? <p className="whitespace-pre-line">{header}</p> : null}
      </div>

      <div className="mt-3 space-y-1">
        <MetaRow label="Order" value="ORD-SAMPLE-001" widthCh={widthCh} />
        <MetaRow label="Customer" value="Budi" widthCh={widthCh} />
        <MetaRow label="Time" value={timeLabel} widthCh={widthCh} />
        <MetaRow label="Type" value="Dine In" widthCh={widthCh} />
      </div>

      <div className="my-2 whitespace-pre">{divider}</div>

      <div className="space-y-2">
        {SAMPLE_ITEMS.map((item) => {
          const lineTotal = item.qty * item.price;
          return (
            <div key={item.name}>
              <div>{item.name}</div>
              <div className="whitespace-pre">
                {formatPreviewColumns(
                  `${item.qty} x ${formatPreviewMoney(item.price)}`,
                  formatPreviewMoney(lineTotal),
                  widthCh,
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="my-2 whitespace-pre">{divider}</div>

      <div className="space-y-1">
        <MetaRow label="Subtotal" value={formatPreviewMoney(SAMPLE_SUBTOTAL)} widthCh={widthCh} />
        {showTaxBreakdown ? (
          <MetaRow label="Tax" value={formatPreviewMoney(SAMPLE_TAX)} widthCh={widthCh} />
        ) : null}
        <div className="whitespace-pre font-bold">
          {formatPreviewColumns("TOTAL", formatPreviewMoney(SAMPLE_TOTAL), widthCh)}
        </div>
      </div>

      <div className="my-2 whitespace-pre">{divider}</div>

      {footer ? <p className="text-center whitespace-pre-line">{footer}</p> : null}

      <div aria-hidden className="h-6" />
      <div aria-hidden className="h-3" />
      <div aria-hidden className="h-3" />
    </div>
  );
}
