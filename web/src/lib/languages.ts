/**
 * Language constants and date/number formatting locales.
 *
 * Kept free of i18next / JSON imports on purpose so it can be used from plain
 * Node scripts (tests) as well as from the app. `lib/i18n.ts` re-exports these
 * so existing imports from "@/lib/i18n" keep working.
 */

export const LANGUAGES = ["en", "zh-CN", "ms", "ta", "fil"] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * BCP-47 locale used for date/number formatting, per app language.
 * Dates must follow the UI language — otherwise a Chinese screen shows
 * "Jan 8, 2027" instead of "2027年1月8日".
 */
const DATE_LOCALES: Record<Language, string> = {
  en: "en-US",
  "zh-CN": "zh-CN",
  ms: "ms-MY",
  ta: "ta-IN",
  fil: "fil-PH",
};

/** Resolve the date-formatting locale for an i18n language code. */
export const dateLocale = (lang: string): string =>
  DATE_LOCALES[lang as Language] ?? "en-US";
