"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { getCommonMessages, resolveLocale } from "@/lib/i18n";

type LanguageSwitcherProps = {
  className: string;
};

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = resolveLocale(searchParams.get("lang"));
  const messages = getCommonMessages(locale);
  const alternateLocale = locale === "en" ? "es" : "en";
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  nextSearchParams.set("lang", alternateLocale);

  const nextQuery = nextSearchParams.toString();
  const href = nextQuery ? `${pathname}?${nextQuery}` : pathname;

  return (
    <Link
      aria-label={`${messages.nav.language}: ${alternateLocale.toUpperCase()}`}
      className={className}
      href={href}
      lang={alternateLocale}
    >
      {messages.nav.language}: {alternateLocale.toUpperCase()}
    </Link>
  );
}
