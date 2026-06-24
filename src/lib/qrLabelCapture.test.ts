// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildQrLabelBodyHtml, printHtmlLabel } from "@/lib/qrLabelCapture";

vi.mock("html2canvas", () => ({
  default: vi.fn(),
}));

describe("qrLabelCapture", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("builds escaped label body html", () => {
    const html = buildQrLabelBodyHtml({
      restaurantName: "Resto <A>",
      outletName: "Hall & Bar",
      tableName: "T01",
      qrImageSrc: "blob:qr",
      scanHint: "Scan <here>",
    });

    expect(html).toContain("Resto &lt;A&gt;");
    expect(html).toContain("Hall &amp; Bar");
    expect(html).toContain("Scan &lt;here&gt;");
    expect(html).toContain('src="blob:qr"');
    expect(html).toContain("width:80mm");
    expect(html).not.toContain("example.com");
  });

  it("prints via hidden iframe without window.open", () => {
    const openSpy = vi.spyOn(window, "open");
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === "iframe") {
        Object.defineProperty(el, "contentDocument", {
          value: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
          configurable: true,
        });
        Object.defineProperty(el, "contentWindow", {
          value: { print: vi.fn(), onafterprint: null },
          configurable: true,
        });
      }
      return el;
    });

    printHtmlLabel("<div>Label</div>", "Print QR T01");

    expect(openSpy).not.toHaveBeenCalled();
    expect(document.querySelector("iframe")).not.toBeNull();

    openSpy.mockRestore();
  });
});
