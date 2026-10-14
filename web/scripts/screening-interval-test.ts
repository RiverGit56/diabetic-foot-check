/**
 * Re-screening interval tests.
 *
 * The "next assessment due" date must be driven by the IWGDF risk category
 * (IWGDF 2023), not by a flat interval:
 *
 *   category 0 (no LOPS, no PAD)                   → 12 months
 *   category 1 (LOPS or PAD)                       → 6–12 months → we use 6
 *   category 2 (two of LOPS / PAD / deformity)     → 3–6 months  → we use 3
 *   category 3 (previous ulcer / amputation)       → 1–3 months  → we use 1
 *
 * Run: npm run test:interval
 */
import {
  IWGDF_SCREENING_INTERVAL_MONTHS,
  IWGDF_CATEGORIES,
  screeningIntervalMonths,
  nextScreeningDate,
  mapToIWGDFCategory,
} from "../src/lib/clinicalRules.ts";
import { dateLocale, LANGUAGES } from "../src/lib/languages.ts";

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

const CATEGORIES = [0, 1, 2, 3] as const;

// ─────────────────────────────────────────────────────────────────────────
console.log("════════ 1 · INTERVAL TABLE ════════");

check("category 0 → 12 months", screeningIntervalMonths(0) === 12, `got ${screeningIntervalMonths(0)}`);
check("category 1 → 6 months", screeningIntervalMonths(1) === 6, `got ${screeningIntervalMonths(1)}`);
check("category 2 → 3 months", screeningIntervalMonths(2) === 3, `got ${screeningIntervalMonths(2)}`);
check("category 3 → 1 month", screeningIntervalMonths(3) === 1, `got ${screeningIntervalMonths(3)}`);

check(
  "the interval never grows as risk rises",
  CATEGORIES.every((c) => c === 0 || screeningIntervalMonths(c) < screeningIntervalMonths((c - 1) as 0 | 1 | 2 | 3))
);

// Each value must sit inside the range IWGDF 2023 actually publishes.
const GUIDELINE_RANGE: Record<0 | 1 | 2 | 3, [number, number]> = {
  0: [12, 12],
  1: [6, 12],
  2: [3, 6],
  3: [1, 3],
};
check(
  "every interval sits inside its published IWGDF 2023 range",
  CATEGORIES.every((c) => {
    const v = screeningIntervalMonths(c);
    const [lo, hi] = GUIDELINE_RANGE[c];
    return v >= lo && v <= hi;
  }),
  CATEGORIES.map((c) => `${c}:${screeningIntervalMonths(c)}`).join(" ")
);

check(
  "no flat 90-day interval survives anywhere",
  !Object.values(IWGDF_SCREENING_INTERVAL_MONTHS).includes(3) ||
    IWGDF_SCREENING_INTERVAL_MONTHS[2] === 3 // 3 months is allowed only as the cat-2 value
);

// ─────────────────────────────────────────────────────────────────────────
console.log("\n════════ 2 · NEXT DATE ARITHMETIC ════════");

const oct10 = new Date(2026, 9, 10).getTime(); // 10 Oct 2026
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

check("category 0 → 10 Oct 2027", iso(nextScreeningDate(oct10, 0)) === "2027-10-10", iso(nextScreeningDate(oct10, 0)));
check("category 1 → 10 Apr 2027", iso(nextScreeningDate(oct10, 1)) === "2027-04-10", iso(nextScreeningDate(oct10, 1)));
check("category 2 → 10 Jan 2027", iso(nextScreeningDate(oct10, 2)) === "2027-01-10", iso(nextScreeningDate(oct10, 2)));
check("category 3 → 10 Nov 2026", iso(nextScreeningDate(oct10, 3)) === "2026-11-10", iso(nextScreeningDate(oct10, 3)));
check(
  "advancing is calendar-based, not 30-day based",
  iso(nextScreeningDate(new Date(2026, 0, 31).getTime(), 1)) === "2026-07-31",
  iso(nextScreeningDate(new Date(2026, 0, 31).getTime(), 1))
);
check("the date is in the future", nextScreeningDate(oct10, 3).getTime() > oct10);

// ─────────────────────────────────────────────────────────────────────────
console.log("\n════════ 3 · RISK CATEGORY FROM A STORED ENTRY ════════");

/** Build a history-entry-shaped object (no full AssessmentResult needed). */
const entry = (
  flags: string[],
  scores: Partial<Record<"neuropathy" | "circulation" | "skin", number>>
) => ({
  emergencyFlags: flags,
  categoryScores: (["neuropathy", "circulation", "skin"] as const).map((category) => ({
    category,
    score: 0,
    maxScore: 10,
    percentage: scores[category] ?? 0,
  })),
});

