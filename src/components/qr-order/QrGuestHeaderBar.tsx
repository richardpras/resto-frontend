import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

type QrGuestHeaderBarProps = {
  children?: ReactNode;
  className?: string;
};

export function QrGuestHeaderBar({ children, className = "" }: QrGuestHeaderBarProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="shrink-0">
        <LanguageSwitcher mode="guest" variant="guest" />
      </div>
    </div>
  );
}

export function QrGuestLanguageCorner() {
  return (
    <div className="fixed top-3 right-3 z-20" data-testid="qr-guest-language-corner">
      <LanguageSwitcher mode="guest" variant="guest" />
    </div>
  );
}
