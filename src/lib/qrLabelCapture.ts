import html2canvas from "html2canvas";

export type QrLabelPrintParams = {
  restaurantName: string;
  outletName: string;
  tableName: string;
  qrImageSrc: string;
  scanHint: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Inline HTML matching QrPrintTemplate layout (80mm label, no URL). */
export function buildQrLabelBodyHtml({
  restaurantName,
  outletName,
  tableName,
  qrImageSrc,
  scanHint,
}: QrLabelPrintParams): string {
  return `
    <div data-testid="qr-print-label" class="qr-print-label" style="width:80mm;max-width:100%;margin:0 auto;border:1px solid #000;border-radius:8px;padding:16px;text-align:center;color:#000;background:#fff;box-sizing:border-box;">
      <div style="font-weight:700;font-size:14px;line-height:1.25;">${escapeHtml(restaurantName)}</div>
      <div style="font-size:12px;color:#4b5563;margin-bottom:8px;">${escapeHtml(outletName)}</div>
      <div style="font-size:20px;font-weight:800;margin-bottom:12px;line-height:1.25;">${escapeHtml(tableName)}</div>
      <img src="${escapeHtml(qrImageSrc)}" alt="QR" style="display:block;margin:0 auto;width:160px;height:160px;object-fit:contain;" />
      <div style="font-size:12px;margin-top:12px;font-weight:500;line-height:1.25;">${escapeHtml(scanHint)}</div>
    </div>
  `;
}

export async function captureElementAsPngBlob(
  element: HTMLElement,
  options?: { backgroundColor?: string; scale?: number },
): Promise<Blob> {
  const canvas = await html2canvas(element, {
    backgroundColor: options?.backgroundColor ?? "#ffffff",
    scale: options?.scale ?? 2,
    useCORS: true,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Failed to create PNG blob"));
    }, "image/png");
  });
}

const PRINT_PAGE_STYLE = `
  html, body { margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 16px;
    box-sizing: border-box;
    background: #fff;
  }
  img { max-width: 100%; height: auto; }
  @media print {
    body { padding: 0; display: block; }
    img { width: 80mm; margin: 0 auto; display: block; }
  }
`;

export function printHtmlLabel(bodyHtml: string, title = "Print QR"): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error("Print iframe unavailable");
  }

  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title>
    <style>${PRINT_PAGE_STYLE}</style>
    </head><body>${bodyHtml}
    <script>window.onload = function () { window.print(); };</script>
    </body></html>`);
  doc.close();

  const cleanup = () => {
    iframe.remove();
  };
  win.onafterprint = cleanup;
  setTimeout(cleanup, 60_000);
}

async function waitForImageLoad(element: HTMLElement): Promise<void> {
  const img = element.querySelector("img");
  if (!img || img.complete) return;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("QR image failed to load"));
  });
}

/** Print the same PNG capture used for download — WYSIWYG with preview. */
export async function printCapturedLabel(element: HTMLElement, title = "Print QR"): Promise<void> {
  await waitForImageLoad(element);
  const blob = await captureElementAsPngBlob(element);
  const url = URL.createObjectURL(blob);
  try {
    const bodyHtml = `<img src="${url}" alt="QR Label" style="width:80mm;display:block;margin:0 auto;" />`;
    printHtmlLabel(bodyHtml, title);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

/** Build a temporary off-screen label, capture, and print (Tables page). */
export async function printQrLabel(params: QrLabelPrintParams, title?: string): Promise<void> {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;";
  host.innerHTML = buildQrLabelBodyHtml(params);
  document.body.appendChild(host);

  const label = host.firstElementChild;
  if (!(label instanceof HTMLElement)) {
    host.remove();
    throw new Error("QR label element missing");
  }

  try {
    await printCapturedLabel(label, title ?? `Print QR ${params.tableName}`);
  } finally {
    host.remove();
  }
}
