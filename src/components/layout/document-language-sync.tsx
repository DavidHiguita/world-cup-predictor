"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { resolveLocale } from "@/lib/i18n";

export function DocumentLanguageSync() {
  const searchParams = useSearchParams();
  const locale = resolveLocale(searchParams.get("lang"));

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
