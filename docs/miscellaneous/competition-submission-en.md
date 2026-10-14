# FootCheck — Competition Submission Materials

**Project:** FootCheck — Diabetic Foot Check Assistant
**Type:** Mobile-first, five-language, offline-capable screening & education web app
**Target users:** Singapore residents aged 60+ with diagnosed type 1 or type 2 diabetes
**Live demo:** https://b67d3face37d47fd8db26026af6e1931.sg.agentos-app.run
**Version:** v3.17 ｜ **Date:** 2026-10-14

> A Chinese counterpart of this document is in `competition-submission-zh.md`.

> **✅ CONFIRMED SELECTIONS** — **Project name:** `FootCheck — Diabetic Foot Check Assistant` ｜ **Short blurb:** `Clear next-step foot screening for older adults with diabetes.`

---

## 1. Project Name

**FootCheck — Diabetic Foot Check Assistant**

---

## 2. Short Blurb

**"Clear next-step foot screening for older adults with diabetes."**

---

## 3. Project Description

### (a) Overview — scenario, users, value proposition

**Scenario.** FootCheck is used in the everyday home setting: an older adult with diabetes sits down, takes a few minutes to look at their own feet, and answers a short structured questionnaire on a phone. The app then tells them the single most important thing they need to know — **what to do next**.

**Users.**
- **Primary:** adults aged **60 or over with diagnosed type 1 or type 2 diabetes**, who are at the highest risk of foot ulceration and amputation, and who frequently have reduced sensation, vision and mobility.
- **Secondary:** family **caregivers** who help an older relative check their feet.
- **Tertiary:** **clinicians**, who can receive a short, structured, plain-language summary of what the patient reported.

**Value proposition.** FootCheck turns an ambiguous observation ("my foot is red — is that serious?") into a **deterministic, guideline-grounded care decision**, delivered in the user's own language, with **no login and no data leaving the device**. It does not try to diagnose; it closes the *triage and navigation* gap — the gap between noticing something and knowing where to go.

### (b) Real-Scenario Insight — pain points, population, core problem

**Where the pain comes from.** Diabetic foot complications — ulceration, infection and ultimately lower-limb amputation — are among the most feared consequences of diabetes, and the risk rises steeply with age. Two features of ageing make these problems easy to miss:
1. **Peripheral neuropathy** removes the pain that would normally signal an injury, so a wound can develop silently.
2. **Reduced vision and mobility** make it hard to inspect the feet daily, or to reach a clinic quickly once something is noticed.

**Target population.** Singapore residents aged **60+ with diagnosed diabetes** — a **multilingual** group (English, Chinese, Malay, Tamil, Filipino). Most existing digital tools assume English literacy and clinical measurements, so precisely the people at highest risk are the least served.

**Core problem.** The problem is **not a lack of information — it is the absence of a decision.** An older adult can see a red patch, a blister or a discoloured toe, but cannot tell whether it is trivial, urgent, or an emergency, and often cannot judge which care setting is appropriate. That is the gap FootCheck addresses: **screening and care navigation**, deliberately not diagnosis.

### (c) Solution Design — business & technical architecture, and how prompts drive AI generation

#### Business architecture

A single screening session produces **four decoupled outputs**, so the user gets both a decision and its context:

| Output | Values | Question it answers |
| --- | --- | --- |
| **Care tier** | `EMERGENCY` / `PRIMARY_CARE` / `SELF_CARE` / `ABSTAIN` | *Where should I go?* |
| **Risk level** | `low` / `moderate` / `high` / `urgent` | *How much risk is present?* |
| **IWGDF risk category** | 0 / 1 / 2 / 3 | *How often should I be re-screened?* (12 / 6 / 3 / 1 months) |
| **Education + applicable rules** | self-care guidance + the exact clinical rules that fired, each with its source | *Why, and what can I do?* |

**Trust & delivery model.** Patient-led and caregiver-friendly; **local-first** (all data stays in the browser), **login-free**, and **upload-free** by design — which keeps the project aligned with Singapore's PDPA without collecting personal data at all. The product is explicitly positioned as a **screening & education tool, not a diagnostic device**, and gives **no medication advice**. **Safe abstention is a first-class outcome**: when the input is unclear or self-contradictory, the app says "unable to assess safely — see a clinician" rather than guessing.

#### Technical architecture

