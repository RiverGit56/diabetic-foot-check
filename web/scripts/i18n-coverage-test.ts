/**
 * i18n coverage guard for the profile form.
 *
 * The profile page renders its option lists with dynamic keys, e.g.
 *   t(`profile.comorbidityOpt.${id}`)
 * If an option id has no matching key, the UI shows the RAW key
 * ("profile.comorbidityOpt.none") instead of a label. This test fails loudly
 * in that case, and also flags orphaned keys left behind by removed options.
 *
 * Run: npm run test:i18n
 */
import fs from "node:fs";
import path from "node:path";
import {
  QUESTION_BANK,
  CORE_QUESTIONS,
  selectSessionQuestions,
} from "../src/lib/assessment.ts";
import { CLINICAL_RULES } from "../src/lib/clinicalRules.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Every option list rendered on the profile page, with its valid ids. */
const EXPECTED: Record<string, string[]> = {
  genderOpt: ["male", "female", "other"],
  diabetesTypeOpt: ["type2", "type1"],
  durationOpt: ["under5", "5to10", "over10"],
  hba1cOpt: ["under7", "7to8", "over8", "unknown", "notTested", "recently"],
  comorbidityOpt: ["hypertension", "kidney", "eye", "heart", "cholesterol", "none"],
  smokingOpt: ["never", "former", "current"],
  footInspectionOpt: ["daily", "weekly", "rarely", "never"],
  barefootOpt: ["never", "sometimes", "often"],
  footwearOpt: ["closed", "sandals", "flipflops"],
};

/** Plain (non-dynamic) keys the profile page renders. */
const REQUIRED_LITERAL_KEYS = [
  "title", "subtitle", "ageRange", "ageRangeOpt", "gender", "diabetesType",
  "duration", "insulin", "hba1c", "comorbidities", "smoking",
  "footCareSection", "footCareSectionDesc", "footInspection", "barefoot",
  "footwearType", "priorAmputation", "yes", "no", "save", "saved",
  "gateBanner", "requiredHint",
];

/**
 * Locales that must be complete. Every locale is now fully translated and must
 * stay aligned with en.json (the baseline). i18next falls back to en at runtime
 * for any missing key, but we require every language to be actually translated.
 */
const LOCALES = ["en", "zh-CN", "ms", "ta", "fil"];

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (ok) { pass++; console.log(`PASS  ${label}`); }
  else { fail++; console.log(`FAIL  ${label}${detail ? "  — " + detail : ""}`); }
};

