/**
 * i18n key-alignment checker.
 *
 * Baseline = en.json. Every other locale (zh-CN, ms, ta, fil) must expose the
 * SAME key tree — same dotted paths, same node types. A locale that is missing a
 * key would show the English fallback at runtime (i18next fallbackLng:"en"),
 * but for a finished app we want every language actually translated. This script
 * reports, per locale:
 *   - MISSING  : a key that exists in en.json but not in the locale (or a
 *                structural mismatch — en leaf vs locale object, etc.)
 *   - ORPHAN   : a key present in the locale but not in en.json (left behind by
 *                a removed feature; harmless but indicates drift).
 *
 * Exit code is 1 if any MISSING key exists, so it can gate CI / the test suite.
 *
 * Run: npm run test:i18n-keys
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE = "en";
const TARGETS = ["zh-CN", "ms", "ta", "fil"];

type NodeType = "obj" | "leaf";

/** Flatten a JSON tree into dotted paths → node type (object vs leaf/array). */
function flatten(
  obj: unknown,
  prefix = "",
  out: Map<string, NodeType> = new Map()
): Map<string, NodeType> {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        out.set(p, "obj");
        flatten(v, p, out);
      } else {
        out.set(p, "leaf");
      }
    }
  }
  return out;
}

const baseJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, "public", "locales", `${BASE}.json`), "utf8")
);
const baseKeys = flatten(baseJson);

let totalMissing = 0;
let totalOrphan = 0;

console.log(`Baseline: ${BASE}.json  (${baseKeys.size} leaf/object keys)`);

for (const loc of TARGETS) {
  const json = JSON.parse(
    fs.readFileSync(path.join(ROOT, "public", "locales", `${loc}.json`), "utf8")
  );
  const keys = flatten(json);

  const missing = [...baseKeys.keys()].filter((k) => {
    if (!keys.has(k)) return true;
    return baseKeys.get(k) !== keys.get(k); // structural mismatch
  });
  const orphan = [...keys.keys()].filter((k) => !baseKeys.has(k));

  totalMissing += missing.length;
  totalOrphan += orphan.length;

  console.log(`\n=== ${loc} ===`);
  console.log(
    `  missing: ${missing.length}   orphan: ${orphan.length}`
  );
  if (missing.length) {
    console.log(
      "  MISSING: " +
        missing.slice(0, 80).join(", ") +
        (missing.length > 80 ? ` …(+${missing.length - 80})` : "")
    );
  }
  if (orphan.length) {
    console.log(
      "  ORPHAN:  " +
        orphan.slice(0, 40).join(", ") +
        (orphan.length > 40 ? ` …(+${orphan.length - 40})` : "")
    );
  }
}

console.log(
  `\n════════ RESULT: ${totalMissing} missing, ${totalOrphan} orphan across ${TARGETS.length} locales ══════`
);
process.exit(totalMissing ? 1 : 0);
