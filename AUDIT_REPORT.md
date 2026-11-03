# 📋 FAMX1 (Kinsutra AI) — Comprehensive Engineering & QA Audit Report

**Date:** 2026-11-02  
**Auditor:** Senior Full-Stack Engineer & QA Lead  
**Scope:** Full FAMX1 Codebase (Frontend React/Vite, Backend FastAPI/Python, Kinship Engines, AI Agent, Routing & UI)  
**Status:** Audit Complete — Ready for Review & Execution Plan Approval

---

## ═══ EXECUTIVE SUMMARY & ARCHITECTURE OVERVIEW ═══

### 1. Purpose of the Application
**Kinsutra AI** is an anthropology-backed genealogical knowledge graph and family relationship engine. It combines:
- An interactive SVG/Canvas-based dynastic family tree visualizer with Polaroid-style member cards, washi tape styling, and organic tilts.
- **Lounsbury Kinship Algebra 2.0**: A formal string reduction algebra (`+` Ascent, `-` Descent, `0` Lateral, `=` Affine) distinguishing parallel vs. cross-cousins (*Menarikam*) and computing cultural/regional terminology in Hindi, Telugu, Tamil, Kannada, and Malayalam.
- **Kinsutra AI Agent**: An NLP extractor supporting natural language story parsing, spreadsheet/CSV imports, and REST integrations with Google Gemini and OpenAI.
- Multi-family network switching, member perspective switching, family access codes, and in-app family messaging/groups.

### 2. Tech Stack
- **Frontend:** React 19 (`19.2.8`), Vite (`8.2.0`), React Router DOM (`7.18.2`), Zustand (`5.0.15`) with `persist` middleware, GSAP (`3.15.0`) + ScrollTrigger, Lenis (`1.3.26`), SheetJS / XLSX (`0.18.5`), Oxlint (`1.75.0`).
- **Backend:** Python 3.12, FastAPI (`0.141.1`), Uvicorn, Pydantic, Python `unittest`.
- **Styling:** CSS3 custom properties with blackboard chalkboard theme tokens, Lenis smooth scrolling, Web Audio API synthesized sound effects.

### 3. Folder Structure & Entry Points
- **Frontend Entry:** `index.html` → `src/main.jsx` → `src/App.jsx`
- **Frontend State:** `src/store/familyStore.js` (Zustand store persisted to `localStorage` under `familygraph-store`)
- **Backend Entry:** `backend/app/main.py`
- **Algebra Engines:**
  - Client-side JS Engine: `src/utils/relationshipEngine.js`
  - Backend Python Engine: `backend/app/relationships/engine.py`, `canonical.py`, `graph.py`, `terminology.py`
- **AI Agent Utilities:** `src/utils/aiGraphParser.js`, `src/utils/aiLlmEngine.js`

### 4. Data Flow
`UI Components / Modals / Agent Drawer`  
&nbsp;&nbsp;&nbsp;&nbsp;↓  
`Zustand Store (familyStore.js)`  
&nbsp;&nbsp;&nbsp;&nbsp;↓ (persisted to localStorage `familygraph-store`)  
`Graph Layout Hook (useGraphLayout.js)` & `Relationship Engine (relationshipEngine.js)`  
&nbsp;&nbsp;&nbsp;&nbsp;↓  
`SVG Canvas (GraphCanvas.jsx) + GraphNode / GraphEdge`  
*(Optional: Backend API `POST /api/relationship` on FastAPI server)*

---

## ═══ PHASE 0 — BUILD, RUNTIME & ENVIRONMENT BASELINE ═══

