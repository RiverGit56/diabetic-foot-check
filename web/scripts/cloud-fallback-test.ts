/**
 * Cloud fallback / isolation verification.
 *
 * Verifies the OPTIONAL cloud mirror (`cloudDb.ts`) behaves correctly under the
 * agreed isolation model (public demo table, synthetic-only, never blocks):
 *
 *   A. CLOUD OFF (cloudEnabled === false, no test client)
 *        → save* returns false immediately, never throws, never touches the
 *          app's own localStorage keys. The main flow is unaffected.
 *   B. CLOUD CONFIGURED BUT CLIENT UNAVAILABLE (factory → null)
 *        → save* returns false, no throw.
 *   C. CLOUD ON, WRITE SUCCEEDS (factory → fake client, no error)
 *        → save* returns true; the payload sent to the cloud contains ONLY
 *          whitelisted columns, with strings/JSONB bounded by length limits.
 *   D. CLOUD ON, WRITE REJECTED (factory → fake client, error envelope)
 *        → save* returns false, never throws, and the record is mirrored into
 *          this module's own localStorage fallback (not the app's keys).
 *   E. CLOUD ON, WRITE THROWS (factory → fake client that throws)
 *        → save* returns false, never throws (transport failure is contained).
 *
 * The cloud SDK is lazy-imported, so this test runs without the optional
 * `@tencent-ai/workbuddy-cloud-sdk` package installed — it drives behaviour via
 * the `__setTestClientFactory` seam.
 *
 * Run: npm run test:cloud
 */
import type { WorkBuddyCloudClient } from "@tencent-ai/workbuddy-cloud-sdk";
import {
  saveAssessment,
  saveReassessment,
  listAssessments,
  listReassessments,
  __setTestClientFactory,
} from "../src/lib/cloudDb.ts";

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

// A minimal in-memory localStorage mock for mirror assertions.
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

