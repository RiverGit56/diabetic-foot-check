# Data Source Registry and Grading Criteria Explanation

**Version:** v3.10-consistency-fixes ｜ **Date:** 2026-10-13  
**Purpose:** To verify the registration classification of the 6 medical data sources, and to explain the grading criteria for the final assessment results and the **review interval** (both the review-interval algorithm and the UI display are already wired in).

> **Companion file:** The item-by-item "assessment result ↔ grading criterion ↔ medical source" mapping (including honest disclosures and the fix log for the 7 inconsistencies) is in `docs/中文说明/assessment-criteria-source-mapping-zh.md`.

> **Important correction in this version:** Two thresholds in the previous implementation —— "≥3 danger signals" and "≥4 uncertain" —— **were made up by us (the AI) and did not come from any medical database**. This version has been corrected according to the **actual standards** in the medical databases. See Part 2 for details.

---

## Part 1 · Registration Classification of the 6 Medical Data Sources (Verification Result)

### 1.1 Current Registration (3-layer classification)

| Layer       | Layer Name                 | Data Source                            | ID        | Purpose                        |
| ----------- | -------------------------- | -------------------------------------- | --------- | ------------------------------ |
| **Layer 1** | Macro & Background         | data.gov.sg (Singapore open data)      | `source5` | Local disease prevalence and population background |
| **Layer 2** | Medical Rules & Standards  | NICE NG19 — Diabetic foot problems: prevention and management (UK) | `source1` | Core triage rules / referral criteria |
| **Layer 2** |                            | IWGDF Risk Stratification (0–3)        | `source3` | International risk stratification standard |
| **Layer 2** |                            | MIMIC-III / PhysioNet (optional)       | `source6` | Critical-infection thresholds  |
| **Layer 3** | Patient Features & Testing | Kaggle: Diabetes Health Indicators     | `source2` | High-risk profile              |
| **Layer 3** |                            | Synthea Synthetic Patient Records      | `source4` | Synthetic test data            |

**Conclusion:** ✅ Consistent with the 3-layer structure you provided (Layer1=data.gov.sg; Layer2=NICE/IWGDF/MIMIC-III; Layer3=Kaggle/Synthea).

### 1.2 Inconsistencies That Have Been Fixed

| # | Issue                          | Original state                                                                          | Fixed                                                              |
| - | ------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1 | **ACE reference verified to not exist** | A code comment once said `American College of Endocrinology`, later changed to `Agency for Care Effectiveness, Singapore MOH` | **Removed**: no diabetic-foot-specific guidance could be found on the official ACE website; all related rules were relabeled to **IWGDF 2023 / NICE NG19** (both are publicly downloadable and verifiable item by item) |
| 2 | **Kaggle dataset inconsistency** | The homepage displayed `Diabetes Health Indicators Dataset`, while the code referenced `Pima Indians Diabetes Dataset` (two different datasets) | Unified to `Diabetes Health Indicators (CDC BRFSS 2015, 253,680 rows, 21 features)` |
| 3 | **The two "data source" lists mean different things** | The 6 "medical data sources" on the homepage vs. the 6 "runtime connections" on the `/data` page | Not an error (different purposes); suggest distinguishing them by name |

### 1.3 On the Classification of MIMIC-III (Debatable)

MIMIC-III is essentially an **ICU patient dataset**, not a clinical guideline. Placing it in Layer 2 classifies it by "purpose" (calibrating red-flag thresholds); classified by "data nature" it would be closer to Layer 3.

---

## Part 2 · Grading Criteria for Assessment Results

> ⚠️ **The app has three parallel gradings**: risk level (how severe), care tier (where to go), IWGDF category (follow-up frequency).

### 2.1 Medical Basis (the True Source of the Grading Criteria)

**The grading is not made up from experience, but comes from two sets of authoritative definitions:**

**① SIRS (Systemic Inflammatory Response Syndrome) criteria**  
Source: ACCP/SCCM consensus conference (Bone et al., *Chest* 1992;101:1644-55)  
**Meeting ≥2 of the following 4 items = SIRS positive:**

| Item      | Threshold                    |
| --------- | ---------------------------- |
| Temperature | > 38 °C or < 36 °C         |
| Heart rate  | > 90 bpm                   |
| Respiration | > 20 breaths/min or PaCO₂ < 32 mmHg |
| White blood cells | > 12 or < 4 ×10⁹/L, or band forms > 10% |