| Check | Result | Evidence / Log Output | Severity |
| :--- | :--- | :--- | :--- |
| **Frontend Lint (`oxlint`)** | **49 Warnings** | `oxlint` found 49 warnings: duplicate boolean checks in `relationshipEngine.js:377`, unused variables in `App.jsx`, `Chat.jsx`, `useGraphLayout.js`, `KinsutraAgentWidget.jsx`, `CommandPalette.jsx`, `RelationEditorModal.jsx`, useless regex escapes in `aiGraphParser.js:14, 126`. | Medium |
| **Frontend Build (`vite build`)** | **Built with Chunk Warning** | Output: `index.html` (1.07 kB), `index-CxuiIS57.css` (104.60 kB), `index-Bp9ufLLg.js` (881.43 kB). Single bundle chunk exceeds 500 kB because routes and heavy packages (XLSX, GSAP) are not code-split. | Medium |
| **Backend Unit Tests** | **Passed (21/21)** | `python -m unittest backend/app/relationships/tests/test_relationships.py` passed in 0.004s. | OK |
| **Backend Server Launch (`backend/app/main.py`)** | **CRITICAL FAILURE (`ImportError`)** | Running `from app.main import app` crashes: `ImportError: cannot import name 'get_regional_term' from 'app.relationships.terminology'`. Function `get_regional_term` was never implemented in `terminology.py`! | **CRITICAL** |
| **Backend Module Path** | **FAILURE (`ModuleNotFoundError`)** | Running `python backend/app/main.py` fails with `ModuleNotFoundError: No module named 'app'`. Root path is not in Python module search path. | High |
| **Backend Dependencies** | **Missing `requirements.txt`** | `backend/requirements.txt` or `pyproject.toml` is completely missing from the repository. | Medium |
| **Environment Config** | **Missing `.env.example`** | No `.env` or `.env.example` exists. LLM keys are read from `localStorage` without documented environment variables. | Medium |
| **Deprecated / Duplicated Packages** | **Package Conflict** | `package.json` contains both `@studio-freight/lenis: ^1.0.42` (deprecated by author) and `lenis: ^1.3.26`. `App.jsx` imports `lenis`. `@studio-freight/lenis` is redundant bloat. | Low |
| **Node.js ESM imports in utility scripts** | **Module Not Found** | Running `node scratch/test_relations.js` throws `ERR_MODULE_NOT_FOUND` because `aiGraphParser.js` imports `'../store/familyStore'` without `.js` extension. | Low |

---

## ═══ PHASE 1 — MODEL AUDIT ═══

### A) Data Models & Schemas

#### Model 1: `Person` (`src/store/familyStore.js`, `backend/app/relationships/graph.py`, `backend/app/main.py`)

| Field | Problem | Where it breaks | Severity | Fix |
| :--- | :--- | :--- | :--- | :--- |
| `memberNo` | Missing in `completeOnboarding`. Types inconsistent: number vs string. | `ProfilePanel.jsx:368` and `GraphNode.jsx:254` render `#{displayPerson.memberNo \|\| '01'}`. Onboarded user has undefined member number. | Medium | Ensure `completeOnboarding` assigns `memberNo: 1`. Normalize `memberNo` to numeric sequence. |
| `name` | Deduplication by name prevents legitimate relatives with identical names (e.g. grandfather & grandson). | `familyStore.js:730`: `addPerson` checks `p.name.toLowerCase() === nameKey` and silently returns existing person ID instead of creating new relative! | High | Only deduplicate if explicit flag is passed or allow user confirmation; do not silently hijack existing IDs. |
| `gender` | In `Onboarding.jsx`, gender option `'other'` exists, but `relationshipEngine.js:223` and `engine.py:114` assume binary male fallback. | If gender is `'other'` or `'unknown'`, engine assigns male terms ("Father", "Brother", "Son") rather than neutral terms ("Parent", "Sibling", "Child"). | Medium | Implement neutral relationship terms ("Parent", "Child", "Sibling", "Spouse") when gender is non-binary or unknown. |
| `photo` | Raw base64 data URLs stored directly in `localStorage` without size compression. | `localStorage` quota (typically 5MB) quickly fills up after 2–3 photos, throwing unhandled `QuotaExceededError` and corrupting persistence. | High | Compress/resize images via canvas to max 128x128 thumbnail before storing, or enforce strict file size limit. |
| `pydantic` schema (`PersonModel`) | `main.py:24` only models `id`, `name`, `gender`. Additional fields from UI (`birthDate`, `isDeceased`, `phone`) are unmodeled. | FastAPI API schema documentation `/docs` does not reflect the frontend entity contract. | Low | Expand `PersonModel` with optional profile fields. |

---

#### Model 2: `Edge` / `Relationship` (`src/store/familyStore.js`, `backend/app/main.py`, `src/utils/relationshipEngine.js`)

