/**
 * Assessment Engine — Diabetic Foot Check
 * Based on IWGDF 2023 Risk Stratification & NICE NG19 criteria
 *
 * A ~41-question bank of SYMPTOM / disease-detection items across six asked
 * clinical categories (red flags, neuropathy, skin & nail, wound, circulation,
 * history) with weighted scoring, adaptive branching and emergency-flag
 * detection. Each session asks only a short personalised subset (~11
 * questions) — see `selectSessionQuestions()`.
 *
 * Foot-care HABITS (how often feet are checked, footwear, barefoot walking)
 * are collected on the profile page and scored under the `selfcare` category,
 * so the bank itself holds no "how do you look after your feet" items.
 */

import type { CareTier } from "./triageEngine";

export type CategoryId =
  | "redflags"
  | "neuropathy"
  | "skin"
  | "wound"
  | "circulation"
  | "selfcare"
  | "history";

export type RiskLevel = "low" | "moderate" | "high" | "urgent";

/** Re-exported for convenience so pages only import from one place. */
export type { CareTier };

export interface QuestionOption {
  id: string;
  /** i18n key: `assess.options.${id}` */
  textKey: string;
  weight: number;
  /** Triggers an emergency flag if selected */
  emergencyFlag?: string;
}

export interface Question {
  id: string;
  /** i18n key: `assess.questions.${id}` */
  textKey: string;
  category: CategoryId;
  options: QuestionOption[];
  /**
   * CORE SAFETY SCREEN — asked in EVERY session.
   *
   * These questions directly determine the deterministic care tier
   * (see `triageEngine.deriveTriageInput`), so they can never be skipped:
   * skipping them would leave the engine unable to exclude an emergency.
   */
  core?: boolean;
  /**
   * Adaptive follow-up: only shown when this returns true for the answers
   * gathered so far in the current session.
   */
  showIf?: (answers: Record<string, string>) => boolean;
  /**
   * Personalization gate: the question is only eligible for a session when
   * this passes for the user's profile (age, comorbidities, control, …).
   */
  appliesIf?: (profile: UserProfile | null) => boolean;
  /**
   * Relevance for this profile. Higher = more likely to be selected once the
   * question is eligible. Used to rank the rotating pool.
   */
  relevance?: (profile: UserProfile | null) => number;
  /** i18n key explaining WHY this question was selected for this session. */
  reasonKey?: string;
  /** Multi-select (checkboxes) instead of single-select (radio) */
  multi?: boolean;
}

