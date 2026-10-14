/**
 * WorkBuddy Cloud Service — OPTIONAL, best-effort data mirror for the
 * Diabetic Foot Check demo.
 *
 * Design constraints (per the agreed isolation model — PUBLIC DEMO TABLE):
 *   1. NO LOGIN. There is no owner_id / auth.uid(). The DB policy (schema.sql)
 *      is permissive for anon + authenticated; the SECURITY safeguard is this
 *      module's field whitelist + length limits (we only ever write the
 *      synthetic columns, bounded).
 *   2. SYNTHETIC DATA ONLY. Never write real names, NRICs, phone numbers, or
 *      free-text that could identify a person. PDPA.
 *   3. BEST-EFFORT, NEVER BLOCKS. When the cloud is unavailable
 *      (`cloudEnabled === false`) or any request fails, every function returns
 *      false / null and the caller keeps using local storage. On a cloud write
 *      failure we additionally mirror the record into a local-storage fallback
 *      so the demo data is not lost — but this module never throws and never
 *      touches the app's own localStorage keys.
 *   4. ONE-SHOT ACTIVATION. The cloud is only "on" once `publicConfig` is
 *      filled (endpoint + publishableKey non-empty). If activation returned
 *      `cloud_service_unavailable`, publicConfig stays empty, cloudEnabled
 *      stays false, and we never touch the cloud. No retry loop here.
 *
 * The SDK is imported LAZILY (dynamic import) so this module can be loaded and
 * unit-tested without the optional `@tencent-ai/workbuddy-cloud-sdk` package
 * being installed. A test seam (`__setTestClientFactory`) lets tests inject a
 * fake client to simulate cloud-on / cloud-fails without real credentials.
 */

import type { WorkBuddyCloudClient } from "@tencent-ai/workbuddy-cloud-sdk";
import { publicConfig, cloudEnabled } from "./cloudConfig.ts";

// ── Safeguards: field whitelist + length limits ────────────────────────────
// Mirrors the synthetic-only columns in cloud/schema.sql. Anything not listed
// here is dropped before a write, so the permissive public table can never be
// polluted with personal data from a future code change.

const MAX_ID = 64; // synthetic_case_id, triggered_rule_id
const MAX_SHORT = 32; // care_tier, escalation_outcome
const MAX_JSONB_BYTES = 4096; // selected_symptoms / delta_changes / updates
const MAX_SYMPTOM_KEYS = 64;

export interface CloudAssessment {
  synthetic_case_id: string;
  selected_symptoms: Record<string, string>;
  triggered_rule_id: string | null;
  care_tier: string;
}

export interface CloudReassessment {
  followup_checkin_updates: Record<string, unknown>;
  delta_changes: Record<string, unknown> | null;
  escalation_outcome: string;
}

function byteLength(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

/** Keep only whitelisted columns, bound every string / JSONB field. */
function sanitizeAssessment(a: CloudAssessment): CloudAssessment {
  const symptoms: Record<string, string> = {};
  const entries = Object.entries(a.selected_symptoms ?? {}).slice(0, MAX_SYMPTOM_KEYS);
  for (const [k, v] of entries) {
    if (typeof v === "string") {
      symptoms[String(k).slice(0, MAX_ID)] = v.slice(0, MAX_SHORT);
    }
  }
  // Bound the JSONB column so a pathological payload can't blow up the insert.
  let selected = symptoms;
  if (byteLength(JSON.stringify(symptoms)) > MAX_JSONB_BYTES) selected = {};
  return {
    synthetic_case_id: String(a.synthetic_case_id ?? "").slice(0, MAX_ID),
    selected_symptoms: selected,
    triggered_rule_id: a.triggered_rule_id
      ? String(a.triggered_rule_id).slice(0, MAX_ID)
      : null,
    care_tier: String(a.care_tier ?? "").slice(0, MAX_SHORT),
  };
}

function sanitizeReassessment(r: CloudReassessment): CloudReassessment {
  const updates = capJsonb(r.followup_checkin_updates ?? {}, MAX_JSONB_BYTES);
  const delta = r.delta_changes ? capJsonb(r.delta_changes, MAX_JSONB_BYTES) : null;
  return {
    followup_checkin_updates: updates,
    delta_changes: delta,
    escalation_outcome: String(r.escalation_outcome ?? "").slice(0, MAX_SHORT),
  };
}

function capJsonb(obj: Record<string, unknown>, maxBytes: number): Record<string, unknown> {
  if (byteLength(JSON.stringify(obj)) <= maxBytes) return obj;
  // Drop to empty rather than send an oversized payload that would fail the
  // insert and waste a round-trip. The local mirror still keeps the full data.
  return {};
}

/** Required columns must be present, else the write is refused (return false). */
function assessmentValid(a: CloudAssessment): boolean {
  return a.synthetic_case_id.length > 0 && a.care_tier.length > 0;
}

function reassessmentValid(r: CloudReassessment): boolean {
  return r.escalation_outcome.length > 0;
}

// ── Client lifecycle ────────────────────────────────────────────────────────

let client: WorkBuddyCloudClient | null = null;
let triedInit = false;
let cloudGaveUp = false; // a real transport/init failure → stop trying this session
let testFactory: (() => WorkBuddyCloudClient | null) | null = null;

/**
 * TEST SEAM. Inject a fake client to simulate cloud-on / cloud-fails. Pass null
 * to clear. When set, getClient() returns the factory's client regardless of
 * cloudEnabled, so tests never need real credentials or the real SDK.
 */
export function __setTestClientFactory(fn: (() => WorkBuddyCloudClient | null) | null): void {
  testFactory = fn;
  client = null;
  triedInit = false;
  cloudGaveUp = false;
}

async function getClient(): Promise<WorkBuddyCloudClient | null> {
  if (testFactory) return testFactory(); // test seam overrides everything
  if (!cloudEnabled) return null; // not bound → never touch the cloud
  if (cloudGaveUp) return null; // a prior failure → don't keep hammering
  if (!triedInit) {
    triedInit = true;
    try {
      // Lazy import: avoids a hard dependency at module load / in tests.
      // webpackIgnore keeps this OUT of the static client bundle — the SDK is
      // only ever reached when cloudEnabled is true (it isn't in this build),
      // so excluding it is safe and avoids bundling a server-oriented package.
      const mod = await import(/* webpackIgnore: true */ "@tencent-ai/workbuddy-cloud-sdk");
      client = mod.createWorkBuddyCloud({
        endpoint: publicConfig.endpoint,
        publishableKey: publicConfig.publishableKey,
        ...(publicConfig.oauthRelayBaseUrl
          ? { oauthRelayBaseUrl: publicConfig.oauthRelayBaseUrl }
          : {}),
      });
    } catch (e) {
      console.warn("[cloudDb] SDK init failed — giving up on cloud this session:", e);
      cloudGaveUp = true;
      client = null;
    }
  }
  return client;
}

// ── Local-storage fallback mirror ───────────────────────────────────────────
// Only written when a cloud write was attempted but failed. This is this
// module's OWN mirror (separate keys from the app's history), so the demo data
// is not lost even though the cloud rejected it. Never throws.

const MIRROR_A = "footcheck-cloud-mirror-assessments";
const MIRROR_R = "footcheck-cloud-mirror-reassessments";

function mirrorToLocal(key: string, record: unknown): void {
  try {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) {
      arr.push(record);
      localStorage.setItem(key, JSON.stringify(arr));
    }
  } catch {
    /* best-effort: ignore storage failures */
  }
}