| Field | Problem | Where it breaks | Severity | Fix |
| :--- | :--- | :--- | :--- | :--- |
| `from` vs `from_id`, `to` vs `to_id` | **API Contract Mismatch:** Frontend edge uses `{ from, to, type }`. Backend `EdgeModel` in `main.py:30` requires `from_id` and `to_id`. | `POST /api/relationship` fails immediately with `422 Unprocessable Entity` if frontend edges are sent. | **CRITICAL** | Update `EdgeModel` in `main.py` to accept `from_id` or `from` (using Pydantic `Field(validation_alias=...)`) and `to_id` or `to`. |
| `e.type` normalization in `getGenerationCount` | `getGenerationCount` filters for `e.type === RELATIONSHIP_TYPES.CHILD` (`familyStore.js:999`), but `inferTransitiveEdges` normalizes ALL child edges to `PARENT` (`from: parent, to: child`). | Descendant generation count is ALWAYS 0. `getGenerationCount()` returns incorrect generation depth. | **CRITICAL** | In `getGenerationCount()`, traverse children where `e.from === id && e.type === RELATIONSHIP_TYPES.PARENT`. |
| `label` | `addEdge` and showcase family do not populate `edge.label`. `Chat.jsx:97, 130` and `CommandPalette.jsx:24` rely on `edge.label`. | Relationship pill in chat list, chat header, and command palette displays blank/empty text. | High | Derive relationship dynamically via `deriveRelationship(meId, personId)` or auto-assign `edge.label` upon edge creation. |
| `EDGE_CONFIGS` invalid constants | `GraphEdge.jsx:12-13` references `RELATIONSHIP_TYPES.ADOPTED_PARENT` and `ADOPTED_CHILD`, which are `undefined` on `RELATIONSHIP_TYPES`. | Creates `[undefined]` key in JavaScript object map, silently overwriting edge styles. | Medium | Add missing constants to `RELATIONSHIP_TYPES` or map to `PARENT`/`CHILD` variants. |
| Non-nuclear direct edges | If user adds relative as `UNCLE_AUNT`, `COUSIN`, `IN_LAW`, `findAlgebraicPath` only traverses `PARENT`, `CHILD`, `SPOUSE`, `SIBLING`. Direct edge shortcut in `relationshipEngine.js:46` only checks `PARENT`, `SPOUSE`, `SIBLING`. | Adding an Uncle or Cousin directly without intermediate parents returns `UNCONNECTED` / "Family Relative"! | High | In direct edge shortcut (`relationshipEngine.js:46`), add cases for `UNCLE_AUNT`, `COUSIN`, `IN_LAW`, `GRANDPARENT`, `STEP_PARENT`. |
| Duplicate boolean conditions in `relationshipEngine.js` | Lines 373 & 377: `opStr === '=0=' \|\| opStr === '=0='` and `opStr === '=0' \|\| opStr === '0=' \|\| opStr === '=0' \|\| opStr === '0='`. | Redundant code flagged by linter; indicates missing intended condition (e.g. spouse-sibling variations). | Medium | Clean duplicate conditions and ensure comprehensive affine operator coverage. |

---

#### Model 3: `FamilyNetwork` (`src/store/familyStore.js`)

| Field | Problem | Where it breaks | Severity | Fix |
| :--- | :--- | :--- | :--- | :--- |
| `people` / `edges` in family list | Initial family network in `completeOnboarding` does not sync `people` and `edges` inside `families[0]`. | Switching trees and switching back loses tree state if not explicitly saved during switch. | High | Ensure `families[0]` initialized in `completeOnboarding` contains snapshot of `{ meId, people, edges }`. |
| `switchFamilyTree` empty tree handling | Switching to a new/empty family sets `meId: null`. The UI remains on `/app` with no prompt to create root person. | User is left with blank canvas and no active person perspective. | Medium | If switched family is empty, show prompt to set up root member or auto-seed root profile. |

---

#### Model 4: `Message`, `Group`, `Event` (`src/store/familyStore.js`, `src/pages/Chat.jsx`, `src/pages/Groups.jsx`)

| Field | Problem | Where it breaks | Severity | Fix |
| :--- | :--- | :--- | :--- | :--- |
| `familyId` partition | `messages`, `groups`, `events` are stored in global arrays with no `familyId` property. | Switching between Family Trees leaks private messages and groups across unrelated families. | High | Add `familyId: activeFamilyId` to message and group schemas, and filter queries by `activeFamilyId`. |
| Member selection in `Groups.jsx` | `Groups.jsx:21` only pulls `neighbors = getNeighbors(meId)` instead of all family members. | User cannot add cousins, aunts, grandchildren, or relatives beyond immediate 1-hop neighbors to groups! | High | Allow selecting from `Object.values(people).filter(p => p.id !== meId)`. |
| Chat member list in `Chat.jsx` | `Chat.jsx:36` only displays `neighbors = getNeighbors(meId)`. Non-adjacent relatives cannot be messaged. | Cannot open a conversation with cousins or extended relatives. | Medium | List all members in tree with an option to start conversation with any relative. |

