/**
 * Assessment bank + session-selector tests.
 *
 * Covers the three "optimisation" requirements:
 *  1. The bank is large (~40 questions) with profile-personalised candidates.
 *  2. Each session asks only a short, varied subset (~10) — never the whole bank.
 *  3. Adaptive follow-ups are driven by the PREVIOUS answer.
 *
 * Run: npm run test:assess
 */
import {
  QUESTION_BANK,
  CORE_QUESTIONS,
  CATEGORIES,
  SESSION_ROTATING_COUNT,
  getVisibleQuestions,
  selectSessionQuestions,
  dailySessionSeed,
  sessionSeed,
  calculateRisk,
  calculateRiskWithProfile,
  type Question,
  type UserProfile,
} from "../src/lib/assessment.ts";

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

const idOf = (q: Question) => q.id;
const personalized = (qs: Question[]) => qs.filter((q) => !q.core && !q.showIf);
const upFront = (qs: Question[]) => qs.filter((q) => !q.showIf).length;

// ─────────────────────────────────────────────────────────────────────────
console.log("════════ 1 · BANK SHAPE ════════");

check(`bank has ≥ 40 questions (got ${QUESTION_BANK.length})`, QUESTION_BANK.length >= 40);
check(`bank has exactly 7 core safety questions (got ${CORE_QUESTIONS.length})`, CORE_QUESTIONS.length === 7);
check(
  `core = rf1-rf5 + w1 + sk1`,
  ["rf1", "rf2", "rf3", "rf4", "rf5", "w1", "sk1"].every((id) =>
    CORE_QUESTIONS.some((q) => q.id === id)
  )
);

const ids = QUESTION_BANK.map(idOf);
check("question ids are unique", new Set(ids).size === ids.length);
const optIds = QUESTION_BANK.flatMap((q) => q.options.map((o) => o.id));
check("option ids are unique", new Set(optIds).size === optIds.length);
check(
  "every question has ≥ 2 options",
  QUESTION_BANK.every((q) => q.options.length >= 2),
  QUESTION_BANK.filter((q) => q.options.length < 2).map(idOf).join(",")
);
check(
  "every option has a numeric weight and a textKey",
  QUESTION_BANK.every((q) =>
    q.options.every((o) => typeof o.weight === "number" && !!o.textKey)
  )
);
check(
  "every question-backed category is represented",
  CATEGORIES.filter((c) => !c.profileOnly).every((c) =>
    QUESTION_BANK.some((q) => q.category === c.id)
  )
);
check(
  "profile-only categories hold no bank questions",
  CATEGORIES.filter((c) => c.profileOnly).every(
    (c) => !QUESTION_BANK.some((q) => q.category === c.id)
  )
);
check(
  "the bank holds no foot-care-habit (selfcare) items",
  !QUESTION_BANK.some((q) => q.category === "selfcare")
);

// ─────────────────────────────────────────────────────────────────────────
console.log("\n════════ 2 · ADAPTIVE FOLLOW-UPS (driven by the previous answer) ════════");

const followUps = QUESTION_BANK.filter((q) => !!q.showIf);
check(`bank has adaptive follow-ups (got ${followUps.length})`, followUps.length >= 4);

// The wound follow-ups only appear once an open wound (w1c) is reported.
const beforeWound = getVisibleQuestions({}, QUESTION_BANK).map(idOf);
const afterWound = getVisibleQuestions({ w1: "w1c" }, QUESTION_BANK).map(idOf);
check(
  "w2/w4/w5 are hidden until an open wound is reported",
  !["w2", "w4", "w5"].some((id) => beforeWound.includes(id)) &&
    ["w2", "w4", "w5"].every((id) => afterWound.includes(id))
);
check(
  "w2/w4/w5 stay hidden when there is no wound",
  !["w2", "w4", "w5"].some((id) => getVisibleQuestions({ w1: "w1a" }, QUESTION_BANK).map(idOf).includes(id))
);

// Charcot follow-up fires from numbness (n5) or reduced sensation (n1).
check(
  "n7 fires after numbness (n5c)",
  getVisibleQuestions({ n5: "n5c" }, QUESTION_BANK).some((q) => q.id === "n7")
);
check(
  "n7 fires after reduced sensation (n1b)",
  getVisibleQuestions({ n1: "n1b" }, QUESTION_BANK).some((q) => q.id === "n7")
);
check(
  "n7 stays hidden when sensation is normal",
  !getVisibleQuestions({ n1: "n1a", n5: "n5a" }, QUESTION_BANK).some((q) => q.id === "n7")
);

// Rest-pain follow-up fires from claudication.
check(
  "c4 fires after leg pain on walking (c3b/c3c)",
  getVisibleQuestions({ c3: "c3c" }, QUESTION_BANK).some((q) => q.id === "c4") &&
    getVisibleQuestions({ c3: "c3b" }, QUESTION_BANK).some((q) => q.id === "c4")
);
check(
  "c4 stays hidden with no claudication",
  !getVisibleQuestions({ c3: "c3a" }, QUESTION_BANK).some((q) => q.id === "c4")
);

// ─────────────────────────────────────────────────────────────────────────
console.log("\n════════ 3 · SESSION SELECTOR (short + personalised) ════════");

