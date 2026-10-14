# Assessment Results ↔ Medical Standards Cross-Reference

> **Purpose:** For competition presentation. Lists the **grading criteria** corresponding to **each type of assessment result**, and **which medical source** that criterion **comes from**.  
> This document aligns, item by item, "how the code actually decides" with "which medical standard that decision comes from," and **honestly marks which thresholds have a source and which are our own calibration**.

**Version:** v3.12-binary-options | **Date:** 2026-10-13  
**Companion files:** `docs/中文说明/data-sources-and-grading-zh.md` (data source registry + grading criteria overview), `docs/中文说明/question-bank-and-selection-logic-zh.md` (per-question weights, auto-generated)

---

## 0 · 30-Second Walkthrough

1. The app produces **5 types of results**, of which the **care tier** is the primary result — it answers "where should I go right now."
2. The care tier is determined by **13 deterministic rules**, with **no AI involved whatsoever**: the same set of answers always yields the same result.
3. The rules come from four sets of standards that are **publicly downloadable and verifiable item by item**: **SIRS 1992** (systemic inflammatory response), **IWGDF/IDSA 2023** (diabetic foot infection classification), **IWGDF 2023** (foot ulcer risk stratification), **NICE NG19** (UK guideline for the prevention and management of diabetic foot problems).
4. The severity score and the care tier are **deliberately decoupled**: the score answers "how severe," the tier answers "where to go." The LLM can only **explain** the tier, **not modify** it.
5. When information is insufficient or self-contradictory, we **abstain** (ABSTAIN) rather than guess.

> **In one sentence:** This is not an "AI guessing at disease" app, but a screening and care-navigation tool that writes **published clinical grading standards as deterministic rules**.

---

## 1 · The 5 Types of Results the App Actually Produces

| # | Result                           | Value                                                     | UI Location                             | Code Entry Point                                           |
| - | ---------------------------- | ------------------------------------------------------ | -------------------------------- | ---------------------------------------------- |
| 1 | **Care tier**           | `EMERGENCY` / `PRIMARY_CARE` / `SELF_CARE` / `ABSTAIN` | Result page block 1 **TriageCard (primary result)**     | `triageEngine.ts` → `evaluateTriage()`         |
| 2 | **Risk level**          | `low` / `moderate` / `high` / `urgent`                 | Result page block 2                         | `assessment.ts` → `calculateRiskWithProfile()` |
| 3 | **Category scores**     | 7 categories, each with score / max / percentage                             | Result page category breakdown                          | Same as above                                             |
| 4 | **Emergency flags**     | 9 flags (**all reachable**, see §4)                                   | Affects #1, #2, #5                      | Same as above                                             |
| 5 | **Recommendation keys** | Each option with weight ≥2 generates one key                                    | Recommendations page                              | Same as above                                             |
| 6 | **IWGDF category + clinical rules**          | Category 0–3, 18 `CLINICAL_RULES`                     | **Recommendations page** (IWGDF risk level card + clinical decision rules card) | `clinicalRules.ts`                             |

> ✅ **The clinical knowledge layer is now integrated into the UI (v3.10).** The IWGDF category (Category 0–3) and 18 clinical rules are now displayed on the **recommendations page**, each rule carrying an **IWGDF 2023 / NICE NG19** source badge (source relabeling completed in v3.11).  
> The original "risk–action matrix" (`RISK_ACTION_MATRIX`) has been **deleted** — the "how soon to seek care" time windows it encoded duplicated and conflicted with the triage engine; the triage engine is the **single source of truth** for "where to go and how urgently."

---

## 2 · Care Tier (Primary Result): 13 Rules Compared One by One

**Decision method:** Pure rules, no randomness, no clock, no I/O. Sorted by `(priority, id)`; **the first match wins**.  
**Evidence strength:** ★★★ = threshold matches the guideline text; ★★☆ = guideline principle matches but the threshold is our own specification; ★☆☆ = weak source or our own calibration.

