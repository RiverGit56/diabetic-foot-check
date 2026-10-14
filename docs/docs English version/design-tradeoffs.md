# Key Design Trade-offs

**Project:** Diabetic Foot Check Assistant (FootCheck)
**Version:** v3.17 ｜ **Date:** 2026-10-14

This document explains several **deliberate, sometimes counter-intuitive** design decisions, together with their rationale and their cost. There is one guiding principle: **on clinical-safety questions, prefer the conservative, explainable and auditable option over the "clever" one.**

---

## 1. Why deterministic rules instead of blind LLM judgement?

**Decision:** the care tier (EMERGENCY / PRIMARY_CARE / SELF_CARE / ABSTAIN), the risk level and the IWGDF category are **all produced by a deterministic rule engine**. No LLM makes the final judgement.

**Rationale:**

1. **Auditable.** Every rule states its source (IWGDF 2023, NICE NG19, IWGDF/IDSA 2023, SIRS, Sepsis‑3) and can be checked line by line against the published guideline. An LLM's judgement cannot give a stable, reproducible justification.
2. **Reproducible.** The same answers **always** produce the same result (and `test:crosslang` proves it is consistent across all 5 languages). LLM output is stochastic — clinical triage must not "vary slightly each time".
3. **Red flags must not be guessed.** Emergency triggers are simple pattern matches: `IF gangrene THEN EMERGENCY`. Such judgements **must be deterministic**, not a probability.
4. **Conservative first.** When uncertain, the rules **round up** (`ABSTAIN` → see a clinician) rather than reassure the user.

**Cost (being honest):** the rule engine only covers **structured questions** and cannot interpret free text. Expressive or colloquial descriptions land in "unsure", which triggers a conservative `ABSTAIN`. This is a **deliberate trade-off** — better to over-refer than to miss a red flag.

> If a language model is ever used in this project, it may **at most** explain and educate; it may **never modify** the tier the rule engine produced.

---

## 2. Why focus on 5 languages, and why no AI image diagnosis?

### 2.1 Five languages (en / zh-CN / ms / ta / fil)

**Rationale:**

- **Matches the target population.** The project targets Singapore adults aged 60+ with diabetes; these 5 languages cover the main language groups (English, Chinese, Malay, Tamil, Filipino).
- **Clinical safety requires full coverage.** Red flags, care advice and disclaimers **must be complete in every language**, or non-English users could receive worse grading. So we do **complete translation + per-key alignment checks** (`npm run test:i18n-keys`: 0 missing / 0 orphan) and added a **cross-language consistency test** (`test:crosslang`: the same answers give identical grading in all 5 languages).
- **Language decoupled from logic.** The engine emits **translation keys**; the UI renders per language, so **adding a language cannot affect clinical logic**.

**About the translations:** the 5 locales were translated by AI from the English baseline and verified automatically (key alignment, placeholders, empty values). They have **not** been reviewed line-by-line by native speakers — a known limitation (see §5).

### 2.2 No AI image diagnosis

**Rationale:**

- **Evidence and regulation.** Automatically judging a wound/gangrene from a photo is a **medical-device-grade** function requiring regulatory clearance and clinical validation — outside the scope of this demo.
- **High false-negative risk.** A missed gangrene is extremely costly; letting the user answer structured questions and explicitly warning "if you see this, seek care immediately" is safer and more explainable.
- **Accessibility.** Taking clear, well-lit foot photos is hard for older users; a structured questionnaire plus written education is more reliable.
- **Honest positioning.** This project is a **screening/education tool**, not a diagnostic device. Adding "AI photo diagnosis" would break that positioning.

---

## 3. Data privacy and PDPA

| Concern | Approach |
| --- | --- |
| Data minimisation | Collects only the fields the assessment needs; no name, NRIC or phone |
| Local-first | Profile, assessment history and daily check-ins are stored **only in the browser's localStorage** |
| No cross-border transfer | **Nothing is uploaded** to a server by default |
| No third-party tracking | The build ships **no** analytics/advertising SDK |
| Deletable | Clearing the browser's data deletes all local records |

Keeping **data on the user's device** sidesteps most PDPA collection, cross-border and retention obligations by design.

---

## 4. Why the demo does not upload data to a server

**Decision:** the demo **does not upload user data to any server** (the CloudBase path has `cloudEnabled = false`).

**Rationale:**

1. **Zero server-side trust boundary.** With no server there is no "server breach" attack surface; user data never leaves the device.
2. **No login needed for a demo.** Requiring no sign-up lowers the barrier and avoids collecting account data.
3. **Cloud resources are unstable.** Attempting to provision the cloud in this environment returned `cancelled` / `cloud_service_unavailable`, so it is treated as an **optional enhancement**: write to the cloud only when available, fall back locally on failure, and **never block the main flow**.
4. **A clean upgrade path.** If production genuinely needs the cloud (e.g. multi-device sync), `cloudDb.ts` + `cloud/schema.sql` are already prepared for a **public demo table / no login / synthetic data only** model: field whitelist + length limits + RLS, with the front end holding only a publishable key (no admin secret). Filling in `publicConfig` is then enough — **no clinical logic changes**.

**Cost:** data is **not synced across devices** — switching browser or clearing the cache loses it. Acceptable for a demo.

---

## 5. Known limitations

1. **Not clinical validation.** All tests are **regression tests** (ensuring stable behaviour and reproducible grading), **not** clinical trials or medical validation, and they **cannot** prove clinical effectiveness.
2. **Translations not human-reviewed line-by-line.** `ms` / `ta` / `fil` were AI-translated plus automatically checked; native speakers should review the medical/colloquial terms.
3. **SIRS is only partially captured.** The tool captures only **temperature** of the 4 SIRS criteria (via a red-flag question); heart rate, respiratory rate and white-cell count require clinical measurement and are out of scope (documented in code comments).
4. **Rules cover structured questions only.** Free text cannot be interpreted; unclear answers trigger a conservative `ABSTAIN`.
5. **Population and region limits.** Aimed at Singapore's 60+ population with diagnosed diabetes; the built-in facilities and population statistics are Singapore data.
6. **Cloud not connected.** No cross-device sync, no server-side retention.
7. **No medication advice.** Outputs are limited to the care tier and self-care education; **no drug or dosage advice** is given.
8. **Public/built-in data sources.** The only external dependency is the public keyless `data.gov.sg`; on failure it falls back to built-in data, which may not be the latest.

---

## 6. In one sentence

> We chose **deterministic, explainable, local-first, conservative grading**: the rule engine decides (auditable, reproducible), no LLM decides; data stays on the user's device; when unsure, refer rather than reassure. These trade-offs give up "intelligence" and cross-device sync in exchange for **clinical safety and privacy** — the right direction for foot screening in an older diabetic population.
