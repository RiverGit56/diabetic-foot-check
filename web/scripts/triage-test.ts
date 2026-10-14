/**
 * triageEngine tests — tier coverage, determinism, and the LLM guardrail.
 *
 * Run from the `web/` directory:
 *   node --experimental-strip-types scripts/triage-test.ts
 *   (or) npm run test:triage
 *
 * The triage engine is deterministic: no randomness, no clock, no I/O.
 * These tests assert that property and cover all four care tiers.
 */
import {
  evaluateTriage,
  deriveTriageInput,
  buildExplanationContract,
  isTierUnchanged,
  TRIAGE_METADATA,
  TRIAGE_RULES,
  TRIAGE_SOURCES,
  countUnsureRedFlags,
  countConfirmedRedFlags,
  UNKNOWN_ABSTAIN_THRESHOLD,
  SIRS_CRITERIA,
  type CareTier,
  type TriageInput,
} from "../src/lib/triageEngine.ts";

const ALL_RF_NO: Record<string, string> = {
  rf1: "rf1a",
  rf2: "rf2a",
  rf3: "rf3a",
  rf4: "rf4a",
  rf5: "rf5a",
};

interface Scenario {
  name: string;
  expect: CareTier;
  answers: Record<string, string>;
  /** Optional profile — supplies prior amputation / HbA1c for vulnerability. */
  profile?: import("../src/lib/assessment.ts").UserProfile;
}

const scenarios: Scenario[] = [
  // ── Tier 1 · EMERGENCY — ANY single severe sign (no count rule) ──
  { name: "EMERGENCY — fever > 38°C (single sign)", expect: "EMERGENCY", answers: { ...ALL_RF_NO, rf1: "rf1b" } },
  { name: "EMERGENCY — gangrenous tissue (single sign)", expect: "EMERGENCY", answers: { ...ALL_RF_NO, rf3: "rf3b" } },
  { name: "EMERGENCY — rapidly spreading redness", expect: "EMERGENCY", answers: { ...ALL_RF_NO, rf2: "rf2b", w1: "w1b" } },
  { name: "EMERGENCY — foul-smelling pus", expect: "EMERGENCY", answers: { ...ALL_RF_NO, rf4: "rf4b" } },
  { name: "EMERGENCY — altered mental state", expect: "EMERGENCY", answers: { ...ALL_RF_NO, rf5: "rf5b" } },
  {
    name: "EMERGENCY — 3 signs confirmed (still via single-sign rules)",
    expect: "EMERGENCY",
    answers: { rf1: "rf1b", rf2: "rf2b", rf3: "rf3b", rf4: "rf4a", rf5: "rf5a" },
  },
  {
    name: "EMERGENCY — 1 confirmed sign among 4 unanswered",
    expect: "EMERGENCY",
    answers: { rf1: "rf1b" },
  },

  // ── Tier 2 · PRIMARY_CARE ──
  { name: "PRIMARY — open wound (shallow ulcer)", expect: "PRIMARY_CARE", answers: { ...ALL_RF_NO, w1: "w1c", w2: "w2a" } },
  { name: "PRIMARY — new blister", expect: "PRIMARY_CARE", answers: { ...ALL_RF_NO, sk1: "sk1blister" } },
  { name: "PRIMARY — broken skin / fissures", expect: "PRIMARY_CARE", answers: { ...ALL_RF_NO, sk1: "sk1crack" } },
  {
    name: "PRIMARY — escalated: redness in high-risk foot",
    expect: "PRIMARY_CARE",
    answers: { ...ALL_RF_NO, sk1: "sk1red" },
    profile: { priorAmputation: true },
  },
  {
    name: "PRIMARY — 3 unanswered but clear wound present",
    expect: "PRIMARY_CARE",
    answers: { rf4: "rf4a", rf5: "rf5a", w1: "w1c", w2: "w2a" },
  },

  // ── Tier 3 · SELF_CARE — all red flags answered "no" (SIRS excludable) ──
  { name: "SELF — mild redness, low risk", expect: "SELF_CARE", answers: { ...ALL_RF_NO, sk1: "sk1red", s1: "s1c" } },
  { name: "SELF — routine, no acute finding", expect: "SELF_CARE", answers: { ...ALL_RF_NO } },

  // ── Tier 4 · ABSTAIN — ≥2 unanswered red flags (cannot exclude SIRS) ──
  {
    name: "ABSTAIN — 2 unanswered (= SIRS minimum criteria)",
    expect: "ABSTAIN",
    answers: { rf3: "rf3a", rf4: "rf4a", rf5: "rf5a" },
  },
  {
    name: "ABSTAIN — 3 unanswered",
    expect: "ABSTAIN",
    answers: { rf4: "rf4a", rf5: "rf5a" },
  },
  {
    name: "ABSTAIN — all 5 unanswered",
    expect: "ABSTAIN",
    answers: {},
  },
  { name: "ABSTAIN — red flags unanswered", expect: "ABSTAIN", answers: {} },
  {
    name: "ABSTAIN — contradiction (no colour change vs redness)",
    expect: "ABSTAIN",
    answers: { ...ALL_RF_NO, s1: "s1a", sk1: "sk1red" },
  },
  {
    name: "ABSTAIN — contradiction (normal sensation vs cannot feel)",
    expect: "ABSTAIN",
    answers: { ...ALL_RF_NO, n1: "n1a", n3: "n3b" },
  },
];