| Priority | Rule        | Result                                              | Trigger condition (question / option the user sees)                       | Medical standard                                                        | Medical source                                                  | Strength  |
| --- | --------- | ----------------------------------------------- | --------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- | --- |
| 100 | **RF-01** | 🔴 EMERGENCY                                    | `rf1` "Fever >38°C or chills?" = **Yes**           | **SIRS temperature criterion**: temperature >38 °C or <36 °C. Severe foot infection = local infection **+** SIRS     | ACCP/SCCM 1992 (Bone et al., *Chest*) + IWGDF/IDSA 2023 | ★★★ |
| 100 | **RF-02** | 🔴 EMERGENCY                                    | `rf2` "Is the redness/swelling spreading rapidly up the leg?" = **Yes**             | Erythema **>2 cm** or extending deeper than the skin/subcutaneous tissue is moderate or above; spreading erythema suggests deep infection                     | IWGDF/IDSA 2023                                       | ★★★ |
| 100 | **RF-03** | 🔴 EMERGENCY                                    | `rf3` "Is there blackened, necrotic, or gangrenous tissue?" = **Yes**          | Gangrene is a **limb-threatening** lesion, and NICE requires **immediate referral**; a single severe sign is already an emergency — no need to accumulate a count              | NICE NG19 §1.4.1                                      | ★★★ |
| 100 | **RF-04** | 🔴 EMERGENCY                                    | `rf4` "Is there foul-smelling pus or exudate?" = **Yes**             | Foul odour suggests deep / anaerobic / necrotising infection (IWGDF/IDSA 2023 severe infection criterion)                 | IWGDF/IDSA 2023                                       | ★★☆ |
| 100 | **RF-05** | 🔴 EMERGENCY                                    | `rf5` "Are you confused, drowsy, or unusually unwell?" = **Yes**         | Altered mental status is the basis for **sepsis (qSOFA / Sepsis-3)**, **not one of the 4 SIRS criteria** | Sepsis-3 (*JAMA* 2016)                                 | ★★☆ |
| 300 | **PC-01** | 🟠 PRIMARY_CARE                                 | `w1c` "Has a wound or ulcer right now" = Yes, and **no** systemic signs         | Superficial ulcer / open wound without systemic manifestations → requires professional care, not necessarily emergency care                             | IWGDF 2023                                            | ★★★ |
| 300 | **PC-02** | 🟠 PRIMARY_CARE                                 | `sk1` selects "new blister / fluid-filled swelling"                    | A new blister is a **precursor lesion** to ulceration and requires professional assessment                                        | IWGDF 2023                                            | ★★☆ |
| 300 | **PC-03** | 🟠 PRIMARY_CARE                                 | `sk1` selects "skin crack / fissure"                     | A deep heel fissure is a high-risk precursor lesion to ulceration                                              | IWGDF 2023                                            | ★★☆ |
| 310 | **PC-04** | 🟠 PRIMARY_CARE<br />(confidence = `escalated`) | `sk1` selects "pressure redness" **and** `isVulnerable()` is true | Mild redness on a high-risk foot already requires professional assessment (**the escalation logic is our own calibration**, not a guideline clause)                        | IWGDF 2023 (principle)                                        | ★★☆ |
| 350 | **AB-01** | ⚪ ABSTAIN                                       | Self-contradictory answers (3 combinations, see §6)                      | Safety design: do not guess on contradictory input                                                 | —                                                     | —   |
| 350 | **AB-02** | ⚪ ABSTAIN                                       | ≥2 red-flag questions answered "unsure" **and** no clear local wound               | Safe conservative rule: when too many items are uncertain, prefer referral (the SIRS "≥2 items" is **supporting** evidence)                    | Our safety calibration (§7)                                            | ★★☆ |
| 400 | **SC-01** | 🟢 SELF_CARE                                    | `sk1` selects "pressure redness" (**not** a high-risk foot)                | Mild pressure redness, **skin intact** → offloading + home observation (IWGDF 2023 prevention Rec 4/5)         | IWGDF 2023                                            | ★★☆ |
| 490 | **SC-02** | 🟢 SELF_CARE                                    | Fallback (no positive findings at all)                             | No acute problem → routine self-monitoring                                              | IWGDF 2023                                            | ★★★ |

