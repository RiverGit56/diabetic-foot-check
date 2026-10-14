/**
 * Reassessment / Dynamic-Escalation tests — tier ranking, escalation
 * detection, and determinism.
 *
 * Run from the `web/` directory:
 *   node --experimental-strip-types scripts/reassessment-test.ts
 *   (or) npm run test:reassess
 *
 * The reassessment logic is deterministic: no randomness, no clock beyond the
 * re-check-date offset. Same inputs → same output.
 */
import {
  evaluateReassessment,
  isEscalated,
  TIER_SEVERITY_RANK,
  type ReassessmentResult,
} from "../src/lib/triageEngine.ts";
import { recheckDateForTier } from "../src/lib/clinicalRules.ts";
import type { CareTier } from "../src/lib/triageEngine.ts";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++;
    console.log("  ✓ " + name);
  } else {
    failed++;
    console.error("  ✗ " + name + (detail ? "  — " + detail : ""));
  }
}

// A benign baseline: no red flags, only a mild pressure-redness (→ SELF_CARE).
const BASE: Record<string, string> = {
  rf1: "rf1a", rf2: "rf2a", rf3: "rf3a", rf4: "rf4a", rf5: "rf5a",
  w1: "w1a", sk1: "sk1red",
};

console.log("Reassessment: tier severity ranking");
check("TIER_SEVERITY_RANK has 4 tiers", Object.keys(TIER_SEVERITY_RANK).length === 4);
check("EMERGENCY is most urgent (rank 0)", TIER_SEVERITY_RANK.EMERGENCY === 0);
check("SELF_CARE is least urgent of actionable", TIER_SEVERITY_RANK.SELF_CARE === 2);

console.log("\nReassessment: isEscalated transitions");
check("SELF_CARE → EMERGENCY escalates", isEscalated("SELF_CARE", "EMERGENCY"));
check("PRIMARY_CARE → EMERGENCY escalates", isEscalated("PRIMARY_CARE", "EMERGENCY"));
check("SELF_CARE → PRIMARY_CARE escalates", isEscalated("SELF_CARE", "PRIMARY_CARE"));
check("EMERGENCY → SELF_CARE does NOT escalate (improvement)",
  !isEscalated("EMERGENCY", "SELF_CARE"));
check("identical tier does NOT escalate", !isEscalated("SELF_CARE", "SELF_CARE"));
check("anything → ABSTAIN does NOT escalate", !isEscalated("SELF_CARE", "ABSTAIN"));
check("ABSTAIN → EMERGENCY does NOT escalate (prev not actionable)",
  !isEscalated("ABSTAIN", "EMERGENCY"));

console.log("\nReassessment: evaluateReassessment scenarios");
const rStable = evaluateReassessment(BASE, BASE);
check("identical states → no escalation", !rStable.escalated);
check("identical states → same tier", rStable.prevTier === rStable.newTier);

const rFever = evaluateReassessment(BASE, { ...BASE, rf1: "rf1b" });
check("new fever → escalates", rFever.escalated);
check("new fever → EMERGENCY", rFever.newTier === "EMERGENCY");
check("new fever → prev was SELF_CARE", rFever.prevTier === "SELF_CARE");

const rWound = evaluateReassessment(BASE, { ...BASE, w1: "w1c" });
check("new active wound → PRIMARY_CARE", rWound.newTier === "PRIMARY_CARE");
check("new wound escalates SELF_CARE → PRIMARY_CARE", rWound.escalated);

const rRecover = evaluateReassessment({ ...BASE, rf1: "rf1b" }, BASE);
check("recovery (EMERGENCY → SELF_CARE) not flagged as escalation",
  !rRecover.escalated && rRecover.newTier === "SELF_CARE");

// Omitting ≥2 of the five red-flag answers leaves them undefined. The engine
// can no longer rule out a SIRS-positive severe infection → ABSTAIN.
const rAbstain = evaluateReassessment(BASE, { w1: "w1a", sk1: "sk1a" });
check("≥2 unanswered red flags → ABSTAIN (calibrated)", rAbstain.newTier === "ABSTAIN");
check("prev tier still resolves (BASE → SELF_CARE)", rAbstain.prevTier === "SELF_CARE");
check("ABSTAIN is NOT treated as escalation",
  !isEscalated(rAbstain.prevTier, rAbstain.newTier));

console.log("\nReassessment: determinism");
const a = evaluateReassessment(BASE, { ...BASE, rf1: "rf1b" });
const b = evaluateReassessment(BASE, { ...BASE, rf1: "rf1b" });
check("same inputs → same tier", a.newTier === b.newTier);
check("same inputs → same escalation flag", a.escalated === b.escalated);
check("same inputs → same prev tier", a.prevTier === b.prevTier);

console.log("\nReassessment: re-check date offsets");
check("EMERGENCY re-check date is null (immediate)", recheckDateForTier("EMERGENCY") === null);
const scDate = recheckDateForTier("SELF_CARE");
check("SELF_CARE re-check date is in the future", (scDate as Date) > new Date());
check("PRIMARY_CARE re-check date is in the future",
  (recheckDateForTier("PRIMARY_CARE") as Date) > new Date());
check("ABSTAIN re-check date is in the future",
  (recheckDateForTier("ABSTAIN") as Date) > new Date());

// Type-soundness sanity (no runtime effect, documents the union).
const tiers: CareTier[] = ["EMERGENCY", "PRIMARY_CARE", "SELF_CARE", "ABSTAIN"];
check("all four tiers are valid CareTier values", tiers.length === 4);

// ReassessmentResult shape sanity.
const _shape: ReassessmentResult = rStable;
check("ReassessmentResult exposes prev/new decisions",
  !!_shape.prevDecision && !!_shape.newDecision);

console.log(`\n════════ RESULT: ${passed} passed, ${failed} failed ══════`);
process.exit(failed ? 1 : 0);
