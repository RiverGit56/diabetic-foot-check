"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import { dateLocale } from "@/lib/i18n";
import {
  getAssessmentHistory,
  getProfile,
  type AssessmentHistoryEntry,
  type UserProfile,
  type RiskLevel,
} from "@/lib/assessment";
import {
  mapToIWGDFCategory,
  getApplicableRules,
  nextScreeningDate,
  IWGDF_CATEGORIES,
  type ClinicalRule,
} from "@/lib/clinicalRules";
import { TRIAGE_SOURCES } from "@/lib/triageEngine";

interface Category {
  key: string;
  icon: string;
  items: string[];
}

/** Colour-coded badge for the guideline a clinical rule comes from. */
function sourceBadge(source: ClinicalRule["source"]): string {
  return source === "NICE"
    ? "bg-sky-100 text-sky-800"
    : "bg-violet-100 text-violet-800";
}

export default function RecommendationsPage() {
  const { t, i18n } = useTranslation();
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [history, setHistory] = useState<AssessmentHistoryEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setHistory(getAssessmentHistory());
    setProfile(getProfile());
  }, []);

  const latest = history.length > 0 ? history[history.length - 1] : null;
  const riskLevel: RiskLevel = latest?.riskLevel || "low";

  const riskColor = riskLevel === "low" ? "text-risk-low bg-risk-lowBg"
    : riskLevel === "moderate" ? "text-risk-moderate bg-risk-moderateBg"
    : riskLevel === "high" ? "text-risk-high bg-risk-highBg"
    : "text-risk-high bg-risk-highBg";
  const riskDot = riskLevel === "low" ? "bg-risk-low"
    : riskLevel === "moderate" ? "bg-risk-moderate"
    : "bg-risk-high";

  // Build personalized recommendation categories based on assessment results
  const categories: Category[] = buildRecommendations(latest, profile, t);

  // IWGDF 2023 risk category + the clinical rules that actually fired.
  const iwgdfCategory = latest ? mapToIWGDFCategory(latest) : null;
  const iwgdfInfo =
    iwgdfCategory !== null
      ? (IWGDF_CATEGORIES.find((c) => c.category === iwgdfCategory) ?? null)
      : null;
  const applicableRules: ClinicalRule[] = latest
    ? getApplicableRules(latest)
    : [];

  const riskLabelKey = riskLevel === "low" ? "recommendations.riskLow"
    : riskLevel === "moderate" ? "recommendations.riskModerate"
    : riskLevel === "high" ? "recommendations.riskHigh"
    : "recommendations.riskUrgent";

  const lastDate = latest
    ? new Date(latest.timestamp).toLocaleDateString(dateLocale(i18n.language))
    : t("recommendations.notAssessed");

  return (
    <div className="py-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">{t("recommendations.title")}</h1>
        <p className="text-base text-gray-600">{t("recommendations.subtitle")}</p>
      </div>

      {/* Risk Indicator Card */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t("recommendations.currentRisk")}</p>
            <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-semibold ${riskColor}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${riskDot}`} />
              {t(riskLabelKey)}
            </span>
            <p className="mt-1.5 text-sm text-gray-600">
              {t("recommendations.lastAssessed")}: {lastDate}
            </p>
            {latest && (
              <p className="mt-0.5 text-sm text-gray-500">
                {latest.totalScore}/{latest.maxScore} {t("assess.scoreUnit")}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className={`h-6 w-6 ${
              riskLevel === "low" ? "text-risk-low"
              : riskLevel === "moderate" ? "text-risk-moderate"
              : "text-risk-high"
            }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        {latest && latest.categoryScores.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="mb-2 text-sm font-semibold text-gray-700">{t("recommendations.categoryBreakdown")}</p>
            <div className="flex flex-wrap gap-1.5">
              {latest.categoryScores.map((cs) => (
                <span key={cs.category} className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  cs.percentage >= 60 ? "bg-red-100 text-red-800"
                  : cs.percentage >= 30 ? "bg-amber-100 text-amber-800"
                  : "bg-green-100 text-green-800"
                }`}>
                  {t(`assess.categories.${cs.category}`)}: {cs.percentage}%
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deterministic care tier (rule-locked) */}
      {latest && latest.triageTier && (() => {
        const tier = latest.triageTier!;
        const tierColor =
          tier === "EMERGENCY" ? "border-red-500 bg-red-50 text-red-900"
          : tier === "PRIMARY_CARE" ? "border-amber-500 bg-amber-50 text-amber-900"
          : tier === "SELF_CARE" ? "border-green-500 bg-green-50 text-green-900"
          : "border-gray-400 bg-gray-50 text-gray-900";
        return (
          <div className={`mb-4 rounded-2xl border-2 ${tierColor} p-4`}>
            <p className="text-sm font-semibold uppercase tracking-wide opacity-70">
              {t("recommendations.careTierLabel")}
            </p>
            <p className="text-lg font-bold">{t(`triage.tier.${tier}`)}</p>
          </div>
        );
      })()}

      {/* IWGDF 2023 risk category (drives the re-screening interval) */}
      {iwgdfInfo && iwgdfCategory !== null && (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-gray-900">{t("iwgdf.label")}</h2>
            <span className="flex-shrink-0 rounded-full bg-primary-100 px-2.5 py-1 text-sm font-semibold text-primary-800">
              {t(`iwgdf.cat${iwgdfCategory}`)}
            </span>
          </div>
          <p className="text-base leading-relaxed text-gray-800 break-words">
            {t(`iwgdf.catDesc${iwgdfCategory}`)}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-primary-50 px-3 py-2">
            <p className="flex-shrink-0 text-sm text-primary-900">{t("iwgdf.screeningFreq")}</p>
            <p className="min-w-0 text-right text-sm font-semibold text-primary-800">
              {t(`iwgdf.catFreq${iwgdfCategory}`)}
            </p>
          </div>
        </div>
      )}

      {/* Next routine screening date (IWGDF interval) */}
      {iwgdfCategory !== null && latest && (
        <div className="mb-4 rounded-2xl border border-primary-200 bg-primary-50 p-4">
          <p className="text-sm font-semibold text-primary-900">{t("recommendations.nextScreeningLabel")}</p>
          <p className="mt-1 text-base font-bold text-primary-800">
            {new Date(nextScreeningDate(latest.timestamp, iwgdfCategory)).toLocaleDateString(dateLocale(i18n.language))}
          </p>
        </div>
      )}

      {/* Clinical decision rules that fired for this assessment */}
      {applicableRules.length > 0 && (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">{t("iwgdf.clinicalRules")}</h2>
          <p className="mt-1 text-sm text-gray-600 break-words">{t("iwgdf.rulesDisclaimer")}</p>
          <div className="mt-3 space-y-3">
            {applicableRules.map((rule, i) => (
              <div
                key={rule.id}
                className={`flex gap-2.5 ${i > 0 ? "border-t border-gray-100 pt-3" : ""}`}
              >
                <span
                  className={`mt-0.5 h-fit flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${sourceBadge(rule.source)}`}
                >
                  {t(`rules.source.${rule.source}`)}
                </span>
                <p className="min-w-0 flex-1 text-base leading-relaxed text-gray-800 break-words">
                  {t(rule.ruleKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical basis — fixed, verifiable guideline sources */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-base font-bold text-gray-900">{t("recommendations.clinicalBasis")}</h2>
        <ul className="space-y-1">
          {TRIAGE_SOURCES.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-gray-700 break-words">
              <span className="text-primary-600">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <Disclaimer />

      {/* Personalized Recommendations */}
      {categories.length > 0 ? (
        categories.map((cat) => (
          <div key={cat.key} className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100">
                <svg className="h-5 w-5 text-primary-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                </svg>
              </div>
              <h2 className="text-base font-bold text-gray-900">{t(`recommendations.${cat.key}`)}</h2>
            </div>
            <div className="space-y-2.5">
              {cat.items.map((item, i) => (
                <div key={i} className="flex gap-2.5">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-base leading-relaxed text-gray-800 break-words">{t(`recommendations.${item}`)}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-base text-gray-600">{t("recommendations.noAssessment")}</p>
          <a href="/assess" className="mt-2 inline-block text-base font-semibold text-primary-600 underline">
            {t("recommendations.takeAssessment")}
          </a>
        </div>
      )}

      {/* Emergency warning */}
      {latest && latest.emergencyFlags.length > 0 && (
        <div className="mb-3 rounded-2xl border-2 border-red-500 bg-red-50 p-4" role="alert">
          <div className="flex gap-2">
            <svg className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="font-bold text-red-900">{t("recommendations.emergencyTitle")}</p>
              <ul className="mt-1 space-y-1">
                {latest.emergencyFlags.map((flag) => (
                  <li key={flag} className="text-base text-red-800 break-words">
                    • {t(`assess.flags.${flag}`)}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-base font-semibold text-red-900">{t("recommendations.emergencyAction")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Learn More */}
      <button
        onClick={() => setShowLearnMore(!showLearnMore)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-base font-semibold text-primary-800 shadow-sm transition-colors hover:bg-primary-50 min-h-[3rem]"
        aria-expanded={showLearnMore}
      >
        {t("recommendations.learnMore")}
        <svg className={`h-5 w-5 transition-transform ${showLearnMore ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {showLearnMore && (
        <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4 animate-fade-in">
          <p className="text-base leading-relaxed text-gray-700 break-words">{t("recommendations.learnMoreText")}</p>
        </div>
      )}

      {/* Tracking (compare with last record) CTA */}
      {latest && (
        <Link
          href="/followup"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-4 text-lg font-semibold text-white shadow-md transition-colors hover:bg-primary-700 min-h-[3rem]"
        >
          {t("recommendations.recheckCta")}
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M8 7V3M16 7V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
    </div>
  );
}

// ── Build personalized recommendations ──
function buildRecommendations(
  latest: AssessmentHistoryEntry | null,
  profile: UserProfile | null,
  t: (key: string) => string
): Category[] {
  if (!latest) {
    // No assessment done yet — show general recommendations
    return [
      {
        key: "categoryDaily",
        icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z",
        items: ["daily1", "daily2", "daily3"],
      },
    ];
  }

  const cats: Category[] = [];
  const items: Record<string, string[]> = {
    categoryDaily: [],
    categoryMedical: [],
    categoryLifestyle: [],
  };

  // Always include daily care
  items.categoryDaily.push("daily1", "daily2", "daily3");

  // Personalized based on category scores
  for (const cs of latest.categoryScores) {
    if (cs.category === "neuropathy" && cs.percentage >= 30) {
      items.categoryMedical.push("medNeuropathy");
    }
    if (cs.category === "skin" && cs.percentage >= 30) {
      items.categoryMedical.push("medSkin");
    }
    if (cs.category === "wound" && cs.percentage >= 30) {
      items.categoryMedical.push("medWound");
    }
    if (cs.category === "circulation" && cs.percentage >= 30) {
      items.categoryMedical.push("medCirculation");
    }
    if (cs.category === "selfcare" && cs.percentage >= 30) {
      items.categoryLifestyle.push("lsSelfCare");
    }
    if (cs.category === "history" && cs.percentage >= 30) {
      items.categoryMedical.push("medHistory");
    }
  }

  // Profile-based recommendations
  if (profile?.smoking === "current") {
    items.categoryLifestyle.push("lsSmoking");
  }
  if (profile?.insulinUse === true) {
    items.categoryMedical.push("medInsulin");
  }
  if (profile?.lastHbA1c === "over8") {
    items.categoryMedical.push("medHbA1c");
  }

  // General lifestyle
  items.categoryLifestyle.push("lifestyle1", "lifestyle2", "lifestyle3");

  // Risk-based urgency
  if (latest.riskLevel === "moderate") {
    items.categoryMedical.unshift("medSeeGP2weeks");
  } else if (latest.riskLevel === "high" || latest.riskLevel === "urgent") {
    items.categoryMedical.unshift("medSeeGP48h");
  } else {
    items.categoryMedical.push("medRegular6to12");
  }

  // Build category array
  if (items.categoryDaily.length > 0) {
    cats.push({
      key: "categoryDaily",
      icon: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z",
      items: items.categoryDaily,
    });
  }
  if (items.categoryMedical.length > 0) {
    cats.push({
      key: "categoryMedical",
      icon: "M9 12h6m-6 4h6m-6-8h6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z",
      items: items.categoryMedical,
    });
  }
  if (items.categoryLifestyle.length > 0) {
    cats.push({
      key: "categoryLifestyle",
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
      items: items.categoryLifestyle,
    });
  }

  return cats;
}
