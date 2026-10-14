"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RiskBadge from "@/components/RiskBadge";
import TriageCard from "@/components/TriageCard";
import {
  CATEGORIES,
  getVisibleQuestions,
  selectSessionQuestions,
  sessionSeed,
  calculateRiskWithProfile,
  saveAssessmentResult,
  getProfile,
  isProfileComplete,
  PROFILE_GATE_KEY,
  ASSESS_AUTOSTART_KEY,
  type AssessmentResult,
  type CategoryId,
  type Question,
} from "@/lib/assessment";
import {
  evaluateTriage,
  deriveTriageInput,
  type TriageDecision,
} from "@/lib/triageEngine";
import { mapToIWGDFCategory, nextScreeningDate } from "@/lib/clinicalRules";
import { dateLocale } from "@/lib/i18n";

type Phase = "intro" | "questioning" | "result";

/** Per-day counter of how many checks have been started (drives the seed). */
const SESSION_ATTEMPT_KEY = "footcheck-assess-attempt";

export default function AssessPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [triageDecision, setTriageDecision] = useState<TriageDecision | null>(null);
  // Track which question index we're on (within visible questions)
  const [stepIndex, setStepIndex] = useState(0);
  // Multi-select state for current question
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  // The personalised questions for THIS session (core screen + rotating picks).
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);

  // Compute visible questions based on current answers
  const visibleQuestions = useMemo(
    () => (sessionQuestions.length ? getVisibleQuestions(answers, sessionQuestions) : []),
    [answers, sessionQuestions]
  );
  const currentQuestion = visibleQuestions[stepIndex];
  const totalSteps = visibleQuestions.length;
  // How many questions this session will ask up-front (follow-ups excluded).
  const plannedSteps = useMemo(
    () => (sessionQuestions.length ? getVisibleQuestions({}, sessionQuestions).length : 0),
    [sessionQuestions]
  );
  const currentCategory = currentQuestion?.category;
  const categoryIndex = CATEGORIES.findIndex((c) => c.id === currentCategory);

  // ── Handlers ──

  /**
   * Build a fresh, personalised session.
   *
   * The seed combines today's date with a per-day attempt counter, so:
   *  - the same person sees a stable set within one sitting, and
   *  - every new check (and every new day) draws a different set of
   *    personalised questions — not the same four every time.
   */
  const buildSession = () => {
    let attempt = 0;
    if (typeof window !== "undefined") {
      try {
        attempt = Number(sessionStorage.getItem(SESSION_ATTEMPT_KEY) || "0");
        sessionStorage.setItem(SESSION_ATTEMPT_KEY, String(attempt + 1));
      } catch {
        attempt = 0;
      }
    }
    setSessionQuestions(selectSessionQuestions(getProfile(), { seed: sessionSeed(attempt) }));
  };

  const beginQuestioning = () => {
    // Reuse the session previewed on the intro screen; only build one if the
    // mount effect has not run yet.
    if (sessionQuestions.length === 0) buildSession();
    setPhase("questioning");
    setStepIndex(0);
    setAnswers({});
    setMultiSelected([]);
  };

  const handleBegin = () => {
    // Gate: first-time users must complete their profile before the
    // questionnaire, because the profile supplies the Self-Care and Medical
    // History categories used to score the result.
    if (!isProfileComplete(getProfile())) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(PROFILE_GATE_KEY, "1");
      }
      router.push("/profile");
      return;
    }
    beginQuestioning();
  };

  // On mount: build today's session (the profile lives in localStorage, so
  // this can only run on the client) and honour the profile-gate autostart.
  useEffect(() => {
    if (typeof window === "undefined") return;
    buildSession();

    if (sessionStorage.getItem(ASSESS_AUTOSTART_KEY) !== "1") return;
    sessionStorage.removeItem(ASSESS_AUTOSTART_KEY);
    sessionStorage.removeItem(PROFILE_GATE_KEY);
    if (isProfileComplete(getProfile())) {
      setPhase("questioning");
      setStepIndex(0);
      setAnswers({});
      setMultiSelected([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSingleSelect = (optionId: string) => {
    if (!currentQuestion) return;
    // Store the answer only. Advancing is now an explicit "Next" action so the
    // user can review their choice — and can move forward again after pressing Back.
    setAnswers({ ...answers, [currentQuestion.id]: optionId });
  };

  /** Options that are exclusive: picking one clears every other selection. */
  const EXCLUSIVE_OPTION_IDS = new Set(["sk1none"]);

  const toggleMulti = (optionId: string) => {
    setMultiSelected((prev) => {
      if (EXCLUSIVE_OPTION_IDS.has(optionId)) {
        // "None of these" is exclusive — tapping it clears the rest.
        return prev.includes(optionId) ? [] : [optionId];
      }
      // Picking a real finding clears the "none" sentinel.
      const withoutExclusive = prev.filter((o) => !EXCLUSIVE_OPTION_IDS.has(o));
      return withoutExclusive.includes(optionId)
        ? withoutExclusive.filter((o) => o !== optionId)
        : [...withoutExclusive, optionId];
    });
  };

  /** Advance to the next question (or finish) — used by the "Next" button. */
  const handleNext = () => {
    if (!currentQuestion) return;
    let newAnswers = answers;
    if (currentQuestion.multi) {
      if (multiSelected.length === 0) return;
      newAnswers = { ...answers, [currentQuestion.id]: [...multiSelected].sort().join(",") };
      setAnswers(newAnswers);
    } else if (!answers[currentQuestion.id]) {
      return; // nothing selected yet
    }
    if (stepIndex < totalSteps - 1) {
      setStepIndex(stepIndex + 1);
      setMultiSelected([]);
    } else {
      finishAssessment(newAnswers);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      // Restore multi-select state if going back to a multi question
      const prevQ = visibleQuestions[stepIndex - 1];
      if (prevQ?.multi && answers[prevQ.id]) {
        setMultiSelected(answers[prevQ.id].split(","));
      } else {
        setMultiSelected([]);
      }
    }
  };

  const finishAssessment = (finalAnswers: Record<string, string>) => {
    const profile = getProfile();
    const res = calculateRiskWithProfile(finalAnswers, profile, sessionQuestions);
    // Deterministic care-navigation tier (independent of the severity score).
    const decision = evaluateTriage(
      deriveTriageInput(finalAnswers, profile || undefined)
    );
    const full: AssessmentResult = { ...res, triageTier: decision.tier };
    setResult(full);
    setTriageDecision(decision);
    saveAssessmentResult(full);
    setPhase("result");
  };

  const handleRetake = () => {
    // A retake is a new check: draw a fresh set of personalised questions.
    buildSession();
    setPhase("intro");
    setAnswers({});
    setStepIndex(0);
    setMultiSelected([]);
    setResult(null);
    setTriageDecision(null);
  };

  // ── Render ──

  if (phase === "intro") {
    return (
      <div className="py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">{t("assess.title")}</h1>
          <p className="text-base text-gray-600">{t("assess.subtitle")}</p>
        </div>
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <svg className="h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 4h.01M12 2a4 4 0 014 4v6a4 4 0 01-8 0V6a4 4 0 014-4z M12 12v6m0 0l3-3m-3 3l-3-3" />
              </svg>
            </div>
          </div>
          <p className="mb-3 text-base text-gray-700">{t("assess.introDesc")}</p>
          {/* Category overview — only categories we actually ask about */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            {CATEGORIES.filter((c) => !c.profileOnly).map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                <svg className="h-4 w-4 flex-shrink-0 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                </svg>
                <span className="text-sm text-gray-700">{t(cat.labelKey)}</span>
              </div>
            ))}
          </div>
          <div className="mb-4 rounded-lg bg-primary-50 px-4 py-2.5 text-sm text-primary-800">
            {t("assess.duration")} · {plannedSteps} {t("assess.questionsLabel")}
          </div>
          {/* Explain that the session is short and personalised */}
          <p className="mb-2 text-sm leading-relaxed text-gray-500">
            {t("assess.personalisedNote")}
          </p>
          {/* First-time users must complete their profile before starting */}
          <p className="mb-2 text-sm leading-relaxed text-gray-500">
            {t("assess.firstTimeNote")}
          </p>
          <button
            onClick={handleBegin}
            className="w-full rounded-xl bg-primary-600 py-4 text-lg font-semibold text-white shadow-md transition-colors hover:bg-primary-700 min-h-[3rem]"
          >
            {t("assess.start")}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "questioning" && currentQuestion) {
    const progress = ((stepIndex + 1) / totalSteps) * 100;
    const isMulti = currentQuestion.multi;
    const cat = CATEGORIES.find((c) => c.id === currentCategory);

    return (
      <div className="py-4">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {cat && (
                <svg className="h-5 w-5 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                </svg>
              )}
              <span className="text-sm font-semibold text-gray-700">{cat && t(cat.labelKey)}</span>
            </div>
            <span className="text-sm text-gray-500">{stepIndex + 1} / {totalSteps}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={stepIndex + 1}
              aria-valuemin={1}
              aria-valuemax={totalSteps}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {/* Why this question was picked for this person (personalisation) */}
          {currentQuestion.reasonKey && (
            <p className="mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 3v2m0 14v2M5.6 5.6L7 7m10 10l1.4 1.4M3 12h2m14 0h2M5.6 18.4L7 17m10-10l1.4-1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t(currentQuestion.reasonKey)}
              </span>
            </p>
          )}
          <p className="mb-4 text-lg font-semibold text-gray-900">{t(currentQuestion.textKey)}</p>

          {isMulti && (
            <p className="mb-3 text-sm text-gray-500">{t("assess.multiSelectHint")}</p>
          )}

          <div className="space-y-2">
            {currentQuestion.options.map((opt) => {
              const selected = isMulti
                ? multiSelected.includes(opt.id)
                : answers[currentQuestion.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => isMulti ? toggleMulti(opt.id) : handleSingleSelect(opt.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-base transition-colors min-h-[3rem] break-words ${
                    selected
                      ? "border-primary-500 bg-primary-50 text-primary-800"
                      : "border-gray-200 bg-white text-gray-800 hover:border-primary-300"
                  }`}
                >
                  {isMulti ? (
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 ${
                      selected ? "border-primary-500 bg-primary-500" : "border-gray-300"
                    }`}>
                      {selected && (
                        <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  ) : (
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? "border-primary-500 bg-primary-500" : "border-gray-300"
                    }`}>
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                    </span>
                  )}
                  <span className="break-words">{t(opt.textKey)}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation — Back (when available) + Next (always) */}
          <div className="mt-4 flex gap-2">
            {stepIndex > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-5 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 min-h-[3rem]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("common.back")}
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isMulti ? multiSelected.length === 0 : !answers[currentQuestion.id]}
              className="ml-auto flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 min-h-[3rem]"
            >
              {t("common.next")}
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    const riskKey = result.riskLevel === "low" ? "resultLow"
      : result.riskLevel === "moderate" ? "resultModerate"
      : result.riskLevel === "high" ? "resultHigh"
      : "resultUrgent";
    const riskDescKey = riskKey + "Desc";

    // Color mapping for risk badge based on level
    const riskColors = {
      low: { bg: "bg-risk-lowBg", text: "text-risk-low", ring: "ring-risk-low" },
      moderate: { bg: "bg-risk-moderateBg", text: "text-risk-moderate", ring: "ring-risk-moderate" },
      high: { bg: "bg-risk-highBg", text: "text-risk-high", ring: "ring-risk-high" },
      urgent: { bg: "bg-red-100", text: "text-red-900", ring: "ring-red-600" },
    };
    const rc = riskColors[result.riskLevel];

    return (
      <div className="py-4 animate-fade-in">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">{t("assess.resultsTitle")}</h1>
          <p className="mt-1 text-sm text-gray-600">{t("assess.resultsSubtitle")}</p>
        </div>

        {/* ── 1. Deterministic care triage — rule-locked (top priority) ── */}
        {triageDecision && (
          <div className="mb-4">
            <TriageCard decision={triageDecision} />
          </div>
        )}

        {/* ── 2. Risk score summary (compact, single line) ── */}
        <div className={`mb-4 rounded-2xl border-2 ${rc.ring} ${rc.bg} p-4`} role="status" aria-live="polite">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/40`}>
              <svg className={`h-6 w-6 ${rc.text}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-base font-bold ${rc.text}`}>{t(`assess.${riskKey}`)}</p>
              <p className="text-sm text-gray-700">
                {t("assess.scoreLabel")}: {result.totalScore} / {result.maxScore} {t("assess.scoreUnit")}
              </p>
            </div>
          </div>
        </div>

        {/* ── 2b. Recheck reminder time ── */}
        <div className="mb-4 rounded-2xl border border-primary-200 bg-primary-50 p-4">
          <p className="text-sm font-semibold text-primary-900">{t("assess.recheckReminder")}</p>
          <p className="mt-1 text-base font-bold text-primary-800">
            {new Date(nextScreeningDate(result.timestamp, mapToIWGDFCategory(result))).toLocaleDateString(dateLocale(i18n.language))}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-primary-700 break-words">{t("assess.recheckReminderNote")}</p>
        </div>

        {/* ── 3. Emergency flags (only if present) ── */}
        {result.emergencyFlags.length > 0 && (
          <div className="mb-4 rounded-2xl border-2 border-red-500 bg-red-50 p-4" role="alert">
            <div className="flex gap-2">
              <svg className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-red-900">{t("assess.emergencyTitle")}</p>
                <ul className="mt-2 space-y-1">
                  {result.emergencyFlags.map((flag) => (
                    <li key={flag} className="text-base text-red-800 break-words">
                      • {t(`assess.flags.${flag}`)}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-base font-semibold text-red-900">{t("assess.emergencyAction")}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 4. Risk description (brief) ── */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-base leading-relaxed text-gray-800 break-words">{t(`assess.${riskDescKey}`)}</p>
        </div>

        {/* ── 5. Category breakdown (compact) ── */}
        <details className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between p-4 text-base font-bold text-gray-900">
            <span>{t("assess.breakdownTitle")}</span>
            <svg className="h-5 w-5 text-gray-500 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="space-y-3 border-t border-gray-100 p-4">
            {result.categoryScores.map((cs) => {
              const cat = CATEGORIES.find((c) => c.id === cs.category);
              if (!cat) return null;
              const barColor = cs.percentage >= 60 ? "bg-risk-high" : cs.percentage >= 30 ? "bg-risk-moderate" : "bg-risk-low";
              return (
                <div key={cs.category}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <svg className="h-4 w-4 flex-shrink-0 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                      </svg>
                      <span className="truncate text-sm text-gray-700">{t(cat.labelKey)}</span>
                    </div>
                    <span className="flex-shrink-0 text-sm font-semibold text-gray-600">{cs.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${cs.percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </details>

        {/* ── 6. Not a diagnosis note ── */}
        <div className="mb-4 rounded-xl border border-amber-400 bg-amber-50 p-3">
          <div className="flex gap-2">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-base leading-relaxed text-amber-900 break-words">{t("assess.notDiagnosisNote")}</p>
          </div>
        </div>

        {/* ── 7. Actions ── */}
        <div className="space-y-2">
          <Link
            href="/recommendations"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-4 text-lg font-semibold text-white shadow-md transition-colors hover:bg-primary-700 min-h-[3rem]"
          >
            {t("assess.viewRecommendations")}
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/followup"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-300 bg-white py-3.5 text-base font-semibold text-primary-700 transition-colors hover:bg-primary-50 min-h-[3rem]"
          >
            {t("assess.recheckCta")}
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M8 7V3M16 7V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <button
            onClick={handleRetake}
            className="w-full rounded-xl border border-gray-300 bg-white py-3.5 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 min-h-[3rem]"
          >
            {t("assess.retake")}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