- **Front end:** Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS 3.4, built as a **static export** (`output: "export"`) and served as a pure static site — **no server and no API routes** in the shipped product.
- **Internationalisation:** i18next with **5 locales** (en / zh-CN / ms / ta / fil), **542 leaf keys each**, bundled into the JavaScript at build time so the app **works offline**. The engine emits **translation keys only**, so adding a language can never change clinical logic — a property enforced by an automated cross-language test.
- **Deterministic engine** (pure functions: no randomness, no clock, no I/O — same input always gives the same output):
  - `triageEngine.ts` — the **4 care tiers** and their ordered rules (EMERGENCY → PRIMARY_CARE → ABSTAIN → SELF_CARE, first match wins). Red flags are **binary yes/no**; **any single severe sign is already an emergency** (no "minimum symptom count").
  - `assessment.ts` — a **41-question bank** across 7 categories, a fixed **7-question safety screen** plus personalised questions selected per session, **12 required profile fields**, and profile-integrated scoring.
  - `clinicalRules.ts` — **18 clinical rules** sourced to **IWGDF 2023 / NICE NG19 / NG28 / IWGDF-IDSA 2023 / SIRS 1992 / Sepsis-3**, each carrying a `sourceRef`; maps to the IWGDF category and the screening interval.
- **Data:** `dataSources.ts` calls the public **keyless** `data.gov.sg` API (weather, PSI, MOH statistics) directly from the client, with graceful fallback to built-in data; `riskProfiles.ts` holds NPHS-anchored population risk profiles; all user data is persisted in the browser's `localStorage`.
- **Optional cloud (disabled by default):** `cloudDb.ts` + `cloud/schema.sql` implement a "public demo table, no login, synthetic data only" model with field whitelisting, length limits and row-level security. The app runs fully without it and **never blocks** on it.
- **Quality:** TypeScript `tsc --noEmit` is clean and **10 automated test suites are all green** — triage 45, assessment 35, profile 14, i18n 161, key-alignment 0 missing / 0 orphan, cross-language 34, cloud-fallback 19, first-run 11, screening-interval 38, re-assessment 30 — plus browser regression scripts.

#### How prompts drive AI generation

This project was built with **WorkBuddy (CodeBuddy) as a prompt-driven AI development partner**. Two distinct "prompt → generation" loops are involved, and they are kept **strictly separate**:

**1. Build-time — prompts generated the product.** The developer wrote requirements, clinical constraints and acceptance criteria in natural language, and the AI generated the implementation. Concretely, prompt-driven AI produced:
- the React/Next.js pages and components;
- the deterministic engine, the 41-question bank and the 18 clinical rules (grounded in the named guidelines supplied in the prompt);
- the **five locale JSON files** — the four non-English locales were AI-translated from the English baseline and then machine-verified for key alignment;
- the **10 test scripts** and the browser regression scripts;
- the **bilingual documentation** and the Mermaid architecture / trust-boundary diagrams (rendered to SVG and PNG);
- the **static build and the public deployment**.

Prompts also drove **correction**, not just creation. A prompt asking for a *"consistency audit of the code against its cited sources"* produced a report of **7 code-vs-source inconsistencies**, which a follow-up prompt then fixed; another prompt **re-attributed 11 unverifiable citations** to freely downloadable guidelines.

**2. Run-time — prompts are deliberately NOT allowed to decide.** Inside the product, **no LLM makes any clinical judgement**. The care tier is produced by the rule engine and is **locked**. If a language model is ever used, it may **only explain or educate**: `buildExplanationContract()` hands the model a system prompt that forbids changing the tier, and `isTierUnchanged()` verifies the tier came back unchanged. This separation is the project's central safety design: **AI builds the tool; AI does not decide for the patient.**

### (d) Business Value — only what this project can genuinely support

**What is genuinely measurable and verifiable in the repository** (no invented statistics):

- **4** deterministic care tiers and **3** decoupled outputs (tier / risk / IWGDF category).
- A **41-question** bank and **18** clinical rules, **each traced to a downloadable guideline**.
- **5** complete languages, **542 keys each**, **0 missing / 0 orphan**, with **cross-language grading proven identical**.
- **10** automated test suites green; a **static** build with **no server dependency** and **zero data upload**.
- **6** user-facing pages; **no API keys or secrets** anywhere in the repository.

**Qualitative impact that the design genuinely delivers** (supportable without outcome data):

- **Converts ambiguity into action** — it replaces "is this serious?" with a clear, language-appropriate next step.
- **Safety-conservative by design** — it **abstains** ("see a clinician") rather than reassure when the input is unclear.
- **Accessible to older users** — five languages, 18 px base font, 44 px touch targets, offline-capable.
- **Privacy by architecture** — data never leaves the device, which materially **lowers PDPA obligations**.
- **Auditable** — every output can be traced, rule by rule, to a public guideline, a property a black-box model cannot offer.

**What is explicitly NOT claimed (honesty statement):**

