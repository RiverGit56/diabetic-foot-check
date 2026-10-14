-- ============================================================================
-- Diabetic Foot Check — CloudBase (managed PostgreSQL) schema
-- ============================================================================
-- ISOLATION MODEL: PUBLIC DEMO TABLE (NO LOGIN REQUIRED)
--
-- This app is a screening/education tool, not a diagnostic device. The cloud
-- layer is an OPTIONAL, best-effort mirror of synthetic demo data:
--   * No sign-in. No per-user ownership (no auth.uid(), no owner_id column).
--   * Writes are allowed for anon + authenticated roles (the relay may attach
--     a demo session id, but there is no personal account).
--   * ONLY synthetic, non-personal fields are ever written — the app-side
--     field whitelist + length limits in cloudDb.ts enforce this. The DB
--     policy is permissive by design for a public demo, so the SAFEGUARD is
--     the app code, never the schema.
--   * PDPA: this table must NEVER hold real names / NRIC / phone numbers /
--     free-text that could identify a person.
--
-- Create these tables via the cloud-service management flow / SQL console.
-- ============================================================================

-- 1) assessments: one row per completed demo assessment ----------------------
CREATE TABLE IF NOT EXISTS public.assessments (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  synthetic_case_id   TEXT NOT NULL,
  selected_symptoms   JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_rule_id   TEXT,
  care_tier           TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) reassessments: one row per follow-up check-in / escalation event --------
CREATE TABLE IF NOT EXISTS public.reassessments (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  followup_checkin_updates JSONB NOT NULL DEFAULT '{}'::jsonb,
  delta_changes            JSONB,
  escalation_outcome       TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security: PUBLIC DEMO — anon + authenticated may read & write
-- synthetic demo rows. There is no per-user ownership because the demo has no
-- sign-in. The app-side whitelist + length limits (cloudDb.ts) are what keep
-- only the synthetic columns populated; the schema deliberately carries no
-- identity column that could be abused to store personal data.
ALTER TABLE public.assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reassessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assessments_owner_all   ON public.assessments;
DROP POLICY IF EXISTS reassessments_owner_all ON public.reassessments;

CREATE POLICY assessments_public_rw ON public.assessments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY reassessments_public_rw ON public.reassessments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Indexes for the chronological "latest first" reads -------------------------
CREATE INDEX IF NOT EXISTS assessments_created_idx
  ON public.assessments (created_at DESC);

CREATE INDEX IF NOT EXISTS reassessments_created_idx
  ON public.reassessments (created_at DESC);

-- ============================================================================
-- PDPA / safety note
-- ----------------------------------------------------------------------------
-- This permissive policy is ONLY acceptable because:
--   1. The data is 100% synthetic (no real patient information, ever).
--   2. The writing client (cloudDb.ts) whitelists columns and bounds lengths.
--   3. The privacy notice states the data is demo-only, not a real medical
--      record.
-- If real personal data is ever contemplated, this model MUST be replaced with
-- per-user RLS (owner_id = auth.uid()) plus a sign-in flow — do not relax the
-- above three guarantees.
-- ============================================================================
