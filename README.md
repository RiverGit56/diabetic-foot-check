# FootCheck — Diabetic Foot Check Assistant


&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Project name: FootCheck — Diabetic Foot Check Assistant  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Short blurb: Clear next-step foot screening for older adults with diabetes.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;🟢 A foot screening and health-education tool for Singapore adults <ins>**aged 60+ with diagnosed type 1 or type 2 diabetes**</ins>, built for <ins>**seniors**</ins> and their <ins>**caregivers**</ins>, and <ins>**available in 5 languages**</ins>.

> ⚠️ This is a screening and education tool, NOT a diagnostic device. It does not give medication advice and does not replace professional medical care. If you feel unwell, seek medical attention.

---

## 🎬 Watch 30-Second Project Intro

https://youtu.be/ztv1ns6s0TM

Most diabetes-related amputations start with a wound that could have been caught earlier. FootCheck brings that check home.

---

## 🌐 WEB APP - Try it

**<https://b67d3face37d47fd8db26026af6e1931.sg.agentos-app.run>**

WEB APP: No sign-up, no install — just open it.  
For seniors and caregivers. 5 Languages.

<img src="Cover%20Image/Cover%20Image-380x216@3x.png" alt="FootCheck — Diabetic Foot Check Assistant" width="428">

---

## What it does

FootCheck helps older adults with diabetes perform a structured **self-check of their feet at home** and tells them the **clear next step**:

- **Care tier (primary result)** — `EMERGENCY` (go to A\&E now) / `PRIMARY_CARE` (see a clinician soon) / `SELF_CARE` (manage at home) / `ABSTAIN` (not enough information — see a clinician).
- **Risk level** — `low` / `moderate` / `high` / `urgent`.
- **IWGDF category (0–3)** — drives the recommended **screening / review interval** (12 / 6 / 3 / 1 months).
- **Advice and education** — care-navigation guidance plus foot self-care tips, tailored to the result.

**Tech stack:** Next.js 14 (App Router, static export) · React 18 · TypeScript · Tailwind CSS · i18next.

---

## Architecture & documentation

| Contents                                                               | Document                                                                                                                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| System architecture diagram (Mermaid + SVG/PNG)                        | [`docs/docs English version/system-architecture.md`](docs/docs%20English%20version/system-architecture.md)                                     |
| Trust-boundary diagram (Mermaid + SVG/PNG)                             | [`docs/docs English version/trust-boundary.md`](docs/docs%20English%20version/trust-boundary.md)                                               |
| **Result ↔ criterion ↔ source mapping** — the key competition document | [`docs/docs English version/assessment-criteria-source-mapping-en.md`](docs/docs%20English%20version/assessment-criteria-source-mapping-en.md) |
| Data-source registry and grading criteria                              | [`docs/docs English version/data-sources-and-grading-en.md`](docs/docs%20English%20version/data-sources-and-grading-en.md)                     |
| Question bank (41 questions) and per-session selection logic           | [`docs/docs English version/question-bank-and-selection-logic-en.md`](docs/docs%20English%20version/question-bank-and-selection-logic-en.md)   |
| Technical approach and target population                               | [`docs/docs English version/technical-approach-en.md`](docs/docs%20English%20version/technical-approach-en.md)                                 |
| CloudBase (production-phase design, not enabled)                       | [`docs/中文说明/cloudbase-integration.md`](docs/中文说明/cloudbase-integration.md)                                                                     |
| Key design trade-offs and known limitations                            | [`docs/docs English version/design-tradeoffs.md`](docs/docs%20English%20version/design-tradeoffs.md)                                           |
| Proof-of-usage screenshots (WorkBuddy AI conversation evidence)        | [`Proof of Workbuddy usage/`](Proof%20of%20Workbuddy%20usage/)                                                                                 |
| Cover image (16:9) — SVG · PNG 380×216 · PNG @3x (1140×648)            | [`Cover Image/`](Cover%20Image/)                                                                                                               |

---

## Medical rules & data sources (only what is actually used)