**② IWGDF/IDSA diabetic foot infection grading**  
Source: IWGDF/IDSA 2023 guideline

| Grade | Name        | Criterion                          |
| ----- | ----------- | ---------------------------------- |
| 1  | Uninfected    | No local/systemic signs of infection |
| 2  | Mild          | Skin/subcutaneous only; erythema ≤ 2 cm |
| 3  | Moderate      | Deeper than skin/subcutaneous, or erythema > 2 cm |
| 4  | **Severe**    | **Local infection + SIRS (systemic inflammation)** |

> **Key conclusion:** Severe infection = local infection + SIRS, and SIRS requires **≥2** signs.  
> In the medical standards there is **no** numerical threshold for "how many symptoms count as an emergency" —— any single severe sign (gangrene, spreading infection, systemic toxicity) is itself an emergency.

### 2.2 Care Tier —— The Primary Result

- **Code:** `triageEngine.ts` → `evaluateTriage(input)`
- The primary result shown by the TriageCard at the top of the results page (answers "where should I seek care right now")
- Pure rules, deterministic, sorted by `(priority, id)`, **the first match wins**

| Priority | Rule     | Tier             | Trigger condition (medical basis)          |
| -------- | -------- | ---------------- | ------------------------------------------ |
| **100** | RF-01    | **EMERGENCY**    | Fever >38°C / chills (SIRS temperature item) |
| **100** | RF-02    | **EMERGENCY**    | Rapidly spreading redness/swelling (deep/spreading infection) |
| **100** | RF-03    | **EMERGENCY**    | Blackening / gangrenous tissue (tissue necrosis, limb-threatening) |
| **100** | RF-04    | **EMERGENCY**    | Foul-smelling pus (deep/necrotizing infection) |
| **100** | RF-05    | **EMERGENCY**    | Altered consciousness (sepsis / organ dysfunction) |
| **300** | PC-01…03 | **PRIMARY_CARE** | Superficial ulcer / new blister / broken skin (no systemic symptoms) |
| **310** | PC-04    | **PRIMARY_CARE** | Mild redness on a high-risk foot (escalated) |
| **350** | AB-01    | **ABSTAIN**      | Answers are self-contradictory             |
| **350** | AB-02    | **ABSTAIN**      | **≥2 red-flag questions unclear** (cannot rule out SIRS) |
| **400** | SC-01    | **SELF_CARE**    | Mild pressure redness, skin not broken     |
| **490** | SC-02    | **SELF_CARE**    | No acute problem (default fallback)        |

**Note: EMERGENCY has no numerical threshold** —— the 5 RF rules above are each independent; any one being "yes" triggers an emergency.

### 2.3 The ABSTAIN Threshold —— Why It Is 2, Not 4

**Medical basis:** Severe infection = local infection + SIRS, and SIRS requires **≥2** signs.

Therefore: **when ≥2 red-flag questions are "unclear", SIRS cannot be ruled out → severe infection cannot be ruled out → abstain (advise seeking care).**

- The threshold **2** comes directly from the SIRS "≥2 items" rule, and is not arbitrary.
- The previous "**≥4**" had no medical basis whatsoever and has been removed.
- If only 1 item is unclear and the rest are clearly "no", then SIRS can be ruled out and normal grading continues.

### 2.4 Risk Level: `low` / `moderate` / `high` / `urgent`

- **Code:** `assessment.ts` → `calculateRiskWithProfile(answers, profile)`
- **Basis:** weighted total score ratio `ratio = total score / max score`

| Order | Condition                        | Result       |
| ----- | -------------------------------- | ------------ |
| 1  | Emergency flags include `chronicWound` | **urgent**   |
| 2  | Any emergency flag, **or** `ratio ≥ 0.85` | **high**     |
| 3  | `ratio ≥ 0.60`                   | **moderate** |
| 4  | Everything else                  | **low**      |

### 2.5 IWGDF Category (Category 0–3)

- **Code:** `clinicalRules.ts` → `mapToIWGDFCategory(result)`
- Purpose: determines screening frequency (Category 0 every 12 months → Category 3 every 1–3 months); already displayed on the **recommendations page**

