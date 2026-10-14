# Diabetic Foot Check Assistant — Technical Planning Document

> **Status:** Planning Phase (no code, no database, no deployment yet)
> **Target Users:** Adults aged 60 and over with diagnosed type 1 or type 2 diabetes
> **Languages:** English, 简体中文 (Simplified Chinese), Malay, Tamil, Filipino
> **Backend:** Tencent CloudBase (TCB)
> **Source Control:** GitHub (monorepo)

---

## 0. Target Population

| Dimension | Definition |
| --- | --- |
| **Age** | **60 years and over** |
| **Condition** | **Diagnosed type 1 OR type 2 diabetes** (excludes gestational diabetes and pre-diabetes) |
| **Age bands** | 60–69 · 70–79 · 80–89 · 89+ |
| **Out of scope** | Anyone under 60; people without a diabetes diagnosis; gestational diabetes; pre-diabetes |
| **Use case** | Home foot self-check → care navigation (a screening & education tool — **no diagnosis, no medication advice**) |

**Why focus on 60+?** Diabetic foot ulceration and amputation risk rise steeply with age. Older adults with diabetes often carry several risk factors at once — peripheral neuropathy, peripheral arterial disease, reduced vision and reduced mobility — making them the highest-risk group and the easiest to miss.

**Why cover both type 1 and type 2?** Both types cause peripheral neuropathy and peripheral arterial disease, and the international risk-stratification standards (IWGDF 2023, Singapore ACE 2024) grade foot risk identically for the two. The assessment and triage logic therefore **does not differ by diabetes type** — the only requirement is a diagnosis of type 1 or type 2.

> **Fairness note:** the profile collects gender but does **not** use it to select or weight questions — ACE 2024 / IWGDF risk stratification does not differentiate foot risk by gender. This is a deliberate fairness design choice.

---

## Table of Contents

