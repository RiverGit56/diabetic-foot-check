"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import { changeLanguage, LANGUAGES, dateLocale, type Language } from "@/lib/i18n";
import {
  getAssessmentHistory,
  hasCompletedFirstRun,
  markFirstRunComplete,
  type AssessmentHistoryEntry,
  type RiskLevel,
} from "@/lib/assessment";
import { getEnvironmentalRisk } from "@/lib/dataSources";
interface EnvData {
  outdoorRisk: string;
  isRaining: boolean;
  airQualityRisk: string;
  recommendations: string[];
  forecast: string;
  psi: number;
  timestamp: string;
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  // `null` = not resolved yet (server render / before hydration). Resolved in an
  // effect so the server and the first client render agree (no hydration
  // mismatch) — localStorage is not available while rendering on the server.
  const [firstRun, setFirstRun] = useState<boolean | null>(null);
  const [history, setHistory] = useState<AssessmentHistoryEntry[]>([]);
  const [envData, setEnvData] = useState<EnvData | null>(null);
  const [envLoading, setEnvLoading] = useState(true);
  // Bumped when the first-run language selector changes the language, so that
  // screen re-renders immediately (does not rely on the i18n subscription).
  const [langVersion, setLangVersion] = useState(0);
  const latest = history.length > 0 ? history[history.length - 1] : null;

  useEffect(() => {
    setFirstRun(!hasCompletedFirstRun());
  }, []);

  useEffect(() => {
    // Nothing to load until we know we're showing the dashboard.
    if (firstRun !== false) return;

    setHistory(getAssessmentHistory());

    // Live environmental data from data.gov.sg (public, keyless). On network
    // failure it resolves with safe fallback values, so the card still renders.
    getEnvironmentalRisk()
      .then((risk) => setEnvData(risk))
      .catch(() => {})
      .finally(() => setEnvLoading(false));
  }, [firstRun]);

  const riskLevel: RiskLevel = latest?.riskLevel || "low";

  const riskColor = riskLevel === "low" ? "text-risk-low bg-risk-lowBg"
    : riskLevel === "moderate" ? "text-risk-moderate bg-risk-moderateBg"
    : "text-risk-high bg-risk-highBg";
  const riskDot = riskLevel === "low" ? "bg-risk-low"
    : riskLevel === "moderate" ? "bg-risk-moderate"
    : "bg-risk-high";
  const riskLabel = riskLevel === "low" ? t("recommendations.riskLow")
    : riskLevel === "moderate" ? t("recommendations.riskModerate")
    : riskLevel === "high" ? t("recommendations.riskHigh")
    : t("recommendations.riskUrgent");

  const lastDate = latest
    ? new Date(latest.timestamp).toLocaleDateString(dateLocale(i18n.language), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : t("recommendations.notAssessed");

  /** Change language from the first-run screen. */
  const handleFirstRunLanguage = (lang: Language) => {
    changeLanguage(lang);
    setLangVersion((v) => v + 1);
  };

  // Still resolving whether this is a first run — render nothing for the single
  // frame it takes, so a returning user never sees a flash of the welcome page.
  if (firstRun === null) return null;

  // ── First run: pick a language before entering the app ──
  if (firstRun) {
    return (
      <div className="py-4">
        {/* Same heading block as the dashboard */}
        <div className="mb-5 text-center">
          <p className="text-base text-gray-600">{t("home.greeting")}</p>
          <h1 className="text-xl font-bold text-gray-900">{t("home.welcome")}</h1>
          <p className="mt-1 text-base text-gray-600">{t("home.welcomeSub")}</p>
        </div>

        {/* Same CTA as the dashboard */}
        <button
          onClick={() => {
            markFirstRunComplete();
            setFirstRun(false);
          }}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-primary-600/30 transition-colors hover:bg-primary-700 min-h-[3.5rem]"
          aria-label={t("home.startCheck")}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a4 4 0 00-4 4v2a3 3 0 00-3 3v1a3 3 0 003 3v2a4 4 0 008 0v-2a3 3 0 003-3v-1a3 3 0 00-3-3V6a4 4 0 00-4-4z" />
          </svg>
          {t("home.startCheck")}
        </button>

        {/* Language choice — shown on first run only */}
        <div key={langVersion} className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-base font-semibold text-gray-900">{t("firstRun.chooseLanguage")}</p>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((lang) => {
              const selected = i18n.language === lang;
              return (
                <button
                  key={lang}
                  onClick={() => handleFirstRunLanguage(lang)}
                  aria-pressed={selected}
                  className={`rounded-xl border px-4 py-3 text-base transition-colors min-h-[3rem] break-words ${
                    selected
                      ? "border-primary-500 bg-primary-50 font-semibold text-primary-800"
                      : "border-gray-200 bg-white text-gray-700 hover:border-primary-300"
                  }`}
                >
                  {t(`language.${lang}`)}
                </button>
              );
            })}
          </div>
        </div>

