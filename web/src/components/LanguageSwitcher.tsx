"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { changeLanguage, LANGUAGES, type Language } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentLang = i18n.language as Language;

  const handleSelect = (lang: Language) => {
    changeLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-base font-medium text-white transition-colors hover:bg-white/25 min-h-[2.75rem]"
        aria-label={t("language.label")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" strokeLinecap="round" />
        </svg>
        <span className="text-sm">{t(`language.${currentLang}`)}</span>
        <svg className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg animate-fade-in"
          role="listbox"
          aria-label={t("language.label")}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => handleSelect(lang)}
              className={`flex w-full items-center justify-between px-4 py-3 text-base transition-colors hover:bg-gray-50 ${
                lang === currentLang ? "font-bold text-primary-800" : "text-gray-700"
              }`}
              role="option"
              aria-selected={lang === currentLang}
            >
              <span>{t(`language.${lang}`)}</span>
              {lang === currentLang && (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
