"use client";

import { useTranslation } from "react-i18next";
import type { TriageDecision, CareTier } from "@/lib/triageEngine";

/**
 * TriageCard — renders the deterministic care tier.
 *
 * The care tier shown here is LOCKED. It is produced by the rule engine and
 * is never altered by AI-generated text.
 */

const TIER_STYLES: Record<
  CareTier,
  { border: string; bg: string; text: string; badge: string; icon: string; iconPath: string }
> = {
  EMERGENCY: {
    border: "border-red-500",
    bg: "bg-red-50",
    text: "text-red-900",
    badge: "bg-red-600 text-white",
    icon: "text-red-600",
    iconPath:
      "M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  },
  PRIMARY_CARE: {
    border: "border-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-900",
    badge: "bg-amber-600 text-white",
    icon: "text-amber-600",
    iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  SELF_CARE: {
    border: "border-green-500",
    bg: "bg-green-50",
    text: "text-green-900",
    badge: "bg-green-600 text-white",
    icon: "text-green-600",
    iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  ABSTAIN: {
    border: "border-gray-400",
    bg: "bg-gray-50",
    text: "text-gray-900",
    badge: "bg-gray-600 text-white",
    icon: "text-gray-600",
    iconPath:
      "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

export default function TriageCard({
  decision,
  compact = false,
}: {
  decision: TriageDecision;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const s = TIER_STYLES[decision.tier];

  return (
    <div
      className={`rounded-2xl border-2 ${s.border} ${s.bg} p-4 shadow-sm`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 flex items-start gap-3">
        <svg
          className={`mt-0.5 h-6 w-6 flex-shrink-0 ${s.icon}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d={s.iconPath} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold uppercase tracking-wide ${s.text} opacity-70`}>
            {t("triage.title")}
          </p>
          <p className={`text-lg font-bold ${s.text} break-words`}>
            {t(`triage.tier.${decision.tier}`)}
          </p>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${s.badge}`}
        >
          {t(`triage.confidence.${decision.confidence}`)}
        </span>
      </div>

      {/* Abstention message */}
      {decision.tier === "ABSTAIN" && decision.abstention && (
        <div className="mb-3 rounded-xl bg-white/70 p-3">
          <p className="text-base font-semibold text-gray-900">
            {t(decision.abstention.reasonKey)}
          </p>
          <p className="mt-1 text-base leading-relaxed text-gray-700 break-words">
            {t(decision.abstention.detailKey)}
          </p>
        </div>
      )}

      {/* Where & when */}
      {decision.tier !== "ABSTAIN" && (
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-white/70 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("triage.facilityLabel")}
            </p>
            <p className={`mt-0.5 text-base font-semibold ${s.text} break-words`}>
              {t(decision.playbook.facilityKey)}
            </p>
          </div>
          <div className="rounded-xl bg-white/70 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("triage.timeframeLabel")}
            </p>
            <p className={`mt-0.5 text-base font-semibold ${s.text} break-words`}>
              {t(decision.playbook.timeframeKey)}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-xl bg-white/70 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t("triage.actionLabel")}
        </p>
        <ul className="space-y-1.5">
          {decision.playbook.actionKeys.map((key) => (
            <li key={key} className="flex gap-2">
              <svg
                className={`mt-0.5 h-5 w-5 flex-shrink-0 ${s.icon}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-base leading-relaxed text-gray-800 break-words">
                {t(key)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Why (matched criteria) */}
      {!compact && decision.matchedCriteria.length > 0 && (
        <div className="mt-3 rounded-xl bg-white/60 px-3 py-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t("triage.criteriaLabel")}
          </p>
          <ul className="space-y-1">
            {decision.matchedCriteria.map((key) => (
              <li key={key} className="text-sm text-gray-700 break-words">
                • {t(key)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Locked-tier notice */}
      <p className="mt-3 text-xs leading-relaxed text-gray-500 break-words">
        {t("triage.lockedNote")}
      </p>
    </div>
  );
}