        <Disclaimer />
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Welcome */}
      <div className="mb-5 text-center">
        <p className="text-base text-gray-600">{t("home.greeting")}</p>
        <h1 className="text-xl font-bold text-gray-900">{t("home.welcome")}</h1>
        <p className="mt-1 text-base text-gray-600">{t("home.welcomeSub")}</p>
      </div>

      {/* Start Check CTA */}
      <Link
        href="/assess"
        className="mb-5 flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-primary-600/30 transition-colors hover:bg-primary-700 min-h-[3.5rem]"
        aria-label={t("home.startCheck")}
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a4 4 0 00-4 4v2a3 3 0 00-3 3v1a3 3 0 003 3v2a4 4 0 008 0v-2a3 3 0 003-3v-1a3 3 0 00-3-3V6a4 4 0 00-4-4z" />
        </svg>
        {t("home.startCheck")}
      </Link>

      <Disclaimer />

      {/* Last Assessment Card — real data */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t("home.lastCheckTitle")}</p>
            <p className="text-base font-semibold text-gray-900">{lastDate}</p>
            {latest && (
              <p className="mt-0.5 text-xs text-gray-500">
                {latest.totalScore}/{latest.maxScore} {t("assess.scoreUnit")}
              </p>
            )}
          </div>
          {latest ? (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-semibold ${riskColor}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${riskDot}`} />
              {riskLabel}
            </span>
          ) : (
            <Link
              href="/assess"
              className="rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-100"
            >
              {t("home.startCheck")}
            </Link>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-gray-900">{t("home.quickTipsTitle")}</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-800">
                {n}
              </div>
              <p className="text-base leading-relaxed text-gray-800 break-words">{t(`home.tip${n}`)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Live Environmental Data — data.gov.sg */}
      <div className="mb-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-blue-900">{t("env.cardTitle")}</h2>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {t("env.dataSource")}
          </span>
        </div>

        {envLoading ? (
          <div className="py-4 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
            <p className="mt-2 text-sm text-blue-600">{t("common.loading")}</p>
          </div>
        ) : envData ? (
          <div className="space-y-2">
            {/* Weather */}
            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">{t("env.weatherLabel")}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 break-words">{envData.forecast}</span>
            </div>

            {/* Air Quality */}
            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h2m2 0h6m2 0h4M9 6h2m2 0h6m-12 6h2m2 0h4M3 18h2m2 0h6" />
                </svg>
                <span className="text-sm font-medium text-gray-700">{t("env.airQualityLabel")}</span>
              </div>
              <span className={`text-sm font-bold ${
                envData.psi <= 50 ? "text-green-600"
                : envData.psi <= 100 ? "text-amber-600"
                : "text-red-600"
              }`}>
                {envData.psi > 0 ? `${envData.psi} (${t(`env.psi${envData.airQualityRisk.charAt(0).toUpperCase() + envData.airQualityRisk.slice(1)}`)})` : t("env.unavailable")}
              </span>
            </div>

            {/* Advisory */}
            <div className={`rounded-lg px-3 py-2 ${
              envData.outdoorRisk === "low" ? "bg-green-100"
              : envData.outdoorRisk === "moderate" ? "bg-amber-100"
              : "bg-red-100"
            }`}>
              <p className={`text-sm font-medium ${
                envData.outdoorRisk === "low" ? "text-green-800"
                : envData.outdoorRisk === "moderate" ? "text-amber-800"
                : "text-red-800"
              } break-words`}>
                {t("env.outdoorRiskLabel")}: {envData.outdoorRisk === "low" ? t("env.riskLow") : envData.outdoorRisk === "moderate" ? t("env.riskModerate") : t("env.riskHigh")}
              </p>
              {envData.recommendations.map((rec) => (
                <p key={rec} className="mt-1 text-xs text-gray-700 break-words">{t(`env.${rec}`)}</p>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-2 text-sm text-blue-600">{t("env.unavailable")}</p>
        )}
      </div>

      {/* Data Sources — 3-Layer Architecture */}
      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4">
        <h2 className="mb-2 text-base font-bold text-primary-900">{t("home.dataSourcesTitle")}</h2>
        <p className="mb-4 text-sm text-primary-700">{t("home.dataSourcesDesc")}</p>

        {/* Layer 1: Macro & Background */}
        <div className="mb-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">1</span>
            <h3 className="text-sm font-bold text-primary-900">{t("home.layer1Title")}</h3>
          </div>
          <p className="mb-2 text-xs text-primary-600 leading-relaxed break-words">{t("home.layer1Desc")}</p>
          <div className="pl-8">
            <div className="flex items-start gap-2 mb-1.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-200 text-xs font-bold text-primary-900">5</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-900 break-words">{t("home.source5")}</p>
                <p className="text-xs text-primary-700 leading-relaxed break-words">{t("home.source5Desc")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Layer 2: Medical Rules & Standards */}
        <div className="mb-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">2</span>
            <h3 className="text-sm font-bold text-primary-900">{t("home.layer2Title")}</h3>
          </div>
          <p className="mb-2 text-xs text-primary-600 leading-relaxed break-words">{t("home.layer2Desc")}</p>
          <div className="pl-8 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-200 text-xs font-bold text-primary-900">1</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-900 break-words">{t("home.source1")}</p>
                <p className="text-xs text-primary-700 leading-relaxed break-words">{t("home.source1Desc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-200 text-xs font-bold text-primary-900">3</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-900 break-words">{t("home.source3")}</p>
                <p className="text-xs text-primary-700 leading-relaxed break-words">{t("home.source3Desc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-200 text-xs font-bold text-primary-900">6</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-900 break-words">{t("home.source6")}</p>
                <p className="text-xs text-primary-700 leading-relaxed break-words">{t("home.source6Desc")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Layer 3: Patient Features & Testing */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">3</span>
            <h3 className="text-sm font-bold text-primary-900">{t("home.layer3Title")}</h3>
          </div>
          <p className="mb-2 text-xs text-primary-600 leading-relaxed break-words">{t("home.layer3Desc")}</p>
          <div className="pl-8 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-200 text-xs font-bold text-primary-900">2</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-900 break-words">{t("home.source2")}</p>
                <p className="text-xs text-primary-700 leading-relaxed break-words">{t("home.source2Desc")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-200 text-xs font-bold text-primary-900">4</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-900 break-words">{t("home.source4")}</p>
                <p className="text-xs text-primary-700 leading-relaxed break-words">{t("home.source4Desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
