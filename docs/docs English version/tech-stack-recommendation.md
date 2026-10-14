# FootCheck — Tech Stack Recommendation & Milestone Plan

## 1. Environment Inspection

| Component           | Value                                                 |
| ------------------- | ----------------------------------------------------- |
| Runtime (managed)   | Node 22.22.2, Python 3.13.12                          |
| OS                  | macOS (Apple Silicon)                                 |
| Package Manager     | npm (web), pnpm (monorepo planned)                    |
| Editor              | WorkBuddy AI with built-in preview                    |
| Critical constraint | `NODE_OPTIONS=""` required to bypass brokered FS shim |

## 2. Recommended Tech Stack

### Current: Next.js 14 (App Router) — RECOMMENDED TO KEEP

The prototype is already built on Next.js 14.2.15 with React 18, TypeScript, and Tailwind CSS 3.4. After evaluating Vite as an alternative, **we recommend keeping Next.js** for the following reasons:

| Factor             | Next.js (Current)                     | Vite + React                 | Decision                                |
| ------------------ | ------------------------------------- | ---------------------------- | --------------------------------------- |
| Dev server speed   | ~1.5s cold start                      | ~0.5s cold start             | Vite is faster, but Next.js is adequate |
| SSR/SSG for SEO    | Built-in (App Router)                 | Requires additional setup    | Next.js wins for future SEO needs       |
| File-based routing | Built-in (App Router)                 | Requires react-router        | Next.js reduces dependencies            |
| API routes         | Built-in for CloudBase proxy          | Requires Express/Fastify     | Next.js simplifies backend integration  |
| PWA support        | next-pwa plugin                       | vite-plugin-pwa              | Both work; Vite's plugin is simpler     |
| i18n ecosystem     | Full react-i18next support            | Full react-i18next support   | Tie                                     |
| Production build   | `next build` → static export possible | `vite build` → static output | Both produce static output              |
| Community/Support  | Larger ecosystem                      | Growing fast                 | Next.js has more reference material     |

**Verdict:** Keep Next.js. The switching cost outweighs the marginal dev-server speed gain. Next.js API routes will simplify CloudBase integration later.

### Full Stack Recommendation

| Layer                 | Technology                                        | Rationale                                              |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| **Frontend**          | Next.js 14 (App Router) + React 18 + TypeScript   | Already built; SSR-ready for SEO; file-based routing   |
| **Styling**           | Tailwind CSS 3.4 + PostCSS + Autoprefixer         | Utility-first, mobile-first, rapid prototyping         |
| **i18n**              | i18next 23 + react-i18next 15                     | Mature, ICU MessageFormat-ready, lazy-loading capable  |
| **Backend (planned)** | Tencent CloudBase (Cloud Functions + Database)    | Serverless, auto-scaling, Singapore region available   |
| **AI (planned)**      | CloudBase + LLM API for conversational assessment | Hybrid: rules for safety, LLM for natural conversation |
| **PWA (planned)**     | next-pwa with service worker                      | Offline-capable, installable                           |
| **Testing (planned)** | Vitest + Playwright + fairness testing matrix     | Unit + E2E + fairness across subgroups                 |
| **Repository**        | GitHub monorepo (pnpm + Turborepo)                | Shared packages: frontend, backend, expert-package     |

## 3. Frontend Directory Structure

```
web/
├── public/
│   └── locales/          # Modular i18n JSON files (one per language)
│       ├── en.json       # English (master)
│       ├── zh-CN.json    # Simplified Chinese
│       ├── ms.json       # Bahasa Melayu
│       ├── ta.json       # Tamil
│       └── fil.json      # Filipino
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── layout.tsx    # Root layout (metadata, viewport, AppWrapper)
│   │   ├── page.tsx      # Home page
│   │   ├── globals.css   # Global styles + Tailwind directives
│   │   ├── assess/
│   │   │   └── page.tsx  # Conversational intake + triage
│   │   ├── recommendations/
│   │   │   └── page.tsx  # Care navigation page
│   │   └── followup/
│   │       └── page.tsx  # Reassessment check-in
│   ├── components/       # Reusable UI components
│   │   ├── AppWrapper.tsx    # Shell: header + main + bottom nav
│   │   ├── Header.tsx        # Fixed top header with title + tagline
│   │   ├── BottomNav.tsx     # Fixed bottom navigation (4 tabs)
│   │   ├── LanguageSwitcher.tsx  # 5-language dropdown
│   │   ├── Disclaimer.tsx    # Disclaimer + no-image-diagnosis notice
│   │   └── RiskBadge.tsx     # Color-coded risk indicator
│   └── lib/
│       └── i18n.ts       # i18next init, language persistence, exports
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── next.config.mjs
```

### Planned Monorepo Structure (Future)

