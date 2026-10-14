/**
 * Clinical Rules Engine — IWGDF 2023 & NICE NG19
 * 
 * Externalizes clinical decision rules from the assessment flow.
 * This module represents the "medical knowledge layer" that can be
 * versioned, audited, and updated independently of the app code.
 * 
 * Sources (all freely downloadable, every rule traces to verbatim text):
 * - IWGDF 2023 Practical Guidelines — "Prevention of foot ulcers in persons
 *   with diabetes" (Bus SA, et al.) and the Intersocietal PAD guideline
 *   (Fitridge R, et al.). https://iwgdfguidelines.org/guidelines-2023/
 * - NICE NG19 — Diabetic foot problems: prevention and management (2015,
 *   recommendations 1.3.x / 1.4.x updated 2023).
 *   https://www.nice.org.uk/guidance/ng19
 * - NICE NG28 — Type 2 diabetes in adults: management (blood glucose control).
 *   https://www.nice.org.uk/guidance/ng28
 *
 * Attribution history: rules previously credited to a "Singapore ACE 2024
 * diabetic foot clinical guidance" could NOT be verified against any published
 * ACE guidance document. They have been re-attributed to the IWGDF 2023 and
 * NICE sources above, whose text is quoted in
 * `docs/中文说明/assessment-criteria-source-mapping-zh.md`.
 * 
 * Risk Stratification: IWGDF 2023 System
 *   Category 0: No LOPS, no PAD, no deformity            → Low risk      → screen every 12 months
 *   Category 1: LOPS OR PAD (one of the two)             → Moderate risk → screen every 6-12 months
 *   Category 2: Any TWO of LOPS / PAD / foot deformity   → High risk     → screen every 3-6 months
 *   Category 3: (LOPS or PAD) + previous ulcer, amputation, renal
 *               replacement therapy, or Charcot foot      → Highest risk  → screen every 1-3 months
 *
 * NOTE: This app is a screening and education tool, NOT a diagnostic device.
 * All clinical decisions must be verified by a qualified healthcare professional.
 */

import type {
  CategoryId,
  RiskLevel,
  CategoryScore,
} from "./assessment";

// ═══════════════════════════════════════════════════════════════════
//  IWGDF Risk Classification
// ═══════════════════════════════════════════════════════════════════

export interface IWGDFFootCategory {
  category: 0 | 1 | 2 | 3;
  label: string;
  description: string;
  riskLevel: RiskLevel;
  /** Recommended screening frequency */
  screeningFrequency: string;
  /** Recommended actions */
  actions: string[];
}

