/**
 * Triage Engine — Diabetic Foot Check
 * ====================================
 * INDEPENDENT, DETERMINISTIC care-navigation module.
 *
 * This module answers ONE question: **where should this person go for care?**
 * It is intentionally separate from the severity/risk score (assessment.ts).
 * The severity score describes *how much* foot risk is present; the triage
 * engine decides *what care tier* the person needs right now.
 *
 * ── Design contract ──────────────────────────────────────────────────────
 * 1. DETERMINISTIC — pure functions only. No randomness, no Date.now(), no I/O.
 *    The same input ALWAYS produces the same decision.
 * 2. LLM-SAFE — the care tier is LOCKED. An LLM may only *explain* the outcome
 *    in natural language; it must never add, remove, or change the tier.
 *    See `buildExplanationContract()` for the guardrail handed to the LLM.
 * 3. NO IMAGE DIAGNOSIS — this engine consumes conversational intake and
 *    self-reported signs only. It never inspects a photo.
 * 4. FAIL-SAFE — when inputs are ambiguous, conflicting, or incomplete the
 *    engine returns ABSTAIN (calibrated abstention) rather than guessing.
 *
 * ── Clinical grounding ───────────────────────────────────────────────────
 * Tier 1 · EMERGENCY   — local/regional red flags from NICE NG19 §1.4.1
 *                        (gangrene), IWGDF/IDSA 2023 Table 2 (rapidly
 *                        progressive cellulitis) plus systemic-infection signs
 *                        from SIRS (ACCP/SCCM 1992), Sepsis-3 (Singer et al.,
 *                        2016) and MIMIC-III critical-infection flags
 *                        (fever > 38 °C, spreading redness, black/gangrenous
 *                        tissue, foul-smelling pus, altered mental state).
 * Tier 2 · PRIMARY     — IWGDF 2023 risk stratification: new blisters,
 *                        shallow ulcers, and broken skin WITHOUT systemic signs.
 * Tier 3 · SELF_CARE   — IWGDF 2023 Prevention Rec 4/5 self-management: mild
 *                        pressure redness without skin breakdown → hygiene +
 *                        offloading advice with a 24–48 h re-check.
 * Tier 4 · ABSTAIN     — calibrated abstention for ambiguous / conflicting
 *                        inputs: "Unable to assess safely."
 *
 * Attribution history: several red flags were previously credited to a
 * "Singapore ACE 2024" diabetic-foot guidance that could not be verified
 * against any published ACE document. They are now sourced to the
 * freely-downloadable guidelines above; see
 * `docs/中文说明/assessment-criteria-source-mapping-zh.md`.
 *
 * NOTE: This is a screening and education tool, NOT a diagnostic device.
 */

import type { UserProfile } from "./assessment";

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

/** The four mutually-exclusive care tiers. */
export type CareTier = "EMERGENCY" | "PRIMARY_CARE" | "SELF_CARE" | "ABSTAIN";

/** How confident the deterministic engine is in the tier. */
export type TriageConfidence = "definitive" | "escalated" | "calibrated";

/**
 * Systemic infection / red-flag signs.
 * `undefined` means "not yet answered" — the UI requires a yes/no answer
 * before advancing, so in normal use all five will be `boolean`. The
 * `undefined` state is retained for safety: programmatic callers that
 * pass incomplete answers will still trigger ABSTAIN rather than guessing.
 */
export interface SystemicSigns {
  /** Fever > 38 °C or chills */
  fever?: boolean;
  /** Redness spreading rapidly up the leg / beyond the foot */
  spreadingRedness?: boolean;
  /** Black, dead, or gangrenous tissue */
  gangrene?: boolean;
  /** Foul-smelling pus or discharge */
  foulPus?: boolean;
  /** Confusion, drowsiness, or systemic unwellness */
  alteredMentalState?: boolean;
}

