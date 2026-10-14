# Question Bank Overview & Per-Session Question Logic

> This file is **auto-generated from the live code** in `web/src/lib/assessment.ts`, and matches exactly what the App actually asks (see the notes in `web/scripts/` for the generation script).

> **Target population:** adults aged 60 and over with a confirmed diagnosis of **type 1 or type 2** diabetes. The assessment and triage logic **does not distinguish between diabetes types** (IWGDF 2023 / NICE NG19 stratify foot risk identically for both types).

## 1. Overview

| Item | Value |
| --- | --- |
| Total questions in the question bank | **41 questions** |
| Fixed mandatory questions per screening (safety screening) | **7 questions** |
| Personalised questions drawn per screening | **4 questions** |
| Actual number of questions per screening | **about 11 questions** (7 mandatory + 4 personalised); up to **13–15 questions** if conditional branches are triggered |
| Conditional branches (follow-up based on the previous question) | **5 questions** |
| Clinical categories (with questions) | **6 categories** (red flags · neuropathy · skin · wound · circulation · history) |
| Categories derived from the profile | **1 category** (self-care habits, no questions) |
| Languages | English / Simplified Chinese (简体中文) (Malay, Tamil and Filipino to be added later) |

### Three types of questions

| Type | Meaning | Count | Appears each time? |
| --- | --- | --- | --- |
| 🔒 **Mandatory (core)** | Safety-screening questions that directly determine the "care tier" result, and **cannot be skipped in any screening** | 7 | Asked every time |
| 🔀 **Conditional branch (adaptive)** | Appears dynamically (as a follow-up) based on **the answer to the previous question** | 5 | Asked only when the trigger condition is met |
| 🎯 **Personalised** | Drawn based on **profile** relevance (age, disease duration, blood sugar, smoking, comorbidities, footwear, barefoot, care habits, amputation history) + date rotation | 29 | 4 questions drawn each time, varying session by session / day by day |

> **The question bank keeps only questions that "detect disease symptoms".** The former "foot-care habits" category (how toenails are cut, whether moisturiser is applied, whether shoes are worn indoors, whether the person goes barefoot — 9 questions in total) has been **removed entirely**; it is instead **collected on the "Profile" page** and counted separately in the risk assessment as the "self-care" category — so the question bank below **no longer contains any questions of this type**, and the slots freed up have been replaced with **symptom-detection questions** for neuropathy / skin / circulation / history.

## 2. Complete question bank (all 41 questions)

### Red-flag symptoms (emergency) · Red flags (emergency)　(5 questions)

| # | Question ID | Type | Question | Options (weight) | When it appears / why it is asked |
| --- | --- | --- | --- | --- | --- |
| 1 | `rf1` | 🔒 Mandatory | Do you have a fever (temperature above 38°C) or chills? | No (0); Yes (3 ⚠️) | Safety screening, asked every time |
| 2 | `rf2` | 🔒 Mandatory | Is redness spreading rapidly up your leg or beyond your foot? | No (0); Yes (3 ⚠️) | Safety screening, asked every time |
| 3 | `rf3` | 🔒 Mandatory | Is there any black, dead, or gangrenous tissue on your foot? | No (0); Yes (3 ⚠️) | Safety screening, asked every time |
| 4 | `rf4` | 🔒 Mandatory | Is there foul-smelling pus or discharge from your foot? | No (0); Yes (3 ⚠️) | Safety screening, asked every time |
| 5 | `rf5` | 🔒 Mandatory | Are you feeling confused, drowsy, or unusually unwell? | No (0); Yes (3 ⚠️) | Safety screening, asked every time |

### Wound / ulcer · Wound / ulcer　(4 questions)

| # | Question ID | Type | Question | Options (weight) | When it appears / why it is asked |
| --- | --- | --- | --- | --- | --- |
| 6 | `w1` | 🔒 Mandatory | Do you have a foot wound or sore now, or have you had one before? | No, and never have (0); Had one before, but it has healed (1 ⚠️); Yes, I have a wound or sore now (4 ⚠️) | Safety screening, asked every time |
| 7 | `w2` | 🔀 Conditional branch | How long has this wound been there? | Less than 1 week (1); 1–2 weeks (3); More than 2 weeks (5 ⚠️) | **Only if** the previous question "wound status" is answered "I have a wound now" (w1c) |
| 8 | `w4` | 🔀 Conditional branch | Compared with last week, is the wound getting better or worse? | Getting better or unchanged (0); Getting worse (3) | **Only if** the previous question "wound status" is answered "I have a wound now" (w1c) |
| 9 | `w5` | 🔀 Conditional branch | Can you see bone, joint, or tendon inside the wound? | No (0); Yes (3) | **Only if** the previous question "wound status" is answered "I have a wound now" (w1c) |