export const IWGDF_CATEGORIES: IWGDFFootCategory[] = [
  {
    category: 0,
    label: "No Loss of Protective Sensation (LOPS) or PAD",
    description:
      "No neuropathy, no peripheral artery disease, no deformity, no previous ulcer/amputation.",
    riskLevel: "low",
    screeningFrequency: "Annually (every 12 months)",
    actions: [
      "Annual foot examination by healthcare professional",
      "Patient education on daily foot self-inspection",
      "Proper footwear fitting guidance",
    ],
  },
  {
    category: 1,
    label: "LOPS or PAD",
    description:
      "Loss of protective sensation OR peripheral artery disease present (one of the two), but no deformity and no previous ulcer/amputation.",
    riskLevel: "moderate",
    screeningFrequency: "Every 6-12 months",
    actions: [
      "Inspect feet daily — patient or family member",
      "Properly fitted walking shoes (extra depth, wide toe box)",
      "Do not walk barefoot",
      "Consider therapeutic insoles/orthoses",
      "Professional foot care every 6-12 months",
    ],
  },
  {
    category: 2,
    label: "Two of: LOPS / PAD / Deformity",
    description:
      "Any TWO of loss of protective sensation, peripheral artery disease, or structural foot deformity.",
    riskLevel: "high",
    screeningFrequency: "Every 3-6 months",
    actions: [
      "Professional foot care every 3-6 months",
      "Therapeutic footwear with pressure-relief insoles",
      "Vascular assessment — consider referral to vascular surgeon",
      "If deformity present, consider prophylactic surgery",
      "Enhanced patient/family education",
    ],
  },
  {
    category: 3,
    label: "Previous Ulcer, Amputation, or Charcot",
    description:
      "Loss of protective sensation or PAD PLUS a history of foot ulceration, lower extremity amputation, renal replacement therapy, or Charcot foot.",
    riskLevel: "urgent",
    screeningFrequency: "Every 1-3 months",
    actions: [
      "Specialist care every 1-3 months by multidisciplinary foot team",
      "Custom-moulded footwear with pressure-relief",
      "Consider contact cast or removable cast walker if ulcer present",
      "Immediate referral if any new skin breakdown",
      "Psychosocial support for long-term management",
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
//  IWGDF / NICE Clinical Decision Rules
// ═══════════════════════════════════════════════════════════════════

export interface ClinicalRule {
  id: string;
  source: "IWGDF" | "NICE";
  /** Clinical category this rule applies to */
  category: CategoryId;
  /** Condition that triggers this rule */
  trigger: string;
  /** Clinical threshold or finding */
  threshold: string;
  /** Recommended action */
  action: string;
  /** Urgency level */
  urgency: "routine" | "soon" | "urgent" | "emergency";
  /** i18n key for this rule */
  ruleKey: string;
  /**
   * Exact clause this rule was derived from, for audit / competition Q&A.
   * Kept in the source language (guideline citations are not translated).
   */
  sourceRef: string;
}

export const CLINICAL_RULES: ClinicalRule[] = [
  // ── Neuropathy Rules ──
  {
    id: "IWGDF-N01",
    source: "IWGDF",
    category: "neuropathy",
    trigger: "Loss of protective sensation (LOPS) detected",
    threshold: "Inability to feel 10g Semmes-Weinstein monofilament at any of 5 sites",
    action: "Classify as IWGDF Category 1. Screen every 6-12 months.",
    urgency: "soon",
    ruleKey: "rules.neuropathy.lops",
    sourceRef: "IWGDF 2023 Prevention, Rec 1-2 & Table 1 (LOPS or PAD = risk 1, screen every 6-12 months)",
  },
  {
    id: "IWGDF-N02",
    source: "IWGDF",
    category: "neuropathy",
    trigger: "Burning/tingling/numbness in feet or legs",
    threshold: "Symptoms consistent with diabetic peripheral neuropathy",
    action: "Refer for nerve conduction studies if symptoms are progressive or asymmetric",
    urgency: "soon",
    ruleKey: "rules.neuropathy.symptoms",
    sourceRef: "IWGDF 2023 Prevention, Rec 1 (screen annually for signs OR SYMPTOMS of peripheral neuropathy)",
  },
  {
    id: "IWGDF-N03",
    source: "IWGDF",
    category: "neuropathy",
    trigger: "Inability to feel hot water / temperature discrimination impaired",
    threshold: "Positive for temperature discrimination loss",
    action: "Advise against hot foot soaks. Educate on water temperature testing with elbow/thermometer.",
    urgency: "routine",
    ruleKey: "rules.neuropathy.temperature",
    sourceRef: "IWGDF 2023 Prevention, Rec 4 rationale (\"people should avoid soaking their feet in a bath\")",
  },

  // ── Skin & Nail Rules ──
  {
    id: "IWGDF-S01",
    source: "IWGDF",
    category: "skin",
    trigger: "Calluses, corns, or thickened nails present",
    threshold: "Any callosity or onychomycosis",
    action: "Professional debridement by podiatrist. Do not self-treat.",
    urgency: "soon",
    ruleKey: "rules.skin.callus",
    sourceRef: "IWGDF 2023 Prevention, Rec 2 (assess for excess callus) & Rec 9 (treat excess callus)",
  },
  {
    id: "IWGDF-S02",
    source: "IWGDF",
    category: "skin",
    trigger: "Fungal infection between toes or on soles",
    threshold: "Tinea pedis (athlete's foot) visible",
    action: "Antifungal treatment. Ensure thorough drying between toes after washing.",
    urgency: "routine",
    ruleKey: "rules.skin.fungal",
    sourceRef: "IWGDF 2023 Prevention, Rec 9 (treat fungal infections on the foot) & Rec 4 (careful drying between toes)",
  },
  {
    id: "IWGDF-S03",
    source: "IWGDF",
    category: "skin",
    trigger: "Skin is dry, cracked, or fissured",
    threshold: "Xerosis with visible cracks",
    action: "Moisturize daily (avoiding between toes). Use urea-based cream for cracks.",
    urgency: "routine",
    ruleKey: "rules.skin.dry",
    sourceRef: "IWGDF 2023 Prevention, Rec 4 (use emollients to moisturize dry skin)",
  },

  // ── Wound Rules ──
  {
    id: "NICE-W01",
    source: "NICE",
    category: "wound",
    trigger: "Any open wound, blister, or ulceration on foot",
    threshold: "Active foot ulcer or wound present",
    action: "Refer to the multidisciplinary foot care service within 24 hours. Do not delay.",
    urgency: "urgent",
    ruleKey: "rules.wound.active",
    sourceRef: "NICE NG19 §1.1.1 (refer within 24 hours) & §1.4.2 (other active foot problems within 1 working day)",
  },
  {
    id: "IWGDF-W02",
    source: "IWGDF",
    category: "wound",
    trigger: "Wound present for > 2 weeks without improvement",
    threshold: "Chronic non-healing wound (> 14 days)",
    action: "Urgent referral for advanced wound care. Consider vascular assessment and imaging.",
    urgency: "urgent",
    ruleKey: "rules.wound.chronic",
    sourceRef: "IWGDF 2023 PAD, CLTI definition (PAD + rest pain, gangrene or foot ulcer of at least 2 weeks duration)",
  },
  {
    id: "IWGDF-W03",
    source: "IWGDF",
    category: "wound",
    trigger: "Previous history of foot ulceration",
    threshold: "Any prior ulcer, even if healed",
    action: "Classify as IWGDF Category 3. Increased surveillance. Custom footwear mandatory.",
    urgency: "soon",
    ruleKey: "rules.wound.history",
    sourceRef: "IWGDF 2023 Prevention, Table 1 (history of a foot ulcer = risk 3) & Rec 8c (prescribe therapeutic footwear)",
  },

  // ── Circulation Rules ──
  {
    id: "IWGDF-C01",
    source: "IWGDF",
    category: "circulation",
    trigger: "Absent or diminished pedal pulses",
    threshold: "Posterior tibial or dorsalis pedis pulse absent",
    action: "Measure Ankle-Brachial Index (ABI). If ABI < 0.9, refer for vascular assessment.",
    urgency: "soon",
    ruleKey: "rules.circulation.pulses",
    sourceRef: "IWGDF 2023 PAD, Rec 1 (palpate foot pulses) & Rec 2 (ABI/TBI; PAD less likely at ABI 0.9-1.3)",
  },
  {
    id: "IWGDF-C02",
    source: "IWGDF",
    category: "circulation",
    trigger: "Intermittent claudication or rest pain in legs/feet",
    threshold: "Symptoms of peripheral artery disease (PAD)",
    action: "Urgent vascular referral. Consider antiplatelet therapy and lipid management.",
    urgency: "urgent",
    ruleKey: "rules.circulation.claudication",
    sourceRef: "IWGDF 2023 PAD, Rec 1 (PAD history), Rec 13 (severe ischaemia -> urgent vascular consult) & Rec 24 (antiplatelet therapy)",
  },
  {
    id: "IWGDF-C03",
    source: "IWGDF",
    category: "circulation",
    trigger: "Cold feet, color changes, or hair loss on lower legs",
    threshold: "Clinical signs of poor perfusion",
    action: "Vascular assessment. Toe-brachial index if ABI is unreliable (calcified arteries in diabetes).",
    urgency: "soon",
    ruleKey: "rules.circulation.signs",
    sourceRef: "IWGDF 2023 PAD, Rec 1 (examine the foot for signs of ischaemia) & Rec 2 (medial artery calcification can falsely elevate ABI)",
  },

  // ── Self-Care Rules ──
  {
    id: "IWGDF-SC01",
    source: "IWGDF",
    category: "selfcare",
    trigger: "Patient does not inspect feet daily",
    threshold: "No daily foot inspection habit",
    action: "Educate on daily inspection using mirror for soles. Set reminder system.",
    urgency: "routine",
    ruleKey: "rules.selfcare.inspection",
    sourceRef: "IWGDF 2023 Prevention, Rec 5 (examine their feet daily)",
  },
  {
    id: "IWGDF-SC02",
    source: "IWGDF",
    category: "selfcare",
    trigger: "Improper footwear or walking barefoot",
    threshold: "No protective footwear or barefoot walking",
    action: "Prescribe proper diabetic footwear. Emphasize NEVER walking barefoot, even indoors.",
    urgency: "soon",
    ruleKey: "rules.selfcare.footwear",
    sourceRef: "IWGDF 2023 Prevention, Rec 3 (not walking barefoot, not in socks without shoes) & Rec 8a-c (footwear)",
  },
  {
    id: "IWGDF-SC03",
    source: "IWGDF",
    category: "selfcare",
    trigger: "Improper nail cutting technique",
    threshold: "Cutting nails too short, curved, or by someone with neuropathy",
    action: "Teach proper nail care: cut straight across, file edges. Refer to podiatrist if neuropathy present.",
    urgency: "routine",
    ruleKey: "rules.selfcare.nails",
    sourceRef: "IWGDF 2023 Prevention, Rec 4 (\"cut toenails straight across\")",
  },

  // ── Medical History Rules ──
  {
    id: "IWGDF-H01",
    source: "IWGDF",
    category: "history",
    trigger: "Diabetes duration > 10 years",
    threshold: "More than 10 years since diabetes diagnosis",
    action: "Increase foot screening frequency. Risk of neuropathy and PAD increases with duration.",
    urgency: "routine",
    ruleKey: "rules.history.duration",
    sourceRef: "IWGDF 2023 Prevention, Rec 2 (extend screening when LOPS or PAD is found; risk factors accumulate over time)",
  },
  {
    id: "NICE-H02",
    source: "NICE",
    category: "history",
    trigger: "Poor glycemic control (HbA1c > 8%)",
    threshold: "HbA1c ≥ 64 mmol/mol (8%) — our conservative line for a 60+ population",
    action: "Intensify glycemic management and set an individualised target. Higher risk of complications.",
    urgency: "soon",
    ruleKey: "rules.history.hba1c",
    sourceRef: "NICE NG28 §1.6 (intensify at HbA1c ≥58 mmol/mol / 7.5%) & NICE NG19 §1.3.13 (importance of blood glucose control). NOTE: the 8% cut-point is OUR calibration, not a guideline number.",
  },
  {
    id: "IWGDF-H03",
    source: "IWGDF",
    category: "history",
    trigger: "Previous lower extremity amputation",
    threshold: "Any prior toe, foot, or leg amputation",
    action: "IWGDF Category 3. Highest risk. Multidisciplinary care every 1-3 months. Contralateral limb at extremely high risk.",
    urgency: "urgent",
    ruleKey: "rules.history.amputation",
    sourceRef: "IWGDF 2023 Prevention, Table 1 (a lower-extremity amputation = risk 3, screen every 1-3 months)",
  },
];

// ═══════════════════════════════════════════════════════════════════
//  Rule Evaluation Engine
// ═══════════════════════════════════════════════════════════════════

/**
 * Map assessment result to IWGDF risk category.
 *
 * Takes only the two fields it needs, so it also works on a stored history
 * entry (`AssessmentHistoryEntry` carries `emergencyFlags` + `categoryScores`)
 * without re-running the whole assessment.
 */
export function mapToIWGDFCategory(result: {
  emergencyFlags: string[];
  categoryScores: CategoryScore[];
}): 0 | 1 | 2 | 3 {
  // ── Category 3 — LOPS/PAD PLUS a high-risk marker ──
  // A prior ulcer, a prior amputation, or a chronic (>2-week) wound places the
  // foot in IWGDF's highest-risk stratum. In a diabetic foot these markers
  // imply significant underlying LOPS/PAD, so any one of them is sufficient.
  if (
    result.emergencyFlags.includes("historyUlcer") ||
    result.emergencyFlags.includes("amputationHistory") ||
    result.emergencyFlags.includes("chronicWound")
  ) {
    return 3;
  }

  const neuropathyScore = result.categoryScores.find(
    (c) => c.category === "neuropathy"
  );
  const circulationScore = result.categoryScores.find(
    (c) => c.category === "circulation"
  );
  const skinScore = result.categoryScores.find((c) => c.category === "skin");

  // LOPS proxy, PAD proxy, and foot-deformity / skin-breakdown proxy.
  const hasLOPS = (neuropathyScore?.percentage ?? 0) >= 30;
  const hasPAD = (circulationScore?.percentage ?? 0) >= 30;
  const hasDeformity = (skinScore?.percentage ?? 0) >= 40;

  // ── Category 2 — any TWO of LOPS / PAD / deformity ──
  // (IWGDF 2023: LOPS+PAD, LOPS+deformity, or PAD+deformity.)
  const riskFactorCount = [hasLOPS, hasPAD, hasDeformity].filter(Boolean).length;
  if (riskFactorCount >= 2) {
    return 2;
  }

  // ── Category 1 — exactly ONE of LOPS or PAD ──
  // Deformity alone is NOT an IWGDF risk category, so it stays at 0.
  if (hasLOPS || hasPAD) {
    return 1;
  }

  // ── Category 0 — no LOPS, no PAD, no deformity ──
  return 0;
}

// ═══════════════════════════════════════════════════════════════════
//  Re-screening interval — how soon the next assessment is due
// ═══════════════════════════════════════════════════════════════════

/**
 * IWGDF 2023 recommended re-screening interval, in months, for each risk
 * category. The interval is driven by the RISK CATEGORY, not by age and not by
 * a flat number of days:
 *
 *   Category 0  no LOPS, no PAD                   → 12 months (annual)
 *   Category 1  LOPS or PAD                       → 6–12 months
 *   Category 2  any two of LOPS / PAD / deformity → 3–6 months
 *   Category 3  previous ulcer / amputation       → 1–3 months
 *
 * We use the more conservative (shorter) end of each range — 6, 3, and 1
 * months — so nobody is screened less often than the guideline allows.
 *
 * An ACTIVE wound or an emergency red flag is NOT a "next appointment" — the
 * deterministic triage engine (`triageEngine.ts`) sends those people to urgent
 * care today, and the home card is not the vehicle for that message.
 */
export const IWGDF_SCREENING_INTERVAL_MONTHS: Record<0 | 1 | 2 | 3, number> = {
  0: 12,
  1: 6,
  2: 3,
  3: 1,
};

/** Re-screening interval (in months) for an IWGDF risk category. */
export function screeningIntervalMonths(category: 0 | 1 | 2 | 3): number {
  return IWGDF_SCREENING_INTERVAL_MONTHS[category];
}

/**
 * The date the next assessment is due: the last assessment advanced by the
 * IWGDF interval for this person's risk category.
 */
export function nextScreeningDate(
  lastTimestamp: number,
  category: 0 | 1 | 2 | 3
): Date {
  const d = new Date(lastTimestamp);
  d.setMonth(d.getMonth() + IWGDF_SCREENING_INTERVAL_MONTHS[category]);
  return d;
}

// ═══════════════════════════════════════════════════════════════════
//  Acute re-check horizon (Dynamic Re-assessment)
// ═══════════════════════════════════════════════════════════════════
//
// Separate from the routine IWGDF screening interval above. This is the
// short-term re-check window the engine advises right after a result, driven by
// the care tier (not the IWGDF risk category).

/** Days from "now" until the next acute re-check is advised, by care tier. */
export const RECHECK_OFFSET_DAYS: Record<string, number> = {
  EMERGENCY: 0, // immediate — not a scheduled re-check
  PRIMARY_CARE: 2,
  SELF_CARE: 2,
  ABSTAIN: 14,
};

/**
 * A concrete suggested re-check date for a care tier.
 * Returns `null` for EMERGENCY (which is "today / immediately").
 */
export function recheckDateForTier(tier: string, from: number = Date.now()): Date | null {
  const days = RECHECK_OFFSET_DAYS[tier] ?? 14;
  if (days <= 0) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Get the clinical rules whose trigger condition is met by an assessment.
 *
 * Takes only the two fields it needs, so it also works on a stored history
 * entry (`AssessmentHistoryEntry` carries `emergencyFlags` + `categoryScores`)
 * without re-running the whole assessment.
 */
export function getApplicableRules(result: {
  categoryScores: CategoryScore[];
  emergencyFlags: string[];
}): ClinicalRule[] {
  const rules: ClinicalRule[] = [];

  // Neuropathy rules
  const neuropathy = result.categoryScores.find(
    (c) => c.category === "neuropathy"
  );
  if (neuropathy && neuropathy.percentage >= 30) {
    rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-N01")!);
    rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-N02")!);
    if (neuropathy.percentage >= 50) {
      rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-N03")!);
    }
  }

  // Skin rules
  const skin = result.categoryScores.find((c) => c.category === "skin");
  if (skin && skin.percentage >= 30) {
    rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-S01")!);
    if (skin.percentage >= 40) {
      rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-S02")!);
    }
    rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-S03")!);
  }

  // Wound rules — highest priority
  if (result.emergencyFlags.includes("activeWound")) {
    rules.push(CLINICAL_RULES.find((r) => r.id === "NICE-W01")!);
  }
  if (result.emergencyFlags.includes("chronicWound")) {
    rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-W02")!);
  }
  if (result.emergencyFlags.includes("historyUlcer")) {
    rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-W03")!);
  }

  // Circulation rules
  const circulation = result.categoryScores.find(
    (c) => c.category === "circulation"
  );
  if (circulation && circulation.percentage >= 30) {
    rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-C01")!);
    if (circulation.percentage >= 50) {
      rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-C02")!);
    }
    rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-C03")!);
  }

  // Self-care rules
  const selfcare = result.categoryScores.find(
    (c) => c.category === "selfcare"
  );
  if (selfcare && selfcare.percentage >= 20) {
    rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-SC01")!);
    rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-SC02")!);
    if (selfcare.percentage >= 40) {
      rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-SC03")!);
    }
  }

  // History rules
  const history = result.categoryScores.find(
    (c) => c.category === "history"
  );
  if (history && history.percentage >= 20) {
    rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-H01")!);
    if (history.percentage >= 40) {
      rules.push(CLINICAL_RULES.find((r) => r.id === "NICE-H02")!);
    }
  }
  if (result.emergencyFlags.includes("amputationHistory")) {
    rules.push(CLINICAL_RULES.find((r) => r.id === "IWGDF-H03")!);
  }

  // Sort by urgency (emergency first)
  const urgencyOrder: Record<string, number> = {
    emergency: 0,
    urgent: 1,
    soon: 2,
    routine: 3,
  };
  rules.sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  );

  return rules;
}

// ═══════════════════════════════════════════════════════════════════
//  Metadata
// ═══════════════════════════════════════════════════════════════════

export const RULES_METADATA = {
  sources: [
    "IWGDF 2023 Practical Guidelines (prevention of foot ulcers; intersocietal PAD)",
    "NICE NG19 — Diabetic foot problems: prevention and management",
    "NICE NG28 — Type 2 diabetes in adults: management",
  ],
  version: "2.0.0",
  lastUpdated: "2026-10-13",
  totalRules: CLINICAL_RULES.length,
  disclaimer:
    "This screening tool uses published clinical guidelines for educational purposes. It is NOT a diagnostic device and does not replace professional medical evaluation.",
};