> Only sources **actually referenced in the code** are listed. A result-by-result "output ↔ criterion ↔ source" mapping is in [`docs/docs English version/assessment-criteria-source-mapping-en.md`](docs/docs%20English%20version/assessment-criteria-source-mapping-en.md) ([中文](docs/中文说明/assessment-criteria-source-mapping-zh.md)).

**Clinical rules (used by the triage engine):**

| Source                                                                      | Used for                                                   |
| --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **IWGDF 2023** — Prevention and Management of Foot Problems in Diabetes     | Risk stratification (0–3), prevention and self-care advice |
| **NICE NG19** — Diabetic foot problems: prevention and management           | Red flags, referral thresholds, home monitoring            |
| **NICE NG28** — Type 2 diabetes in adults: management                       | Blood-glucose-control rule (1 rule)                        |
| **IWGDF/IDSA 2023** — Diagnosis and Treatment of Foot Infection in Diabetes | Infection grading (1–4; severe = local infection + SIRS)   |
| **ACCP/SCCM 1992 SIRS criteria** (Bone et al., *Chest* 1992;101:1644‑55)    | SIRS 4 criteria (≥2 = positive)                            |
| **qSOFA / Sepsis‑3** (Singer et al., *JAMA* 2016)                           | Altered mental state as an independent emergency trigger   |

> Note: this tool captures only **one** of the 4 SIRS criteria (temperature, via a red-flag question); heart rate, respiratory rate and white-cell count require clinical measurement and are outside the scope of this screening tool.

**Data sources (runtime / built-in):**

| Source                                                  | Used for                                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **data.gov.sg / api.data.gov.sg** (public, keyless)     | Weather, PSI air quality, MOH datasets (diabetes prevalence, NPHS indicators, …)                     |
| **MOH National Population Health Survey (NPHS) 2022**   | Singapore population chronic-disease statistics (hypertension, hyperlipidaemia, obesity, smoking, …) |
| **World Bank (2024) / IDF Diabetes Atlas (10th ed.)**   | Singapore diabetes prevalence                                                                        |
| **Built-in care-facility directory**                    | Singapore hospitals / polyclinics / wound-care centres (public information)                          |
| **Kaggle: Diabetes Health Indicators (CDC BRFSS 2015)** | **Feature reference** for high-risk profiles (not calibration)                                       |
| **MIMIC‑III / PhysioNet**                               | ICU **feature reference** (not calibration)                                                          |
| **Synthea**                                             | **Synthetic** patient test profiles                                                                  |

> The only external host is `data.gov.sg` / `api.data.gov.sg` — public and keyless. The project contains **no API keys or secrets**.

---

## 🧪 Try it yourself

**No registration required.** Just open the demo link.

**First-visit flow:**

1. Open the link → you see the **welcome screen** (first-run onboarding).
2. Fill in your **profile** (12 required fields, used to personalise and score).
3. Go to **Assess** → answer **one question at a time** (pick an option, then tap **Next**).
4. Read the **result**: a **care-tier banner** at the top, then risk level, advice and the IWGDF category.

**Three scenarios worth trying, with expected results:**

| Scenario                        | How to answer                                                                                                                                | Expected result                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **① Manage at home (low risk)** | Answer "No" to every red-flag question; no breaks/blisters; only mild pressure redness                                                       | Tier **`SELF_CARE`**, risk **low**                       |
| **② See a clinician soon**      | A **new blister / superficial skin break**, but **no** fever, no spreading redness, no gangrene                                              | Tier **`PRIMARY_CARE`**, higher risk                     |
| **③ Emergency (red flag)**      | Any red flag "Yes" — e.g. **black/gangrenous tissue**, **rapidly spreading redness**, **foul-smelling pus**, or **fever + red swollen foot** | Tier **`EMERGENCY`** (red banner, seek care immediately) |

> Also: if **≥2 red-flag questions are answered "unsure"**, a severe infection cannot be ruled out, so the result is **`ABSTAIN`** (see a clinician). This is a **deliberate, conservative** design — better to over-refer than to miss a red flag.

**How to switch language:** tap the **language selector in the top-right corner** and pick English / 简体中文 / Bahasa Melayu / Tamil / Filipino; the UI updates **instantly** (works offline too).

