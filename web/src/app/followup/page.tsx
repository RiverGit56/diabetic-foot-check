"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import {
  getAssessmentHistory,
  type AssessmentHistoryEntry,
  type RiskLevel,
} from "@/lib/assessment";
import { dateLocale } from "@/lib/i18n";
import { isEscalated, type CareTier } from "@/lib/triageEngine";

/** Tier badge colours (mirrors TriageCard's TIER_STYLES). */
const TIER_BADGE: Record<string, string> = {
  EMERGENCY: "bg-red-600 text-white",
  PRIMARY_CARE: "bg-amber-600 text-white",
  SELF_CARE: "bg-green-600 text-white",
  ABSTAIN: "bg-gray-600 text-white",
};

export default function FollowupPage() {
  const { t, i18n } = useTranslation();
  const [history, setHistory] = useState<AssessmentHistoryEntry[]>([]);
  const [checkinDone, setCheckinDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [changes, setChanges] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHistory(getAssessmentHistory());
    // Load daily check-in streak from localStorage
    try {
      const raw = localStorage.getItem("footcheck-checkins");
      if (raw) {
        const checkins = JSON.parse(raw);
        const today = new Date().toDateString();
        const lastCheckin = checkins[checkins.length - 1];
        if (lastCheckin && new Date(lastCheckin.date).toDateString() === today) {
          setCheckinDone(true);
        }
        // Calculate streak
        let s = 0;
        const today2 = new Date();
        today2.setHours(0, 0, 0, 0);
        for (let i = 0; i < checkins.length; i++) {
          const d = new Date(checkins[checkins.length - 1 - i].date);
          d.setHours(0, 0, 0, 0);
          const diff = (today2.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
          if (diff === i) s++;
          else break;
        }
        setStreak(s);
      }
    } catch {
      // No check-ins yet
    }
  }, []);

  const handleCheckin = (done: boolean) => {
    if (!done) return;
    setCheckinDone(true);
    // Save to localStorage
    try {
      const raw = localStorage.getItem("footcheck-checkins");
      const checkins = raw ? JSON.parse(raw) : [];
      checkins.push({ date: new Date().toISOString(), noticed: !!changes, note: changes });
      localStorage.setItem("footcheck-checkins", JSON.stringify(checkins));
      // Recalculate streak
      let s = 0;
      const today2 = new Date();
      today2.setHours(0, 0, 0, 0);
      for (let i = 0; i < checkins.length; i++) {
        const d = new Date(checkins[checkins.length - 1 - i].date);
        d.setHours(0, 0, 0, 0);
        const diff = (today2.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === i) s++;
        else break;
      }
      setStreak(s);
    } catch {
      // ignore
    }
    setSaved(true);
    setChanges("");
    setTimeout(() => setSaved(false), 3000);
  };

  const riskColor = (level: RiskLevel) =>
    level === "low" ? "text-risk-low"
    : level === "moderate" ? "text-risk-moderate"
    : "text-risk-high";

  const riskBg = (level: RiskLevel) =>
    level === "low" ? "bg-risk-low"
    : level === "moderate" ? "bg-risk-moderate"
    : "bg-risk-high";

  const riskLabel = (level: RiskLevel) =>
    level === "low" ? t("followup.riskLowShort")
    : level === "moderate" ? t("followup.riskModerateShort")
    : level === "high" ? t("followup.riskHighShort")
    : t("followup.riskUrgentShort");

  // Chart data: last 10 assessments
  const chartData = history.slice(-10);
  const maxScore = Math.max(...chartData.map((e) => e.maxScore), 1);

  // ── Compare latest vs previous care tier (escalation detection) ──
  const latestEntry = history.length ? history[history.length - 1] : null;
  const prevEntry = history.length > 1 ? history[history.length - 2] : null;
  const canCompare =
    !!latestEntry?.triageTier && !!prevEntry?.triageTier;
  const escalated = canCompare
    ? isEscalated(
        prevEntry!.triageTier as CareTier,
        latestEntry!.triageTier as CareTier
      )
    : false;

  return (
    <div className="py-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">{t("followup.title")}</h1>
        <p className="text-base text-gray-600">{t("followup.subtitle")}</p>
      </div>

      {/* Comparison with last record (escalation detection) */}
      {latestEntry && prevEntry && canCompare && (
        <div
          className={`mb-4 rounded-2xl border p-4 shadow-sm ${
            escalated
              ? "border-2 border-red-500 bg-red-50"
              : "border border-gray-200 bg-white"
          }`}
          role={escalated ? "alert" : undefined}
        >
          <div className="flex items-center gap-2">
            {escalated ? (
              <svg className="h-6 w-6 flex-shrink-0 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="h-6 w-6 flex-shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <p className={`text-base font-bold ${escalated ? "text-red-900" : "text-gray-900"}`}>
              {t("followup.escalationTitle")}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${TIER_BADGE[prevEntry.triageTier as CareTier]}`}>
              {t("followup.prevLabel")}: {t(`triage.tierShort.${prevEntry.triageTier}`)}
            </span>
            <svg className={`h-5 w-5 flex-shrink-0 ${escalated ? "text-red-600" : "text-gray-400"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${TIER_BADGE[latestEntry.triageTier as CareTier]}`}>
              {t("followup.nowLabel")}: {t(`triage.tierShort.${latestEntry.triageTier}`)}
            </span>
          </div>
          <p className={`mt-3 text-base leading-relaxed break-words ${escalated ? "text-red-800" : "text-gray-700"}`}>
            {escalated ? t("followup.escalated") : t("followup.stable")}
          </p>
        </div>
      )}
      {latestEntry && !prevEntry && (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-base leading-relaxed text-gray-700 break-words">
            {t("followup.noPrevious")}
          </p>
        </div>
      )}

      {/* Trend chart */}
      {chartData.length > 0 ? (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-gray-900">{t("followup.trendTitle")}</h2>
          <p className="mb-3 text-sm text-gray-600">{t("followup.trendDesc")}</p>
          {/* Simple bar chart */}
          <div className="flex items-end justify-between gap-1.5" style={{ height: "120px" }} role="img" aria-label={t("followup.trendTitle")}>
            {chartData.map((entry, i) => {
              const heightPct = (entry.totalScore / maxScore) * 100;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end justify-center" style={{ height: "100px" }}>
                    <div
                      className={`w-full max-w-[2rem] rounded-t ${riskBg(entry.riskLevel)}`}
                      style={{ height: `${Math.max(heightPct, 5)}%` }}
                      title={`${riskLabel(entry.riskLevel)} — ${entry.totalScore}/${entry.maxScore}`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {new Date(entry.timestamp).toLocaleDateString(dateLocale(i18n.language), { month: "short", day: "numeric" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-base text-gray-600">{t("followup.noHistory")}</p>
          <Link href="/assess" className="mt-2 inline-block text-base font-semibold text-primary-600 underline">
            {t("home.startCheck")}
          </Link>
        </div>
      )}

      {/* Assessment history list */}
      {history.length > 0 && (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-gray-900">{t("followup.assessmentHistory")}</h2>
          <div className="space-y-2">
            {[...history].reverse().slice(0, 10).map((entry, i) => (
              <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(entry.timestamp).toLocaleDateString(dateLocale(i18n.language), { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {entry.totalScore}/{entry.maxScore} {t("assess.scoreUnit")}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${
                  entry.riskLevel === "low" ? "bg-risk-lowBg"
                  : entry.riskLevel === "moderate" ? "bg-risk-moderateBg"
                  : "bg-risk-highBg"
                } ${riskColor(entry.riskLevel)}`}>
                  <span className={`h-2 w-2 rounded-full ${riskBg(entry.riskLevel)}`} />
                  {riskLabel(entry.riskLevel)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily check-in — the streak now lives inside this card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">{t("followup.checkinTitle")}</h2>

        {/* Streak strip — folded in from the home page's check-in card */}
        <div className="mb-3 mt-2 flex items-center justify-between gap-3 rounded-xl bg-primary-50 px-3 py-2">
          <p className="flex-shrink-0 text-sm text-primary-900">{t("followup.streakLabel")}</p>
          <p className="min-w-0 break-words text-right text-sm font-semibold text-primary-800">
            {streak > 0 ? `${streak} ${t("followup.streakDays")}` : t("followup.noStreak")}
          </p>
        </div>

        <p className="mb-3 text-base text-gray-700">{t("followup.checkinQuestion")}</p>
        {checkinDone ? (
          <div className="rounded-xl bg-risk-lowBg px-4 py-3 text-base font-semibold text-risk-low" role="status">
            ✓ {t("followup.checkinSaved")}
          </div>
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => handleCheckin(true)}
                className="flex-1 rounded-xl border border-primary-500 bg-primary-50 py-3 text-base font-semibold text-primary-800 transition-colors hover:bg-primary-100 min-h-[3rem]"
              >
                {t("followup.checkinYes")}
              </button>
              <button
                className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-base font-semibold text-gray-600 transition-colors hover:bg-gray-50 min-h-[3rem]"
              >
                {t("followup.checkinNo")}
              </button>
            </div>
            <div className="mb-3">
              <label className="mb-1.5 block text-sm font-medium text-gray-600">{t("followup.changesLabel")}</label>
              <textarea
                value={changes}
                onChange={(e) => setChanges(e.target.value)}
                placeholder={t("followup.changesPlaceholder")}
                className="w-full rounded-xl border border-gray-200 p-3 text-base text-gray-800 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                rows={3}
              />
            </div>
          </>
        )}
        {saved && !checkinDone && (
          <p className="mt-2 text-center text-base font-semibold text-risk-low" role="status">
            {t("followup.checkinSaved")}
          </p>
        )}
      </div>
    </div>
  );
}