function installStorage() {
  (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
}
function uninstallStorage() {
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
}

interface Capture {
  table?: string;
  payload?: Record<string, unknown>;
}
function makeFakeClient(opts: {
  insertResult?: { data: unknown; error: unknown };
  insertThrows?: Error;
  capture?: Capture;
}): WorkBuddyCloudClient {
  const from = (table: string) => ({
    insert: async (payload: Record<string, unknown>) => {
      if (opts.capture) {
        opts.capture.table = table;
        opts.capture.payload = payload;
      }
      if (opts.insertThrows) throw opts.insertThrows;
      return opts.insertResult ?? { data: {}, error: null };
    },
    select: () => ({
      order: () => ({
        limit: async () => ({ data: [], error: null }),
      }),
    }),
  });
  return { database: { from } } as unknown as WorkBuddyCloudClient;
}

const APP_SENTINEL_KEY = "footcheck-app-history";
const MIRROR_A = "footcheck-cloud-mirror-assessments";
const MIRROR_R = "footcheck-cloud-mirror-reassessments";

function sampleAssessment() {
  return {
    synthetic_case_id: "DEMO-0001",
    selected_symptoms: { rf1: "rf1a", w1: "w1c" },
    triggered_rule_id: "PC-02",
    care_tier: "SELF_CARE",
  };
}
function sampleReassessment() {
  return {
    followup_checkin_updates: { rf1: "rf1b" },
    delta_changes: { care_tier: ["SELF_CARE", "PRIMARY_CARE"] },
    escalation_outcome: "ESCALATED",
  };
}

// ── A. CLOUD OFF (default: cloudEnabled === false, no factory) ──────────────
console.log("════════ A. CLOUD OFF — main flow must be unaffected ════════");
__setTestClientFactory(null);

// Seed a sentinel in the APP's own localStorage to prove cloudDb never touches it.
installStorage();
const ls = (globalThis as unknown as { localStorage: MemStorage }).localStorage;
ls.setItem(APP_SENTINEL_KEY, "APP-OWNED-DATA");

let threw = false;
let result = false;
try {
  result = await saveAssessment(sampleAssessment());
} catch (e) {
  threw = true;
  console.log("  unexpected throw:", e);
}
check("cloud off: saveAssessment returns false (no-op)", result === false, `got ${result}`);
check("cloud off: never throws", !threw);
const appDataUntouched = ls.getItem(APP_SENTINEL_KEY) === "APP-OWNED-DATA";
check("cloud off: app's own localStorage untouched", appDataUntouched);
check("cloud off: listAssessments returns null", (await listAssessments()) === null);

// ── B. CLOUD CONFIGURED BUT CLIENT UNAVAILABLE (factory → null) ─────────────
console.log("\n════════ B. CLOUD CONFIGURED BUT CLIENT UNAVAILABLE ════════");
__setTestClientFactory(() => null);
threw = false;
try {
  result = await saveAssessment(sampleAssessment());
} catch (e) {
  threw = true;
}
check("client null: saveAssessment returns false", result === false);
check("client null: never throws", !threw);

// ── C. CLOUD ON, WRITE SUCCEEDS + whitelist/length enforcement ─────────────
console.log("\n════════ C. CLOUD ON, WRITE SUCCEEDS (whitelist + length limits) ════════");
const capture: Capture = {};
__setTestClientFactory(() =>
  makeFakeClient({ insertResult: { data: {}, error: null }, capture })
);
// A rogue TOP-LEVEL column must be dropped by the whitelist; overlong fields
// must be truncated. The arbitrary keys INSIDE selected_symptoms are legitimate
// question-IDs (free-form JSONB), so they are kept (only their values bounded).
const input = {
  synthetic_case_id: "x".repeat(200), // overlong → must be truncated to 64
  selected_symptoms: {
    ok_key: "y".repeat(200), // value truncated to 32
    another: "z".repeat(200),
  },
  triggered_rule_id: "PC-99",
  care_tier: "SELF_CARE",
  evil_column: "MUST-BE-DROPPED", // not a whitelisted column → dropped
} as unknown as Parameters<typeof saveAssessment>[0];
result = await saveAssessment(input);
check("cloud on: saveAssessment returns true", result === true);
check("cloud on: wrote to 'assessments' table", capture.table === "assessments");
const sent = capture.payload as Record<string, unknown> | undefined;
const onlyWhitelisted =
  sent !== undefined &&
  Object.keys(sent).every((k) =>
    ["synthetic_case_id", "selected_symptoms", "triggered_rule_id", "care_tier"].includes(k)
  );
check("whitelist: only synthetic columns sent", onlyWhitelisted, sent ? Object.keys(sent).join(",") : "none");
const topLevelDropped = sent !== undefined && !("evil_column" in sent);
check("whitelist: non-whitelisted top-level column dropped", topLevelDropped, sent ? Object.keys(sent).join(",") : "none");
const idOk = sent?.synthetic_case_id === "x".repeat(64);
check("length: synthetic_case_id truncated to 64", idOk, String(sent?.synthetic_case_id));
const symptoms = sent?.selected_symptoms as Record<string, string> | undefined;
const symptomValueOk = symptoms?.ok_key === "y".repeat(32);
check("length: symptom value truncated to 32", symptomValueOk);

// ── D. CLOUD ON, WRITE REJECTED → returns false + mirrors locally ───────────
console.log("\n════════ D. CLOUD ON, WRITE REJECTED (error envelope) ════════");
installStorage();
(globalThis as unknown as { localStorage: MemStorage }).localStorage.removeItem(MIRROR_A);
__setTestClientFactory(() =>
  makeFakeClient({ insertResult: { data: null, error: { code: "42501", message: "denied" } } })
);
threw = false;
try {
  result = await saveReassessment(sampleReassessment());
} catch (e) {
  threw = true;
}
check("rejected: saveReassessment returns false", result === false);
check("rejected: never throws", !threw);
const mirrored = (globalThis as unknown as { localStorage: MemStorage }).localStorage.getItem(MIRROR_R);
let mirroredOk = false;
try {
  const arr = mirrored ? JSON.parse(mirrored) : [];
  mirroredOk = Array.isArray(arr) && arr.length === 1 && arr[0].escalation_outcome === "ESCALATED";
} catch {
  /* ignore */
}
check("rejected: record mirrored to local fallback", mirroredOk, String(mirrored));
uninstallStorage();

// ── E. CLOUD ON, WRITE THROWS (transport failure contained) ─────────────────
console.log("\n════════ E. CLOUD ON, WRITE THROWS (transport failure) ════════");
__setTestClientFactory(() =>
  makeFakeClient({ insertThrows: new Error("network down") })
);
threw = false;
try {
  result = await saveAssessment(sampleAssessment());
} catch (e) {
  threw = true;
}
check("throws: saveAssessment returns false (contained)", result === false);
check("throws: never propagates the error", !threw);

// ── listAssessments on cloud-on returns [] (no error) ───────────────────────
console.log("\n════════ F. CLOUD ON, READ ════════");
__setTestClientFactory(() => makeFakeClient({}));
const listed = await listAssessments();
check("cloud on: listAssessments returns [] (not null)", Array.isArray(listed) && listed.length === 0);
const listedR = await listReassessments();
check("cloud on: listReassessments returns [] (not null)", Array.isArray(listedR) && listedR.length === 0);

// Clean up seam.
__setTestClientFactory(null);

console.log(`\n════════ RESULT: ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