/** Local foot findings (no systemic involvement assumed). */
export interface LocalFindings {
  /** New blister on the foot */
  newBlister?: boolean;
  /** Shallow ulcer or open wound */
  shallowUlcer?: boolean;
  /** Broken skin / fissures without an open ulcer */
  brokenSkin?: boolean;
  /** Mild pressure redness WITHOUT any break in the skin */
  pressureRedness?: boolean;
}

/** Everything the triage engine needs. */
export interface TriageInput {
  systemicSigns: SystemicSigns;
  localFindings: LocalFindings;
  /** Raw assessment answers (question id → option id) for contradiction checks. */
  answers: Record<string, string>;
  profile?: UserProfile;
}

/** One auditable, ordered decision rule. */
export interface TriageRule {
  id: string;
  tier: CareTier;
  source:
    | "IWGDF 2023"
    | "NICE NG19"
    | "IWGDF/IDSA 2023"
    | "SIRS 1992"
    | "Sepsis-3"
    | "Safety";
  /** Lower priority number = evaluated first. */
  priority: number;
  description: string;
  /** i18n key explaining WHY this rule fired. */
  criteriaKey: string;
  test: (input: TriageInput) => boolean;
}

/** Care playbook for a tier (all values are i18n keys). */
export interface TierPlaybook {
  facilityKey: string;
  timeframeKey: string;
  actionKeys: string[];
}

/** The final, locked decision returned by `evaluateTriage()`. */
export interface TriageDecision {
  tier: CareTier;
  /** Which rule fired (for audit / explainability). */
  ruleId: string;
  confidence: TriageConfidence;
  /** All criteria that matched, as i18n keys (may be > 1 for the same tier). */
  matchedCriteria: string[];
  playbook: TierPlaybook;
  /** Present only when tier === "ABSTAIN". */
  abstention?: {
    reasonKey: string;
    detailKey: string;
  };
  /** Always true — the tier is rule-determined and may not be altered. */
  locked: true;
}

// ═══════════════════════════════════════════════════════════════════
//  Source constants (auditable thresholds)
// ═══════════════════════════════════════════════════════════════════

export const MIMIC_III_THRESHOLDS = {
  /** Sepsis / systemic infection screening threshold (°C). */
  feverCelsius: 38.0,
  /** Reference: MIMIC-III ICD-9 codes for diabetic foot infection / sepsis. */
  icd9Codes: ["707.15", "681.10", "682.7", "995.91", "038.9"],
  note:
    "MIMIC-III critical-infection flags inform the systemic-sign thresholds used by the red-flag screen.",
} as const;

/**
 * SIRS — Systemic Inflammatory Response Syndrome criteria.
 * Source: ACCP/SCCM Consensus Conference (Bone et al., Chest 1992;101:1644-55).
 * These are the systemic-sign thresholds that IWGDF/IDSA use to define a
 * SEVERE diabetic foot infection. SIRS is positive when ≥ 2 criteria are met.
 *
 * NOTE (scope honesty): this screening tool captures only 1 of the 4 SIRS
 * criteria — temperature, via the rf1 red-flag question. Heart rate,
 * respiratory rate / PaCO2, and WBC all require clinical measurement and are
 * out of scope. The rf5 red flag (confusion / drowsiness) is NOT a SIRS
 * criterion; it is an altered-mental-state sign drawn from qSOFA / Sepsis-3
 * (Singer et al., JAMA 2016;315:801-10), which is why the red-flag screen
 * uses it as an independent emergency trigger rather than as a SIRS point.
 */
export const SIRS_CRITERIA = {
  /** Temperature > 38 °C or < 36 °C */
  temperatureHighCelsius: 38.0,
  temperatureLowCelsius: 36.0,
  /** Heart rate > 90 beats/min */
  heartRateBpm: 90,
  /** Respiratory rate > 20 breaths/min, or PaCO2 < 32 mmHg (4.3 kPa) */
  respiratoryRate: 20,
  paco2MmHg: 32,
  /** WBC > 12 ×10⁹/L, or < 4 ×10⁹/L, or > 10% band forms */
  wbcHigh: 12,
  wbcLow: 4,
  bandFormsPercent: 10,
  /** Number of criteria required for a positive SIRS screen. */
  requiredCriteria: 2,
  source: "ACCP/SCCM 1992 (Bone et al.) — adopted by IWGDF/IDSA for severe foot infection",
} as const;