- **No** claim of reduced amputations, reduced admissions or cost savings — **no outcome data was collected**.
- The project is **not clinically validated**; the tests are **regression tests**, not clinical trials.
- The non-English translations were **AI-generated and automatically checked**, **not** human-reviewed line-by-line.
- The tool captures **only 1 of the 4 SIRS criteria** (temperature); heart rate, respiratory rate and white-cell count require clinical measurement and are out of scope.

**Potential (clearly labelled as hypothesis, not measured):** earlier appropriate referral, fewer unnecessary emergency visits, and greater caregiver confidence. These are the **intended direction** of the design and would require a real-world pilot to confirm.

---

## 4. Development Process Statement

*(Written backup evidencing the use of CodeBuddy / WorkBuddy throughout the build. Every milestone below is a git tag in the public repository, so the process is independently verifiable.)*

### 4.1 Chronological milestones (with git tags)

| Date | Milestone | Git tag |
| --- | --- | --- |
| 2026-10-13 | **First complete preview** — 6 pages, 5 languages, live `data.gov.sg` data, first clinical rule set. | `v1-preview` |
| 2026-10-13 | **Deterministic triage engine** introduced; AI-invented thresholds removed and re-grounded in guidelines. | `v2.1-triage`, `v2.2-triage` |
| 2026-10-13 | **UX & safety pass** — explicit "Next" button; profile gate; all 12 fields required; age band set to 60+; diabetes type limited to type 1/2; i18n hot-reload fix; one-click demo reset. | `v2.3-next-button` … `v2.9-demo-reset` |
| 2026-10-13 | **First-run welcome**, disclaimer trimmed on the assess page, footprint icon. | `v3.0-first-run-welcome` … `v3.2-footprint-icon` |
| 2026-10-13 | **User-named preview snapshot** (bookmark of the v3.2 code state). | `v2-preview` |
| 2026-10-13 | **Content depth** — 41-question personalised bank; symptom-only bank; unified target-population definition; IWGDF-graded screening interval; UI clean-ups. | `v3.3-personalised-bank` … `v3.8-checkin-consolidated` |
| 2026-10-13 | **Competition mapping document** — every result ↔ criterion ↔ medical source. | `v3.9-criteria-mapping` |
| 2026-10-13 | **Audit fixes** — 7 code-vs-source inconsistencies fixed; clinical knowledge surfaced in the UI. | `v3.10-consistency-fixes` |
| 2026-10-13 | **Citation re-attribution** — 11 unverifiable citations re-attributed to IWGDF 2023 / NICE NG19. | `v3.11-source-reattribution` |
| 2026-10-13 | **User-named preview snapshot** (binary yes/no questions, no "uncertain" option). | `v3-preview` |
| 2026-10-13 | **Dynamic re-assessment** (escalation comparison), later folded into the tracking page. | `v3.13-dynamic-recheck` |
| 2026-10-14 | **All 5 languages completed**; cloud isolation model finalised as a public demo table (not connected). | `v3.15-i18n-cloud` |
| 2026-10-14 | **Static export + public deployment**; server API routes removed. | `v3.16-static-export` |
| 2026-10-14 | **Competition deliverables** — architecture & trust-boundary diagrams, design trade-offs, README, LICENSE. | `v3.17-docs-and-license` |

> Two internal numbers appear in the documentation without their own tags: **v3.12** is the code state of the user-named `v3-preview` snapshot, and **v3.14** (removal of the standalone re-check page) is documented but untagged.

### 4.2 What WorkBuddy did (and what the human did)

**WorkBuddy generated and edited essentially the entire codebase, test suite, documentation and diagrams**, under the developer's prompt direction. The developer acted as **product owner and reviewer**: supplying requirements, clinical constraints and design decisions, then verifying every result and issuing corrective prompts.

| Area | Produced by prompt-driven AI (WorkBuddy) |
| --- | --- |
| **Application code** | All 6 pages; the React components; `triageEngine.ts`, `assessment.ts`, `clinicalRules.ts`, `dataSources.ts`, `riskProfiles.ts`, `i18n.ts`, `languages.ts`, `cloudDb.ts`, `cloudConfig.ts`. |
| **Clinical content** | The 41-question bank; the 18 clinical rules with per-rule `sourceRef`; 5 × 542 translation keys. |
| **Tests** | 10 Node test scripts (`npm run test:*`) plus browser regression scripts. |
| **Documentation** | Bilingual README; 8+ documents; Mermaid diagrams rendered to SVG and PNG. |
| **Operations** | Static-export build; secret audit (zero hits across 114 tracked files); public deployment. |