export const CATEGORIES: {
  id: CategoryId;
  labelKey: string;
  icon: string;
  /**
   * True when this category is scored from the PROFILE (foot-check habits,
   * footwear, barefoot habits) rather than from questionnaire items. Such a
   * category still appears in the results breakdown but is not part of the
   * "what we will ask you" overview, because the bank has no questions for it.
   */
  profileOnly?: boolean;
}[] = [
  {
    id: "redflags",
    labelKey: "assess.categories.redflags",
    icon: "M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  },
  {
    id: "neuropathy",
    labelKey: "assess.categories.neuropathy",
    icon: "M12 11c0 3.517-1.009 6.799-2.753 9.451a3.5 3.5 0 01-.497-1.851L8.5 15.5v-2.25a1.5 1.5 0 013 0zm6.75-3.75a.75.75 0 00-.75.75v3.75a.75.75 0 001.5 0V8.25a.75.75 0 00-.75-.75z",
  },
  {
    id: "skin",
    labelKey: "assess.categories.skin",
    icon: "M7 8a2 2 0 11.001 0 M7 8a2 2 0 110 4M7 8a2 2 0 100-4M12 8a2 2 0 110 4M12 8a2 2 0 100-4M12 8a2 2 0 110 4M17 8a2 2 0 110 4M17 8a2 2 0 100-4",
  },
  {
    id: "wound",
    labelKey: "assess.categories.wound",
    icon: "M12 9v2m0 4h.01M5 12a7 7 0 1014 0 7 7 0 00-14 0z",
  },
  {
    id: "circulation",
    labelKey: "assess.categories.circulation",
    icon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  },
  {
    id: "selfcare",
    labelKey: "assess.categories.selfcare",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    // Scored from the profile (footInspection / barefootFrequency /
    // footwearType) — the bank deliberately holds no foot-care-habit items.
    profileOnly: true,
  },
  {
    id: "history",
    labelKey: "assess.categories.history",
    icon: "M9 12h6m-6 4h6m-6-8h6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
];

/**
 * The full question bank (~41 questions).
 *
 * ── How a session is built ──────────────────────────────────────────────
 * `selectSessionQuestions()` picks a short, personalised session (~10
 * questions) from this bank instead of asking everything:
 *
 *   1. CORE (always asked) — the 7 safety-screen questions that directly
 *      determine the deterministic care tier. They are never skipped: the
 *      triage engine cannot exclude an emergency without them.
 *   2. ADAPTIVE FOLLOW-UPS — shown only when an earlier answer triggers
 *      them (e.g. wound duration once a wound is reported).
 *   3. ROTATING POOL — everything else, ranked by relevance to the user's
 *      profile and rotated daily so the same questions are not repeated.
 *
 * Weights feed the severity score (assessment.ts); `emergencyFlag` feeds the
 * care tier (triageEngine.ts).
 */

/** Personalisation helpers — keep the `appliesIf` / `relevance` rules terse. */
const hasComorbidity = (p: UserProfile | null, id: string) =>
  (p?.comorbidities ?? []).includes(id);
const isOlder = (p: UserProfile | null) =>
  p?.ageRange === "80-89" || p?.ageRange === "89+";
const isLongDuration = (p: UserProfile | null) => p?.diabetesDuration === "over10";
const isPoorControl = (p: UserProfile | null) => p?.lastHbA1c === "over8";
const isSmoker = (p: UserProfile | null) => p?.smoking === "current";
const neglectsFootCare = (p: UserProfile | null) =>
  p?.footInspection === "rarely" || p?.footInspection === "never";
const wearsOpenFootwear = (p: UserProfile | null) =>
  p?.footwearType === "sandals" || p?.footwearType === "flipflops";
const goesBarefoot = (p: UserProfile | null) =>
  p?.barefootFrequency === "sometimes" || p?.barefootFrequency === "often";

export const QUESTION_BANK: Question[] = [
  // ═══════════════════════════════════════════════════════════════
  //  1 · CORE SAFETY SCREEN — asked in EVERY session
  // ═══════════════════════════════════════════════════════════════

  // ── Red Flag Screening (NICE NG19 / IWGDF-IDSA + SIRS/Sepsis-3 systemic infection criteria) ──
  // Asked first — a positive answer triggers the EMERGENCY care tier.
  {
    id: "rf1",
    textKey: "assess.questions.rf1",
    category: "redflags",
    core: true,
    options: [
      { id: "rf1a", textKey: "assess.options.rf1a", weight: 0 },
      { id: "rf1b", textKey: "assess.options.rf1b", weight: 3, emergencyFlag: "redFlagFever" },
    ],
  },
  {
    id: "rf2",
    textKey: "assess.questions.rf2",
    category: "redflags",
    core: true,
    options: [
      { id: "rf2a", textKey: "assess.options.rf2a", weight: 0 },
      { id: "rf2b", textKey: "assess.options.rf2b", weight: 3, emergencyFlag: "redFlagSpreading" },
    ],
  },
  {
    id: "rf3",
    textKey: "assess.questions.rf3",
    category: "redflags",
    core: true,
    options: [
      { id: "rf3a", textKey: "assess.options.rf3a", weight: 0 },
      { id: "rf3b", textKey: "assess.options.rf3b", weight: 3, emergencyFlag: "redFlagGangrene" },
    ],
  },
  {
    id: "rf4",
    textKey: "assess.questions.rf4",
    category: "redflags",
    core: true,
    options: [
      { id: "rf4a", textKey: "assess.options.rf4a", weight: 0 },
      { id: "rf4b", textKey: "assess.options.rf4b", weight: 3, emergencyFlag: "redFlagFoulPus" },
    ],
  },
  {
    id: "rf5",
    textKey: "assess.questions.rf5",
    category: "redflags",
    core: true,
    options: [
      { id: "rf5a", textKey: "assess.options.rf5a", weight: 0 },
      { id: "rf5b", textKey: "assess.options.rf5b", weight: 3, emergencyFlag: "redFlagMentalState" },
    ],
  },

  // ── Wound status — history + current (merges the former w1 + w3) ──
  // One question covers both "have you ever had a foot wound" (IWGDF
  // Category 3 risk factor) and "do you have one now" (active wound).
  {
    id: "w1",
    textKey: "assess.questions.w1",
    category: "wound",
    core: true,
    options: [
      { id: "w1a", textKey: "assess.options.w1a", weight: 0 },
      // A healed past ulcer is an IWGDF Category 3 risk marker (highest
      // recurrence risk) — not an active emergency, but it must still elevate
      // the risk tier, so it carries the `historyUlcer` flag.
      { id: "w1b", textKey: "assess.options.w1b", weight: 1, emergencyFlag: "historyUlcer" },
      { id: "w1c", textKey: "assess.options.w1c", weight: 4, emergencyFlag: "activeWound" },
    ],
  },
  {
    id: "w2",
    textKey: "assess.questions.w2",
    category: "wound",
    showIf: (a) => a["w1"] === "w1c",
    reasonKey: "assess.reason.followUp",
    options: [
      { id: "w2a", textKey: "assess.options.w2a", weight: 1 },
      { id: "w2b", textKey: "assess.options.w2b", weight: 3 },
      { id: "w2c", textKey: "assess.options.w2c", weight: 5, emergencyFlag: "chronicWound" },
    ],
  },
  {
    id: "w4",
    textKey: "assess.questions.w4",
    category: "wound",
    showIf: (a) => a["w1"] === "w1c",
    reasonKey: "assess.reason.followUp",
    options: [
      { id: "w4a", textKey: "assess.options.w4a", weight: 0 },
      { id: "w4b", textKey: "assess.options.w4b", weight: 3 },
    ],
  },
  {
    id: "w5",
    textKey: "assess.questions.w5",
    category: "wound",
    showIf: (a) => a["w1"] === "w1c",
    reasonKey: "assess.reason.followUp",
    options: [
      { id: "w5a", textKey: "assess.options.w5a", weight: 0 },
      { id: "w5b", textKey: "assess.options.w5b", weight: 3 },
    ],
  },

  // ── Skin findings — one multi-select (merges the former s3 + s4 + s5) ──
  // "Look at your feet and tap everything that applies." Keeping these three
  // findings together removes two questions and the ambiguous "unsure" state
  // for things the person can simply see.
  {
    id: "sk1",
    textKey: "assess.questions.sk1",
    category: "skin",
    core: true,
    multi: true,
    options: [
      { id: "sk1crack", textKey: "assess.options.sk1crack", weight: 2 },
      { id: "sk1blister", textKey: "assess.options.sk1blister", weight: 2 },
      { id: "sk1red", textKey: "assess.options.sk1red", weight: 1 },
      { id: "sk1none", textKey: "assess.options.sk1none", weight: 0 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  2 · ADAPTIVE FOLLOW-UPS
  // ═══════════════════════════════════════════════════════════════

  // ── Neuropathy ──
  {
    id: "n1",
    textKey: "assess.questions.n1",
    category: "neuropathy",
    options: [
      { id: "n1a", textKey: "assess.options.n1a", weight: 0 },
      { id: "n1b", textKey: "assess.options.n1b", weight: 2 },
    ],
  },
  {
    id: "n2",
    textKey: "assess.questions.n2",
    category: "neuropathy",
    options: [
      { id: "n2a", textKey: "assess.options.n2a", weight: 0 },
      { id: "n2b", textKey: "assess.options.n2b", weight: 1 },
      { id: "n2c", textKey: "assess.options.n2c", weight: 3 },
      { id: "n2d", textKey: "assess.options.n2d", weight: 3 },
    ],
  },
  {
    id: "n3",
    textKey: "assess.questions.n3",
    category: "neuropathy",
    options: [
      { id: "n3a", textKey: "assess.options.n3a", weight: 0 },
      { id: "n3b", textKey: "assess.options.n3b", weight: 3 },
    ],
  },
  {
    id: "n4",
    textKey: "assess.questions.n4",
    category: "neuropathy",
    reasonKey: "assess.reason.neuropathy",
    relevance: (p) => (isLongDuration(p) ? 2 : 0) + (isPoorControl(p) ? 1 : 0),
    options: [
      { id: "n4a", textKey: "assess.options.n4a", weight: 0 },
      { id: "n4b", textKey: "assess.options.n4b", weight: 1 },
      { id: "n4c", textKey: "assess.options.n4c", weight: 2 },
    ],
  },
  {
    id: "n5",
    textKey: "assess.questions.n5",
    category: "neuropathy",
    reasonKey: "assess.reason.neuropathy",
    relevance: (p) => (isLongDuration(p) ? 2 : 0) + (isPoorControl(p) ? 1 : 0),
    options: [
      { id: "n5a", textKey: "assess.options.n5a", weight: 0 },
      { id: "n5b", textKey: "assess.options.n5b", weight: 1 },
      { id: "n5c", textKey: "assess.options.n5c", weight: 3 },
    ],
  },
  {
    id: "n6",
    textKey: "assess.questions.n6",
    category: "neuropathy",
    reasonKey: "assess.reason.age",
    relevance: (p) => (isOlder(p) ? 3 : 0),
    options: [
      { id: "n6a", textKey: "assess.options.n6a", weight: 0 },
      { id: "n6b", textKey: "assess.options.n6b", weight: 2 },
    ],
  },
  {
    // Adaptive follow-up: numbness (n5) or reduced sensation (n1) may hide a
    // Charcot foot — a red-hot, swollen, deformed foot.
    id: "n7",
    textKey: "assess.questions.n7",
    category: "neuropathy",
    showIf: (a) => a["n5"] === "n5c" || a["n1"] === "n1b",
    reasonKey: "assess.reason.followUp",
    options: [
      { id: "n7a", textKey: "assess.options.n7a", weight: 0 },
      { id: "n7b", textKey: "assess.options.n7b", weight: 3 },
    ],
  },
  {
    // Motor neuropathy / deformity — an IWGDF risk factor for ulceration.
    id: "n8",
    textKey: "assess.questions.n8",
    category: "neuropathy",
    reasonKey: "assess.reason.neuropathy",
    relevance: (p) => (isLongDuration(p) ? 2 : 0) + (isPoorControl(p) ? 1 : 0),
    options: [
      { id: "n8a", textKey: "assess.options.n8a", weight: 0 },
      { id: "n8b", textKey: "assess.options.n8b", weight: 2 },
      { id: "n8c", textKey: "assess.options.n8c", weight: 3 },
    ],
  },
  {
    // Thermal sensation — part of loss of protective sensation (LOPS).
    id: "n9",
    textKey: "assess.questions.n9",
    category: "neuropathy",
    reasonKey: "assess.reason.neuropathy",
    relevance: (p) => (isLongDuration(p) ? 2 : 0) + (isOlder(p) ? 1 : 0),
    options: [
      { id: "n9a", textKey: "assess.options.n9a", weight: 0 },
      { id: "n9b", textKey: "assess.options.n9b", weight: 2 },
      { id: "n9c", textKey: "assess.options.n9c", weight: 3 },
    ],
  },
  {
    // Painless injury — the hallmark of LOPS: trauma the person never felt.
    id: "n10",
    textKey: "assess.questions.n10",
    category: "neuropathy",
    reasonKey: "assess.reason.neuropathy",
    relevance: (p) => (isLongDuration(p) ? 2 : 0) + (isPoorControl(p) ? 1 : 0),
    options: [
      { id: "n10a", textKey: "assess.options.n10a", weight: 0 },
      { id: "n10b", textKey: "assess.options.n10b", weight: 2 },
      { id: "n10c", textKey: "assess.options.n10c", weight: 3 },
    ],
  },

  // ── Skin & Nail ──
  {
    id: "s1",
    textKey: "assess.questions.s1",
    category: "skin",
    options: [
      { id: "s1a", textKey: "assess.options.s1a", weight: 0 },
      { id: "s1b", textKey: "assess.options.s1b", weight: 2 },
      { id: "s1c", textKey: "assess.options.s1c", weight: 2 },
      { id: "s1d", textKey: "assess.options.s1d", weight: 3 },
    ],
  },
  {
    id: "s2",
    textKey: "assess.questions.s2",
    category: "skin",
    options: [
      { id: "s2a", textKey: "assess.options.s2a", weight: 0 },
      { id: "s2b", textKey: "assess.options.s2b", weight: 1 },
      { id: "s2c", textKey: "assess.options.s2c", weight: 2 },
    ],
  },
  {
    id: "s6",
    textKey: "assess.questions.s6",
    category: "skin",
    reasonKey: "assess.reason.skin",
    relevance: (p) => (isPoorControl(p) ? 2 : 0) + (goesBarefoot(p) ? 1 : 0),
    options: [
      { id: "s6a", textKey: "assess.options.s6a", weight: 0 },
      { id: "s6b", textKey: "assess.options.s6b", weight: 1 },
    ],
  },
  {
    id: "s7",
    textKey: "assess.questions.s7",
    category: "skin",
    reasonKey: "assess.reason.skin",
    relevance: (p) => (isLongDuration(p) ? 2 : 0),
    options: [
      { id: "s7a", textKey: "assess.options.s7a", weight: 0 },
      { id: "s7b", textKey: "assess.options.s7b", weight: 1 },
    ],
  },
  {
    id: "s8",
    textKey: "assess.questions.s8",
    category: "skin",
    reasonKey: "assess.reason.footwear",
    relevance: (p) => (wearsOpenFootwear(p) ? 2 : 0) + (p?.priorAmputation ? 2 : 0),
    options: [
      { id: "s8a", textKey: "assess.options.s8a", weight: 0 },
      { id: "s8b", textKey: "assess.options.s8b", weight: 1 },
      { id: "s8c", textKey: "assess.options.s8c", weight: 2 },
    ],
  },
  {
    id: "s9",
    textKey: "assess.questions.s9",
    category: "skin",
    reasonKey: "assess.reason.skin",
    relevance: (p) => (isOlder(p) ? 2 : 0),
    options: [
      { id: "s9a", textKey: "assess.options.s9a", weight: 0 },
      { id: "s9b", textKey: "assess.options.s9b", weight: 2 },
    ],
  },
  {
    id: "s10",
    textKey: "assess.questions.s10",
    category: "skin",
    reasonKey: "assess.reason.skin",
    relevance: (p) => (isOlder(p) ? 2 : 0) + (isPoorControl(p) ? 1 : 0),
    options: [
      { id: "s10a", textKey: "assess.options.s10a", weight: 0 },
      { id: "s10b", textKey: "assess.options.s10b", weight: 1 },
    ],
  },
  {
    // Nail-fold infection (paronychia) — a local infection of the toe.
    id: "s11",
    textKey: "assess.questions.s11",
    category: "skin",
    reasonKey: "assess.reason.skin",
    relevance: (p) => (isOlder(p) ? 2 : 0) + (neglectsFootCare(p) ? 1 : 0),
    options: [
      { id: "s11a", textKey: "assess.options.s11a", weight: 0 },
      { id: "s11b", textKey: "assess.options.s11b", weight: 2 },
      { id: "s11c", textKey: "assess.options.s11c", weight: 3 },
    ],
  },
  {
    // Dark / blood spot — unrecognised pressure or trauma (pre-ulcer sign).
    id: "s12",
    textKey: "assess.questions.s12",
    category: "skin",
    reasonKey: "assess.reason.skin",
    relevance: (p) => (wearsOpenFootwear(p) ? 2 : 0) + (goesBarefoot(p) ? 1 : 0),
    options: [
      { id: "s12a", textKey: "assess.options.s12a", weight: 0 },
      { id: "s12b", textKey: "assess.options.s12b", weight: 2 },
    ],
  },
  {
    // Deep heel fissures — a common portal for infection.
    id: "s13",
    textKey: "assess.questions.s13",
    category: "skin",
    reasonKey: "assess.reason.skin",
    relevance: (p) => (isOlder(p) ? 2 : 0) + (isPoorControl(p) ? 1 : 0),
    options: [
      { id: "s13a", textKey: "assess.options.s13a", weight: 0 },
      { id: "s13b", textKey: "assess.options.s13b", weight: 1 },
      { id: "s13c", textKey: "assess.options.s13c", weight: 3 },
    ],
  },

  // ── Circulation (PAD) ──
  {
    id: "c1",
    textKey: "assess.questions.c1",
    category: "circulation",
    options: [
      { id: "c1a", textKey: "assess.options.c1a", weight: 0 },
      { id: "c1b", textKey: "assess.options.c1b", weight: 1 },
      { id: "c1c", textKey: "assess.options.c1c", weight: 3 },
    ],
  },
  {
    id: "c2",
    textKey: "assess.questions.c2",
    category: "circulation",
    options: [
      { id: "c2a", textKey: "assess.options.c2a", weight: 0 },
      { id: "c2b", textKey: "assess.options.c2b", weight: 2 },
      { id: "c2c", textKey: "assess.options.c2c", weight: 3 },
    ],
  },
  {
    id: "c3",
    textKey: "assess.questions.c3",
    category: "circulation",
    reasonKey: "assess.reason.circulation",
    relevance: (p) =>
      (isSmoker(p) ? 3 : 0) +
      (isLongDuration(p) ? 1 : 0) +
      (hasComorbidity(p, "heart") ? 2 : 0) +
      (hasComorbidity(p, "cholesterol") ? 1 : 0),
    options: [
      { id: "c3a", textKey: "assess.options.c3a", weight: 0 },
      { id: "c3b", textKey: "assess.options.c3b", weight: 1 },
      { id: "c3c", textKey: "assess.options.c3c", weight: 3 },
    ],
  },
  {
    // Adaptive follow-up: leg pain on walking (c3) may progress to rest pain,
    // which is a marker of critical limb ischaemia.
    id: "c4",
    textKey: "assess.questions.c4",
    category: "circulation",
    showIf: (a) => a["c3"] === "c3b" || a["c3"] === "c3c",
    reasonKey: "assess.reason.followUp",
    options: [
      { id: "c4a", textKey: "assess.options.c4a", weight: 0 },
      { id: "c4b", textKey: "assess.options.c4b", weight: 3 },
    ],
  },
  {
    id: "c5",
    textKey: "assess.questions.c5",
    category: "circulation",
    reasonKey: "assess.reason.circulation",
    relevance: (p) => (isSmoker(p) ? 2 : 0) + (hasComorbidity(p, "heart") ? 1 : 0),
    options: [
      { id: "c5a", textKey: "assess.options.c5a", weight: 0 },
      { id: "c5b", textKey: "assess.options.c5b", weight: 1 },
    ],
  },
  {
    id: "c6",
    textKey: "assess.questions.c6",
    category: "circulation",
    reasonKey: "assess.reason.comorbidity",
    relevance: (p) => (hasComorbidity(p, "kidney") ? 3 : 0) + (hasComorbidity(p, "heart") ? 2 : 0),
    options: [
      { id: "c6a", textKey: "assess.options.c6a", weight: 0 },
      { id: "c6b", textKey: "assess.options.c6b", weight: 2 },
    ],
  },
  {
    // Dependent rubor — a classic sign of significant peripheral arterial disease.
    id: "c7",
    textKey: "assess.questions.c7",
    category: "circulation",
    reasonKey: "assess.reason.circulation",
    relevance: (p) => (isSmoker(p) ? 2 : 0) + (hasComorbidity(p, "heart") ? 2 : 0),
    options: [
      { id: "c7a", textKey: "assess.options.c7a", weight: 0 },
      { id: "c7b", textKey: "assess.options.c7b", weight: 2 },
    ],
  },
  {
    // Foot-to-foot asymmetry — suggests one-sided arterial disease.
    id: "c8",
    textKey: "assess.questions.c8",
    category: "circulation",
    reasonKey: "assess.reason.circulation",
    relevance: (p) => (isSmoker(p) ? 2 : 0) + (isLongDuration(p) ? 1 : 0),
    options: [
      { id: "c8a", textKey: "assess.options.c8a", weight: 0 },
      { id: "c8b", textKey: "assess.options.c8b", weight: 3 },
    ],
  },

  // ── General health ──
  {
    id: "g1",
    textKey: "assess.questions.g1",
    category: "history",
    reasonKey: "assess.reason.control",
    relevance: (p) => (isPoorControl(p) ? 3 : 0),
    options: [
      { id: "g1a", textKey: "assess.options.g1a", weight: 0 },
      { id: "g1b", textKey: "assess.options.g1b", weight: 3 },
    ],
  },
  {
    id: "g2",
    textKey: "assess.questions.g2",
    category: "history",
    reasonKey: "assess.reason.comorbidity",
    relevance: (p) => (hasComorbidity(p, "eye") ? 3 : 0),
    options: [
      { id: "g2a", textKey: "assess.options.g2a", weight: 0 },
      { id: "g2b", textKey: "assess.options.g2b", weight: 2 },
    ],
  },
  {
    // Already-diagnosed LOPS or PAD — IWGDF stratification input.
    id: "h1",
    textKey: "assess.questions.h1",
    category: "history",
    reasonKey: "assess.reason.history",
    relevance: (p) => (isLongDuration(p) ? 2 : 0) + (isPoorControl(p) ? 1 : 0),
    options: [
      { id: "h1a", textKey: "assess.options.h1a", weight: 0 },
      { id: "h1b", textKey: "assess.options.h1b", weight: 2 },
      { id: "h1c", textKey: "assess.options.h1c", weight: 2 },
      { id: "h1d", textKey: "assess.options.h1d", weight: 3 },
    ],
  },
];

/** Back-compat alias — the full bank. */
export const QUESTIONS = QUESTION_BANK;

// ── Scoring Engine ──

export interface CategoryScore {
  category: CategoryId;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface AssessmentResult {
  totalScore: number;
  maxScore: number;
  riskLevel: RiskLevel;
  categoryScores: CategoryScore[];
  emergencyFlags: string[];
  /** Specific recommendation keys based on answers */
  recommendationKeys: string[];
  /** Deterministic care-navigation tier from the triage engine (if computed) */
  triageTier?: CareTier;
  /** Answers in a serializable format */
  answers: Record<string, string>;
  timestamp: number;
}

// Risk-level bands are determined by the weighted score ratio
// (totalScore / maxScore). Evaluation order is: urgent → high → moderate → low.
const THRESHOLDS = {
  moderate: 0.6, // ratio >= 0.60 → moderate
  high: 0.85,    // ratio >= 0.85 → high
  // ratio < 0.60 → low  (there is no separate lower bound; low is the fallback)
};

/**
 * Filter a session's questions down to the ones that should be shown right
 * now — adaptive follow-ups stay hidden until their trigger fires.
 */
export function getVisibleQuestions(
  answers: Record<string, string>,
  questions: Question[] = QUESTION_BANK
): Question[] {
  return questions.filter((q) => !q.showIf || q.showIf(answers));
}

// ── Session selection ──

/** How many rotating (personalised) questions a session adds on top of core. */
export const SESSION_ROTATING_COUNT = 4;

/** The safety screen asked in EVERY session (7 questions). */
export const CORE_QUESTIONS: Question[] = QUESTION_BANK.filter((q) => q.core);

/** Deterministic rotation: same seed → same order, different seed → shifted. */
function rotate<T>(list: T[], seed: number): T[] {
  if (list.length === 0) return list;
  const k = ((seed % list.length) + list.length) % list.length;
  return [...list.slice(k), ...list.slice(0, k)];
}

/**
 * Build one short, personalised session from the bank.
 *
 *   core (7)  +  personalised (4)  +  any adaptive follow-ups that fire
 *   → about 10–11 questions instead of the whole 41-question bank
 *
 * ── How the four personalised questions are chosen ──
 * The aim is a *spread* of clinical domains, not four questions from whichever
 * category happens to score highest. The algorithm is:
 *
 *   1. ELIGIBILITY — start from every non-core, non-adaptive question whose
 *      `appliesIf` gate passes for this profile (e.g. a kidney-disease
 *      question is only eligible for someone with kidney disease).
 *   2. RELEVANCE — inside each category, split the candidates into
 *      "profile-relevant" (`relevance > 0`) and "the rest", ranked by the
 *      profile signals (age, diabetes duration, HbA1c control, smoking,
 *      comorbidities, footwear, barefoot habits, foot-check habits,
 *      prior amputation). Relevant candidates are always preferred.
 *   3. ROTATION — rotate each of those two groups by `seed`, so *which*
 *      relevant question is asked changes from session to session while the
 *      category's most relevant candidates are always the ones considered.
 *   4. ROUND-ROBIN — visit categories most-relevant-first and take one
 *      question from each in turn until four are picked. This guarantees the
 *      session samples different domains (neuropathy, skin, circulation,
 *      history, …) instead of clustering in one.
 *
 * The result is deterministic for a given `(profile, seed)`: the same seed
 * always yields the same session. Pass a daily seed for day-to-day variety, or
 * a per-session seed for a fresh set on every check.
 */
export function selectSessionQuestions(
  profile: UserProfile | null,
  options: { seed?: number; rotating?: number } = {}
): Question[] {
  const seed = options.seed ?? 0;
  const rotatingCount = options.rotating ?? SESSION_ROTATING_COUNT;

  const rel = (q: Question) => (q.relevance ? q.relevance(profile) : 0);

  const pool = QUESTION_BANK.filter(
    (q) => !q.core && !q.showIf && (!q.appliesIf || q.appliesIf(profile))
  );

  // 1–3. Per-category queues: profile-relevant first (rotated), then the rest.
  const byCategory = new Map<CategoryId, Question[]>();
  for (const q of pool) {
    if (!byCategory.has(q.category)) byCategory.set(q.category, []);
    byCategory.get(q.category)!.push(q);
  }

  const queues = new Map<CategoryId, Question[]>();
  const categoryTopRelevance = new Map<CategoryId, number>();
  for (const [cat, list] of byCategory) {
    const relevant = rotate(
      list.filter((q) => rel(q) > 0).sort((a, b) => a.id.localeCompare(b.id)),
      seed
    );
    const rest = rotate(
      list.filter((q) => rel(q) === 0).sort((a, b) => a.id.localeCompare(b.id)),
      seed + 1
    );
    queues.set(cat, [...relevant, ...rest]);
    categoryTopRelevance.set(cat, list.reduce((m, q) => Math.max(m, rel(q)), 0));
  }

  // 4. Round-robin, most-relevant domain first.
  const catOrder = [...queues.keys()].sort(
    (a, b) =>
      categoryTopRelevance.get(b)! - categoryTopRelevance.get(a)! ||
      a.localeCompare(b)
  );

  const picked: Question[] = [];
  const depth = Math.max(0, ...catOrder.map((c) => queues.get(c)!.length));
  for (let cursor = 0; cursor < depth && picked.length < rotatingCount; cursor++) {
    for (const cat of catOrder) {
      if (picked.length >= rotatingCount) break;
      const queue = queues.get(cat)!;
      if (cursor < queue.length) picked.push(queue[cursor]);
    }
  }

  const chosenIds = new Set(picked.map((q) => q.id));
  // Keep bank order so the safety screen always comes first.
  return QUESTION_BANK.filter((q) => q.core || q.showIf || chosenIds.has(q.id));
}

/** Days since the Unix epoch — a stable per-day seed for session rotation. */
export function dailySessionSeed(now: number = Date.now()): number {
  return Math.floor(now / 86_400_000);
}

/**
 * Seed that is stable within a day but changes on every check, so a retake the
 * same day asks a different personalised set. `attempt` is a per-day counter
 * the caller persists (e.g. in sessionStorage).
 */
export function sessionSeed(attempt = 0, now: number = Date.now()): number {
  return dailySessionSeed(now) * 1000 + attempt;
}

export function getOptionWeight(question: Question, optionId: string): number {
  const opt = question.options.find((o) => o.id === optionId);
  return opt ? opt.weight : 0;
}

export function calculateRisk(
  answers: Record<string, string>,
  questions: Question[] = QUESTION_BANK
): AssessmentResult {
  const visible = getVisibleQuestions(answers, questions);
  const emergencyFlags: string[] = [];
  const recommendationKeys: string[] = [];
  const categoryScores: CategoryScore[] = [];
  let totalScore = 0;
  let maxScore = 0;

  // Calculate per-category scores
  for (const cat of CATEGORIES) {
    const catQuestions = visible.filter((q) => q.category === cat.id);
    if (catQuestions.length === 0) continue;

    let catScore = 0;
    let catMax = 0;

    for (const q of catQuestions) {
      const answer = answers[q.id];
      if (!answer) continue;

      // Handle multi-select (comma-separated)
      const selected = answer.split(",");
      for (const optId of selected) {
        const weight = getOptionWeight(q, optId);
        catScore += weight;

        // Check for emergency flags
        const opt = q.options.find((o) => o.id === optId);
        if (opt?.emergencyFlag && !emergencyFlags.includes(opt.emergencyFlag)) {
          emergencyFlags.push(opt.emergencyFlag);
        }

        // Generate specific recommendation keys
        if (weight >= 2) {
          const recKey = `${q.id}_${optId}`;
          if (!recommendationKeys.includes(recKey)) {
            recommendationKeys.push(recKey);
          }
        }
      }

      // Max score = sum of all option weights (for single-select) or
      // max single option weight (for multi-select)
      if (q.multi) {
        catMax += Math.max(...q.options.map((o) => o.weight)) * q.options.length;
      } else {
        catMax += Math.max(...q.options.map((o) => o.weight));
      }
    }

    const percentage = catMax > 0 ? catScore / catMax : 0;
    categoryScores.push({
      category: cat.id,
      score: catScore,
      maxScore: catMax,
      percentage: Math.round(percentage * 100),
    });

    totalScore += catScore;
    maxScore += catMax;
  }

  // Determine risk level
  const ratio = maxScore > 0 ? totalScore / maxScore : 0;
  let riskLevel: RiskLevel;

  if (emergencyFlags.length > 0 && emergencyFlags.includes("chronicWound")) {
    riskLevel = "urgent";
  } else if (emergencyFlags.length > 0 || ratio >= THRESHOLDS.high) {
    riskLevel = "high";
  } else if (ratio >= THRESHOLDS.moderate) {
    riskLevel = "moderate";
  } else {
    riskLevel = "low";
  }

  return {
    totalScore,
    maxScore,
    riskLevel,
    categoryScores,
    emergencyFlags,
    recommendationKeys,
    answers,
    timestamp: Date.now(),
  };
}

/**
 * Calculate risk score from assessment answers COMBINED with profile data.
 *
 * Self-Care and Medical History questions were moved from the assessment
 * questionnaire to the profile page. This function merges the two:
 *  - Profile-based fields (footInspection, barefootFrequency, footwearType,
 *    diabetesDuration, comorbidities, priorAmputation) are mapped to the
 *    same weight scale the assessment questions used.
 *  - Assessment-answer-based categories (redflags, neuropathy, skin, wound,
 *    circulation) are scored from the answers as before.
 */
export function calculateRiskWithProfile(
  answers: Record<string, string>,
  profile?: UserProfile | null,
  questions: Question[] = QUESTION_BANK
): AssessmentResult {
  const visible = getVisibleQuestions(answers, questions);
  const emergencyFlags: string[] = [];
  const recommendationKeys: string[] = [];
  const categoryScores: CategoryScore[] = [];
  let totalScore = 0;
  let maxScore = 0;

  // ── Profile-to-score mapping (same weights as the former Q18–Q23) ──
  // Self-Care (sc1, sc2, sc3)
  const selfcareWeight: Record<string, number> = {
    // footInspection (sc1)
    daily: 0, weekly: 1, rarely: 2, never: 3,
    // barefootFrequency (sc2)
    never_barefoot: 0, sometimes_barefoot: 2, often_barefoot: 3,
    // footwearType (sc3)
    closed: 0, sandals: 1, flipflops: 2,
  };

  const footInspectionWeight = profile?.footInspection
    ? selfcareWeight[profile.footInspection] ?? 0 : 0;
  const barefootWeight = profile?.barefootFrequency
    ? selfcareWeight[profile.barefootFrequency + "_barefoot"] ?? 0 : 0;
  const footwearWeight = profile?.footwearType
    ? selfcareWeight[profile.footwearType] ?? 0 : 0;

  const scScore = footInspectionWeight + barefootWeight + footwearWeight;
  const scMax = 3 + 3 + 2; // 8

  // Medical History (h1, h2, h3)
  const durationWeight = profile?.diabetesDuration === "under5" ? 0
    : profile?.diabetesDuration === "5to10" ? 1
    : profile?.diabetesDuration === "over10" ? 3 : 0;

  const comorbiditiesCount = countComorbidities(profile);
  const comorbidityWeight = comorbiditiesCount === 0 ? 0
    : comorbiditiesCount <= 2 ? 2 : 3;

  const amputationWeight = profile?.priorAmputation === true ? 3 : 0;
  if (profile?.priorAmputation === true) {
    emergencyFlags.push("amputationHistory");
  }

  const hScore = durationWeight + comorbidityWeight + amputationWeight;
  const hMax = 3 + 3 + 3; // 9

  // Recommendation keys for profile-based answers
  if (durationWeight >= 2) recommendationKeys.push("h1_duration");
  if (comorbidityWeight >= 2) recommendationKeys.push("h2_comorbidities");
  if (amputationWeight > 0) recommendationKeys.push("h3_amputation");

  // ── Per-category scoring ──
  // Self-Care and Medical History start from the profile-derived base, then
  // add any assessment questions that belong to those categories (for
  // history: the general-health questions g1 / g2 / h1).
  // `selfcare` is profile-only, so it always has zero questions here.
  for (const cat of CATEGORIES) {
    let catScore = 0;
    let catMax = 0;

    if (cat.id === "selfcare") {
      catScore += scScore;
      catMax += scMax;
    }
    if (cat.id === "history") {
      catScore += hScore;
      catMax += hMax;
    }

    const catQuestions = visible.filter((q) => q.category === cat.id);

    for (const q of catQuestions) {
      const answer = answers[q.id];
      if (!answer) continue;

      const selected = answer.split(",");
      for (const optId of selected) {
        const weight = getOptionWeight(q, optId);
        catScore += weight;

        const opt = q.options.find((o) => o.id === optId);
        if (opt?.emergencyFlag && !emergencyFlags.includes(opt.emergencyFlag)) {
          emergencyFlags.push(opt.emergencyFlag);
        }

        if (weight >= 2) {
          const recKey = `${q.id}_${optId}`;
          if (!recommendationKeys.includes(recKey)) {
            recommendationKeys.push(recKey);
          }
        }
      }

      if (q.multi) {
        catMax += Math.max(...q.options.map((o) => o.weight)) * q.options.length;
      } else {
        catMax += Math.max(...q.options.map((o) => o.weight));
      }
    }

    if (catMax === 0) continue;

    const percentage = catScore / catMax;
    categoryScores.push({
      category: cat.id,
      score: catScore,
      maxScore: catMax,
      percentage: Math.round(percentage * 100),
    });

    totalScore += catScore;
    maxScore += catMax;
  }

  // Determine risk level
  const ratio = maxScore > 0 ? totalScore / maxScore : 0;
  let riskLevel: RiskLevel;

  if (emergencyFlags.length > 0 && emergencyFlags.includes("chronicWound")) {
    riskLevel = "urgent";
  } else if (emergencyFlags.length > 0 || ratio >= THRESHOLDS.high) {
    riskLevel = "high";
  } else if (ratio >= THRESHOLDS.moderate) {
    riskLevel = "moderate";
  } else {
    riskLevel = "low";
  }

  return {
    totalScore,
    maxScore,
    riskLevel,
    categoryScores,
    emergencyFlags,
    recommendationKeys,
    answers,
    timestamp: Date.now(),
  };
}

const HISTORY_KEY = "footcheck-history";
const PROFILE_KEY = "footcheck-profile";

/**
 * sessionStorage handshake between the assessment page and the profile page.
 * Flow: user taps "Start" with an incomplete profile → assess sets
 * PROFILE_GATE_KEY and routes to /profile → profile shows a banner → on save
 * it sets ASSESS_AUTOSTART_KEY and routes back → assess auto-starts.
 */
export const PROFILE_GATE_KEY = "footcheck-profile-gate";
export const ASSESS_AUTOSTART_KEY = "footcheck-assess-autostart";

/** localStorage flag: the user has passed the first-run welcome screen. */
const ONBOARDED_KEY = "footcheck-onboarded";

/**
 * True once the user has been through the first-run welcome screen (where they
 * pick a language). Until then, the home route shows that screen instead of the
 * dashboard. On the server we can't know, so we report "already onboarded" —
 * the home page resolves the real value after mount to avoid a hydration
 * mismatch.
 */
export function hasCompletedFirstRun(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return true;
  }
}

/** Records that the first-run welcome screen has been completed. */
export function markFirstRunComplete(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    // storage unavailable — the welcome screen will simply show again
  }
}

export interface AssessmentHistoryEntry {
  timestamp: number;
  riskLevel: RiskLevel;
  totalScore: number;
  maxScore: number;
  categoryScores: CategoryScore[];
  emergencyFlags: string[];
  /** Deterministic care tier (added in Version 2) */
  triageTier?: CareTier;
  /**
   * Raw answers captured for this assessment. Persisted so the Dynamic
   * Re-check flow can prefill — and compare against — the previous state.
   * Optional for backward compatibility with history entries saved before
   * this field existed.
   */
  answers?: Record<string, string>;
}

export function saveAssessmentResult(result: AssessmentResult): void {
  if (typeof window === "undefined") return;
  const history = getAssessmentHistory();
  const entry: AssessmentHistoryEntry = {
    timestamp: result.timestamp,
    riskLevel: result.riskLevel,
    totalScore: result.totalScore,
    maxScore: result.maxScore,
    categoryScores: result.categoryScores,
    emergencyFlags: result.emergencyFlags,
    triageTier: result.triageTier,
    answers: result.answers,
  };
  history.push(entry);
  // Keep last 50 entries
  const trimmed = history.slice(-50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function getAssessmentHistory(): AssessmentHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export interface UserProfile {
  ageRange?: string;
  gender?: string;
  diabetesType?: string;
  diabetesDuration?: string;
  insulinUse?: boolean;
  lastHbA1c?: string;
  comorbidities?: string[];
  smoking?: string;
  // ── Former assessment questions, now profile fields ──
  /** How often the user inspects their feet (sc1). Values: "daily" | "weekly" | "rarely" | "never" */
  footInspection?: string;
  /** How often the user walks barefoot (sc2). Values: "never" | "sometimes" | "often" */
  barefootFrequency?: string;
  /** Type of footwear typically used (sc3). Values: "closed" | "sandals" | "flipflops" */
  footwearType?: string;
  /** Prior amputation history (h3). Boolean */
  priorAmputation?: boolean;
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Wipes all locally stored app data (profile, assessment history, the
 * first-run flag and the profile-gate handshake flags). Used by the `?reset=1`
 * demo helper so a tester can get a brand-new-user experience. The UI language
 * preference is kept.
 */
export function clearStoredData(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(ONBOARDED_KEY);
    sessionStorage.removeItem(PROFILE_GATE_KEY);
    sessionStorage.removeItem(ASSESS_AUTOSTART_KEY);
  } catch {
    // storage unavailable (private mode / disabled) — nothing to clear
  }
}

/**
 * Every profile field is mandatory — the profile supplies the Self-Care and
 * Medical History categories (plus the vulnerability check) used to score the
 * result, so a partial profile would silently distort the outcome.
 */
export const REQUIRED_PROFILE_FIELDS: (keyof UserProfile)[] = [
  "ageRange",
  "gender",
  "diabetesType",
  "diabetesDuration",
  "insulinUse",
  "lastHbA1c",
  "comorbidities",
  "smoking",
  "footInspection",
  "barefootFrequency",
  "footwearType",
  "priorAmputation",
];

/**
 * Sentinel stored in `comorbidities` when the user explicitly reports having
 * none. This lets "none" be a deliberate answer (required) instead of an
 * ambiguous empty list.
 */
export const COMORBIDITY_NONE = "none";

/** Number of real comorbidities (excludes the "none" sentinel). */
export function countComorbidities(profile?: UserProfile | null): number {
  return (profile?.comorbidities ?? []).filter((c) => c !== COMORBIDITY_NONE).length;
}

/** A field counts as filled when it is neither undefined/null nor an empty string/array. */
function isFieldFilled(profile: UserProfile | null, field: keyof UserProfile): boolean {
  if (!profile) return false;
  const value = profile[field];
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  // booleans: `false` is a valid answer, `undefined` was already handled above
  return true;
}

/** Returns the required fields that are still unanswered (empty when complete). */
export function getMissingProfileFields(profile: UserProfile | null): (keyof UserProfile)[] {
  return REQUIRED_PROFILE_FIELDS.filter((f) => !isFieldFilled(profile, f));
}

/** True when every required profile field has been answered. */
export function isProfileComplete(profile: UserProfile | null): boolean {
  return getMissingProfileFields(profile).length === 0;
}