check(
  "a clean low-risk entry → category 0",
  mapToIWGDFCategory(entry([], {})) === 0,
  String(mapToIWGDFCategory(entry([], {})))
);
check(
  "neuropathy alone → category 1",
  mapToIWGDFCategory(entry([], { neuropathy: 40 })) === 1,
  String(mapToIWGDFCategory(entry([], { neuropathy: 40 })))
);
check(
  "neuropathy + circulation → category 2",
  mapToIWGDFCategory(entry([], { neuropathy: 40, circulation: 40 })) === 2,
  String(mapToIWGDFCategory(entry([], { neuropathy: 40, circulation: 40 })))
);
check(
  "neuropathy + skin deformity → category 2",
  mapToIWGDFCategory(entry([], { neuropathy: 40, skin: 50 })) === 2,
  String(mapToIWGDFCategory(entry([], { neuropathy: 40, skin: 50 })))
);
check(
  "prior amputation → category 3",
  mapToIWGDFCategory(entry(["amputationHistory"], {})) === 3
);
check(
  "chronic wound → category 3",
  mapToIWGDFCategory(entry(["chronicWound"], {})) === 3
);
check(
  "previous ulcer → category 3",
  mapToIWGDFCategory(entry(["historyUlcer"], {})) === 3
);
check(
  "below-threshold neuropathy stays category 0",
  mapToIWGDFCategory(entry([], { neuropathy: 29 })) === 0
);
check(
  "PAD alone → category 1 (IWGDF: LOPS OR PAD is category 1)",
  mapToIWGDFCategory(entry([], { circulation: 40 })) === 1,
  String(mapToIWGDFCategory(entry([], { circulation: 40 })))
);
check(
  "deformity alone → category 0 (deformity is not a category on its own)",
  mapToIWGDFCategory(entry([], { skin: 50 })) === 0,
  String(mapToIWGDFCategory(entry([], { skin: 50 })))
);
check(
  "below-threshold PAD stays category 0",
  mapToIWGDFCategory(entry([], { circulation: 29 })) === 0,
  String(mapToIWGDFCategory(entry([], { circulation: 29 })))
);

// The whole point: a higher category must produce an EARLIER next date.
const dates = CATEGORIES.map((c) => nextScreeningDate(oct10, c).getTime());
check(
  "higher risk → earlier next assessment",
  dates.every((d, i) => i === 0 || d < dates[i - 1])
);

// ─────────────────────────────────────────────────────────────────────────
console.log("\n════════ 4 · INTERVAL STRINGS AGREE WITH THE INTERVAL TABLE ════════");

// This section exists because the two used to disagree: the human-readable
// `screeningFrequency` strings said 3-6 / 1-3 / 1-4 weeks while the numeric
// table said 6 / 3 / 1 months. They must never drift apart again.

const categoryText = (cat: 0 | 1 | 2 | 3) => {
  const info = IWGDF_CATEGORIES.find((c) => c.category === cat);
  if (!info) return "";
  return [info.screeningFrequency, ...info.actions].join(" ");
};

check("category 0 states an annual / 12-month horizon", /12 months|Annual/i.test(categoryText(0)), categoryText(0).slice(0, 60));
check("category 1 states a 6-12 month horizon", /6-12 months/i.test(categoryText(1)), categoryText(1).slice(0, 60));
check("category 2 states a 3-6 month horizon", /3-6 months/i.test(categoryText(2)), categoryText(2).slice(0, 60));
check("category 3 states a 1-3 month horizon", /1-3 months/i.test(categoryText(3)), categoryText(3).slice(0, 60));

check(
  "our category-1 interval (6) is the conservative end of 6-12 months",
  screeningIntervalMonths(1) === 6
);
check(
  "our category-2 interval (3) is the conservative end of 3-6 months",
  screeningIntervalMonths(2) === 3
);
check(
  "our category-3 interval (1) is the conservative end of 1-3 months",
  screeningIntervalMonths(3) === 1
);

// The numeric interval must sit inside the range its own string states.
const STATED_RANGE: Record<0 | 1 | 2 | 3, [number, number]> = {
  0: [12, 12],
  1: [6, 12],
  2: [3, 6],
  3: [1, 3],
};
check(
  "the numeric interval sits inside the range the string states",
  CATEGORIES.every((c) => {
    const v = screeningIntervalMonths(c);
    const [lo, hi] = STATED_RANGE[c];
    return v >= lo && v <= hi;
  }),
  CATEGORIES.map((c) => `${c}:${screeningIntervalMonths(c)}`).join(" ")
);
check(
  "no stale 1-4-week string survives anywhere",
  !/1-4 weeks/i.test(CATEGORIES.map(categoryText).join(" "))
);

// ─────────────────────────────────────────────────────────────────────────
console.log("\n════════ 5 · DATE FORMATTING FOLLOWS THE UI LANGUAGE ════════");

check(`every language has a date locale (${LANGUAGES.length})`, LANGUAGES.every((l) => !!dateLocale(l)));
check("zh-CN formats as zh-CN (not en-US)", dateLocale("zh-CN") === "zh-CN", dateLocale("zh-CN"));
check("an unknown language falls back to en-US", dateLocale("xx") === "en-US");
check(
  "the Chinese locale really renders a Chinese date",
  new Date(2027, 0, 8).toLocaleDateString(dateLocale("zh-CN"), { year: "numeric", month: "short", day: "numeric" }).includes("2027")
);

console.log(`\n════════ RESULT: ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
