"use client";

import "@/lib/i18n";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "./Header";
import BottomNav from "./BottomNav";
import { ReactNode } from "react";
import { clearStoredData } from "@/lib/assessment";

const STORAGE_KEY = "footcheck-lang";

export default function AppWrapper({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  // A counter we bump after each language change to force a full re-render of
  // the page content tree. The react-i18next subscription model works for
  // components mounted before the change, but the `children` prop coming from
  // the Next.js layout doesn't always pick up the event in App Router — so we
  // remount it via a `key` to guarantee the translated strings re-render.
  const [langKey, setLangKey] = useState(0);
  const [currentLang, setCurrentLang] = useState("en");

  // Demo/testing helper: open any page with `?reset=1` to wipe the stored
  // profile + history and behave like a brand-new user. The flag is removed
  // from the URL so a refresh does not reset again.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") !== "1") return;

    clearStoredData();
    params.delete("reset");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (qs ? `?${qs}` : "")
    );
    // Remount the page content so it re-reads the now-empty storage.
    setLangKey((k) => k + 1);
  }, []);

  // After hydration, read the user's saved language and apply it.
  // This avoids an SSR/CSR mismatch (server always renders with "en").
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const target = stored || detectBrowserLanguage();
    if (target && target !== i18n.language) {
      // Use the i18n instance from useTranslation() to guarantee the same
      // instance that React components are subscribed to.
      i18n.changeLanguage(target).then(() => {
        if (stored) localStorage.setItem(STORAGE_KEY, target);
        document.documentElement.lang = target;
        setCurrentLang(target);
        setLangKey((k) => k + 1);
      });
    } else if (target && !stored) {
      // First visit: persist the detected language
      localStorage.setItem(STORAGE_KEY, target);
      document.documentElement.lang = target;
      setCurrentLang(target);
      setLangKey((k) => k + 1);
    }
  }, [i18n]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main
        className="flex-1 pb-32 pt-16 px-4"
        role="main"
      >
        <div key={langKey} className="mx-auto w-full max-w-md">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}

function detectBrowserLanguage(): string {
  if (typeof navigator === "undefined") return "en";
  const browser = (navigator.language || "en").toLowerCase();
  if (browser.startsWith("zh")) return "zh-CN";
  if (browser.startsWith("ms")) return "ms";
  if (browser.startsWith("ta")) return "ta";
  if (browser.startsWith("fil") || browser.startsWith("tl")) return "fil";
  return "en";
}