### Skin and nails · Skin & nails　(11 questions)

| # | Question ID | Type | Question | Options (weight) | When it appears / why it is asked |
| --- | --- | --- | --- | --- | --- |
| 10 | `sk1` | 🔒 Mandatory | Look at both feet. Tap everything you can see right now. | Skin has cracks or fissures (2); New blisters or fluid-filled bumps (2); Redness from pressure, but the skin is not broken (1); None of the above (0) | Safety screening, asked every time |
| 11 | `s1` | 🎯 Personalised | Have you noticed any changes in skin color on your feet? | No change (0); Darker or discoloured (2); Red (2); Pale or purple (3) | General question (no specific profile condition; appears by rotation) |
| 12 | `s2` | 🎯 Personalised | Do you have calluses, corns, or areas of thickened skin on your feet? | No (0); Yes, mild (1); Yes, fairly severe (2) | General question (no specific profile condition; appears by rotation) |
| 13 | `s6` | 🎯 Personalised | Is the skin on your feet very dry or scaly? | No (0); Yes (1) | Profile relevance: HbA1c >8% or often goes barefoot |
| 14 | `s7` | 🎯 Personalised | Do you have itchy or white, cracked skin between your toes? | No (0); Yes (1) | Profile relevance: disease duration >10 years |
| 15 | `s8` | 🎯 Personalised | Are there areas of hard or thickened skin where your shoes rub? | No (0); A little (1); Yes, and painful or very thick (2) | Profile relevance: usually wears sandals/slippers or has amputation history |
| 16 | `s9` | 🎯 Personalised | Are your toenails thick, yellow, or curling into the skin? | No (0); Yes (2) | Profile relevance: age ≥80 years |
| 17 | `s10` | 🎯 Personalised | Has the colour of your feet or toes changed (pale, blue, or dark)? | No (0); Yes (1) | Profile relevance: age ≥80 years or HbA1c >8% |
| 18 | `s11` | 🎯 Personalised | Is there redness, swelling, pain or pus where a toenail meets the skin? | No (0); A little redness or swelling (2); Clearly red and swollen, or pus (3) | Profile relevance: age ≥80 years or rarely checks their feet |
| 19 | `s12` | 🎯 Personalised | Is there a dark or blood-coloured spot on your foot, or under a toenail? | No (0); Yes (2) | Profile relevance: usually wears sandals/slippers or sometimes/often goes barefoot |
| 20 | `s13` | 🎯 Personalised | Are there deep cracks in the skin of your heels that hurt or bleed? | No (0); Yes, but not painful (1); Yes, painful or bleeding (3) | Profile relevance: age ≥80 years or HbA1c >8% |

### Neuropathy · Neuropathy　(10 questions)

| # | Question ID | Type | Question | Options (weight) | When it appears / why it is asked |
| --- | --- | --- | --- | --- | --- |
| 21 | `n1` | 🎯 Personalised | Can you feel your feet normally when touched? | Yes, sensation is normal (0); No, reduced sensation (2) | General question (no specific profile condition; appears by rotation) |
| 22 | `n2` | 🎯 Personalised | Have you noticed any numbness, tingling, or burning sensation in your feet? | No, never (0); Sometimes (a few times a month) (1); Often (weekly or more) (3); Constant (3) | General question (no specific profile condition; appears by rotation) |
| 23 | `n3` | 🎯 Personalised | Can you feel a light touch (like a cotton swab) on your toes? | Yes, I can feel it clearly (0); No, I cannot feel it (3) | General question (no specific profile condition; appears by rotation) |
| 24 | `n4` | 🎯 Personalised | Do you get burning, tingling, or 'pins and needles' in your feet? | Never (0); Sometimes (1); Often or every day (2) | Profile relevance: disease duration >10 years or HbA1c >8% |
| 25 | `n5` | 🎯 Personalised | Do your feet feel numb, or like they are 'asleep'? | Never (0); Sometimes (1); Often or all the time (3) | Profile relevance: disease duration >10 years or HbA1c >8% |
| 26 | `n6` | 🎯 Personalised | Have you had any falls, or felt unsteady on your feet, in the past year? | No (0); Yes (2) | Profile relevance: age ≥80 years |
| 27 | `n7` | 🔀 Conditional branch | Has one foot become red, hot, or swollen, or changed shape recently? | No (0); Yes (3) | **Only if** "numbness in feet" is answered "often" (n5c) **or** "sensation" is answered "reduced sensation" (n1b) |
| 28 | `n8` | 🎯 Personalised | Have your feet changed shape — for example hammer toes, bunions, or a high arch? | No change (0); A little change (2); Clear deformity (3) | Profile relevance: disease duration >10 years or HbA1c >8% |
| 29 | `n9` | 🎯 Personalised | Can your feet tell hot from cold — for example, can you feel the water temperature in a bath? | Yes, perfectly normal (0); Less sensitive than before (2); Cannot feel hot or cold (3) | Profile relevance: disease duration >10 years or age ≥80 years |
| 30 | `n10` | 🎯 Personalised | Have you ever injured your foot — a blister, burn or cut — without feeling it until someone else noticed? | No (0); Once (2); Several times (3) | Profile relevance: disease duration >10 years or HbA1c >8% |

