import { describe, expect, it } from "vitest";
import { translateNavItems } from "./sidebarNavI18n";
import type { SidebarNavItem } from "./sidebarNavTypes";

const t = (key: string) => `tr:${key}`;

describe("translateNavItems", () => {
  it("resolves titleKey to translated title recursively", () => {
    const items: SidebarNavItem[] = [
      {
        title: "",
        titleKey: "nav.dashboard",
        href: "/",
        children: [{ title: "", titleKey: "nav.menuItems", href: "/menu" }],
      },
    ];

    const translated = translateNavItems(items, t);

    expect(translated[0]?.title).toBe("tr:nav.dashboard");
    expect(translated[0]?.children?.[0]?.title).toBe("tr:nav.menuItems");
  });
});