/**
 * IWGDF/IDSA diabetic foot infection grading.
 * Source: IWGDF/IDSA 2023 guideline on the diagnosis and treatment of
 * diabetes-related foot infections.
 *
 *  Grade 1 · Uninfected        — no local or systemic signs
 *  Grade 2 · Mild              — skin/subcutaneous only; erythema ≤ 2 cm
 *  Grade 3 · Moderate          — deeper than skin/subcutaneous, OR erythema > 2 cm
 *  Grade 4 · Severe            — local infection PLUS SIRS (systemic response)
 *
 * Grade 4 is an emergency. Any grade with critical limb ischaemia also warrants
 * urgent specialist care. There is NO "minimum number of symptoms" for severe
 * infection — a single SIRS-positive or necrotising picture is already severe.
 */
export const IDSA_INFECTION_GRADES = [
  { grade: 1, label: "Uninfected", criteria: "No local or systemic signs of infection" },
  { grade: 2, label: "Mild", criteria: "Skin/subcutaneous only; erythema ≤ 2 cm" },
  { grade: 3, label: "Moderate", criteria: "Deeper than skin/subcutaneous, or erythema > 2 cm" },
  { grade: 4, label: "Severe", criteria: "Local infection PLUS SIRS (≥ 2 SIRS criteria)" },
] as const;

export const TRIAGE_SOURCES = [
  "IWGDF 2023 Practical Guidelines (risk stratification)",
  "NICE NG19 — Diabetic foot problems: prevention and management (§1.4.1)",
  "IWGDF/IDSA 2023 (foot infection grading — severe = local infection + SIRS)",
  "ACCP/SCCM 1992 SIRS criteria (Bone et al.)",
  "qSOFA / Sepsis-3 (Singer et al., JAMA 2016 — altered mental state)",
  "MIMIC-III / PhysioNet (critical infection & sepsis flags)",
] as const;

// ═══════════════════════════════════════════════════════════════════
//  Tier playbooks (all strings are i18n keys → triage.playbook.*)
// ═══════════════════════════════════════════════════════════════════