### Circulation (lower-limb arteries) · Circulation (PAD)　(8 questions)

| # | Question ID | Type | Question | Options (weight) | When it appears / why it is asked |
| --- | --- | --- | --- | --- | --- |
| 31 | `c1` | 🎯 Personalised | Do your feet feel cold compared to the rest of your body? | No, feet are warm (0); Sometimes cold (1); Often cold (3) | General question (no specific profile condition; appears by rotation) |
| 32 | `c2` | 🎯 Personalised | Do cuts or sores on your legs or feet heal slowly? | Not slow, they heal normally (0); Sometimes they heal slowly (2); Often heal very slowly (3) | General question (no specific profile condition; appears by rotation) |
| 33 | `c3` | 🎯 Personalised | Do you get cramping pain in your legs or calves when you walk? | No (0); Sometimes, but it eases with a rest (1); Often, and it limits how far I can walk (3) | Profile relevance: smoking or disease duration >10 years or heart disease or high cholesterol |
| 34 | `c4` | 🔀 Conditional branch | Do you get pain in your feet or legs while resting, or at night? | No (0); Yes (3) | **Only if** "leg pain when walking" is answered "sometimes" or "often" (c3b/c3c) |
| 35 | `c5` | 🎯 Personalised | Is the skin on your legs or feet shiny, tight, or losing hair? | No (0); Yes (1) | Profile relevance: smoking or heart disease |
| 36 | `c6` | 🎯 Personalised | Do your feet or ankles swell up during the day? | No (0); Yes (2) | Profile relevance: kidney disease or heart disease |
| 37 | `c7` | 🎯 Personalised | When your foot hangs down, does it turn red or dusky — and go pale when you raise it? | No (0); Yes (2) | Profile relevance: smoking or heart disease |
| 38 | `c8` | 🎯 Personalised | Compared with the other foot, is one foot noticeably colder, paler or more blue? | The two feet are about the same (0); One is colder or paler (3) | Profile relevance: smoking or disease duration >10 years |

### History and general health · History & general health　(3 questions)

| # | Question ID | Type | Question | Options (weight) | When it appears / why it is asked |
| --- | --- | --- | --- | --- | --- |
| 39 | `g1` | 🎯 Personalised | How have your blood sugar levels been over the past month? | Mostly within target range (0); Often high (3) | Profile relevance: HbA1c >8% |
| 40 | `g2` | 🎯 Personalised | Do you have any vision problems that make it hard to see your feet? | No (0); Yes (2) | Profile relevance: has eye disease (retinopathy) |
| 41 | `h1` | 🎯 Personalised | Has a doctor ever told you that you have nerve damage (neuropathy) or poor circulation in your feet? | No (0); Yes — neuropathy (2); Yes — poor circulation (2); Both (3) | Profile relevance: disease duration >10 years or HbA1c >8% |

> ⚠️ = Selecting this option lights up the "emergency alert", shown on the results page as a red banner advising immediate medical care.

## 3. Per-screening question logic (algorithm)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│  1. Mandatory safety screening  rf1–rf5 · w1 · sk1          7 questions                        │
│     (Always asked first; if an emergency cannot be ruled out, the system will "safely abstain")│
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│  2. Personalised draw    4 questions (see the 4-step algorithm below)                          │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│  3. Conditional branches      added only when the trigger condition is met (0–4 questions)     │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
        Actual number of questions per screening ≈ 11 (up to about 15 after branches are triggered)
