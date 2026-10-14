"use client";

import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const { t } = useTranslation();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-primary-800 text-white shadow-md"
      role="banner"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* Footprints icon (Lucide "footprints", ISC licensed).
              Replaces the previous mark, whose stem + base-line silhouette
              read as a wine glass rather than a foot. */}
          <svg
            className="h-8 w-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 17h4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 13h4" />
          </svg>
          <div className="leading-tight">
            <p className="text-lg font-bold">{t("app.title")}</p>
            <p className="text-xs text-primary-200">{t("app.tagline")}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