let pass = 0;
let fail = 0;

console.log("════════ TIER COVERAGE ════════");
for (const sc of scenarios) {
  const d = evaluateTriage(deriveTriageInput(sc.answers, sc.profile));
  const ok = d.tier === sc.expect;
  ok ? pass++ : fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${sc.name.padEnd(52)} → ${d.tier.padEnd(13)} [${d.ruleId}, ${d.confidence}]`
  );
}

console.log("\n════════ DETERMINISM (1000× per scenario) ════════");
let detOk = true;
for (const sc of scenarios) {
  const input: TriageInput = deriveTriageInput(sc.answers, sc.profile);
  const first = JSON.stringify(evaluateTriage(input));
  for (let i = 0; i < 1000; i++) {
    if (JSON.stringify(evaluateTriage(deriveTriageInput(sc.answers, sc.profile))) !== first) {
      console.log(`FAIL  non-deterministic: ${sc.name}`);
      detOk = false;
      break;
    }
  }
}
console.log(detOk ? "PASS  every scenario is deterministic across 1000 runs" : "FAIL  determinism violated");

console.log("\n════════ LLM GUARDRAIL (tier locked) ════════");
const emergency = evaluateTriage(deriveTriageInput({ ...ALL_RF_NO, rf1: "rf1b" }));
const contract = buildExplanationContract(emergency);
const guardChecks = [
  ["lockedTier === EMERGENCY", contract.lockedTier === "EMERGENCY"],
  ["forbids changing the tier", contract.forbiddenActions.includes("Changing the care tier")],
  ["isTierUnchanged(EMERGENCY, EMERGENCY) === true", isTierUnchanged("EMERGENCY", "EMERGENCY") === true],
  ["isTierUnchanged(EMERGENCY, SELF_CARE) === false", isTierUnchanged("EMERGENCY", "SELF_CARE") === false],
  ["decision.locked === true", emergency.locked === true],
];
for (const [label, ok] of guardChecks) {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
}

console.log("\n════════ METADATA ════════");
console.log("rules:", TRIAGE_METADATA.totalRules, "| tiers:", TRIAGE_METADATA.tiers.join(", "));
console.log("deterministic:", TRIAGE_METADATA.deterministic, "| llmRole:", TRIAGE_METADATA.llmRole);
console.log("abstainThreshold:", TRIAGE_METADATA.abstainThreshold, "| SIRS requiredCriteria:", SIRS_CRITERIA.requiredCriteria);

console.log("\n════════ THRESHOLD HELPERS (medical-database grounded) ════════");
const helperChecks: [string, boolean][] = [
  ["abstain threshold == SIRS required criteria", UNKNOWN_ABSTAIN_THRESHOLD === SIRS_CRITERIA.requiredCriteria],
  ["UNKNOWN_ABSTAIN_THRESHOLD === 2", UNKNOWN_ABSTAIN_THRESHOLD === 2],
  ["SIRS requires >= 2 criteria", SIRS_CRITERIA.requiredCriteria === 2],
  ["SIRS temperature high = 38°C", SIRS_CRITERIA.temperatureHighCelsius === 38],
  ["SIRS heart rate = 90 bpm", SIRS_CRITERIA.heartRateBpm === 90],
  ["SIRS respiratory rate = 20/min", SIRS_CRITERIA.respiratoryRate === 20],
  ["SIRS WBC high = 12", SIRS_CRITERIA.wbcHigh === 12],
  ["countUnsureRedFlags(all-yes) === 0", countUnsureRedFlags(deriveTriageInput({ rf1: "rf1b", rf2: "rf2b", rf3: "rf3b", rf4: "rf4b", rf5: "rf5b" })) === 0],
  ["countUnsureRedFlags(all-unanswered) === 5", countUnsureRedFlags(deriveTriageInput({})) === 5],
  ["countUnsureRedFlags(2-unanswered) === 2", countUnsureRedFlags(deriveTriageInput({ rf3: "rf3a", rf4: "rf4a", rf5: "rf5a" })) === 2],
  ["countConfirmedRedFlags(all-yes) === 5", countConfirmedRedFlags(deriveTriageInput({ rf1: "rf1b", rf2: "rf2b", rf3: "rf3b", rf4: "rf4b", rf5: "rf5b" })) === 5],
  ["countConfirmedRedFlags(2-yes) === 2", countConfirmedRedFlags(deriveTriageInput({ rf1: "rf1b", rf2: "rf2b", rf3: "rf3a", rf4: "rf4a", rf5: "rf5a" })) === 2],
  ["countConfirmedRedFlags(all-no) === 0", countConfirmedRedFlags(deriveTriageInput({ ...ALL_RF_NO })) === 0],
];
for (const [label, ok] of helperChecks) {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
}

console.log("\n════════ RE-ATTRIBUTION GUARD (no unverifiable ACE/ADA source) ════════");
// The red flags were re-attributed away from a "Singapore ACE 2024" document
// that could not be verified against any published ACE guidance, and away from
// the ADA (whose site blocks automated access, so the citation could not be
// checked). Every rule must now cite a freely-downloadable, quoted source.
const ALLOWED_SOURCES = [
  "IWGDF 2023",
  "NICE NG19",
  "IWGDF/IDSA 2023",
  "SIRS 1992",
  "Sepsis-3",
  "Safety",
];
const badSources = TRIAGE_RULES.filter((r) => !ALLOWED_SOURCES.includes(r.source));
const sourceChecks: [string, boolean, string?][] = [
  [
    "every rule cites an allowed, verifiable source",
    badSources.length === 0,
    badSources.map((r) => `${r.id}=${r.source}`).join(", "),
  ],
  [
    "no rule is credited to ACE 2024",
    TRIAGE_RULES.every((r) => !/ACE/.test(r.source)),
  ],
  [
    "no rule is credited to MIMIC-III (a database, not a guideline)",
    TRIAGE_RULES.every((r) => !/MIMIC/.test(r.source)),
  ],
  [
    "TRIAGE_SOURCES no longer lists Singapore ACE 2024",
    !TRIAGE_SOURCES.some((s) => /ACE/.test(s)),
  ],
  [
    "TRIAGE_SOURCES lists NICE NG19",
    TRIAGE_SOURCES.some((s) => /NICE NG19/.test(s)),
  ],
  [
    "RF-03 (gangrene) is sourced to NICE NG19 §1.4.1",
    TRIAGE_RULES.find((r) => r.id === "RF-03")?.source === "NICE NG19",
  ],
  [
    "RF-02 (spreading redness) is sourced to IWGDF/IDSA 2023",
    TRIAGE_RULES.find((r) => r.id === "RF-02")?.source === "IWGDF/IDSA 2023",
  ],
];
for (const [label, ok, detail] of sourceChecks) {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail ? "  — " + detail : ""}`);
}

console.log(`\n════════ RESULT: ${pass} passed, ${fail} failed ════════`);
if (fail > 0 || !detOk) process.exit(1);