| Order | Condition                                                | Result         | IWGDF 2023 definition                  |
| ----- | -------------------------------------------------------- | -------------- | -------------------------------------- |
| 1  | Emergency flags include `historyUlcer` / `amputationHistory` / `chronicWound` | **Category 3** | (LOPS or PAD) + prior ulcer/amputation/renal replacement/Charcot foot |
| 2  | **≥2 of the three**: LOPS / PAD / foot deformity         | **Category 2** | LOPS+PAD, or LOPS+foot deformity, or PAD+foot deformity |
| 3  | LOPS ≥30% **or** circulation (PAD) ≥30%, and exactly one of them | **Category 1** | LOPS **or** PAD                        |
| 4  | Everything else                                          | **Category 0** | No LOPS, no PAD, no deformity          |

> **v3.10 fix:** The previous rule required "neuropathy ≥30%" to enter category 1/2, which caused **PAD alone to be graded as category 0**, inconsistent with the IWGDF rule that "LOPS **or** PAD is category 1". It has now been changed to a faithful combination rule; isolated foot deformity still remains category 0 (IWGDF does not list isolated deformity as a risk category).

### 2.6 The Relationship Between the Three Gradings

| Grading        | Question it answers     | Where it is displayed            |
| -------------- | ----------------------- | -------------------------------- |
| **Care tier**  | Where should I go **now**? | First block on the results page (TriageCard, **primary result**) |
| **Risk level** | How **severe** is the risk? | Second block on the results page |
| **IWGDF category** | Follow-up **frequency**? | **"IWGDF Risk Level" card on the recommendations page** (since v3.10) |

**The three are deliberately decoupled. The LLM can only explain the tier, not modify it.**

### 2.7 Review Interval —— Why It Is Not a Fixed 3 Months

**Code:** `clinicalRules.ts` → `IWGDF_SCREENING_INTERVAL_MONTHS` / `screeningIntervalMonths()` / `nextScreeningDate()`; unit test `scripts/screening-interval-test.ts` (`npm run test:interval`, 38 items).

The review interval is determined by the **IWGDF risk category**, and is **not based on age, nor a fixed number of days**:

| IWGDF category | Meaning                     | Interval in this project | Guideline range (IWGDF 2023) |
| -------------- | --------------------------- | ------------------------ | ---------------------------- |
| **0**    | No LOPS, no PAD           | **12 months** | 12 months            |
| **1**    | LOPS **or** PAD           | **6 months**  | 6–12 months          |
| **2**    | Two of the three: LOPS / PAD / foot deformity | **3 months**  | 3–6 months           |
| **3**    | Prior ulcer / amputation / end-stage renal disease | **1 month**  | 1–3 months           |

- Each interval takes the **more conservative end** (category 1 takes 6 rather than 12; category 2 takes 3 rather than 6; category 3 takes 1 rather than 3), ensuring it is never **sparser** than the guideline allows.
- **When there is currently an open wound (`activeWound` / `chronicWound`), no date is shown**; instead it prompts "seek care immediately" —— an open wound is not part of routine review, and the care tier is given by the triage engine (TriageCard).
- The date is calculated by **calendar month** (`setMonth`), not a fixed 90 days; and it is localized according to the UI language (Chinese shows `2027年1月8日`, no longer `Jan 8, 2027`).
- When there is no assessment record yet, stratification is impossible, and it falls back to **category 0 (annual screening)**.
- **"Daily foot self-check" is a separate matter** (the "Daily Foot Check-in" on the tracking page, done every day), unrelated to the professional review frequency.

> **UI status (since v3.10):** The recommendations page shows the IWGDF risk level + recommended screening interval; the "Next Assessment" card on the homepage/tracking page was removed in v3.7 (the algorithm and unit tests are retained). `mapToIWGDFCategory()` is now called directly by the recommendations page.

> **Correction log:** ① The homepage previously used a **hard-coded 90 days** (`latest ? 90 : 30`); since v3.6 it was changed to be computed from the IWGDF category, and since v3.7 that card was removed from the UI (the algorithm is retained). ② The textual ranges in `IWGDF_CATEGORIES[].screeningFrequency` once conflicted with the numeric table (category 1: 3–6 months / category 2: 1–3 months / category 3: 1–4 weeks); **v3.10 unified** them to 12 / 6–12 / 3–6 / 1–3 months, and added a unit-test assertion that "the numeric values must fall within the textual range". ③ `RISK_ACTION_MATRIX` was **deleted in v3.10** because it duplicated and conflicted with the triage engine's time windows.

---

## Part 3 · Score Composition

### 3.1 Categories and Question Counts