```
footcheck/
├── apps/
│   └── web/              # This Next.js app
├── packages/
│   ├── shared/           # Shared types, constants, risk engine
│   ├── expert-package/   # Clinical knowledge layer (JSON + rules)
│   └── ui/               # Shared component library
├── functions/            # CloudBase cloud functions
│   ├── assess/           # Assessment API
│   ├── followup/         # Follow-up scheduling API
│   └── auth/             # Authentication API
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## 4. i18n Management Approach

### Current Implementation

- **Library:** i18next 23 with react-i18next 15
- **Format:** Modular JSON files per language in `public/locales/`
- **Loading:** Bundled at build time (no lazy loading yet — appropriate for 5 languages)
- **Persistence:** `localStorage` key `footcheck-lang`
- **Fallback:** English (`en`) as fallback language
- **Structure:** Namespaced by page/section: `app`, `nav`, `aria`, `language`, `disclaimer`, `home`, `assess`, `recommendations`, `followup`, `common`

### Design Principles

1. **Master file is `en.json`** — all new keys added here first, then translated
2. **Keys are semantic, not positional** — `home.startCheck` not `home.button1`
3. **ICU MessageFormat ready** — can add `i18next-icu` for pluralization/gender if needed
4. **No hardcoded UI strings** — every visible string goes through `t()` function
5. **Language detection:** `localStorage` > browser default > English

### Planned Enhancements

- Lazy-load locale files via `i18next-http-backend` to reduce initial bundle
- Add `i18next-icu` for plural forms (e.g., "1 day" vs "5 days" streak)
- Add translator workflow: export missing keys, import translations
- Fairness testing: verify all 5 locales have identical key sets

## 5. CloudBase Integration Path

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  Next.js PWA (Frontend)                              │
│  - Static export / SSR                               │
│  - Client-side state management                      │
│  - localStorage for offline-first                    │
└──────────────┬──────────────────────────────────────┘
               │ HTTPS (REST/GraphQL)
               ▼
┌─────────────────────────────────────────────────────┐
│  Tencent CloudBase                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Cloud Funcs  │  │  Database    │  │  Storage  │ │
│  │              │  │  (NoSQL)     │  │           │ │
│  │ - assess()   │  │              │  │           │ │
│  │ - followup() │  │  Collections:│  │           │ │
│  │ - auth()     │  │  - users     │  │           │ │
│  │ - checkin()  │  │  - assessments│ │           │ │
│  │              │  │  - checkins   │  │           │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│                                                      │
│  Region: Singapore (ap-singapore)                    │
└─────────────────────────────────────────────────────┘
```

### Integration Steps

1. **Install SDK:** `@cloudbase/js-sdk` in `web` package
2. **Environment config:** Create `.env.local` with CloudBase envId
3. **Auth:** Anonymous auth first (no barrier), upgrade to phone/email later
4. **API proxy:** Use Next.js API routes (`/api/assess`, `/api/followup`) as a thin proxy to CloudBase Cloud Functions — keeps envId server-side
5. **Database schema:**

```typescript
// Collection: users
{
  _id: string,
  language: string,        // preferred language
  ageRange: string,         // "60-69" | "70-79" | "80-89" | "89+"  (target population: 60+)
  diabetesType: string,     // "type1" | "type2"
  createdAt: Date,
  updatedAt: Date,
}

// Collection: assessments
{
  _id: string,
  userId: string,
  answers: Record<string, string>,
  riskLevel: "low" | "moderate" | "high",
  riskFactors: string[],
  createdAt: Date,
}

// Collection: checkins
{
  _id: string,
  userId: string,
  inspected: boolean,
  changes: string | null,
  createdAt: Date,
}
```

1. **Offline-first:** Cache assessment results locally, sync when online
2. **Security rules:** User can only read/write their own data

## 6. Medical Data & Knowledge Sources