const PROFILE_A: UserProfile = {
  ageRange: "80-89",
  diabetesDuration: "over10",
  lastHbA1c: "over8",
  smoking: "current",
  comorbidities: ["heart", "kidney"],
  footwearType: "flipflops",
  barefootFrequency: "often",
  footInspection: "rarely",
  priorAmputation: false,
};
const PROFILE_B: UserProfile = {
  ageRange: "60-69",
  diabetesDuration: "under5",
  lastHbA1c: "under7",
  smoking: "never",
  comorbidities: [],
  footwearType: "closed",
  barefootFrequency: "never",
  footInspection: "daily",
  priorAmputation: false,
};

const sess = selectSessionQuestions(PROFILE_A, { seed: 1 });
check(
  "core safety questions always present",
  CORE_QUESTIONS.every((c) => sess.some((q) => q.id === c.id))
);
check(
  `session is short — ${upFront(sess)} up-front, not the whole bank`,
  upFront(sess) >= 10 && upFront(sess) <= 12 && upFront(sess) < QUESTION_BANK.length
);
check(
  `personalised count == SESSION_ROTATING_COUNT (${SESSION_ROTATING_COUNT})`,
  personalized(sess).length === SESSION_ROTATING_COUNT,
  `got ${personalized(sess).length}`
);

// Determinism for a fixed seed.
check(
  "deterministic for a given (profile, seed)",
  JSON.stringify(selectSessionQuestions(PROFILE_A, { seed: 7 }).map(idOf)) ===
    JSON.stringify(selectSessionQuestions(PROFILE_A, { seed: 7 }).map(idOf))
);

// Variety across seeds.
const setsAcrossSeeds = new Set(
  [1, 2, 3, 4, 5, 6].map((s) =>
    personalized(selectSessionQuestions(PROFILE_A, { seed: s })).map(idOf).join(",")
  )
);
check(
  `different seeds give different personalised sets (got ${setsAcrossSeeds.size}/6 distinct)`,
  setsAcrossSeeds.size >= 4
);

// Personalisation actually depends on the profile.
const setA = personalized(selectSessionQuestions(PROFILE_A, { seed: 1 })).map(idOf).join(",");
const setB = personalized(selectSessionQuestions(PROFILE_B, { seed: 1 })).map(idOf).join(",");
check("different profiles give different personalised sets", setA !== setB, `${setA} vs ${setB}`);

// Cross-domain spread — the 4 picks should not all come from one category.
const cats = new Set(personalized(sess).map((q) => q.category));
check(
  `personalised picks span ≥ 3 clinical domains (got ${cats.size}: ${[...cats].join(",")})`,
  cats.size >= 3
);

// Profile-relevant questions are surfaced for a high-risk profile.
const relevantIds = personalized(selectSessionQuestions(PROFILE_A, { seed: 1 }))
  .filter((q) => (q.relevance ? q.relevance(PROFILE_A) : 0) > 0)
  .map(idOf);
check(
  "high-risk profile surfaces profile-relevant questions",
  relevantIds.length >= 3,
  relevantIds.join(",")
);

// A poor-control profile should see a control-related question.
const anyControl = [1, 2, 3, 4].some((s) =>
  personalized(selectSessionQuestions(PROFILE_A, { seed: s })).some((q) => q.id === "g1")
);
check("poor-control profile surfaces the control question (g1)", anyControl);

// Seeds.
check("dailySessionSeed is stable within a day", dailySessionSeed(1_000_000) === dailySessionSeed(1_500_000));
check("dailySessionSeed changes across days", dailySessionSeed(0) !== dailySessionSeed(86_400_000));
check("sessionSeed changes per attempt", sessionSeed(0) !== sessionSeed(1));
check("sessionSeed is stable for the same attempt", sessionSeed(3) === sessionSeed(3));

// ─────────────────────────────────────────────────────────────────────────
console.log("\n════════ 4 · SCORING FROM A SESSION SUBSET ════════");

const session = selectSessionQuestions(PROFILE_A, { seed: 1 });
const noFlags: Record<string, string> = { rf1: "rf1a", rf2: "rf2a", rf3: "rf3a", rf4: "rf4a", rf5: "rf5a" };
const calm = calculateRiskWithProfile({ ...noFlags, w1: "w1a", sk1: "sk1none" }, PROFILE_A, session);
check("calm answers → low risk", calm.riskLevel === "low", calm.riskLevel);

const wound = calculateRiskWithProfile(
  { ...noFlags, w1: "w1c", w2: "w2c", sk1: "sk1none" },
  PROFILE_A,
  session
);
check("a chronic open wound → high/urgent risk", wound.riskLevel === "high" || wound.riskLevel === "urgent", wound.riskLevel);
check("emergency flags captured from the session subset", wound.emergencyFlags.length > 0, wound.emergencyFlags.join(","));

// Scoring only considers the session's questions, not the whole bank.
const subsetOnly = calculateRisk({ w1: "w1c", sk1: "sk1none" }, session);
check(
  "scoring ignores answers outside the session subset",
  subsetOnly.maxScore <= session.reduce((m, q) => m + Math.max(...q.options.map((o) => o.weight)), 0) + 8 + 9,
  `maxScore ${subsetOnly.maxScore}`
);

console.log(`\n════════ RESULT: ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