> **Key design: EMERGENCY has no "count threshold."** The 5 RF rules are each independent; **any single "Yes" triggers an emergency**.  
> The guideline contains **no** numeric requirement for "how many symptoms count as an emergency"; requiring a count to be met before escalating is **less safe** than the guideline.

---

## 3 · Risk Level (Second Result)

**Decision method:** `ratio = weighted total score / max score`, taking the first matching item in the order below.

| Order | Condition                               | Result           | Basis                                   |
| -- | -------------------------------- | ------------ | ------------------------------------ |
| 1  | Emergency flags include `chronicWound`             | **urgent**   | IWGDF-W02: wound unhealed for >2 weeks = chronic unhealed wound, requires urgent referral |
| 2  | **Any** emergency flag, **or** `ratio ≥ 0.85` | **high**     | Flags come from §4; **0.85 is our own band**               |
| 3  | `ratio ≥ 0.60`                   | **moderate** | **0.60 is our own band**                       |
| 4  | Everything else                               | **low**      | Fallback                                   |

- Each option's weight value is **our own calibration** (see the auto-generated question bank document); it is **not** a score given by any guideline.
- The max score **varies with the questions drawn in that session** (each session asks only 7 mandatory questions + 4 personalised ones), so the score is used only for **banding** and is not presented externally as a "severity percentage."
- **Note:** `historyUlcer` (past ulcer) and `amputationHistory` (past amputation) are both **healed past events**, yet both push the risk level up to `high` (IWGDF category 3). This is a **deliberate conservative design**: a history of ulcer carries the highest recurrence risk and should not be displayed as "low risk."

---

## 4 · Emergency Flags (9 in total, **all reachable**)

| Flag                   | Which option of which question triggers it       | Medical meaning                    | Source               | Reachable?        |
| -------------------- | ----------------- | ----------------------- | ---------------- | ---------- |
| `redFlagFever`       | `rf1` → Yes       | SIRS temperature criterion                | ACCP/SCCM 1992   | ✅          |
| `redFlagSpreading`   | `rf2` → Yes       | Spreading / deep infection              | IWGDF/IDSA 2023  | ✅          |
| `redFlagGangrene`    | `rf3` → Yes       | Tissue necrosis, limb-threatening               | NICE NG19 §1.4.1 | ✅          |
| `redFlagFoulPus`     | `rf4` → Yes       | Deep / necrotising infection              | IWGDF/IDSA 2023  | ✅          |
| `redFlagMentalState` | `rf5` → Yes       | Sepsis (qSOFA)              | Sepsis-3 2016    | ✅          |
| `activeWound`        | `w1` → "Has a wound right now"     | Active ulcer                   | IWGDF 2023       | ✅          |
| `chronicWound`       | `w2` → "More than 2 weeks"    | Chronic unhealed wound >14 days           | IWGDF-W02        | ✅          |
| `historyUlcer`       | `w1b` → "Had a wound before, now healed" | Past ulcer = IWGDF category 3, highest recurrence risk | IWGDF 2023       | ✅ fixed in v3.10 |
| `amputationHistory`  | Profile "past amputation" = yes     | Past amputation = highest risk              | IWGDF 2023       | ✅          |

> ⚠️ **`historyUlcer` is a "risk flag" rather than an "emergency flag"**: it pushes the risk level up to `high`, but it does **not** make the triage engine return EMERGENCY (the triage engine only looks at `rf1`–`rf5` and local wound findings). Currently all 9 flags share the same red alert block, with uniform wording of "seek care within 24–48 hours" — slightly strict for a past ulcer, but the direction is **safe**.

---

## 5 · IWGDF Category (Category 0–3)

**Decision method:** `clinicalRules.ts` → `mapToIWGDFCategory()`. **Purpose:** determines the review interval; now displayed on the **recommendations page**.  
**Since v3.10, changed to IWGDF faithful combination rules** (two of the three items → category 2; exactly one → category 1).

