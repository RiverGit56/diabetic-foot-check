"use client";

import { useTranslation } from "react-i18next";

export default function Disclaimer() {
  const { t } = useTranslation();

  return (
    <div className="mb-4 space-y-2">
      {/* Main disclaimer */}
      <div
        className="rounded-xl border border-amber-400 bg-amber-50 p-3"
        role="alert"
        aria-live="polite"
      >
        <div className="flex gap-2">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-base font-semibold leading-relaxed text-amber-900">
            {t("disclaimer.general")}
          </p>
        </div>
      </div>
    </div>
  );
}
