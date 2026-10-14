"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";

const navItems = [
  {
    href: "/",
    key: "home",
    ariaLabel: "aria.home",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10"
      />
    ),
  },
  {
    href: "/assess",
    key: "assess",
    ariaLabel: "aria.assess",
    // Lucide "footprints" (ISC). The previous shape rendered as a quatrefoil
    // rather than a foot; this matches the header mark.
    icon: (
      <>
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
      </>
    ),
  },
  {
    href: "/recommendations",
    key: "recommendations",
    ariaLabel: "aria.recommendations",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    ),
  },
  {
    href: "/followup",
    key: "followup",
    ariaLabel: "aria.followup",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3M16 7V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
      />
    ),
  },
  {
    href: "/profile",
    key: "profile",
    ariaLabel: "aria.profile",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-gray-200 bg-white"
      role="navigation"
      aria-label={t("nav.ariaLabel") || "Main navigation"}
    >
      <div className="mx-auto flex h-20 max-w-md items-stretch justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? "text-primary-800" : "text-gray-600"
              }`}
              aria-label={t(item.ariaLabel)}
              aria-current={isActive ? "page" : undefined}
            >
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden="true"
              >
                {item.icon}
              </svg>
              <span className="text-sm font-medium">{t(`nav.${item.key}`)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
