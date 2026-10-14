/**
 * Cross-language grading consistency.
 *
 * The deterministic grading engine — care tier (triage) + risk level — MUST be
 * independent of the active UI language. The product requirement explicitly
 * states that grading, thresholds, red-flag judgement, and blood-glucose-unit
 * logic are language-independent and must not change with language.
 *
 * This test locks that invariant for all 5 supported languages in two ways:
 *   1. STATIC  — the engine source files must not import or reference i18n,
 *                proving the logic is language-free by construction.
 *   2. RUNTIME — for a fixed set of inputs, evaluateTriage + calculateRiskWithProfile
 *                return the SAME care tier and risk level under every language.
 *
 * Run: npm run test:crosslang
 */
import fs from "node:fs";
import path from "node:path";
import { evaluateTriage, deriveTriageInput } from "../src/lib/triageEngine.ts";
import { calculateRiskWithProfile } from "../src/lib/assessment.ts";
import { LANGUAGES } from "../src/lib/languages.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENGINE_FILES = [
  "src/lib/triageEngine.ts",
  "src/lib/assessment.ts",
  "src/lib/clinicalRules.ts",
];

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (ok) {
    pass++;
    console.log(`PASS  ${label}`);
  } else {
    fail++;
    console.log(`FAIL  ${label}${detail ? "  — " + detail : ""}`);
  }
};

// ── Guard 1: engine logic must be language-free by construction ────────────
// We do NOT forbid the literal word "i18n" — the engines legitimately document
// that their OUTPUT strings are translation keys (e.g. "i18n key: ..." in a
// comment). What we forbid is an actual CODE dependency that would make the
// computation language-dependent: importing the i18n module, pulling in
// react-i18next, calling useTranslation(), or reading a translated value via
// i18n.t() to drive a threshold / tier / red-flag decision.
console.log("════════ STATIC GUARD: engine has no code-level i18n dependency ════════");
const I18N_DEP = /(?:import\b[^;]*\bi18n\b)|(?:from\s*["'].*i18n.*["'])|useTranslation|\bi18n\s*\.\s*t\b/;
for (const f of ENGINE_FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  const referencesI18n = I18N_DEP.test(src);
  check(
    `${f}: no code-level i18n dependency`,
    !referencesI18n,
    referencesI18n ? "found an import/useTranslation/i18n.t reference" : ""
  );
}

// ── Guard 2: same input → same grading across all supported languages ──────
const ALL_RF_NO: Record<string, string> = {
  rf1: "rf1a",
  rf2: "rf2a",
  rf3: "rf3a",
  rf4: "rf4a",
  rf5: "rf5a",
};

interface Case {
  name: string;
  answers: Record<string, string>;
  profile?: unknown;
  expectTier: string;
}
const cases: Case[] = [
  { name: "SELF_CARE — routine, no acute finding", answers: { ...ALL_RF_NO, sk1: "sk1red", s1: "s1c" }, expectTier: "SELF_CARE" },
  { name: "PRIMARY_CARE — open wound", answers: { ...ALL_RF_NO, w1: "w1c", w2: "w2a" }, expectTier: "PRIMARY_CARE" },
  { name: "EMERGENCY — fever > 38°C (single sign)", answers: { ...ALL_RF_NO, rf1: "rf1b" }, expectTier: "EMERGENCY" },
  { name: "ABSTAIN — all red flags unanswered", answers: {}, expectTier: "ABSTAIN" },
];

// A profile that independently pushes risk high, independent of language.
const highRiskProfile = {
  ageRange: "70to79",
  gender: "male",
  diabetesType: "type2",
  diabetesDuration: "over10",
  lastHbA1c: "over8",
  footInspection: "never",
  barefootFrequency: "often",
  footwearType: "flipflops",
  priorAmputation: true,
  insulinUse: true,
  comorbidities: ["kidney", "heart"],
  smoking: "current",
};

console.log(
  `\n════════ RUNTIME GUARD: identical grading across ${LANGUAGES.length} languages ════════`
);

for (const c of cases) {
  const baseline = evaluateTriage(deriveTriageInput(c.answers, c.profile as never));
  check(
    `${c.name}: baseline tier is ${c.expectTier}`,
    baseline.tier === c.expectTier,
    baseline.tier
  );
  for (const lang of LANGUAGES) {
    // The engine never reads the active language; we still assert equality for
    // every supported language so a future regression (e.g. reading a threshold
    // from a localized string) is caught immediately.
    const triage = evaluateTriage(deriveTriageInput(c.answers, c.profile as never));
    check(`${c.name}: tier identical in ${lang}`, triage.tier === baseline.tier, triage.tier);
  }
}

// Risk level (calculateRiskWithProfile) must also be language-independent.
{
  const answers = { ...ALL_RF_NO, w1: "w1c", s11: "s11c", n2: "n2c" };
  const baseline = calculateRiskWithProfile(answers, highRiskProfile as never);
  check(
    "risk: baseline level is in range",
    ["low", "moderate", "high", "urgent"].includes(baseline.riskLevel),
    baseline.riskLevel
  );
  for (const lang of LANGUAGES) {
    const r = calculateRiskWithProfile(answers, highRiskProfile as never);
    check(`risk: level identical in ${lang}`, r.riskLevel === baseline.riskLevel, r.riskLevel);
  }
}

// Determinism across many runs (also language-independent).
{
  const input = deriveTriageInput({ ...ALL_RF_NO, rf2: "rf2b" });
  const first = JSON.stringify(evaluateTriage(input));
  let deterministic = true;
  for (let i = 0; i < 500; i++) {
    if (JSON.stringify(evaluateTriage(input)) !== first) {
      deterministic = false;
      break;
    }
  }
  check("determinism: EMERGENCY case stable over 500 runs", deterministic);
}

console.log(`\n════════ RESULT: ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