| Order | Condition                                                        | Result    | IWGDF 2023 definition                                  | Guideline screening interval  | Value used in this project         |
| -- | --------------------------------------------------------- | ----- | ---------------------------------------------- | ------- | ------------- |
| 1  | Flags include `historyUlcer` / `amputationHistory` / `chronicWound` | **3** | (LOPS or PAD) **+** past ulcer / amputation / renal replacement / Charcot foot | 1–3 months  | **1 month** (conservative end) |
| 2  | **≥2 of** the three items LOPS / PAD / foot deformity                             | **2** | LOPS+PAD, or LOPS+foot deformity, or PAD+foot deformity                  | 3–6 months  | **3 months** (conservative end) |
| 3  | LOPS ≥30% **or** circulation (PAD) ≥30%, and **exactly one item**                     | **1** | LOPS **or** PAD                                 | 6–12 months | **6 months** (conservative end) |
| 4  | Everything else                                                        | **0** | No LOPS, no PAD, no deformity                               | 12 months   | **12 months**     |

> **Consistency of wording (v3.10 fix):** The **text interval** of `IWGDF_CATEGORIES[].screeningFrequency` and the **numeric value** of `IWGDF_SCREENING_INTERVAL_MONTHS` are now fully consistent (12 / 6–12 / 3–6 / 1–3 months, taking the conservative end 12/6/3/1), and a unit test assertion "the numeric value must fall within the text interval" was added to prevent drift again.  
> **Foot deformity alone** still maps to **category 0** — IWGDF does not list "foot deformity alone" as a risk category.  
> **Proxy note:** We use **questionnaire category scores** (neuropathy ≥30% / circulation ≥30% / skin ≥40%) to approximate the **clinical examination results** of LOPS and PAD (10 g monofilament, ABI); this is an engineering approximation, see §7.

---

## 6 · Basis for Abstention (ABSTAIN)

| Rule             | Trigger condition (3 contradictory combinations + 1 insufficient-information case)                                                                      | Basis                                                      |
| -------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **AB-01** Self-contradictory | ① `s1` "no change in skin colour" but selects "pressure redness"<br />② `n1` "sensation normal" but `n3` "cannot feel light touch"<br />③ `w1` "never had a wound" but now selects "crack / new blister" | Safety design: do not guess on contradictory input                                             |
| **AB-02** Insufficient information | **≥2 of the 5 red-flag items unanswered**, and no clear local wound                                                                  | **Our own safety-conservative calibration**: when information is insufficient, prefer referral; the SIRS "≥2 items" serves as **supporting** (non-derivational) evidence, see §7 |


**Binary logic (v3.12 update):** The red-flag questions now have only two options, "yes / no" (the "unsure" option was removed), making the assessment result more precise. The `undefined` state means only "not yet answered" and will not occur in the normal UI flow (a selection is required on every question before proceeding to the next). That state is retained as a safety net for the programming interface: when a programmatic call passes in incomplete answers, it still triggers ABSTAIN.

> **Why is the threshold 2 rather than 4?** The lower the threshold, the more conservative — every "unanswered" item is an **emergency possibility that has not been ruled out**. Choosing 2 is our deliberate safety stance, not a hard guideline requirement; the value has been parameterised (`TRIAGE_METADATA.abstainThreshold`) and can be recalibrated with synthetic data.

---

## 7 · Honest Disclosure: Which Items Have a Source and Which Are Our Own Calibration

> We recommend **proactively stating** this section. What judges dislike most is presenting self-defined thresholds as guideline standards; proactively distinguishing them actually earns points.

### ✅ With a clear guideline source

