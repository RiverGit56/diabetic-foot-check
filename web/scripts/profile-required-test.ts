// Ad-hoc check: the "none" comorbidity sentinel must score as zero.
import {
  calculateRiskWithProfile,
  countComorbidities,
  isProfileComplete,
  getMissingProfileFields,
  COMORBIDITY_NONE,
  REQUIRED_PROFILE_FIELDS,
  type UserProfile,
} from "../src/lib/assessment.ts";

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (ok) { pass++; console.log(`PASS  ${label}`); }
  else { fail++; console.log(`FAIL  ${label}${detail ? "  — " + detail : ""}`); }
};

// ── countComorbidities ──
check("countComorbidities(['none']) === 0", countComorbidities({ comorbidities: [COMORBIDITY_NONE] }) === 0);
check("countComorbidities([]) === 0", countComorbidities({ comorbidities: [] }) === 0);
check("countComorbidities(undefined) === 0", countComorbidities({}) === 0);
check("countComorbidities(['hypertension','none']) === 1", countComorbidities({ comorbidities: ["hypertension", COMORBIDITY_NONE] }) === 1);
check("countComorbidities(['hypertension','kidney']) === 2", countComorbidities({ comorbidities: ["hypertension", "kidney"] }) === 2);

// ── isProfileComplete / REQUIRED_PROFILE_FIELDS ──
check("REQUIRED_PROFILE_FIELDS covers all 12 fields", REQUIRED_PROFILE_FIELDS.length === 12, String(REQUIRED_PROFILE_FIELDS.length));
check("empty profile is incomplete", !isProfileComplete({}));
check("null profile is incomplete", !isProfileComplete(null));

const full: UserProfile = {
  ageRange: "60-69",
  gender: "male",
  diabetesType: "type2",
  diabetesDuration: "under5",
  insulinUse: false,          // false must count as ANSWERED
  lastHbA1c: "under7",
  comorbidities: [COMORBIDITY_NONE],
  smoking: "never",
  footInspection: "daily",
  barefootFrequency: "never",
  footwearType: "closed",
  priorAmputation: false,     // false must count as ANSWERED
};
check("full profile (with false booleans) is complete", isProfileComplete(full), JSON.stringify(getMissingProfileFields(full)));
check("comorbidities ['none'] satisfies the requirement", getMissingProfileFields(full).length === 0);
check("empty comorbidities [] is still incomplete", !isProfileComplete({ ...full, comorbidities: [] }));
check("missing insulinUse is incomplete", !isProfileComplete({ ...full, insulinUse: undefined }));

// ── scoring: "none" must not add comorbidity weight ──
const answers = { rf1: "rf1a", rf2: "rf2a", rf3: "rf3a", rf4: "rf4a", rf5: "rf5a" };
const withNone = calculateRiskWithProfile(answers, { ...full, comorbidities: [COMORBIDITY_NONE] });
const withEmpty = calculateRiskWithProfile(answers, { ...full, comorbidities: [] });
const withOne = calculateRiskWithProfile(answers, { ...full, comorbidities: ["hypertension"] });

const hist = (r: typeof withNone) => r.categoryScores.find((c) => c.category === "history")?.score;
check('history score with ["none"] === with []', hist(withNone) === hist(withEmpty), `${hist(withNone)} vs ${hist(withEmpty)}`);
check("history score with a real comorbidity is higher", (hist(withOne) ?? 0) > (hist(withNone) ?? 0), `${hist(withOne)} vs ${hist(withNone)}`);

console.log(`\n════════ RESULT: ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