---

### B) AI/ML Model Integration Audit

| Component | Check | Finding & Evidence | Severity | Fix |
| :--- | :--- | :--- | :--- | :--- |
| **API Key Transport** | Secret Exposure | `src/utils/aiLlmEngine.js:124`: `const endpoint = 'https://...gemini-1.5-flash:generateContent?key=${apiKey}'`. API key passed in URL query parameter. | High | Pass API key in request header `x-goog-api-key` to prevent key leakage in browser history and proxy logs. |
| **Response Parsing** | Fragile JSON Extraction | `aiLlmEngine.js:166, 202`: `jsonStr = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim(); JSON.parse(jsonStr);`. Throws unhandled `SyntaxError` if model outputs preamble or explanations. | High | Extract JSON by slicing from first `{` to last `}` before `JSON.parse`. Wrap in try/catch with fallback to heuristic parser. |
| **Network Resilience** | Missing Timeouts & AbortSignal | `fetch()` in `aiLlmEngine.js` has no timeout. If API is down or throttled, promise hangs indefinitely with spinner frozen. | Medium | Add `signal: AbortSignal.timeout(15000)` to all external LLM fetch calls. |
| **Data Safety** | Destructive Overwrite | `KinsutraAgentWidget.jsx:44`: `const shouldClear = parsedData.people.length > 2; if (shouldClear) useFamilyStore.setState({ people: {}, edges: [] })`. Wipes user's existing tree if AI parses >2 people! | **CRITICAL** | Remove automatic wipe. Prompt user with "Merge into current family" or "Create new family network". |
| **API Providers** | Outdated Model Defaults | `aiLlmEngine.js:187` hardcodes `'gpt-3.5-turbo'`, which is superseded and has lower JSON reliability. | Low | Support model selection or upgrade to `gpt-4o-mini`. |

---

## ═══ PHASE 2 — REDIRECTS & ROUTING AUDIT ═══

### Route Map Table

| Route | Component | Auth Required (`isOnboarded`) | Redirects To | Status | Issue & Evidence | Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `Landing.jsx` | No | None (Public) | **BROKEN (CTA Crash)** | Clicking "Open Studio →" or "Family Graph" in `Navigation.jsx:126, 306` throws `ReferenceError: loadShowcaseFamily is not defined`! | Import/destructure `loadShowcaseFamily` in `Navigation.jsx`. |
| `/onboarding` | `Onboarding.jsx` | No | `/app` if `isOnboarded === true` | OK | If already onboarded, redirects to `/app`. | None needed. |
| `/app` | `AppPage.jsx` | Yes (`Protected`) | None (auto-loads showcase if empty) | **ISSUE** | `Protected` does not redirect un-onboarded user; it mutates store in `useEffect` and flashes empty UI on first frame. | Cleanly initialize or redirect un-onboarded visitors to `/onboarding`. |
| `/chat` | `Chat.jsx` | Yes (`Protected`) | None | OK | Renders messaging interface. | Ensure fallback when zero conversations exist. |
| `/groups` | `Groups.jsx` | Yes (`Protected`) | None | OK | Renders group management. | None needed. |
| `*` | Catch-all `<Navigate>` | N/A | `/app` or `/` | **ISSUE** | No dedicated 404 page. User typing invalid route is silently redirected with zero feedback. | Create clean 404 NotFound page with button to return to Graph. |

### Navigation & Deep Linking Issues
1. **Modal State Lost on Refresh / Back Button:**  
   Opening a member's profile sets local `selectedId` state in `AppPage.jsx`. Pressing the browser back button navigates away from `/app` entirely instead of closing the profile modal.
2. **Double Redirect / State Flash:**  
   When navigating directly to `/app` with no persisted data, `Protected` renders children while `useEffect` schedules `loadShowcaseFamily()`, causing a 1-frame layout shift and flash of empty state.

---

## ═══ PHASE 3 — UI & UX AUDIT ═══