| Criterion                                                                              | Source                                                   |
| ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| SIRS 4-item thresholds (temperature >38/<36 °C, heart rate >90, respiration >20 or PaCO₂ <32, WBC >12/<4 or band forms >10%) and "≥2 items" | ACCP/SCCM 1992 (Bone et al., *Chest* 101:1644-55)     |
| Diabetic foot infection 4-level classification (uninfected / mild ≤2 cm / moderate >2 cm or deeper / severe = local infection + SIRS)                    | IWGDF/IDSA 2023                                      |
| Definition and screening intervals of IWGDF risk stratification 0–3 (12 / 6–12 / 3–6 / 1–3 months)                               | IWGDF 2023 prevention guideline                                      |
| ABI < 0.9 = lower-extremity arterial disease                                                              | IWGDF PAD guideline                                         |
| 10 g Semmes-Weinstein monofilament to test protective sensation (LOPS)                                            | IWGDF 2023 prevention guideline (Rec 1-2 & Table 1) / NICE NG19 §1.3.4 |
| HbA1c ≥ 58 mmol/mol (7.5%) = glycaemic control requires intensification                                              | NICE NG28 §1.6 (this project uses **≥64 mmol/mol / 8%** as the conservative line)      |
| Diabetes duration > 10 years → increased risk of neuropathy / PAD                                                  | IWGDF-H01                                            |
| Wound unhealed for > 14 days = chronic unhealed wound                                                          | IWGDF-W02                                            |

### ⚠️ Our own calibration (no direct guideline source; must be described as "productisation calibration")

| Item                                      | Description                                          |
| -------------------------------------- | ------------------------------------------- |
| Category percentage thresholds **30% / 40% / 50%**            | Used to turn a "continuous score" into "whether a given rule is hit"; an engineering calibration                 |
| Risk banding **ratio ≥ 0.60 / 0.85**           | Same as above                                          |
| The **weight value** of each option (0–5 points)                   | We assign values ranked by clinical importance                                |
| **Abstention threshold = 2 uncertain items**                      | Our **safety-conservative calibration**; the SIRS "≥2 items" is only supporting evidence, not the source from which it is derived        |
| "High-risk foot" `isVulnerable()` includes **HbA1c > 8%** | It is a NICE NG19 / IWGDF risk factor and is **not** part of IWGDF risk stratification |
| The "escalation" logic of PC-04                          | Conservative design: high-risk foot + mild redness already means referral                         |
| Treating "category score ≥30%" as a **proxy** for "LOPS positive"         | LOPS is originally a **clinical examination result** from the 10 g monofilament; we approximate it with questionnaire scores        |
| Grouping past ulcer / past amputation under the "emergency flag" red alert block              | Both are **risk flags** (IWGDF category 3), not emergencies; sharing the red alert block is strict but safe in direction   |

> **Removed:** The original `RISK_ACTION_MATRIX` time windows ("2–4 weeks", "48 hours", "today") **have been removed from the code** — they duplicated and conflicted with the triage engine's time windows and were operational advice rather than guideline text. Now "where to go and how urgently" is decided in exactly one place: `triageEngine.ts`.

---

## 8 · The 7 Inconsistencies Recommended for Fixing Before the Defence — ✅ All Fixed (v3.10)

> The table below lists the issues found in the v3.9 audit and their fixes in v3.10. **You can now say directly "we audited and corrected these 7 points" instead of "pending."**