// ── assessments ─────────────────────────────────────────────────────────────

export async function saveAssessment(a: CloudAssessment): Promise<boolean> {
  const clean = sanitizeAssessment(a);
  if (!assessmentValid(clean)) return false;
  const c = await getClient();
  if (!c) return false; // cloud not available → caller keeps its own localStorage
  try {
    const { error } = await c.database.from("assessments").insert({
      synthetic_case_id: clean.synthetic_case_id,
      selected_symptoms: clean.selected_symptoms,
      triggered_rule_id: clean.triggered_rule_id,
      care_tier: clean.care_tier,
    } as any);
    if (error) {
      console.warn("[cloudDb] saveAssessment rejected by cloud:", error);
      mirrorToLocal(MIRROR_A, clean);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[cloudDb] saveAssessment error — mirrored locally:", e);
    mirrorToLocal(MIRROR_A, clean);
    return false;
  }
}

export async function listAssessments(): Promise<CloudAssessment[] | null> {
  const c = await getClient();
  if (!c) return null;
  try {
    const { data, error } = await c.database
      .from("assessments")
      .select("synthetic_case_id, selected_symptoms, triggered_rule_id, care_tier, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.warn("[cloudDb] listAssessments failed:", error);
      return null;
    }
    return (data as CloudAssessment[]) ?? [];
  } catch (e) {
    console.warn("[cloudDb] listAssessments error:", e);
    return null;
  }
}

// ── reassessments ────────────────────────────────────────────────────────────

export async function saveReassessment(r: CloudReassessment): Promise<boolean> {
  const clean = sanitizeReassessment(r);
  if (!reassessmentValid(clean)) return false;
  const c = await getClient();
  if (!c) return false;
  try {
    const { error } = await c.database.from("reassessments").insert({
      followup_checkin_updates: clean.followup_checkin_updates,
      delta_changes: clean.delta_changes,
      escalation_outcome: clean.escalation_outcome,
    } as any);
    if (error) {
      console.warn("[cloudDb] saveReassessment rejected by cloud:", error);
      mirrorToLocal(MIRROR_R, clean);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[cloudDb] saveReassessment error — mirrored locally:", e);
    mirrorToLocal(MIRROR_R, clean);
    return false;
  }
}

export async function listReassessments(): Promise<CloudReassessment[] | null> {
  const c = await getClient();
  if (!c) return null;
  try {
    const { data, error } = await c.database
      .from("reassessments")
      .select("followup_checkin_updates, delta_changes, escalation_outcome, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.warn("[cloudDb] listReassessments failed:", error);
      return null;
    }
    return (data as CloudReassessment[]) ?? [];
  } catch (e) {
    console.warn("[cloudDb] listReassessments error:", e);
    return null;
  }
}

/** Exposed for tests / debugging: whether this session has stopped trying. */
export function __cloudGaveUp(): boolean {
  return cloudGaveUp;
}