| Page / Component | Issue Description | Severity | File & Line | Fix |
| :--- | :--- | :--- | :--- | :--- |
| **Global Navigation** | **CRITICAL RUNTIME CRASH:** Clicking "Family Graph" link or "Open Studio →" throws `ReferenceError: loadShowcaseFamily is not defined`. | **CRITICAL** | `src/components/layout/Navigation.jsx:126, 306` | Destructure `loadShowcaseFamily` from `useFamilyStore`. |
| **Graph Node** | Unlocalized word `'YOU (KAMU)'` rendered on user's Polaroid card. | Medium | `src/components/graph/GraphNode.jsx:44` | Change to `'YOU'` or `'YOU (SELF)'`. |
| **Profile Panel** | Unlocalized word `'YOU (KAMU)'` in profile polaroid chin. | Medium | `src/components/profile/ProfilePanel.jsx:65` | Change to `'YOU'` or `'YOU (SELF)'`. |
| **Profile Panel** | `onEditRelations && onEditRelations(personId);` unused expression. | Low | `src/components/profile/ProfilePanel.jsx:574` | Replace with `onEditRelations?.(personId)`. |
| **Graph Canvas** | `onAddRelative && onAddRelative(meId \|\| null);` unused expression. | Low | `src/components/graph/GraphCanvas.jsx:579` | Replace with `onAddRelative?.(meId \|\| null)`. |
| **Relation Editor** | Unused `edges` import. Spouses and siblings display as 'Mother' or 'Father' when `edge.label` is null. | High | `src/components/modals/RelationEditorModal.jsx:7, 140` | Check `edge.type` before assigning gendered parent labels. |
| **Add Relative Modal** | Submitting with empty name fails silently with zero validation feedback to user. | Medium | `src/components/modals/AddRelativeModal.jsx:92` | Add inline validation error message ("Please enter a relative name"). |
| **Theme System** | `[data-theme="light"]` has dark green blackboard background `#15291e`, meaning light mode is practically identical to dark mode. | Medium | `src/styles/tokens.css:158` | Provide authentic classroom ivory/whiteboard or vintage parchment light mode palette. |
| **Responsive Layout** | On mobile screens (375px), hero CTA buttons and metrics row wrap tightly; agent widget drawer can overlap bottom canvas controls. | Medium | `src/pages/Landing.css`, `src/pages/App.css` | Add `@media (max-width: 640px)` padding and stacking adjustments. |
| **Accessibility** | Interactive icon buttons (`app-topbar__btn`, profile edit buttons) lack accessible labels for screen readers. Contrast ratio on secondary chalk text (`#8fa597`) on `#121e17` is ~4.1:1 (below 4.5:1 WCAG AA). | Low | `src/pages/App.jsx`, `src/styles/tokens.css` | Add `aria-label` to all buttons and boost secondary text brightness to `#a3b8aa`. |

---

## ═══ PHASE 4 — OTHER ISSUES ═══

1. **Dead / Unused Code:**
   - `src/App.jsx:44`: `paletteSelectedId` declared but never read.
   - `src/pages/Chat.jsx:26`: `messages` declared but never read.
   - `src/hooks/useGraphLayout.js:138`: `kidsWidth` declared but never read.
   - `src/components/agent/KinsutraAgentWidget.jsx:22-23`: `people` and `meId` unused.
   - `src/components/search/CommandPalette.jsx:1, 18`: `useCallback` unused, `people` param unused.
   - `src/components/modals/RelationEditorModal.jsx:7`: `edges` unused.
   - `src/assets/hero.png` and `src/assets/vite.svg`: Unreferenced images left in repository.
   - `@studio-freight/lenis`: Unused legacy package in `package.json`.
2. **Missing React Error Boundary:**
   - There is no React Error Boundary component around `<App />` or `<AppPage />`. A single rendering error in SVG layout or node rendering crashes the entire web app into a blank white screen.
3. **Missing Environment Documentation:**
   - Missing `.env.example` explaining `VITE_GEMINI_API_KEY`, `VITE_OPENAI_API_KEY`, and backend port configuration.
4. **Vite Code Splitting & Performance:**
   - Production bundle is 881 kB in a single chunk. `XLSX` and `GSAP` are loaded upfront even on landing page. Dynamic imports (`React.lazy`) for `/app`, `/chat`, `/groups` will drastically reduce initial load time.

---

## ═══ PHASE 5 — PLANNED FIX ORDER ═══

Following the strict protocol: **Critical → High → Medium → Low**, and within each level **Models → Redirects → UI**:

### Batch 1: CRITICAL ISSUES (Must fix first)
1. **[CRITICAL - Model / Backend] Fix FastAPI Backend Crash:**
   - In `backend/app/relationships/terminology.py`: Implement `get_regional_term(canonical_rel: str, gender: str, lang: str = "hindi") -> str` matching `main.py:64`.
   - In `backend/app/main.py`: Fix module import paths so `main.py` can be run from root or backend directory.
   - Create `backend/requirements.txt` (`fastapi`, `uvicorn`, `pydantic`).