**How to verify offline support:** open DevTools → Network → tick **Offline** → reload → the app still works (assessment and history are unaffected; the environmental card falls back to built-in data).

---

## Synthetic data & testing

> **Important: all tests below are REGRESSION TESTS.** They verify that the software behaves consistently and that grading is reproducible. They are **not** clinical trials or medical validation and do **not** prove clinical effectiveness.

- **Purpose:** guarantee that the **same input always yields the same result**, and that the result is **identical across all 5 languages** (`test:crosslang` verifies that a fixed input produces the same care tier and risk level in all 5 languages).
- **Data:** the demo and tests use **synthetic / built-in data** (built-in population statistics, published guideline thresholds, synthetic case profiles). **No real patient data is collected or used.**
- **Cloud path is off by default:** the demo **does not upload data to a server**; when the cloud is disabled `cloudDb.ts` is a no-op, and a failed cloud write falls back to local storage without ever blocking the main flow.

---

## The 5 languages & how the translations were made

**Supported:** English (`en`) · 简体中文 Simplified Chinese (`zh-CN`) · Bahasa Melayu (`ms`) · தமிழ் Tamil (`ta`) · Filipino (`fil`).

- **Switching:** use the **language selector in the top-right corner**; the UI updates instantly (**no network needed**).
- **How it works:** all 5 locale bundles are **compiled into the JS at build time**; any key missing at runtime **falls back to English** (i18next `fallbackLng: "en"`).
- **Language is decoupled from clinical logic:** the rule engine emits only **translation keys and enums**; the UI renders them per language. So **grading / thresholds / red-flag / blood-glucose-unit logic is language-independent**, and adding a language cannot change a judgement.

> **About the AI translation (being honest):** the `ms` / `ta` / `fil` strings were **translated by AI from the English baseline** and then checked automatically for consistency (key alignment, placeholders, empty values — `npm run test:i18n-keys` reports **0 missing / 0 orphan**). They have **not** been reviewed line-by-line by native speakers — have a native speaker review the medical and colloquial terms before real-world use.

---

## Scope & safety

- ✅ **It is:** foot **screening** and **health education**, care-tier guidance, self-care tips.
- ❌ **It is not:** a diagnostic device; it gives **no medication or dosage advice** and **does not replace** assessment or treatment by a qualified professional.


- Outputs are **preliminary risk indicators only**, not a diagnosis. Seek **immediate medical care** if you notice any of: black/gangrenous tissue, rapidly spreading redness, foul-smelling pus, fever with a red swollen foot, or altered consciousness.
- This is a **demo prototype**, not reviewed or approved by any regulator; a separate assessment is required before any clinical use.

---

## Run locally

**Prerequisites:** Node.js 18+ (20+ recommended).

```bash
# 1. Enter the front-end directory
cd web

# 2. Install dependencies
npm install

# 3. Start the dev server (http://localhost:3000 by default)
npm run dev
```

**Production build (static export):**

```bash
cd web
npm run build          # emits a static site to web/out/
# Preview the static output locally (either one)
npx serve out          # or: python3 -m http.server 4173 --directory out
```

> The app uses `output: "export"` and has **no server**. The build output `web/out/` can be deployed to any static host.

**Run the tests:**

```bash
cd web
npm run test:triage     # triage engine
npm run test:assess     # assessment / risk scoring
npm run test:profile    # mandatory profile fields
npm run test:i18n       # 5-language key coverage
npm run test:i18n-keys  # 5 languages aligned with en.json (missing / orphan)
npm run test:crosslang  # same input → identical grading across 5 languages
npm run test:cloud      # cloud fallback (never blocks the main flow)
npm run test:firstrun   # first-run welcome / onboarding
npm run test:interval   # screening intervals
npm run test:reassess   # re-assessment / escalation comparison
```

---

## License

[MIT License](LICENSE) (with a medical/clinical-use notice).

---

## Disclaimer

This software is a **screening and health-education** prototype. It **does not constitute medical advice**, **gives no medication advice**, and **does not replace professional diagnosis or treatment**. Users should consult a qualified healthcare professional about any health concern. The software is provided "as is", and the authors accept no liability for its use.