export const TIER_PLAYBOOK: Record<CareTier, TierPlaybook> = {
  EMERGENCY: {
    facilityKey: "triage.playbook.EMERGENCY.facility",
    timeframeKey: "triage.playbook.EMERGENCY.timeframe",
    actionKeys: [
      "triage.playbook.EMERGENCY.actions.a1",
      "triage.playbook.EMERGENCY.actions.a2",
      "triage.playbook.EMERGENCY.actions.a3",
      "triage.playbook.EMERGENCY.actions.a4",
      "triage.playbook.EMERGENCY.actions.a5",
    ],
  },
  PRIMARY_CARE: {
    facilityKey: "triage.playbook.PRIMARY_CARE.facility",
    timeframeKey: "triage.playbook.PRIMARY_CARE.timeframe",
    actionKeys: [
      "triage.playbook.PRIMARY_CARE.actions.a1",
      "triage.playbook.PRIMARY_CARE.actions.a2",
      "triage.playbook.PRIMARY_CARE.actions.a3",
      "triage.playbook.PRIMARY_CARE.actions.a4",
      "triage.playbook.PRIMARY_CARE.actions.a5",
    ],
  },
  SELF_CARE: {
    facilityKey: "triage.playbook.SELF_CARE.facility",
    timeframeKey: "triage.playbook.SELF_CARE.timeframe",
    actionKeys: [
      "triage.playbook.SELF_CARE.actions.a1",
      "triage.playbook.SELF_CARE.actions.a2",
      "triage.playbook.SELF_CARE.actions.a3",
      "triage.playbook.SELF_CARE.actions.a4",
      "triage.playbook.SELF_CARE.actions.a5",
    ],
  },
  ABSTAIN: {
    facilityKey: "triage.playbook.ABSTAIN.facility",
    timeframeKey: "triage.playbook.ABSTAIN.timeframe",
    actionKeys: [
      "triage.playbook.ABSTAIN.actions.a1",
      "triage.playbook.ABSTAIN.actions.a2",
      "triage.playbook.ABSTAIN.actions.a3",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════
//  Predicates
// ═══════════════════════════════════════════════════════════════════

/** All five red-flag signs were explicitly answered yes or no. */
export function isRedFlagScreenComplete(input: TriageInput): boolean {
  const s = input.systemicSigns;
  return (
    s.fever !== undefined &&
    s.spreadingRedness !== undefined &&
    s.gangrene !== undefined &&
    s.foulPus !== undefined &&
    s.alteredMentalState !== undefined
  );
}

/**
 * Count how many of the five red-flag questions were left unanswered
 * (i.e. `undefined` — not yet answered yes or no). In normal UI flow all
 * five are always answered (the Next button is disabled until a choice is
 * selected), so this returns 0 for typical sessions. It remains as a
 * safety net for programmatic callers with incomplete data.
 */
export function countUnsureRedFlags(input: TriageInput): number {
  const s = input.systemicSigns;
  let count = 0;
  if (s.fever === undefined) count++;
  if (s.spreadingRedness === undefined) count++;
  if (s.gangrene === undefined) count++;
  if (s.foulPus === undefined) count++;
  if (s.alteredMentalState === undefined) count++;
  return count;
}

/**
 * Count how many of the five red-flag signs were explicitly answered "yes".
 */
export function countConfirmedRedFlags(input: TriageInput): number {
  const s = input.systemicSigns;
  let count = 0;
  if (s.fever === true) count++;
  if (s.spreadingRedness === true) count++;
  if (s.gangrene === true) count++;
  if (s.foulPus === true) count++;
  if (s.alteredMentalState === true) count++;
  return count;
}

/**
 * Threshold: number of UNANSWERED red-flag signs that prevents excluding
 * a severe infection.
 *
 * In normal UI flow all five red-flag questions are answered (binary
 * yes/no), so this threshold is never reached. It serves as a safety net
 * for programmatic callers that pass incomplete answers: once ≥ 2 red-flag
 * signs are missing, a positive SIRS screen can no longer be ruled out.
 *
 * Supporting (not deriving) evidence — why 2 is a defensible, conservative
 * floor rather than an arbitrary pick:
 *  · A severe diabetic-foot infection = local infection + SIRS, and SIRS is
 *    positive at ≥ 2 criteria (ACCP/SCCM 1992; adopted by IWGDF/IDSA 2023).
 *    So once ≥ 2 red-flag signs are unknown, a positive SIRS screen can no
 *    longer be ruled out from self-report alone.
 *  · Emergency signs are individually actionable (NICE NG19 §1.4.1 and
 *    IWGDF/IDSA 2023 escalate on ANY single limb-threatening sign), so we
 *    tolerate very little uncertainty before abstaining.
 *
 * Calibration note: the threshold is exposed (see `TRIAGE_META.abstainThreshold`)
 * so it can be tuned and re-validated against the synthetic fairness dataset,
 * rather than being presented as a fixed clinical constant.
 */
export const UNKNOWN_ABSTAIN_THRESHOLD = SIRS_CRITERIA.requiredCriteria; // = 2

/** Any clear local wound finding (actionable without systemic signs). */
export function hasClearLocalFinding(input: TriageInput): boolean {
  const f = input.localFindings;
  return f.shallowUlcer === true || f.newBlister === true || f.brokenSkin === true;
}

/**
 * High-vulnerability foot (IWGDF Category 2–3 baseline or poor glycaemic
 * control). In these feet, even mild findings warrant professional review.
 */
export function isVulnerable(input: TriageInput): boolean {
  const a = input.answers;
  // w1 covers both history and current status: w1b = healed past ulcer,
  // w1c = an open wound right now. Either one marks an IWGDF Category 3 foot.
  const priorUlcer = a["w1"] === "w1b" || a["w1"] === "w1c";
  const priorAmputation = input.profile?.priorAmputation === true;
  const noSensation = a["n1"] === "n1b" || a["n3"] === "n3b";
  const circulationIssue = a["c1"] === "c1c" || a["c2"] === "c2c";
  const poorControl = input.profile?.lastHbA1c === "over8";
  return (
    priorUlcer ||
    priorAmputation ||
    (noSensation && circulationIssue) ||
    poorControl
  );
}

/**
 * Conflicting self-report that prevents a safe determination.
 * These are real, reachable combinations in the assessment flow.
 */
export function hasContradiction(input: TriageInput): boolean {
  const a = input.answers;
  const f = input.localFindings;

  // "No skin changes" but redness reported elsewhere
  if (a["s1"] === "s1a" && f.pressureRedness === true) return true;
  // "Sensation is normal" but cannot feel light touch
  if (a["n1"] === "n1a" && a["n3"] === "n3b") return true;
  // "Never had a foot wound" but broken skin / a new blister reported now
  if (a["w1"] === "w1a" && (f.brokenSkin === true || f.newBlister === true)) return true;

  return false;
}

// ═══════════════════════════════════════════════════════════════════
//  Rules (ordered by priority; first match wins)
// ═══════════════════════════════════════════════════════════════════

export const TRIAGE_RULES: TriageRule[] = [
  // ── Tier 1 · EMERGENCY — NICE NG19 / IWGDF-IDSA red flags + sepsis criteria ──
  //
  // IMPORTANT (medical-database grounded): there is NO "minimum count" rule.
  // Per IWGDF/IDSA 2023, a severe foot infection = local infection + SIRS,
  // and per NICE NG19 §1.4.1 any single limb-threatening sign (gangrene,
  // limb ischaemia, deep/bone infection) already warrants immediate referral.
  // Requiring several symptoms before escalating would be LESS safe than the
  // guideline, so each sign is evaluated on its own.
  {
    id: "RF-01",
    tier: "EMERGENCY",
    source: "SIRS 1992",
    priority: 100,
    description: "Fever above 38 °C or chills (systemic infection)",
    criteriaKey: "triage.criteria.fever",
    test: (i) => i.systemicSigns.fever === true,
  },
  {
    id: "RF-02",
    tier: "EMERGENCY",
    source: "IWGDF/IDSA 2023",
    priority: 100,
    description: "Rapidly spreading redness / erythema",
    criteriaKey: "triage.criteria.spreadingRedness",
    test: (i) => i.systemicSigns.spreadingRedness === true,
  },
  {
    id: "RF-03",
    tier: "EMERGENCY",
    source: "NICE NG19",
    priority: 100,
    description: "Black or gangrenous tissue",
    criteriaKey: "triage.criteria.gangrene",
    test: (i) => i.systemicSigns.gangrene === true,
  },
  {
    id: "RF-04",
    tier: "EMERGENCY",
    source: "IWGDF/IDSA 2023",
    priority: 100,
    description: "Foul-smelling pus or discharge",
    criteriaKey: "triage.criteria.foulPus",
    test: (i) => i.systemicSigns.foulPus === true,
  },
  {
    id: "RF-05",
    tier: "EMERGENCY",
    source: "Sepsis-3",
    priority: 100,
    description: "Altered mental state / systemic unwellness",
    criteriaKey: "triage.criteria.alteredMentalState",
    test: (i) => i.systemicSigns.alteredMentalState === true,
  },

  // ── Tier 2 · PRIMARY_CARE — IWGDF 2023 local wound findings ──
  {
    id: "PC-01",
    tier: "PRIMARY_CARE",
    source: "IWGDF 2023",
    priority: 300,
    description: "Shallow ulcer or open wound without systemic signs",
    criteriaKey: "triage.criteria.shallowUlcer",
    test: (i) => i.localFindings.shallowUlcer === true,
  },
  {
    id: "PC-02",
    tier: "PRIMARY_CARE",
    source: "IWGDF 2023",
    priority: 300,
    description: "New blister on the foot (pre-ulcerative lesion)",
    criteriaKey: "triage.criteria.newBlister",
    test: (i) => i.localFindings.newBlister === true,
  },
  {
    id: "PC-03",
    tier: "PRIMARY_CARE",
    source: "IWGDF 2023",
    priority: 300,
    description: "Broken skin or fissures",
    criteriaKey: "triage.criteria.brokenSkin",
    test: (i) => i.localFindings.brokenSkin === true,
  },
  {
    id: "PC-04",
    tier: "PRIMARY_CARE",
    source: "IWGDF 2023",
    priority: 310,
    description: "Mild redness in a high-risk (vulnerable) foot",
    criteriaKey: "triage.criteria.vulnerableRedness",
    test: (i) => i.localFindings.pressureRedness === true && isVulnerable(i),
  },

  // ── Tier 4 · ABSTAIN — calibrated abstention ──
  {
    id: "AB-01",
    tier: "ABSTAIN",
    source: "Safety",
    priority: 350,
    description: "Conflicting self-report",
    criteriaKey: "triage.criteria.contradiction",
    test: (i) => hasContradiction(i),
  },
  {
    id: "AB-02",
    tier: "ABSTAIN",
    source: "Safety",
    priority: 350,
    description:
      "Severe infection cannot be excluded — ≥2 red-flag signs unanswered (conservative abstention)",
    criteriaKey: "triage.criteria.insufficientData",
    test: (i) =>
      countUnsureRedFlags(i) >= UNKNOWN_ABSTAIN_THRESHOLD &&
      !hasClearLocalFinding(i),
  },

  // ── Tier 3 · SELF_CARE — IWGDF 2023 Prevention self-management ──
  {
    id: "SC-01",
    tier: "SELF_CARE",
    source: "IWGDF 2023",
    priority: 400,
    description: "Mild pressure redness without skin breakdown",
    criteriaKey: "triage.criteria.pressureRedness",
    test: (i) => i.localFindings.pressureRedness === true,
  },
  {
    id: "SC-02",
    tier: "SELF_CARE",
    source: "IWGDF 2023",
    priority: 490,
    description: "No acute foot concern — routine self-monitoring",
    criteriaKey: "triage.criteria.routine",
    test: () => true,
  },
];

// ═══════════════════════════════════════════════════════════════════
//  Evaluation
// ═══════════════════════════════════════════════════════════════════

const ABSTENTION_COPY: Record<string, { reasonKey: string; detailKey: string }> = {
  "triage.criteria.contradiction": {
    reasonKey: "triage.abstention.title",
    detailKey: "triage.abstention.contradictionDetail",
  },
  "triage.criteria.insufficientData": {
    reasonKey: "triage.abstention.title",
    detailKey: "triage.abstention.insufficientDetail",
  },
};

/**
 * Evaluate the deterministic care tier for a set of inputs.
 *
 * Pure function: no randomness, no clock, no I/O. Same input → same output.
 * Rules are sorted by (priority, id) so evaluation order is fully stable.
 */
export function evaluateTriage(input: TriageInput): TriageDecision {
  const ordered = [...TRIAGE_RULES].sort(
    (a, b) => a.priority - b.priority || a.id.localeCompare(b.id)
  );

  // Collect EVERY matching rule for the winning tier (explainability).
  const matched = ordered.filter((r) => r.test(input));
  const winner = matched[0] ?? TRIAGE_RULES[TRIAGE_RULES.length - 1];

  const sameTierCriteria = matched
    .filter((r) => r.tier === winner.tier)
    .map((r) => r.criteriaKey);

  let confidence: TriageConfidence = "definitive";
  if (winner.tier === "ABSTAIN") confidence = "calibrated";
  else if (winner.id === "PC-04") confidence = "escalated";

  const decision: TriageDecision = {
    tier: winner.tier,
    ruleId: winner.id,
    confidence,
    matchedCriteria: sameTierCriteria,
    playbook: TIER_PLAYBOOK[winner.tier],
    locked: true,
  };

  if (winner.tier === "ABSTAIN") {
    decision.abstention =
      ABSTENTION_COPY[winner.criteriaKey] ?? ABSTENTION_COPY["triage.criteria.insufficientData"];
  }

  return decision;
}

// ═══════════════════════════════════════════════════════════════════
//  Derivation from assessment answers
// ═══════════════════════════════════════════════════════════════════

/**
 * Map raw assessment answers → structured `TriageInput`.
 *
 * Question ids: rf1–rf5 (red flags, binary yes/no), w1 (wound history +
 * current status), sk1 (skin findings multi-select: cracked/broken skin,
 * new blister, redness). Option ids follow the `<qid><letter>` convention.
 *
 * Red-flag questions now have only two options (yes/no). The tri-state
 * reader still returns `undefined` for an unanswered question, but in
 * normal UI flow every question is answered before "Next" is enabled.
 */
export function deriveTriageInput(
  answers: Record<string, string>,
  profile?: UserProfile
): TriageInput {
  /** Binary reader: "yes" → true, "no" → false, unanswered → undefined. */
  const tri = (qid: string, yesId: string, noId: string): boolean | undefined => {
    const v = answers[qid];
    if (v === yesId) return true;
    if (v === noId) return false;
    return undefined;
  };

  // sk1 is a multi-select; "sk1none" means "nothing to report".
  const sk1Answered = answers["sk1"] !== undefined;
  const sk = (answers["sk1"] ?? "").split(",").filter(Boolean);

  return {
    systemicSigns: {
      fever: tri("rf1", "rf1b", "rf1a"),
      spreadingRedness: tri("rf2", "rf2b", "rf2a"),
      gangrene: tri("rf3", "rf3b", "rf3a"),
      foulPus: tri("rf4", "rf4b", "rf4a"),
      alteredMentalState: tri("rf5", "rf5b", "rf5a"),
    },
    localFindings: {
      newBlister: sk1Answered ? sk.includes("sk1blister") : undefined,
      shallowUlcer:
        answers["w1"] === "w1c" ? true : answers["w1"] ? false : undefined,
      brokenSkin: sk1Answered ? sk.includes("sk1crack") : undefined,
      pressureRedness: sk1Answered ? sk.includes("sk1red") : undefined,
    },
    answers,
    profile,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  LLM explanation contract (guardrail)
// ═══════════════════════════════════════════════════════════════════

export interface ExplanationContract {
  /** The tier the LLM is FORBIDDEN from changing. */
  lockedTier: CareTier;
  /** System prompt to hand the LLM. */
  systemPrompt: string;
  allowedActions: string[];
  forbiddenActions: string[];
  /** i18n keys the LLM is allowed to draw facts from. */
  facts: string[];
}

/**
 * Build the guardrail that lets an LLM *explain* the decision without ever
 * altering the rule-determined care tier.
 */
export function buildExplanationContract(decision: TriageDecision): ExplanationContract {
  return {
    lockedTier: decision.tier,
    systemPrompt: [
      "You are a health-communication assistant for a diabetic-foot screening tool.",
      "Explain the following rule-determined care tier in calm, plain, reassuring language.",
      `The care tier is LOCKED to "${decision.tier}" and MUST NOT be changed, upgraded, or downgraded.`,
      "Do not diagnose, prescribe, or invent advice. Only restate and clarify the provided actions.",
      "If you are unsure, restate the provided actions rather than adding new ones.",
    ].join(" "),
    allowedActions: [
      "Rephrase the tier, timeframe, facility, and actions in the user's language",
      "Explain the matched criteria in plain language",
      "Express empathy and encourage follow-through",
    ],
    forbiddenActions: [
      "Changing the care tier",
      "Adding or removing clinical actions",
      "Providing a diagnosis",
      "Recommending medication or dosages",
    ],
    facts: [
      decision.matchedCriteria[0] ?? "triage.criteria.routine",
      decision.playbook.facilityKey,
      decision.playbook.timeframeKey,
      ...decision.playbook.actionKeys,
    ],
  };
}

/** Guard for future LLM integration: the tier must come back unchanged. */
export function isTierUnchanged(expected: CareTier, actual: CareTier): boolean {
  return expected === actual;
}

// ═══════════════════════════════════════════════════════════════════
//  Dynamic Re-assessment / Escalation
// ═══════════════════════════════════════════════════════════════════
//
// Closed-loop companion to the core triage engine. It does NOT invent new
// rules — it evaluates the SAME deterministic rules twice (previous state vs.
// user-updated state) and reports whether the care tier has ESCALATED (become
// more urgent). Deterministic: same inputs → same output.

/**
 * Urgency ranking of the care tiers. Lower number = MORE urgent.
 * ABSTAIN is excluded from escalation ranking — it is "cannot determine
 * safely", handled as its own state rather than an urgency level.
 */
export const TIER_SEVERITY_RANK: Record<CareTier, number> = {
  EMERGENCY: 0,
  PRIMARY_CARE: 1,
  SELF_CARE: 2,
  ABSTAIN: 3,
};

/** Tiers that participate in the urgency ordering. */
const ACTIONABLE_TIERS: readonly CareTier[] = ["EMERGENCY", "PRIMARY_CARE", "SELF_CARE"];

/**
 * True when `next` is MORE urgent than `prev`.
 *  · Only the three actionable tiers are compared. Anything → ABSTAIN is NOT an
 *    escalation (it is a loss of determinable safety, shown separately).
 *  · A less-urgent move (e.g. EMERGENCY → SELF_CARE) is an improvement, not an
 *    escalation.
 */
export function isEscalated(prev: CareTier, next: CareTier): boolean {
  if (!ACTIONABLE_TIERS.includes(prev) || !ACTIONABLE_TIERS.includes(next)) {
    return false;
  }
  return TIER_SEVERITY_RANK[next] < TIER_SEVERITY_RANK[prev];
}

/** The outcome of a dynamic re-check. */
export interface ReassessmentResult {
  /** The decision computed from the PREVIOUS answers. */
  prevDecision: TriageDecision;
  /** The decision computed from the UPDATED answers. */
  newDecision: TriageDecision;
  /** True when the updated state is a more urgent care tier than before. */
  escalated: boolean;
  /** The updated care tier. */
  newTier: CareTier;
  /** The previous care tier. */
  prevTier: CareTier;
}

/**
 * Evaluate a dynamic re-check: re-run the deterministic triage on the updated
 * answers and compare against the previous decision.
 *
 * `prevAnswers` need not be complete — older history entries may lack raw
 * answers. Any missing field is treated as "unanswered" by `deriveTriageInput`,
 * which is the safe default the engine expects.
 */
export function evaluateReassessment(
  prevAnswers: Record<string, string>,
  newAnswers: Record<string, string>,
  profile?: UserProfile | null
): ReassessmentResult {
  const prevDecision = evaluateTriage(deriveTriageInput(prevAnswers, profile || undefined));
  const newDecision = evaluateTriage(deriveTriageInput(newAnswers, profile || undefined));
  return {
    prevDecision,
    newDecision,
    escalated: isEscalated(prevDecision.tier, newDecision.tier),
    newTier: newDecision.tier,
    prevTier: prevDecision.tier,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Metadata
// ═══════════════════════════════════════════════════════════════════

export const TRIAGE_METADATA = {
  version: "1.2.0",
  sources: TRIAGE_SOURCES,
  tiers: ["EMERGENCY", "PRIMARY_CARE", "SELF_CARE", "ABSTAIN"] as CareTier[],
  totalRules: TRIAGE_RULES.length,
  deterministic: true,
  llmRole: "explanation-only",
  /** Unknown red-flag signs that block excluding severe infection (our conservative calibration). */
  abstainThreshold: UNKNOWN_ABSTAIN_THRESHOLD,
  sirsCriteria: SIRS_CRITERIA,
  idsaGrading: IDSA_INFECTION_GRADES,
  disclaimer:
    "Deterministic care navigation only. Not a diagnostic device. The care tier is rule-determined and cannot be altered by AI-generated text.",
} as const;