2. **[CRITICAL - Model / Contract] Edge Model Schema Alignment:**
   - In `backend/app/main.py`: Update `EdgeModel` to accept `from` / `from_id` and `to` / `to_id` using Pydantic aliases.
   - Add support for `SIBLING` and extended edges in backend graph parser.
3. **[CRITICAL - Model / Logic] Descendant Generation Calculation:**
   - In `src/store/familyStore.js:999`: Fix `getGenerationCount()` to traverse children via `e.from === id && e.type === RELATIONSHIP_TYPES.PARENT`.
4. **[CRITICAL - Redirects / UI] Navigation Crash:**
   - In `src/components/layout/Navigation.jsx:126, 306`: Destructure `loadShowcaseFamily` from `useFamilyStore` to eliminate `ReferenceError`.
5. **[CRITICAL - AI / Safety] Prevent Destructive AI Tree Wipe:**
   - In `src/components/agent/KinsutraAgentWidget.jsx:44`: Remove automatic graph wipe (`useFamilyStore.setState({ people: {}, edges: [] })`). Provide non-destructive merge or user prompt.

### Batch 2: HIGH PRIORITY ISSUES
6. **[High - Model / Logic] Missing Non-Nuclear Direct Edges in Relationship Engine:**
   - In `src/utils/relationshipEngine.js:46`: Add direct shortcuts for `UNCLE_AUNT`, `COUSIN`, `IN_LAW`, `GRANDPARENT`, `STEP_PARENT`.
7. **[High - Model / Data] Edge Label & Relation Editor Labels:**
   - In `src/components/modals/RelationEditorModal.jsx:140`: Check `edge.type` before defaulting to 'Mother' or 'Father'.
   - Ensure dynamic derivation in `Chat.jsx` and `CommandPalette.jsx` when `edge.label` is empty.
8. **[High - AI / Security] Gemini API Key Transport & JSON Parser:**
   - In `src/utils/aiLlmEngine.js`: Move Gemini key from query param to `x-goog-api-key` header.
   - Add robust JSON substring extraction (`/\{[\s\S]*\}/`) and `AbortSignal.timeout(15000)`.
9. **[High - Model / Store] Groups Member Selection & Multi-Family Partitioning:**
   - In `src/pages/Groups.jsx:21`: Allow selecting all tree members, not just 1-hop neighbors of `meId`.
   - Ensure active family network syncs properly on creation and switch.

### Batch 3: MEDIUM PRIORITY ISSUES
10. **[Medium - Routing] 404 Catch-All Page & Route Guards:**
    - Create a clean `NotFound` page component and attach to Route `*`.
    - Clean up `Protected` wrapper to prevent 1-frame layout shift.
11. **[Medium - UI / Localization] Remove Hardcoded 'KAMU' & Polish Modals:**
    - Replace `'YOU (KAMU)'` in `GraphNode.jsx` and `ProfilePanel.jsx` with `'YOU'`.
    - Add validation error alerts to `AddRelativeModal.jsx` for empty inputs.
12. **[Medium - UI / Tokens] Authentic Light Theme:**
    - Enhance `[data-theme="light"]` in `tokens.css` with a high-contrast vintage paper / light blackboard scheme.
13. **[Medium - Model / Cleanliness] Oxlint Warnings & Regex Escapes:**
    - Fix duplicate comparisons in `relationshipEngine.js:373, 377`.
    - Fix unnecessary regex escapes in `aiGraphParser.js:14, 126`.
    - Clean unused variables in `App.jsx`, `Chat.jsx`, `useGraphLayout.js`, `KinsutraAgentWidget.jsx`, `CommandPalette.jsx`.

### Batch 4: LOW PRIORITY ISSUES & FINAL POLISH
14. **[Low - Cleanliness] Dependency & File Cleanup:**
    - Remove deprecated `@studio-freight/lenis`.
    - Clean up unused files in `src/assets`.
    - Add `.env.example` and update `README.md`.
15. **[Low - Architecture] Error Boundary & Vite Code Splitting:**
    - Add `ErrorBoundary.jsx` around root app.
    - Code-split routes with `React.lazy` and `Suspense`.

---

**Next Step:** Awaiting user review and authorization to proceed to **PHASE 6 (FIX)**.