| Category              | Source     | Questions / fields                                            | Question count |
| --------------------- | ---------- | ------------------------------------------------------------- | -------------- |
| Red-flag symptoms `redflags` | Questionnaire (required) | rf1–rf5                                              | 5          |
| Neuropathy `neuropathy`   | Questionnaire | n1–n10                                                     | 10         |
| Skin and nails `skin`     | Questionnaire | sk1 (required) + s1/s2/s6–s13                               | 11         |
| Wound `wound`          | Questionnaire | w1 (required) + w2/w4/w5 (conditional follow-ups)            | 4          |
| Circulation `circulation` | Questionnaire | c1–c8                                                      | 8          |
| **Self-care `selfcare`** | **Profile** | footInspection + barefootFrequency + footwearType             | **0 (no questions)** |
| **History `history`**    | Questionnaire + profile | g1/g2/h1 + diabetesDuration + comorbidities + priorAmputation | 3          |

> The question bank has **41 questions** in total. Each check asks only **7 mandatory safety questions + 4 personalized questions** (+ conditional follow-ups) ≈ 11 questions, so **the max score floats with the questions drawn for that session**, and is no longer a fixed value.  
> The per-question weights, option scores, emergency flags, and personalization rules are in the auto-generated `docs/中文说明/question-bank-and-selection-logic-zh.md` (`npm run doc:bank`).

### 3.2 Profile Mapping for Self-Care and History

| Field                  | Value → score                           |
| ---------------------- | --------------------------------------- |
| `footInspection`    | daily 0 / weekly 1 / rarely 2 / never 3 |
| `barefootFrequency` | never 0 / sometimes 2 / often 3         |
| `footwearType`      | closed 0 / sandals 1 / flipflops 2      |
| `diabetesDuration`  | under5 0 / 5to10 1 / over10 3           |
| `comorbidities`     | 0 items 0 / 1–2 items 2 / ≥3 items 3       |
| `priorAmputation`   | No 0 / Yes 3 (and triggers `amputationHistory`)      |

---

## Part 4 · Correction Log and To-Dos

### Corrected According to the Medical Databases (this version)

| Item    | Original (self-devised) | Current (medical basis)                 |
| ------- | ----------------------- | --------------------------------------- |
| Emergency trigger | ≥3 danger signals (RF-00) | **No numerical threshold**: any single severe sign is an emergency (IWGDF/IDSA + NICE NG19) |
| Abstain threshold | ≥4 uncertain         | **≥2 unclear** (SIRS requires ≥2 items; severe infection cannot be ruled out) |

| Code constant | `MULTI_REDFLAG_OVERRIDE_THRESHOLD=3`, `UNSURE_ABSTAIN_THRESHOLD=4` | Delete the former; `UNKNOWN_ABSTAIN_THRESHOLD = SIRS_CRITERIA.requiredCriteria = 2` |

### To-Dos / Suggestions

1. ⚠️ This tool only collects 2 of the 5 red-flag items that are SIRS-related (temperature, consciousness). Complete SIRS also requires heart rate, respiration, and white blood cells —— these require clinical measurement and are beyond the scope of this screening tool, as explained in the code comments.
2. 💡 Change the `/data` page title to "Data Connections" to distinguish it from the homepage's "medical data sources".
3. 💡 `isVulnerable` includes `HbA1c > 8%`, and this item is **not** part of IWGDF risk stratification (it is an NICE / IWGDF risk factor); if strict alignment with IWGDF is desired, consider removing or annotating it.
4. 💡 The definition of IWGDF risk 3 also includes **end-stage renal disease (ESRD)** and **Charcot foot**, which the current profile does not collect separately; consider adding them.

---


## Appendix: Sources of Medical Basis

| Source                                                  | Purpose                         |
| ------------------------------------------------------- | ------------------------------- |
| **IWGDF/IDSA 2023** — Guidelines on the diagnosis and treatment of diabetic foot infections | Infection grading (1–4); severe = local infection + SIRS |
| **ACCP/SCCM 1992** (Bone et al., *Chest*)            | SIRS criteria (≥2 of 4 items)         |
| **IWGDF 2023** — Guidelines on prevention and management | Risk stratification (0–3)                  |
| **NICE NG19** — Diabetic foot problems: prevention and management (UK) | Red flags, referral, home monitoring                 |
| **MIMIC-III / PhysioNet**                           | Critical infection/sepsis ICD-9 reference (threshold calibration)    |
| **Kaggle: Diabetes Health Indicators (BRFSS 2015)** | High-risk profile feature reference                   |
| **Synthea**                                         | Synthetic patient test data                   |
| **data.gov.sg**                                     | Singapore prevalence and population background                |
