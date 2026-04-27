import { commonMessages as enCommonMessages } from "@/messages/en/common";
import { commonMessages as esCommonMessages } from "@/messages/es/common";

export const locales = ["en", "es"] as const;

export type Locale = (typeof locales)[number];

const dictionaries = {
  en: enCommonMessages,
  es: esCommonMessages,
} as const;

export function getCommonMessages(locale: Locale = "en") {
  return dictionaries[locale];
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function resolveLocale(value: string | null | undefined): Locale {
  if (value && isLocale(value)) {
    return value;
  }

  return "en";
}