for (const locale of LOCALES) {
  const file = path.join(ROOT, "public", "locales", `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const profile = json.profile;

  if (!profile) {
    check(`${locale}: has a "profile" section`, false);
    continue;
  }

  // 1. Every option id has a key.
  for (const [map, ids] of Object.entries(EXPECTED)) {
    const obj = profile[map];
    if (!obj) {
      check(`${locale}: profile.${map} exists`, false);
      continue;
    }
    const missing = ids.filter((id) => obj[id] === undefined);
    check(
      `${locale}: profile.${map} has all ${ids.length} option labels`,
      missing.length === 0,
      missing.length ? `missing: ${missing.join(", ")}` : ""
    );

    // 2. No orphaned keys left behind by a removed option.
    const orphans = Object.keys(obj).filter((k) => !ids.includes(k));
    check(
      `${locale}: profile.${map} has no orphan keys`,
      orphans.length === 0,
      orphans.length ? `orphans: ${orphans.join(", ")}` : ""
    );
  }

  // 3. Plain keys resolve.
  const missingLiterals = REQUIRED_LITERAL_KEYS.filter((k) => profile[k] === undefined);
  check(
    `${locale}: all ${REQUIRED_LITERAL_KEYS.length} literal profile keys present`,
    missingLiterals.length === 0,
    missingLiterals.length ? `missing: ${missingLiterals.join(", ")}` : ""
  );

  // 4. No value is accidentally a raw key.
  const rawKeyValues: string[] = [];
  const walk = (node: unknown, prefix: string) => {
    if (typeof node === "string") {
      if (/^(profile|assess|common|nav)\.[a-zA-Z0-9_.]+$/.test(node)) rawKeyValues.push(`${prefix} = ${node}`);
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, prefix ? `${prefix}.${k}` : k);
    }
  };
  walk(profile, "profile");
  check(`${locale}: no value is itself a raw key`, rawKeyValues.length === 0, rawKeyValues.join("; "));
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Question-bank coverage — every question and option the engine can render
//    must resolve to a label, and no retired key may linger.
// ─────────────────────────────────────────────────────────────────────────
const BANK_QUESTION_IDS = QUESTION_BANK.map((q) => q.id);
const BANK_OPTION_IDS = QUESTION_BANK.flatMap((q) => q.options.map((o) => o.id));

check(
  `bank: ${BANK_QUESTION_IDS.length} questions (expect 40+)`,
  BANK_QUESTION_IDS.length >= 40,
  `got ${BANK_QUESTION_IDS.length}`
);
check(
  `bank: ${CORE_QUESTIONS.length} core safety questions (expect 7)`,
  CORE_QUESTIONS.length === 7,
  `got ${CORE_QUESTIONS.length}`
);

for (const locale of LOCALES) {
  const file = path.join(ROOT, "public", "locales", `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const assess = json.assess;

  if (!assess) {
    check(`${locale}: has an "assess" section`, false);
    continue;
  }

  // 2a. Every question textKey resolves.
  const missingQ = BANK_QUESTION_IDS.filter((id) => {
    const v = assess.questions?.[id];
    return typeof v !== "string" || v.trim() === "";
  });
  check(
    `${locale}: all ${BANK_QUESTION_IDS.length} bank questions have labels`,
    missingQ.length === 0,
    missingQ.length ? `missing: ${missingQ.join(", ")}` : ""
  );

  // 2b. Every option id resolves.
  const missingO = BANK_OPTION_IDS.filter((id) => {
    const v = assess.options?.[id];
    return typeof v !== "string" || v.trim() === "";
  });
  check(
    `${locale}: all ${BANK_OPTION_IDS.length} bank options have labels`,
    missingO.length === 0,
    missingO.length ? `missing: ${missingO.join(", ")}` : ""
  );

  // 2c. No orphan question/option keys (retired ids that no longer exist).
  const qIds = new Set(BANK_QUESTION_IDS);
  const oIds = new Set(BANK_OPTION_IDS);
  const orphanQ = Object.keys(assess.questions ?? {}).filter((k) => !qIds.has(k));
  const orphanO = Object.keys(assess.options ?? {}).filter((k) => !oIds.has(k));
  check(
    `${locale}: no orphan question keys`,
    orphanQ.length === 0,
    orphanQ.length ? `orphans: ${orphanQ.join(", ")}` : ""
  );
  check(
    `${locale}: no orphan option keys`,
    orphanO.length === 0,
    orphanO.length ? `orphans: ${orphanO.join(", ")}` : ""
  );

  // 2d. Every reasonKey referenced by the bank resolves.
  const reasonKeys = [
    ...new Set(QUESTION_BANK.map((q) => q.reasonKey).filter(Boolean) as string[]),
  ];
  const missingReasons = reasonKeys.filter(
    (k) => typeof assess.reason?.[k.replace("assess.reason.", "")] !== "string"
  );
  check(
    `${locale}: all ${reasonKeys.length} personalisation reason chips resolve`,
    missingReasons.length === 0,
    missingReasons.length ? `missing: ${missingReasons.join(", ")}` : ""
  );

  // 2e. The intro note exists.
  check(
    `${locale}: assess.personalisedNote present`,
    typeof assess.personalisedNote === "string" && assess.personalisedNote.trim() !== ""
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 2f. Clinical decision rules — every ruleKey the recommendations page can
//     render must resolve. A missing key would show the raw
//     "rules.neuropathy.lops" string to the patient instead of a sentence.
// ─────────────────────────────────────────────────────────────────────────
const RULE_KEYS = CLINICAL_RULES.map((r) => r.ruleKey);
const RULE_SOURCES = [...new Set(CLINICAL_RULES.map((r) => r.source))];
const RULE_IDS = CLINICAL_RULES.map((r) => r.id);

check(
  `clinical rules: ${RULE_KEYS.length} rules declared (expect 18)`,
  RULE_KEYS.length === 18,
  `got ${RULE_KEYS.length}`
);
check(
  "clinical rules: every ruleKey is unique",
  new Set(RULE_KEYS).size === RULE_KEYS.length
);

// ── Re-attribution guard ────────────────────────────────────────────────
// The rules were re-attributed away from a "Singapore ACE 2024" document that
// could not be verified, and away from the ADA (whose site blocks automated
// access, so the citation could not be checked either). Keep them out.
check(
  "clinical rules: sources are exactly IWGDF + NICE",
  RULE_SOURCES.length === 2 &&
    RULE_SOURCES.includes("IWGDF") &&
    RULE_SOURCES.includes("NICE"),
  `got ${RULE_SOURCES.join(", ")}`
);
check(
  "clinical rules: no ACE/ADA rule ids survive",
  RULE_IDS.every((id) => !/^(ACE|ADA)-/.test(id)),
  RULE_IDS.filter((id) => /^(ACE|ADA)-/.test(id)).join(", ")
);
check(
  "clinical rules: every rule cites a sourceRef clause",
  CLINICAL_RULES.every((r) => typeof r.sourceRef === "string" && r.sourceRef.trim() !== ""),
  CLINICAL_RULES.filter((r) => !r.sourceRef?.trim()).map((r) => r.id).join(", ")
);

for (const locale of LOCALES) {
  const file = path.join(ROOT, "public", "locales", `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const rules = json.rules;

  if (!rules) {
    check(`${locale}: has a "rules" section`, false);
    continue;
  }

  const resolve = (dotted: string): unknown =>
    dotted.split(".").reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      rules as unknown
    );

  const missingRules = RULE_KEYS.filter(
    (k) => typeof resolve(k.replace(/^rules\./, "")) !== "string"
  );
  check(
    `${locale}: all ${RULE_KEYS.length} clinical rule labels resolve`,
    missingRules.length === 0,
    missingRules.length ? `missing: ${missingRules.join(", ")}` : ""
  );

  const missingSources = RULE_SOURCES.filter(
    (s) => typeof rules.source?.[s] !== "string"
  );
  check(
    `${locale}: all ${RULE_SOURCES.length} rule source badges resolve`,
    missingSources.length === 0,
    missingSources.length ? `missing: ${missingSources.join(", ")}` : ""
  );

  // The recommendations page also renders these dynamically.
  const iwgdfDynamic = [0, 1, 2, 3].flatMap((c) => [
    `cat${c}`,
    `catDesc${c}`,
    `catFreq${c}`,
  ]);
  const missingIwgdf = iwgdfDynamic.filter(
    (k) => typeof json.iwgdf?.[k] !== "string"
  );
  check(
    `${locale}: all ${iwgdfDynamic.length} IWGDF category labels resolve`,
    missingIwgdf.length === 0,
    missingIwgdf.length ? `missing: ${missingIwgdf.join(", ")}` : ""
  );

  // No orphan rule labels left behind by a retired rule.
  const declared = new Set(RULE_KEYS.map((k) => k.replace(/^rules\./, "")));
  const orphanRules: string[] = [];
  for (const [group, entries] of Object.entries(rules)) {
    if (group === "source") continue;
    for (const key of Object.keys(entries as Record<string, unknown>)) {
      if (!declared.has(`${group}.${key}`)) orphanRules.push(`${group}.${key}`);
    }
  }
  check(
    `${locale}: no orphan clinical rule labels`,
    orphanRules.length === 0,
    orphanRules.length ? `orphans: ${orphanRules.join(", ")}` : ""
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Session selector — the safety screen is always present, and the
//    personalised picks actually change with the seed.
// ─────────────────────────────────────────────────────────────────────────
{
  const s1 = selectSessionQuestions(null, { seed: 1 });
  const s2 = selectSessionQuestions(null, { seed: 2 });
  const coreIds = CORE_QUESTIONS.map((q) => q.id);
  check(
    "selector: core safety questions always present",
    coreIds.every((id) => s1.some((q) => q.id === id))
  );
  const upFront1 = s1.filter((q) => !q.showIf).length;
  check(
    "selector: ~10 questions up-front (core + rotating)",
    upFront1 >= 10 && upFront1 <= 12,
    `got ${upFront1}`
  );
  const ids1 = s1.filter((q) => !q.core && !q.showIf).map((q) => q.id).join(",");
  const ids2 = s2.filter((q) => !q.core && !q.showIf).map((q) => q.id).join(",");
  check("selector: different seeds give different personalised picks", ids1 !== ids2, `${ids1} vs ${ids2}`);
  const s1b = selectSessionQuestions(null, { seed: 1 });
  check(
    "selector: deterministic for a given seed",
    JSON.stringify(s1.map((q) => q.id)) === JSON.stringify(s1b.map((q) => q.id))
  );
}

console.log(`\n════════ RESULT: ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