```

### Step 2: How the 4 personalised questions are selected

1. **Eligibility filter (appliesIf)** — removes the "mandatory questions" and the "conditional-branch questions" from the question bank, leaving only the questions that **apply** to that user.
2. **Relevance ranking (relevance)** — **within each category**, scores every question based on the profile (age, disease duration, HbA1c, smoking, comorbidities, footwear, barefoot, care habits, amputation history). "Relevant questions" with a score >0 always come first.
3. **Rotation** — rotates the "relevant questions" and the "remaining questions" within each category separately using the seed `seed`, so **which specific question is asked varies**, but the most relevant candidates are always considered first.
4. **Round-robin selection** — in the order of "the highest-relevance category first", **takes 1 question from each category in turn** until 4 questions have been collected. This ensures that a single screening **covers different clinical domains** rather than concentrating on one category. There are currently exactly 4 rotatable categories (neuropathy, skin, circulation, history), so **each screening draws 1 question from each of these 4 domains**, changing only "which specific question" from one screening to the next.

### Seed: how "different every time" is guaranteed

```
seed = the day's date ordinal × 1000 + the nth screening of that day
```

| Scenario | Result |
| --- | --- |
| Same day, within the same screening | The questions stay **stable** (older adults will not see the questions change mid-way) |
| Same day, starting a new screening | A **different** set of 4 personalised questions is drawn |
| A different day | **Changes** again (satisfying "not necessarily the same every day") |
| Same profile + same seed | **Fully reproducible** (results are auditable and explainable) |

### Key design trade-offs

- **Why 7 mandatory questions?** These 7 questions are the safety baseline: 5 red-flag symptoms + wound status + skin check, which directly determine "whether the person should go to the emergency department right away". If they were skipped, the system could not rule out a serious infection and would have to conservatively "safely abstain".
- **Similar questions are not repeated within one screening**: round-robin selection guarantees **at most 1 question per clinical category**, so even if the question bank contains several similar questions in the same category (such as n2 and n4), an older adult will not be asked repeatedly within the same screening.
- **Does gender take part in question selection?** The profile **collects** gender, but does **not** use it to filter or weight questions. This is because IWGDF / NICE risk stratification **does not distinguish** foot risk by gender; excluding it is a deliberate **fairness** design (this project includes fairness testing capability).
- **Personalisation vs safety**: personalisation affects only "non-critical questions"; the critical safety questions are always fixed, ensuring no missed diagnoses.

### Examples of triggering conditional branches (based on the previous answer)

| Previous answer | Follow-up triggered |
| --- | --- |
| **Only if** the previous question "wound status" is answered "I have a wound now" (w1c) | "How long has this wound been there?" |
| **Only if** the previous question "wound status" is answered "I have a wound now" (w1c) | "Compared with last week, is the wound getting better or worse?" |
| **Only if** the previous question "wound status" is answered "I have a wound now" (w1c) | "Can you see bone, joint, or tendon inside the wound?" |
| **Only if** "numbness in feet" is answered "often" (n5c) **or** "sensation" is answered "reduced sensation" (n1b) | "Has one foot become red, hot, or swollen, or changed shape recently?" |
| **Only if** "leg pain when walking" is answered "sometimes" or "often" (c3b/c3c) | "Do you get pain in your feet or legs while resting, or at night?" |

## 4. Example: two profiles draw different questions

| User | Profile | The 4 personalised questions (example seeds: A=1, B=2) |
| --- | --- | --- |
| A | 82 years old · disease duration >10 years · HbA1c >8% · smoking · heart disease + kidney disease · flip-flops · often barefoot · never checks feet | Burning/pins-and-needles sensation (n4) · redness and swelling around a toenail (s11) · shiny legs losing hair (c5) · doctor-diagnosed neuropathy/circulation (h1) |
| B | 63 years old · disease duration <5 years · HbA1c <7% · non-smoker · no comorbidities · closed-toe shoes · never barefoot · checks feet daily | Light-touch sensation (n3) · dark spot under a toenail (s12) · shiny legs losing hair (c5) · blood sugar control (g1) |

> If the same user starts a new screening, the 4 personalised questions will also change (see the "Seed" section).
