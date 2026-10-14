/**
 * First-run (welcome screen) storage logic.
 *
 * Run: npm run test:firstrun
 */
// ── Minimal localStorage / sessionStorage stub (no browser needed) ──
const store = new Map<string, string>();
const storageStub = {
  getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
(globalThis as unknown as Record<string, unknown>).window = { localStorage: storageStub, sessionStorage: storageStub };
(globalThis as unknown as Record<string, unknown>).localStorage = storageStub;
(globalThis as unknown as Record<string, unknown>).sessionStorage = storageStub;

const {
  hasCompletedFirstRun,
  markFirstRunComplete,
  clearStoredData,
  saveProfile,
  getProfile,
  saveAssessmentResult,
  getAssessmentHistory,
} = await import("../src/lib/assessment.ts");

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (ok) { pass++; console.log(`PASS  ${label}`); }
  else { fail++; console.log(`FAIL  ${label}${detail ? "  — " + detail : ""}`); }
};

const PROFILE = { ageRange: "60-69", gender: "male", diabetesType: "type2" } as never;

// ── Fresh install ──
store.clear();
check("fresh install: hasCompletedFirstRun() === false", hasCompletedFirstRun() === false);

// ── After passing the welcome screen ──
markFirstRunComplete();
check("after markFirstRunComplete(): === true", hasCompletedFirstRun() === true);
check("flag persisted under footcheck-onboarded", store.get("footcheck-onboarded") === "1");

// ── Idempotent ──
markFirstRunComplete();
check("markFirstRunComplete() is idempotent", hasCompletedFirstRun() === true);

// ── clearStoredData() (used by ?reset=1) resets first-run too ──
saveProfile(PROFILE);
saveAssessmentResult({
  totalScore: 1, maxScore: 64, riskLevel: "low", categoryScores: [],
  emergencyFlags: [], recommendationKeys: [], answers: {}, timestamp: Date.now(),
});
store.set("footcheck-profile-gate", "1");
store.set("footcheck-assess-autostart", "1");
store.set("footcheck-lang", "zh-CN"); // must survive

check("precondition: profile + history present", getProfile() !== null && getAssessmentHistory().length === 1);

clearStoredData();

check("clearStoredData(): profile cleared", getProfile() === null);
check("clearStoredData(): history cleared", getAssessmentHistory().length === 0);
check("clearStoredData(): first-run flag cleared", hasCompletedFirstRun() === false);
check("clearStoredData(): profile-gate flag cleared", store.get("footcheck-profile-gate") === undefined);
check("clearStoredData(): autostart flag cleared", store.get("footcheck-assess-autostart") === undefined);
check("clearStoredData(): language preference KEPT", store.get("footcheck-lang") === "zh-CN");

console.log(`\n════════ RESULT: ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