| # | Issue                        | Fix (v3.10)                                                                                                                                                                                                              | Location                                                    |
| - | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| ① | **rf5 was described as the 2nd SIRS item**   | ✅ The comment was changed to "this tool collects only **1 of the 4 SIRS items** (temperature `rf1`); the `rf5` altered mental status belongs to **qSOFA / Sepsis-3** and is an independent emergency trigger"                                                                                                                                | `triageEngine.ts` `SIRS_CRITERIA`                     |
| ② | **The argument for ABSTAIN ≥2 relied on SIRS** | ✅ `UNKNOWN_ABSTAIN_THRESHOLD` is now described as **our own safety-conservative calibration**, the SIRS "≥2 items" is listed as **supporting** (non-derivational) evidence, and it is noted that the value can be recalibrated with synthetic data                                                                                                                              | `triageEngine.ts`                                     |
| ③ | **Screening intervals were self-contradictory**              | ✅ `IWGDF_CATEGORIES[].screeningFrequency` and the `CLINICAL_RULES` action descriptions were unified to **12 / 6–12 / 3–6 / 1–3 months**, consistent with `IWGDF_SCREENING_INTERVAL_MONTHS` (12/6/3/1); a unit test assertion "the numeric value must fall within the text interval" was added                                                  | `clinicalRules.ts` + `screening-interval-test.ts`     |
| ④ | **PAD alone was graded as category 0**        | ✅ `mapToIWGDFCategory` was changed to the IWGDF **faithful combination rules**: two of the three items (LOPS / PAD / deformity) → category 2; exactly one → category 1; deformity alone → category 0. Added unit tests for "PAD alone → category 1" and "deformity alone → category 0"                                                                                           | `clinicalRules.ts`                                    |
| ⑤ | **The "past ulcer" branch was unreachable**           | ✅ `w1b` (healed ulcer) now sets the `historyUlcer` flag → the branch is reachable; people with a past ulcer were corrected from "low risk" to "high risk" (IWGDF category 3); this is a **safety fix**                                                                                                                                   | `assessment.ts`                                       |
| ⑥ | **The source of PC-02 new blister was labelled Kaggle** | ✅ Relabelled to **IWGDF 2023**; `"Kaggle"` was removed from the `TriageRule.source` union type; **Sepsis-3** was added to `TRIAGE_SOURCES` and Kaggle removed (Kaggle is still used for population profiling in `riskProfiles.ts`)                                                                               | `triageEngine.ts`                                     |
| ⑦ | **The 18 clinical rules were not wired into the UI**          | ✅ The recommendations page gained a **clinical decision rules card** (with **IWGDF 2023 / NICE NG19** source badges) + an **IWGDF risk level card**; `getApplicableRules()` is now wired in; the uncalled `getFullRiskAssessment()` and the duplicate `RISK_ACTION_MATRIX` were deleted; an i18n coverage unit test was added (18 rules × en/zh-CN + source badges + sourceRef existence) | `recommendations/page.tsx` + `en.json` / `zh-CN.json` |

**Verification:** Zero TypeScript errors; **all 208 unit tests pass** (interval 38 · i18n 71 · assess 35 · triage 46 · firstrun 11 · profile 14); browser regression **all 28 + 31 items pass**, 0 console errors.

---

## 9 · Quick Answers to Judge Questions

| What a judge might ask           | One-sentence answer                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| "What justifies saying I should go to the emergency department?"     | Any single red flag being "yes" means emergency — based on IWGDF/IDSA 2023: severe foot infection = local infection + SIRS, and the guideline has **no** numeric threshold of "enough symptoms"                              |
| "Why is the abstention threshold 2?"   | This is **our deliberate conservative calibration**, not a hard guideline requirement: each additional red flag answered "unsure" adds one more emergency possibility that has not been ruled out. The SIRS "≥2 items" only **supports** this lower bound as reasonable; it is not the source from which it is derived; the value is parameterised and can be recalibrated with synthetic data     |
| "Can the AI change the result?"    | No. The tier is locked by pure-function rules (`locked: true`), the system prompt given to the LLM explicitly forbids modifying the tier, and there is an additional `isTierUnchanged()` guard                               |
| "How is the score calculated?"       | Weighted total score ÷ max score, banded at 0.60 / 0.85. **The weights are our own calibration**, used only for banding, not presented externally as a severity percentage                                                    |
| "Why three grading systems?"      | Because they answer **different questions**: the care tier answers "where to go", the risk level answers "how severe", and IWGDF answers "how often to re-check". Deliberately decoupled                                                  |
| "Where can I see the IWGDF category?"  | The "IWGDF risk level" card on the recommendations page, containing the category definition, basis, and recommended screening interval                                                                        |
| "Where can I see the 18 clinical rules?"  | The "clinical decision rules" card on the recommendations page, showing only **the rules actually triggered in this assessment**, each with a source badge                                                                 |
| "How do you ensure fairness?"       | The question bank is drawn personalised by age / disease duration / complications / HbA1c, but the **assessment logic does not differentiate by diabetes type or sex**; synthetic data (Synthea) is used for fairness testing                                  |
| "Why not use AI to look at photos?" | We deliberately do not. Image-based diagnosis falls within the scope of medical devices, and we position ourselves as a **screening and educational tool**. Every page carries a red-box notice                                                             |
| "Which 6 data sources did you use?"   | data.gov.sg (population context), **NICE NG19** (triage rules / referral criteria), IWGDF (risk stratification), MIMIC-III (critical-infection threshold calibration), Kaggle (high-risk profiling), Synthea (synthetic test data) |