**Human-in-the-loop evidence.** The developer reviewed every change, ran the full test suite, and issued corrective prompts that changed the product's direction — for example: the prompt that triggered the **consistency audit** (7 fixes), the prompt that **re-attributed the citations**, the decision to **remove AI image diagnosis** from scope, the decision to keep the **deterministic engine instead of an LLM judge**, and the request to **keep the Chinese documents and add English versions** for the public repository.

**Net effect.** A single developer, working prompt-first with WorkBuddy, produced and shipped a five-language, guideline-grounded, tested, documented and publicly deployed application — with the AI doing the bulk of the writing and the human owning the judgement.

---

## 5. Demo Video Script (5–8 minutes)

**Total run time:** ~7:30. **Format:** screen recording with voice-over. **Language:** English voice-over; switch the app to Chinese (and briefly Malay/Tamil/Filipino) to prove multilingual support.

| Time | Visual | Narration (English) |
| --- | --- | --- |
| **0:00–0:40** | Cover image → live app home screen. | "Meet **FootCheck** — a five-language, offline screening tool that helps older adults with diabetes check their feet at home, and tells them exactly what to do next." |
| **0:40–1:30** | Simple on-screen text; an illustrative photo of an older person's foot. | "Diabetic foot problems — ulcers, infection, amputation — rise steeply with age. Neuropathy removes the pain that warns you, and reduced vision and mobility make feet hard to inspect. The problem is not a lack of information; it is the **absence of a decision**." |
| **1:30–2:15** | Architecture diagram (`docs/docs English version/system-architecture.svg`). | "FootCheck answers one question: **where should I go?** A deterministic rule engine produces a care tier — emergency, primary care, self-care, or abstain. **No AI makes the clinical decision**; the tier is locked. Everything runs in the browser, in five languages, with no login and no upload." |
| **2:15–2:55** | First-run welcome screen; language switch; the 12-field profile. | "On first use, you pick your language and fill in a short profile — twelve required fields that personalise the scoring. That's it — no account, no email." |
| **2:55–3:45** | **Scenario A — mild, home care.** Answer every red flag "No"; select *mild redness, skin intact*. | "Scenario one: nothing serious. All red flags are 'No', and the only finding is mild redness with the skin intact. FootCheck returns **self-care** — manage it at home, keep pressure off, and re-check in 24 to 48 hours." *(Show the green care-tier banner, the IWGDF card, and the 12-month screening interval.)* |
| **3:45–4:45** | **Scenario B — red-flag emergency.** Answer "Yes" to *black or gangrenous tissue* (or *fever with a red, swollen foot*). | "Scenario two: a red flag. Watch what happens when a single severe sign is reported — black, dead tissue. FootCheck immediately returns **emergency** — a red banner telling the user to seek care now. There is no 'minimum number of symptoms' — **one severe sign is enough**, exactly as the guidelines require." |
| **4:45–5:30** | **Scenario C — abstain.** Give a self-contradictory answer set (e.g. "never had a foot wound" but also "new blister today"). | "Scenario three: what if your answers don't add up? Here the user says they have never had a foot wound, but also reports a new blister today. FootCheck **refuses to guess** — it returns **abstain**: 'unable to assess safely, please see a clinician.' Safe abstention is a feature, not a bug: we would rather over-refer than miss a red flag." |
| **5:30–6:20** | Recommendations page (care-tier banner, IWGDF card, 18 clinical rules with source badges); tracking page with the escalation comparison. | "Every result is explained. The recommendations page lists the clinical rules that fired, **each with its source** — IWGDF, NICE, SIRS, Sepsis-3. The tracking page compares this check with the last one and flags **escalation** — if your foot has become more urgent since last time, it says so." |
| **6:20–7:10** | Terminal: git tags, test output, the audit report. | "And here's how it was built. This project was written **prompt-first with WorkBuddy**. I described the clinical requirements; the AI generated the engine, the question bank, the five translations, the tests and the documentation. When I asked for a **consistency audit**, it found seven places where the code disagreed with its cited sources — and then fixed them. The key lesson: **keep AI in the build loop, and keep it out of the clinical decision.**" |
| **7:10–7:30** | Cover image; live URL on screen. | "FootCheck — clear, safe, multilingual foot screening for older adults with diabetes. It is a screening tool, not a diagnosis — and it is live right now at the link on screen. Thank you." |

**On-screen text callouts to prepare:** the care-tier banner for each of the three scenarios; the IWGDF screening interval; the source badges; the escalation banner; the live URL.

---

*FootCheck is a screening and education tool, not a diagnostic device. It does not provide diagnosis or medication advice.*