The screening logic is organized in a **3-layer architecture** across 6 medical data/knowledge sources:

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Macro & Background                                    │
│  └─ data.gov.sg (Singapore local disease & population stats)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Medical Rules & Standards (Authoritative Basis)       │
│  ├─ Singapore ACE 2024 (Local triage & referral pathways)       │
│  ├─ IWGDF Guidelines (International foot risk classification)    │
│  └─ MIMIC-III (Severe systemic infection red flag thresholds)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Patient Features & Testing (Public Datasets)          │
│  ├─ Kaggle Diabetes Dataset (Complication risk feature analysis) │
│  └─ Synthea (50+ virtual multi-ethnicity cases for safety &      │
│              fairness testing)                                    │
└─────────────────────────────────────────────────────────────────┘
```


### Detailed Source Table

| # | Source                            | Role in System                                                                                                                                                                                                                                            |
| - | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | **Singapore ACE 2024 Guidelines** | Primary clinical guideline for diabetic foot screening frequency, referral criteria, and risk factor thresholds. Drives the question set and recommendation logic.                                                                                        |
| 2 | **IWGDF Risk Stratification**     | International Working Group on the Diabetic Foot risk classification system (0/1/2/3). Maps to our Low/Moderate/High risk tiers. Informs when to recommend urgent vs. routine follow-up.                                                                  |
| 3 | **MIMIC-III**                     | Critical infection flags extracted from MIMIC-III clinical database. Used to identify red-flag symptoms (e.g., wounds >2 weeks, skin color changes) that trigger high-risk pathway. Not used for individual diagnosis — used to validate rule thresholds. |
| 4 | **Kaggle Diabetes Dataset**       | Population-level diabetes risk profiling. Used to correlate self-reported symptoms with population risk distributions. Informs the "moderate risk" threshold calibration.                                                                                 |
| 5 | **Synthea**                       | Synthetic patient records for testing. Used to generate diverse test personas for fairness testing across age, gender, ethnicity, and symptom combinations. No real patient data is used or stored.                                                       |
| 6 | **data.gov.sg**                   | Singapore public health context (diabetes prevalence, demographic distribution, healthcare access points). Used to contextualize recommendations and ensure culturally appropriate care navigation.                                                       |

### How These Sources Are Used

- **Rules engine (deterministic):** Sources 1-3 inform the rule thresholds in `calculateRisk()`. These are NOT ML models — they are if/then rules with human-reviewable logic.
- **Risk calibration:** Source 4 helps calibrate moderate-risk thresholds using population statistics.
- **Test data:** Source 5 generates synthetic test cases for fairness testing.
- **Localization:** Source 6 ensures the care navigation recommendations are relevant to Singapore's healthcare system.

### What These Sources Do NOT Do

- They do NOT diagnose individual patients
- They do NOT process images or photos
- They do NOT recommend medications
- They do NOT replace professional medical evaluation

## 7. Milestone Plan

### Phase 1: Prototype Skeleton (COMPLETE)

- [x] Mobile-first layout with 4 pages
- [x] 5-language i18n with centralized JSON files
- [x] Language persistence via localStorage
- [x] Conversational intake with 5 scripted questions
- [x] Deterministic risk stratification (Low/Moderate/High)
- [x] Care navigation recommendations
- [x] Follow-up check-in with trend chart
- [x] Safety disclaimers throughout
- [x] No AI image diagnosis — explicit notice
- [x] Accessibility: large fonts, high contrast, touch-friendly controls
- [x] 6 medical data sources referenced in UI

### Phase 2: CloudBase Backend Integration (Next)

- [ ] Set up CloudBase environment (Singapore region)
- [ ] Implement Cloud Functions: assess, followup, auth, checkin
- [ ] Create NoSQL database collections
- [ ] Anonymous auth → phone/email auth
- [ ] Next.js API routes as proxy layer
- [ ] Replace mock data with real API calls
- [ ] Offline-first: cache results locally, sync when online

### Phase 3: Expert Package & LLM Integration

- [ ] Build clinical knowledge expert package (versioned JSON)
- [ ] Integrate LLM for natural conversational assessment
- [ ] Rules engine as safety guardrail on LLM output
- [ ] Dynamic question branching based on context
- [ ] Personalized recommendations based on history

### Phase 4: PWA & Deployment

- [ ] Configure next-pwa service worker
- [ ] Offline assessment capability
- [ ] Installable PWA manifest
- [ ] Push notifications for check-in reminders
- [ ] Deploy to CloudBase static hosting

### Phase 5: Fairness Testing & Quality

- [ ] Fairness testing matrix: language x age x gender x risk x literacy x input style
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Native speaker review for Tamil and Filipino
- [ ] Performance audit (Lighthouse)
- [ ] Security audit

### Phase 6: Deliverables

- [ ] Architecture diagram (SVG)
- [ ] Trust-boundary diagram (SVG)
- [ ] Design trade-offs document
- [ ] Live demo walkthrough script
- [ ] Fairness report
- [ ] GitHub repository with full source

## 8. How to Run & Preview

```bash
# Clone the repository
git clone <repo-url>
cd footcheck/web

# Install dependencies
npm install

# Start dev server (CRITICAL: NODE_OPTIONS="" bypasses brokered FS shim)
NODE_OPTIONS="" node node_modules/next/dist/bin/next dev -p 3000

# Or using npm script:
NODE_OPTIONS="" npm run dev

# Open in browser
open http://localhost:3000
```

### In WorkBuddy AI

1. The dev server runs in background at <http://localhost:3000>
2. The built-in browser preview panel shows the app
3. Use device toolbar (Chrome DevTools) to simulate 375px viewport
4. Switch languages via the header dropdown (top-right)
5. Test all 4 pages via bottom navigation

### Tamil & Filipino Layout Verification

- CSS `word-break: break-word` and `overflow-wrap: break-word` applied for `html[lang="ta"]` and `html[lang="fil"]`
- Increased line-height (1.85) for Tamil script readability
- Max-width 85% on chat message bubbles (was 80%) to accommodate longer Tamil words
- All text uses `text-base` (1.125rem / 18px) minimum — no `text-xs` for body text
- Bottom nav labels use `text-sm` (14px) — verified readable for Tamil at 375px width