---

## 10 · Citation List

| Source                  | Full citation                                                                                                                                                  | Use in this project                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **IWGDF 2023**      | Schaper NC, et al. *IWGDF Guidelines on the prevention and management of diabetes-related foot disease.* 2023 (prevention section: Bus SA, et al.)                    | Risk stratification 0–3, screening intervals, ulcer prevention                                                                         |
| **IWGDF/IDSA 2023** | Senneville É, et al. *IWGDF/IDSA guidelines on the diagnosis and treatment of diabetes-related foot infections.* Diabetes Metab Res Rev. 2023         | Infection 4-level classification; severe = local infection + SIRS                                                                  |
| **ACCP/SCCM 1992**  | Bone RC, et al. *Definitions for sepsis and organ failure and guidelines for the use of innovative therapies in sepsis.* Chest. 1992;101(6):1644-1655 | SIRS 4-item thresholds and "≥2 items"                                                                          |
| **Sepsis-3**        | Singer M, et al. *The Third International Consensus Definitions for Sepsis and Septic Shock.* JAMA. 2016;315(8):801-810                               | qSOFA; basis for altered mental status (rf5)                                                                         |
| **NICE NG19**       | NICE. *Diabetic foot problems: prevention and management.* NICE Guideline NG19. 2015; last updated 2023. <https://www.nice.org.uk/guidance/ng19>      | Gangrene / limb-threatening → immediate referral (§1.4.1); annual foot screening (§1.3.3); 10 g monofilament / pulse examination (§1.3.4); risk stratification (§1.3.6); skin and nail care (§1.3.10) |
| **NICE NG28**       | NICE. *Type 2 diabetes in adults: management.* NICE Guideline NG28. <https://www.nice.org.uk/guidance/ng28>                                           | Glycaemic control: intensify treatment when HbA1c ≥58 mmol/mol (7.5%) (§1.6); patient education (§1.3.13)                                     |
| **MIMIC-III**       | Johnson AEW, et al. *MIMIC-III, a freely accessible critical care database.* Sci Data. 2016;3:160035                                                  | Critical infection / sepsis ICD-9 reference (**only for threshold calibration**)                                                           |
| **Kaggle**          | CDC BRFSS 2015 — *Diabetes Health Indicators Dataset* (253,680 rows, 21 features)                                                                                | Reference for high-risk population profile features (**a dataset, not a guideline**)                                                                    |
| **Synthea**         | Walonoski J, et al. *Synthea: An approach, method, and software mechanism for generating synthetic patients.* JAMIA. 2018;25(3):230-238               | Synthetic patient test data, fairness testing                                                                             |
| **data.gov.sg**     | Singapore open data (real-time weather / PSI / prevalence)                                                                                                                 | Population context and environmental reminders                                                                                  |

### ✅ Resolved Citation Issues (v3.11)

| Citation                                                       | Status    | Resolution                                                                                                                                                                                              |
| -------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Singapore ACE 2024 — Diabetic Foot Clinical Guidance** | ✅ Resolved | After a comprehensive search on the ACE official website (ace-hta.gov.sg), **no** diabetes-foot-specific guidance document **could be found**. All 11 rules previously attributed to ACE have been relabelled to publicly downloadable, item-by-item verifiable sources: **IWGDF 2023** (prevention/PAD guideline), **IWGDF/IDSA 2023** (infection classification), **NICE NG19** (referral criteria), and **NICE NG28** (glycaemic management). Both the code and the documentation have been updated in sync. |

> **Note:** The definitions and thresholds of IWGDF 2023, IWGDF/IDSA 2023, SIRS 1992, Sepsis-3, NICE NG19, and NICE NG28 above were all checked in this round; the IWGDF category definitions and screening intervals, and the SIRS four-item thresholds and the "≥2" principle, are **consistent with the original text**.  
> The only item of our own calibration: the conservative line of **HbA1c ≥64 mmol/mol (8%)** is higher than NICE NG28's ≥58 mmol/mol (7.5%), and has been clearly marked as a "productisation conservative calibration".