0. [Target Population](#0-target-population)
1. [Technical Approach](#1-technical-approach)
2. [Project Structure](#2-project-structure)
3. [Implementation Plan](#3-implementation-plan)
4. [Risks & Mitigations](#4-risks--mitigations)
5. [Future Deliverables](#5-future-deliverables)

---

## 1. Technical Approach

### 1.1 Architecture Overview

The application follows a **three-layer architecture** with a clear separation between the presentation layer (PWA), the application logic layer (CloudBase serverless functions), and the clinical knowledge layer (a WorkBuddy expert package that encodes diabetic foot assessment protocols).

```
┌─────────────────────────────────────────────────────────┐
│                    USER DEVICE (Mobile)                  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │            Progressive Web App (PWA)               │  │
│  │                                                    │  │
│  │  Chat UI │ Assessment Flows │ Education │ Settings │  │
│  │  i18n: EN │ zh-CN │ MS │ TA │ FIL                 │  │
│  │  Service Worker (offline cache)                    │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │ HTTPS                          │
└─────────────────────────┼────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────┐
│              TENCENT CLOUDBASE (Serverless)               │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Cloud Auth   │  │ Cloud Database│  │ Cloud Storage │  │
│  │ (email/phone)│  │  (NoSQL docs) │  │ (foot photos) │  │
│  └──────┬───────┘  └──────┬────────┘  └───────┬──────┘  │
│         │                 │                    │         │
│  ┌──────▼─────────────────▼────────────────────▼──────┐  │
│  │              Cloud Functions (Node.js)               │  │
│  │                                                      │  │
│  │  assessment-engine  │  warning-detector              │  │
│  │  care-navigator     │  personalization-engine        │  │
│  │  reassessment-scheduler │  fairness-auditor          │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │                             │
│              ┌──────────────▼──────────────┐              │
│              │    Expert Package (Domain)   │              │
│              │                              │              │
│              │  Clinical decision trees     │              │
│              │  Warning-sign thresholds     │              │
│              │  Care pathway definitions    │              │
│              │  Multilingual clinical text  │              │
│              └─────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Why This Architecture

| Decision | Rationale |
|---|---|
| **PWA over native app** | No app-store review cycle (critical for hackathon speed); installable on both iOS and Android; works offline via service worker; single codebase. |
| **CloudBase serverless** | Zero infrastructure management; auto-scaling; built-in auth, database, storage, and static hosting; pay-per-use fits a prototype budget. |
| **Hybrid AI + rule engine** | LLM handles natural-language conversation and multilingual understanding; deterministic rules enforce hard clinical safety thresholds. The LLM never makes the final call on a red-flag symptom — rules do. |
| **Expert package as knowledge layer** | The diabetic foot clinical logic (assessment protocols, warning thresholds, care pathways, educational content) is encoded as a WorkBuddy expert package. Cloud functions query this package for decisions rather than hardcoding clinical logic in application code. This mirrors how a medical guideline document works — the app is the delivery vehicle, the expert is the protocol. |
| **Monorepo** | Single repository for frontend, cloud functions, shared types, i18n, and tests. Simplifies CI/CD, versioning, and cross-package refactoring. |
| **i18n-first, not i18n-bolted-on** | All five languages are designed from Day 1. ICU MessageFormat handles pluralization, gender, and number formatting per locale. Cultural adaptation goes beyond word-for-word translation. |

### 1.3 Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend framework** | Next.js 14+ (App Router) | PWA support, SSR/SSG, file-based routing, mature ecosystem |
| **Language** | TypeScript (strict mode) | Type safety across frontend, functions, and shared packages |
| **Styling** | Tailwind CSS | Mobile-first responsive design; rapid prototyping; consistent spacing for accessibility |
| **State management** | Zustand | Minimal boilerplate; works well with Next.js App Router |
| **i18n** | react-i18next + ICU MessageFormat | Mature, supports lazy loading per locale, proper pluralization/gender rules |
| **PWA / offline** | next-pwa (Workbox) | Service worker generation, offline fallback pages, install prompts |
| **Backend** | Tencent CloudBase (TCB) | Serverless functions, NoSQL document DB, cloud storage, auth, static hosting |
| **Cloud functions** | Node.js 18+ (TypeScript) | Type-safe shared code with frontend; CloudBase JS SDK |
| **AI / LLM** | WorkBuddy managed LLM (or direct API) | Conversational assessment, multilingual NLU; managed endpoint reduces key management |
| **Clinical knowledge** | WorkBuddy Expert Package | Encodes assessment protocols, warning thresholds, care pathways, educational content |
| **Unit testing** | Jest + Testing Library | Fast feedback, component testing |
| **E2E testing** | Playwright | Cross-browser, mobile viewport emulation, screenshot diffs |
| **Fairness testing** | Custom harness (Jest-based) | Parametrized test matrix across language × age-band × gender × risk-level subgroups |
| **CI/CD** | GitHub Actions | Automated test, lint, build, deploy on push |
| **Package manager** | pnpm (workspaces) | Fast, disk-efficient, strict about phantom dependencies |
| **Monorepo tooling** | Turborepo | Cached builds, parallel task execution |

### 1.4 The Eight Required Capabilities

Each capability maps to specific components in the architecture:

#### 1.4.1 Conversational Assessment
- **What:** A chat-based interface where the user describes symptoms, answers questions, and receives a preliminary foot-risk assessment.
- **How:** Cloud function `assessment-engine` orchestrates a multi-turn conversation. It sends user messages + conversation history to the LLM with a system prompt grounded in the expert package's clinical protocol. The LLM generates follow-up questions and a structured risk summary.
- **Safety guardrail:** The LLM is instructed to never diagnose. It collects information and classifies risk; the rule engine produces the final risk tier.

#### 1.4.2 Care Navigation
- **What:** Directing the user to appropriate next steps based on their risk level — from "monitor at home" to "see a podiatrist within 2 weeks" to "go to an emergency department now."
- **How:** Cloud function `care-navigator` takes the risk tier + user context (location, insurance, preferences) and returns a prioritized list of recommended actions with explanations. Navigation content is localized via the i18n layer.

#### 1.4.3 Warning-Sign Detection
- **What:** Identifying red-flag symptoms that require immediate medical attention (e.g., visible ulcer, spreading redness, fever with foot swelling, black/charred discoloration, sudden severe pain, foul odor).
- **How:** Cloud function `warning-detector` runs the user's responses through a deterministic rule set loaded from the expert package. Rules are simple pattern matches: `IF symptom == "ulcer_open" THEN red_flag = true`. This is intentionally not AI — it must be auditable and explainable.

#### 1.4.4 Safe Abstention
- **What:** The system must know when NOT to give advice and instead escalate. If the input is ambiguous, outside scope, or indicates an emergency, the app explicitly says "I cannot assess this — please contact a healthcare professional" and provides escalation paths.
- **How:** The rule engine includes an abstention layer. If confidence is below threshold, or if the input falls outside the diabetic foot domain, or if any red flag is triggered, the system abstains and escalates. The LLM is also constrained by a system prompt that forbids fabrication of medical guidance.

#### 1.4.5 Self-Management Support
- **What:** Educational content and daily routines for foot care — daily inspection, moisturizing (but not between toes), proper footwear, nail care, when to call a doctor.
- **How:** Localized content cards served from the i18n layer (no LLM needed for static education). Content is tiered by risk level — higher-risk users get more frequent reminders and more detailed guidance. Includes a simple daily check-in (checkbox-style, not chat) for habit formation.

#### 1.4.6 Dynamic Reassessment
- **What:** Risk is not static. The system periodically prompts the user to re-assess (e.g., every 30 days, or sooner if symptoms change). Historical assessments are tracked and trends are surfaced.
- **How:** Cloud function `reassessment-scheduler` stores a `nextAssessmentDue` timestamp per user. On app open, if overdue, a prompt appears. Trend visualization shows risk progression over time. If risk tier increases between assessments, the system proactively escalates.

#### 1.4.7 Personalization
- **What:** Tailoring the conversation depth, content complexity, reminder frequency, and UI language to the individual user.
- **How:** Cloud function `personalization-engine` maintains a user profile (age, diabetes duration, comorbidities, preferred language, health literacy level assessed via a brief onboarding questionnaire). This profile is passed to the assessment engine and care navigator as context. Personalization also affects UI: lower health literacy → simpler language, larger text, fewer medical terms.

#### 1.4.8 Fairness Testing Across Subgroups
- **What:** Systematic testing to ensure the assessment quality does not degrade for specific demographic or linguistic subgroups.
- **How:** A custom Jest-based test harness runs a matrix of synthetic user personas across:
  - **Language:** EN, zh-CN, MS, TA, FIL
  - **Age band:** 60–69, 70–79, 80–89, 89+
  - **Gender:** male, female
  - **Risk level:** low, moderate, high, emergency
  - **Health literacy:** low, medium, high
  - **Input style:** terse vs. verbose, formal vs. colloquial

  For each cell, the harness runs the full assessment pipeline and checks: (a) correct risk tier classification, (b) no unsupported medical claims, (c) appropriate escalation, (d) culturally appropriate response. A fairness report is generated and committed to `docs/fairness-report.md`.

### 1.5 Data Model (Conceptual, No DB Created Yet)

```
users
├── uid (CloudBase auth UID)
├── profile
│   ├── age, gender, preferredLanguage
│   ├── diabetesDurationYears
│   ├── comorbidities[]
│   ├── healthLiteracyLevel
│   └── location (city/region for care navigation)
├── createdAt, updatedAt

assessments
├── id, uid, createdAt
├── conversationHistory[] (role, content, timestamp)
├── riskTier (low | moderate | high | emergency)
├── warningSignsDetected[]
├── careRecommendations[]
├── abstentionTriggered (bool)
└── nextAssessmentDue (timestamp)

dailyCheckins
├── id, uid, date
├── inspectedFeet (bool)
├── notedChanges (string | null)
└── moodPainLevel (1-10)

fairnessTestResults
├── id, runId, createdAt
├── persona (language, age, gender, risk, literacy)
├── expectedRiskTier, actualRiskTier
├── passed (bool)
└── notes
```

### 1.6 Expert Package as Clinical Knowledge Layer

The diabetic foot clinical domain knowledge is structured as a WorkBuddy expert package. This package is not the web app — it is the protocol the app follows. It contains:

| Component | Content |
|---|---|
| **Agent definition** | Role: diabetic foot screening assistant. Scope: non-diagnostic risk stratification and education. Hard constraint: never diagnoses, always defers to licensed clinicians. |
| **Assessment protocol** | Structured decision tree: initial symptom intake → probing questions (neuropathy symptoms, vascular symptoms, visual signs) → risk stratification (low/moderate/high/emergency). |
| **Warning-sign rules** | Deterministic rules: open ulcer, spreading redness, fever + swelling, black discoloration, foul odor, sudden severe pain, inability to feel foot, visible bone/tendon. Each maps to immediate escalation. |
| **Care pathways** | Risk-tier → recommended actions mapping (e.g., low → self-care + annual check; high → see podiatrist within 2 weeks; emergency → ED now). |
| **Educational content templates** | Multilingual foot-care education templates, tiered by risk level and health literacy. |
| **Abstention criteria** | Explicit list of scenarios where the system must decline to assess and escalate (ambiguity, out-of-scope, red flag, low confidence). |

**Why an expert package instead of hardcoded rules?** Clinical guidelines change. By externalizing the protocol into a structured, version-controlled expert package, we can update clinical logic without touching application code. It also makes the clinical reasoning auditable — a clinician reviewer can read the expert definition and verify it against published guidelines (e.g., IWGDF — International Working Group on the Diabetic Foot).

---

## 2. Project Structure

GitHub monorepo using pnpm workspaces + Turborepo:

```
diabetic-foot-check/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # lint + typecheck + unit tests
│       ├── deploy.yml              # build + deploy to CloudBase
│       └── fairness-tests.yml      # run fairness matrix on PRs
│
├── apps/
│   └── web/                         # Next.js PWA (the user-facing app)
│       ├── public/
│       │   ├── locales/
│       │   │   ├── en.json         # English
│       │   │   ├── zh-CN.json      # 简体中文
│       │   │   ├── ms.json         # Malay (Bahasa Melayu)
│       │   │   ├── ta.json         # Tamil
│       │   │   └── fil.json        # Filipino
│       │   ├── manifest.json       # PWA manifest
│       │   └── icons/              # App icons (192px, 512px)
│       ├── src/
│       │   ├── app/                # Next.js App Router pages
│       │   │   ├── (auth)/         # Login, register, onboarding
│       │   │   ├── (main)/         # Authenticated app shell
│       │   │   │   ├── page.tsx          # Home dashboard
│       │   │   │   ├── assess/           # Conversational assessment
│       │   │   │   ├── history/          # Assessment history & trends
│       │   │   │   ├── education/       # Self-management library
│       │   │   │   ├── checkin/          # Daily check-in
│       │   │   │   └── settings/         # Language, profile, preferences
│       │   │   └── layout.tsx           # Root layout (i18n provider, theme)
│       │   ├── components/
│       │   │   ├── chat/            # Chat bubble, input, message types
│       │   │   ├── assessment/      # Risk tier display, recommendations card
│       │   │   ├── navigation/      # Care pathway cards, escalation banner
│       │   │   ├── education/       # Content cards, tip carousel
│       │   │   ├── checkin/         # Daily check-in form
│       │   │   ├── trends/          # Risk-over-time chart
│       │   │   └── common/          # Header, nav, buttons, loading states
│       │   ├── lib/
│       │   │   ├── cloudbase/       # CloudBase SDK init + typed wrappers
│       │   │   ├── i18n/            # i18next config, locale loading
│       │   │   ├── hooks/           # useAssessment, useUser, useCheckin
│       │   │   └── utils/          # Date formatting, risk-tier helpers
│       │   ├── stores/             # Zustand stores (user, assessment, UI)
│       │   └── types/              # Frontend-specific TypeScript types
│       ├── tests/
│       │   ├── unit/               # Component + logic unit tests
│       │   ├── e2e/                # Playwright user journeys
│       │   └── fairness/           # Subgroup fairness test personas
│       ├── next.config.mjs
│       ├── tailwind.config.ts
│       └── package.json
│
├── functions/                        # CloudBase cloud functions
│   ├── assessment-engine/
│   │   ├── index.ts                 # Entry: orchestrates LLM + rules
│   │   ├── llm-bridge.ts            # LLM call wrapper with retry/fallback
│   │   └── package.json
│   ├── warning-detector/
│   │   ├── index.ts                 # Entry: runs rule engine
│   │   ├── rules.ts                 # Warning-sign rule definitions
│   │   └── package.json
│   ├── care-navigator/
│   │   ├── index.ts                 # Entry: risk → recommendations
│   │   ├── pathways.ts              # Care pathway definitions
│   │   └── package.json
│   ├── personalization-engine/
│   │   ├── index.ts                 # Entry: user profile → personalization context
│   │   └── package.json
│   ├── reassessment-scheduler/
│   │   ├── index.ts                 # Entry: computes next-due, checks trends
│   │   └── package.json
│   └── fairness-auditor/
│       ├── index.ts                 # Entry: runs fairness matrix, writes report
│       └── package.json
│
├── packages/                        # Shared code (published as workspace packages)
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/               # Shared TS types (User, Assessment, RiskTier, etc.)
│   │   │   ├── constants/          # Risk tiers, locales, age bands
│   │   │   └── validation/         # Input validation schemas (zod)
│   │   └── package.json
│   ├── i18n/
│   │   ├── src/
│   │   │   ├── index.ts             # Re-exports locale loaders
│   │   │   └── personas/            # Fairness test persona definitions
│   │   ├── locales/                 # Symlinked or copied from apps/web/public/locales
│   │   └── package.json
│   └── medical-rules/               # Clinical rule definitions (loaded from expert package)
│       ├── src/
│       │   ├── warning-signs.ts     # Warning-sign rule constants
│       │   ├── risk-stratification.ts  # Risk tier computation logic
│       │   └── care-pathways.ts     # Risk → action mappings
│       └── package.json
│
├── expert-package/                  # WorkBuddy expert package (clinical knowledge)
│   ├── plugin.json                  # Expert metadata
│   ├── agents/
│   │   └── foot-check-assistant.md  # Agent definition (role, scope, constraints)
│   ├── skills/
│   │   └── assessment/
│   │       ├── SKILL.md             # Assessment protocol skill
│   │       └── references/
│   │           ├── warning-signs.md     # Red-flag symptom catalog
│   │           ├── risk-stratification.md # Risk tier definitions
│   │           ├── care-pathways.md      # Care pathway definitions
│   │           └── education-content.md # Educational content templates
│   └── avatars/
│       └── foot-check-assistant.png  # Expert avatar (512×512)
│
├── docs/
│   ├── technical-approach.md        # ← This document
│   ├── architecture.md             # Architecture diagram + explanation (future)
│   ├── trust-boundary.md           # Trust-boundary diagram + explanation (future)
│   ├── design-tradeoffs.md         # Key design trade-off analysis (future)
│   ├── demo-walkthrough.md         # Live demo script (future)
│   ├── fairness-report.md          # Fairness test results (future)
│   └── api/                        # Cloud function API documentation
│
├── cloudbaserc.json                 # CloudBase deployment config
├── turbo.json                       # Turborepo task pipeline
├── pnpm-workspace.yaml             # Workspace definition
├── package.json                    # Root package.json (scripts, devDeps)
├── .gitignore
├── .editorconfig
├── CONTRIBUTING.md
└── README.md
```

### 2.1 Structure Rationale

| Choice | Why |
|---|---|
| **`apps/web` separate from `functions/`** | Frontend and cloud functions have different build pipelines and deploy targets. Separation prevents cross-dependencies from leaking into production bundles. |
| **`packages/shared`** | TypeScript types and validation schemas are used by both frontend and functions. Workspace package ensures a single source of truth. |
| **`packages/medical-rules`** | Clinical rules are loaded from the expert package at function startup. This package is the adapter that translates expert-package markdown into TypeScript constants. |
| **`expert-package/` in the repo** | The clinical knowledge is versioned alongside the code. Changes to clinical logic go through the same PR review process as code changes. |
| **`docs/` at root** | All planning, architecture, and operational documents live here. The demo walkthrough and design trade-offs documents will be added here in the next phase. |
| **`.github/workflows/fairness-tests.yml`** | Fairness tests run on every PR, not just on main. This catches regressions in subgroup performance before merge. |

---

## 3. Implementation Plan

The plan is organized into **6 phases** designed for a ~3-day hackathon. Each phase has a clear exit criterion. Phases can be compressed if the team is ahead of schedule.

### Phase 0: Foundation & Scaffolding (Hours 0–2)

**Goal:** Working monorepo skeleton with CI pipeline.

| Task | Detail |
|---|---|
| Initialize monorepo | pnpm workspace + Turborepo config. Root `package.json` with shared scripts. |
| Scaffold `apps/web` | `create-next-app` with TypeScript, Tailwind, App Router. Add `next-pwa`. |
| Scaffold `packages/shared` | Shared types: `User`, `Assessment`, `RiskTier`, `ConversationTurn`, `CareRecommendation`. |
| Set up i18n | Install `react-i18next`. Create 5 locale JSON files with placeholder strings for the home page. Verify language switcher works. |
| CloudBase project setup | Create TCB environment (via console, not code). Write `cloudbaserc.json`. Initialize JS SDK in a test cloud function. |
| GitHub Actions CI | `ci.yml`: install deps → typecheck → lint → unit tests → build. Must pass before any PR merges. |
| Expert package scaffold | Run `init_expert.py` to create the expert package skeleton. Fill in `plugin.json` metadata. |

**Exit criterion:** `pnpm dev` starts the Next.js app. Language switcher cycles through all 5 languages. CI pipeline passes on a trivial PR.

---

### Phase 1: Conversational Assessment + i18n (Hours 2–8)

**Goal:** User can have a multi-turn chat conversation about foot symptoms in any of the 5 languages and receive a risk tier.

| Task | Detail |
|---|---|
| Build chat UI | Message list, input bar, typing indicator, risk-tier result card. Mobile-first: full-height chat, thumb-reachable input. |
| Assessment cloud function | `assessment-engine/index.ts`: accepts user message + conversation history + user profile. Calls LLM with system prompt grounded in expert package's assessment protocol. Returns structured response (next question or risk assessment). |
| LLM bridge | `llm-bridge.ts`: wraps LLM API call. Includes: retry with exponential backoff, timeout (8s), graceful fallback (if LLM fails, show a static questionnaire instead of crashing). |
| Risk stratification logic | `packages/medical-rules/risk-stratification.ts`: takes structured conversation output → computes risk tier (low/moderate/high/emergency) based on expert package thresholds. |
| i18n content for assessment | Translate all UI strings, risk-tier labels, explanation text into all 5 languages. Not just word-for-word — adapt clinical terminology to what's commonly understood in each locale. |
| Write expert package agent MD | Full clinical protocol: symptom intake questions, probing logic, risk thresholds, scope constraints, abstention triggers. |
| Unit tests | Test risk stratification with synthetic conversation outputs covering all 4 risk tiers. Test i18n key completeness across all locales. |

**Exit criterion:** A user can open the app, select a language, chat about their foot symptoms, and see a risk-tier result. All UI text is localized.

---

### Phase 2: Warning-Sign Detection + Safe Abstention (Hours 8–14)

**Goal:** The system detects red-flag symptoms and abstains when appropriate.

| Task | Detail |
|---|---|
| Warning-sign rule engine | `warning-detector/index.ts` + `rules.ts`: deterministic rules loaded from `packages/medical-rules/warning-signs.ts`. Runs on every user message. If a rule fires, immediately interrupts the conversation and escalates. |
| Abstention layer | If input is out-of-scope (e.g., user asks about heart disease), low-confidence (LLM uncertainty above threshold), or triggers a red flag — the system explicitly says "I cannot assess this" and provides escalation guidance. This is a hard constraint in the LLM system prompt AND enforced by post-processing rules. |
| Escalation UI | Red banner with immediate action steps. Phone numbers / ED directions (localized). "Call your healthcare provider now" with tap-to-call if on mobile. |
| Warning-sign catalog in expert package | `references/warning-signs.md`: full catalog of red-flag symptoms with clinical rationale and escalation urgency (immediate vs. 24-hour vs. 1-week). |
| Unit + integration tests | Test that each warning-sign rule fires correctly. Test abstention on out-of-scope queries. Test that red-flag escalation interrupts the conversation. |

**Exit criterion:** When a user mentions an open ulcer or spreading redness, the system immediately escalates. When a user asks about a non-foot medical issue, the system abstains. Both behaviors are tested.

---

### Phase 3: Care Navigation + Self-Management (Hours 14–20)

**Goal:** Users receive actionable care recommendations and educational content.

| Task | Detail |
|---|---|
| Care navigator function | `care-navigator/index.ts`: takes risk tier + user context → returns prioritized recommendations. E.g., moderate risk → "Schedule a podiatrist appointment within 2 weeks" + "Begin daily foot inspection (see guide below)." |
| Care pathway definitions | `packages/medical-rules/care-pathways.ts` + expert package `references/care-pathways.md`: risk-tier → action mappings with urgency levels. |
| Education library UI | Card-based content browser. Content organized by category (daily care, footwear, nail care, when to worry). Filtered by risk level. |
| Daily check-in | Simple form: "Did you inspect your feet today?" + "Any changes?" + optional photo. Streak tracking. Push notification scheduling (via CloudBase scheduled function). |
| Educational content | Write and translate foot-care education content for all 5 languages. Tiered by risk level (low-risk user gets basics; high-risk user gets detailed ulcer prevention, offloading guidance). |
| E2E test (Playwright) | Full journey: onboarding → assessment → receive risk → view recommendations → read education content → complete daily check-in. In English and at least one other language. |

**Exit criterion:** After an assessment, the user sees tailored care recommendations and relevant educational content. The daily check-in is functional. E2E test passes in 2 languages.

---

### Phase 4: Dynamic Reassessment + Personalization (Hours 20–26)

**Goal:** The system adapts over time and personalizes the experience.

| Task | Detail |
|---|---|
| Reassessment scheduler | `reassessment-scheduler/index.ts`: computes `nextAssessmentDue` based on current risk tier (low → 90 days, moderate → 30 days, high → 14 days, emergency → N/A, already escalated). On app open, shows a prompt if overdue. |
| Trend visualization | Line chart showing risk-tier-over-time (using a lightweight charting library — e.g., `recharts` or custom SVG). Color-coded: green=low, amber=moderate, red=high, dark red=emergency. |
| Personalization engine | `personalization-engine/index.ts`: takes user profile → generates personalization context (language complexity level, UI text size preference, reminder frequency, conversation depth). Passed to assessment engine and care navigator. |
| Onboarding questionnaire | Brief (5–7 question) onboarding: age, diabetes duration, comorbidities, health literacy self-assessment, preferred language. Feeds the personalization engine. |
| Profile-driven UI adaptation | If health literacy is "low," simplify language in care recommendations (shorter sentences, fewer medical terms, more analogies). If age > 65, default to larger text. |
| Unit tests | Test reassessment scheduling logic. Test personalization context generation for edge cases. |

**Exit criterion:** Users with different profiles get visibly different experiences. Reassessment prompts appear when due. Trend chart renders correctly with mock historical data.

---

### Phase 5: Fairness Testing + Polish (Hours 26–30)

**Goal:** Fairness test suite passes across all subgroups. App is polished for demo.

| Task | Detail |
|---|---|
| Fairness test harness | `tests/fairness/`: Jest parametrized tests. Persona matrix: 5 languages × 3 age bands × 2 genders × 4 risk levels × 3 literacy levels × 2 input styles = **720 test cases**. For hackathon, subset to ~50 representative cases. |
| Fairness auditor function | `fairness-auditor/index.ts`: runs the fairness matrix against the assessment engine, compares actual vs. expected risk tiers, writes results to CloudBase DB and generates `docs/fairness-report.md`. |
| Fix disparities | If any subgroup shows incorrect risk classification or inappropriate abstention, investigate root cause (usually i18n quality or LLM prompt bias) and fix. |
| Accessibility pass | WCAG 2.1 AA: color contrast, screen reader labels, keyboard navigation, focus management, text resizing. Test with Lighthouse. |
| Performance | Lighthouse PWA audit. Lazy-load locale files. Code-split routes. Image optimization. |
| Polish | Loading states, error states, empty states. Micro-interactions (subtle animations on risk-tier reveal). Consistent spacing. |
| Documentation | Write `docs/api/` for each cloud function. Update README with setup instructions. |

**Exit criterion:** Fairness report shows ≥95% correct risk classification across tested subgroups. Lighthouse score ≥ 90 on performance, accessibility, and PWA. No console errors in a full user journey.

---

### Phase 6: Demo Preparation (Hours 30–32)

**Goal:** Live demo-ready with supporting documents.

| Task | Detail |
|---|---|
| Demo walkthrough script | `docs/demo-walkthrough.md`: step-by-step demo script covering all 8 capabilities. Includes pre-seeded test accounts for different personas. |
| Architecture diagram | `docs/architecture.md` + rendered diagram: the three-layer architecture with data flow annotations. |
| Trust-boundary diagram | `docs/docs English version/trust-boundary.md` + rendered diagram: showing trust zones (user device → CloudBase → LLM → expert package), data boundaries, and safety checkpoints. |
| Design trade-offs document | `docs/docs English version/design-tradeoffs.md`: structured analysis of key trade-offs (PWA vs native, AI vs rules, expert package vs hardcoded, monorepo vs polyrepo, etc.). |
| Deploy to CloudBase | `deploy.yml` pipeline: build → deploy functions → deploy static hosting → verify live URL. |
| Smoke test on production | Run the full demo script against the live deployment. Verify all 5 languages work. |

**Exit criterion:** Live URL is accessible. Demo script runs end-to-end without errors. All 4 documents are complete.

---

## 4. Risks & Mitigations

### 4.1 Clinical Safety Risks

| Risk | Severity | Description | Mitigation |
|---|---|---|---|
| **False negative on red-flag symptom** | 🔴 Critical | The system fails to detect a warning sign (e.g., user describes an ulcer using colloquial language the LLM doesn't recognize as a red flag). | (1) Rule engine runs on every message, not just final assessment. (2) Rules include colloquial/slang terms for symptoms in each language. (3) If confidence < threshold, system abstains and escalates. (4) Prominent disclaimer: "This tool does not replace professional medical evaluation." |
| **LLM hallucination of medical advice** | 🔴 Critical | The LLM generates a specific treatment recommendation or diagnosis that isn't in the protocol. | (1) System prompt has hard constraints: "Never diagnose. Never prescribe treatment. Never contradict established clinical guidelines." (2) Post-processing filter scans LLM output for prohibited patterns ("diagnose", "prescribe", "you have", "take medication"). (3) If filter triggers, fall back to abstention. |
| **User over-reliance on the tool** | 🟠 High | User treats the app as a substitute for professional care, delaying a doctor visit. | (1) Repeated disclaimers at key moments (after risk assessment, in education content). (2) Care recommendations always include professional follow-up for moderate+ risk. (3) Reassessment prompts reinforce "this is monitoring, not diagnosis." |
| **Misclassification of risk tier** | 🟠 High | The risk stratification produces a lower tier than warranted. | (1) Conservative thresholds — when in doubt, classify up, not down. (2) Expert package thresholds are reviewed against IWGDF guidelines. (3) Fairness tests include edge cases at tier boundaries. |

### 4.2 Technical Risks

| Risk | Severity | Description | Mitigation |
|---|---|---|---|
| **LLM latency / unavailability** | 🟠 High | The conversational assessment relies on LLM calls that may be slow (>5s) or fail entirely. | (1) 8-second timeout per LLM call. (2) Graceful fallback: if LLM fails, switch to a static decision-tree questionnaire (predefined questions, no natural language). (3) Loading states + "taking a moment" messaging. (4) Cache assessment protocol in the function to avoid re-fetching. |
| **i18n quality across 5 languages** | 🟠 High | Translation quality varies; clinical terms may not have direct equivalents in Tamil or Filipino. | (1) Engage native speakers for medical terminology review (even if just for spot-checking during hackathon). (2) Use plain-language descriptions alongside clinical terms. (3) Fairness tests catch language-specific classification failures. (4) ICU MessageFormat handles grammatical differences. |
| **CloudBase cold-start latency** | 🟡 Medium | Serverless functions may have cold-start delays (1–3s) on first invocation. | (1) Keep functions lightweight — load expert package rules at module scope, not per invocation. (2) Consider a warm-up ping if needed. (3) Frontend shows skeleton loaders during function calls. |
| **Offline mode limitations** | 🟡 Medium | PWA service worker caches static assets, but assessment requires live LLM calls. | (1) Offline mode shows cached education content + daily check-in (which syncs when back online). (2) Clear messaging: "Assessment requires an internet connection." (3) Queue check-in data for sync. |
| **Monorepo build complexity** | 🟡 Medium | Turborepo + pnpm workspaces + Next.js + cloud functions can have configuration friction. | (1) Keep dependency graph simple — `packages/shared` is the only cross-boundary dependency. (2) Turborepo handles caching; if cache issues arise, `--force` flag bypasses. (3) Separate build configs for web vs functions. |

### 4.3 Fairness & Bias Risks

| Risk | Severity | Description | Mitigation |
|---|---|---|---|
| **Language-based performance disparity** | 🔴 Critical | The LLM may perform better in English than in Tamil or Filipino, leading to worse risk classification for non-English speakers. | (1) Fairness test matrix explicitly tests all 5 languages. (2) If disparity found, investigate whether it's LLM capability or i18n quality. (3) For languages where LLM is weaker, add more deterministic rule-based checks to compensate. (4) Report all disparities in fairness report — transparency over concealment. |
| **Age-band bias** | 🟠 High | The 60+ population is internally very diverse — a person in their 60s and someone over 89 differ sharply in tech literacy, health literacy, vision and mobility. The oldest users may give terser, less structured input. | (1) Fairness tests cover all four bands (60–69 / 70–79 / 80–89 / 89+) and include "terse input" personas. (2) Assessment protocol has adaptive probing — if initial input is sparse, ask more follow-up questions rather than guessing. (3) UI defaults to an 18px base font, 44px touch targets and high contrast to suit reduced vision and mobility. |
| **Gender bias in clinical thresholds** | 🟡 Medium | Some diabetic foot risk factors may present differently by gender (e.g., peripheral arterial disease prevalence). | (1) Expert package references gender-aware thresholds where guidelines differ. (2) Fairness tests include gender as a dimension. (3) If data is insufficient, use conservative (lower) thresholds uniformly. |
| **Cultural bias in care navigation** | 🟡 Medium | Care recommendations may assume healthcare infrastructure that differs across regions (e.g., "see a podiatrist" may not be feasible in rural areas). | (1) Care pathways include fallback options ("If no podiatrist available, see your general practitioner"). (2) Localization extends beyond translation — adapt recommendations to local healthcare context where possible. (3) User onboarding captures location for navigation context. |
| **Input-style bias (formal vs. colloquial)** | 🟡 Medium | Users with lower formal education may describe symptoms in non-clinical language, which the LLM may interpret differently. | (1) Expert package includes colloquial symptom descriptions in each language. (2) Fairness tests include "colloquial" input style personas. (3) Rule engine matches on layperson terms, not just clinical terminology. |

### 4.4 Regulatory & Compliance Risks

| Risk | Severity | Description | Mitigation |
|---|---|---|---|
| **Medical device regulation** | 🔴 Critical | Depending on jurisdiction, a tool that performs risk stratification for a medical condition may be classified as a medical device requiring regulatory approval. | (1) **Explicit positioning:** The app is a "screening and education tool," NOT a diagnostic device. All outputs are "preliminary risk indicators" not diagnoses. (2) Prominent disclaimers throughout. (3) For hackathon prototype: clearly label as "prototype, not for clinical use." (4) Consult regulatory experts before any production deployment. |
| **Data privacy (user health data)** | 🟠 High | The app collects health information (symptoms, risk assessments, daily check-ins) which is sensitive personal data. | (1) CloudBase auth + database security rules enforce per-user data isolation. (2) Data minimization — collect only what's needed for assessment. (3) Clear privacy policy. (4) User can export and delete their data. (5) No health data sent to third-party analytics. |
| **LLM data handling** | 🟠 High | If using a third-party LLM API, user conversation data may be processed by the LLM provider. | (1) Use WorkBuddy's managed LLM endpoint where possible (no separate provider). (2) If using external API, strip PII before sending to LLM. (3) Document data flow in trust-boundary diagram. (4) Check provider's data retention policy. |

### 4.5 Operational Risks

| Risk | Severity | Description | Mitigation |
|---|---|---|---|
| **Hackathon time constraints** | 🟠 High | 8 capabilities + 5 languages + fairness testing + 4 deliverables in a hackathon timeframe is ambitious. | (1) Phased plan with clear exit criteria — if behind schedule, Phase 5 (fairness) can use a reduced persona matrix. (2) Prioritize: assessment + warning detection + abstention are non-negotiable; others can be thinner. (3) Pre-seeded test data for demo to avoid live-data issues. |
| **CloudBase account/quota limits** | 🟡 Medium | Free tier or hackathon credits may have function invocation or database limits. | (1) Monitor usage in CloudBase console. (2) Cache aggressively — expert package rules loaded once per cold start. (3) Use mock LLM responses for development/testing to save API calls. |
| **Team coordination in monorepo** | 🟡 Medium | Multiple people working on a monorepo can cause merge conflicts and build breaks. | (1) Clear ownership per directory (frontend person owns `apps/web`, backend person owns `functions/`). (2) `packages/shared` changes require PR review from both. (3) CI catches type errors across packages. |

### 4.6 Risk Priority Matrix

| Priority | Risks |
|---|---|
| **P0 — Must solve before demo** | False negative on red-flag symptom, LLM hallucination of medical advice, Language-based performance disparity, Medical device regulation positioning |
| **P1 — Must mitigate for demo** | User over-reliance, Misclassification of risk tier, LLM latency/unavailability, i18n quality, Hackathon time constraints |
| **P2 — Track and document** | CloudBase cold-start, Offline limitations, Cultural bias in navigation, Data privacy, LLM data handling |
| **P3 — Monitor post-hackathon** | Monorepo complexity, CloudBase quota, Team coordination |

---

## 5. Future Deliverables

The following will be produced in the next phase (after this planning document is reviewed):

| Deliverable | Description | Format |
|---|---|---|
| **Architecture diagram** | Three-layer architecture with data flow, component responsibilities, and technology annotations. | Rendered SVG diagram + `docs/architecture.md` |
| **Trust-boundary diagram** | Trust zones (device → CloudBase → LLM → expert package), data boundaries, safety checkpoints, and PII handling points. | Rendered SVG diagram + `docs/docs English version/trust-boundary.md` |
| **Design trade-offs document** | Structured analysis of key decisions: PWA vs native, AI vs rules, expert package vs hardcoded, monorepo vs polyrepo, conservative vs. aggressive risk thresholds, etc. | `docs/docs English version/design-tradeoffs.md` |
| **Live demo walkthrough** | Step-by-step demo script covering all 8 capabilities, with pre-seeded personas in multiple languages. | `docs/demo-walkthrough.md` + live URL |
| **Fairness report** | Results of subgroup fairness testing with disparities and mitigations. | `docs/fairness-report.md` |

---

## Appendix A: Language Coverage Matrix

| Capability | EN | zh-CN | MS | TA | FIL |
|---|---|---|---|---|---|
| UI strings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assessment conversation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Risk-tier labels + explanations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Care recommendations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Educational content | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Warning-sign colloquial terms | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ |

> ⚠️ = May use simplified or English-borrowed terms during hackathon; full localization planned for post-hackathon.

## Appendix B: Key Clinical References (for Expert Package)

| Source | Relevance |
|---|---|
| IWGDF (International Working Group on the Diabetic Foot) Guidelines | Gold-standard for diabetic foot risk stratification and management |
| ADA (American Diabetes Association) Standards of Care | Foot care recommendations for diabetes |
| WHO ICD-11 | Diagnostic coding for diabetic foot complications (reference only — app does not diagnose) |
| Local clinical guidelines (per supported locale) | Region-specific care pathway adaptations |
