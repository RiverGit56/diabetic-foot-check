"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../public/locales/en.json";
import zhCN from "../../public/locales/zh-CN.json";
import ms from "../../public/locales/ms.json";
import ta from "../../public/locales/ta.json";
import fil from "../../public/locales/fil.json";

const STORAGE_KEY = "footcheck-lang";

const RESOURCES = {
  en: { translation: en },
  "zh-CN": { translation: zhCN },
  ms: { translation: ms },
  ta: { translation: ta },
  fil: { translation: fil },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: RESOURCES,
    // Always start with "en" on both server and first client render to avoid
    // hydration mismatch. The stored language is applied in a useEffect after
    // mount (see AppWrapper).
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
} else {
  // Already initialised — this happens during development when Fast Refresh
  // re-runs this module after a locale JSON was edited. Without this, the
  // running i18n instance keeps the OLD bundles, so any newly added key shows
  // up as a raw key (e.g. "profile.comorbidityOpt.none") until a full reload.
  for (const [lng, bundle] of Object.entries(RESOURCES)) {
    i18n.addResourceBundle(lng, "translation", bundle.translation, true, true);
  }
}

export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }
};

// Language constants live in a dependency-free module so plain Node scripts
// (tests) can import them without pulling in the JSON bundles above.
export { LANGUAGES, dateLocale } from "./languages";
export type { Language } from "./languages";

export default i18n;
