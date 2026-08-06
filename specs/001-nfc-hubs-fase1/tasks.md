---

description: "Task list for NFC Hubs Phase 1 — Cocktail Bar and Gourmet Tapas"
---

# Tasks: NFC Hubs Phase 1 — Cocktail Bar and Gourmet Tapas

**Input**: Design documents from `/specs/001-nfc-hubs-fase1/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED. The plan specifies a testing stack (Playwright + `@axe-core/playwright` + a payload
budget check) and quickstart.md maps every success criterion SC-001…SC-010 to an automated or manual
check, so test tasks are in scope.

**Organization**: Tasks are grouped by user story so each can be implemented, tested, and demoed
independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every task

## Path Conventions

Per plan.md: shared engine in `src/_includes/` and `src/_engine/`, business content in
`src/businesses/<slug>/`, tests in `tests/`. Build output is `_site/`.

⚠ **Node 24 LTS is required** (Active LTS; see research.md D1). Pinned in `.nvmrc` and enforced by
`engines.node` in `package.json`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and toolchain

- [ ] T001 Create the directory skeleton per plan.md: `src/_data/`, `src/_includes/layouts/`, `src/_includes/partials/`, `src/_engine/`, `src/businesses/copas/`, `src/businesses/tapas/`, `tests/e2e/`, `tests/a11y/`, `tests/budget/`
- [ ] T002 Create `package.json`: Eleventy 3.x devDependency, `"engines": { "node": ">=24" }`, and scripts `dev`, `build`, `test`, `test:e2e`, `test:a11y`, `test:budget`, `audit:placeholders`
- [ ] T003 [P] Create `eleventy.config.js`: input `src/`, output `_site/`, passthrough copy for `src/_engine/` assets, and per-business permalinks producing `_site/copas/index.html` and `_site/tapas/index.html`
- [ ] T004 [P] Create `.gitignore` covering `node_modules/`, `_site/`, `test-results/`, `playwright-report/`
- [ ] T005 [P] Create `playwright.config.ts` with mobile-emulated projects only (iPhone via WebKit, Pixel via Chromium), base URL `http://localhost:8080` — no desktop viewport, per FR-009
- [ ] T006 [P] Create `.nvmrc` pinning Node 24 LTS

**Checkpoint**: `npm install` succeeds and `npm run build` produces an empty-but-valid `_site/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared engine. Both hubs are pure content on top of this; nothing story-specific belongs here.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Implement the placeholder sentinel and resolution helper in `src/_data/resolve.js`: export `PLACEHOLDER = "[PLACEHOLDER - replace]"`, `isPlaceholder(value)`, and `resolveEntry(entry, business)` returning `confirmed` | `pending` per the resolution table in data-model.md
- [ ] T008 [P] Implement build-time data validation in `src/_data/validate.js` against `specs/001-nfc-hubs-fase1/contracts/business-data.schema.json`; the build MUST fail on a missing key, empty string, or `null` so a typo can never be silently treated as a placeholder (data-model.md rule)
- [ ] T009 [P] Create the shared hub layout in `src/_includes/layouts/hub.njk`: `<html lang>` from `business.lang`, semantic list of entries in array order, no external stylesheet/script/font references (FR-022)
- [ ] T010 [P] Create the engine stylesheet `src/_engine/base.css`: reset, system font stack (no web fonts, D7), interactive targets ≥44×44 CSS px, visible focus indicator, layout primitives (FR-023)
- [ ] T011 [P] Create `src/_includes/partials/entry-link.njk` rendering a confirmed entry as `<a href>` (FR-003)
- [ ] T012 [P] Create `src/_includes/partials/entry-pending.njk` rendering a pending entry as `<button type="button">` carrying the pending state, announced to assistive technology and distinguished by more than colour (FR-024, FR-023)
- [ ] T013 [P] Create `src/_includes/partials/entry-wifi.njk` rendering the SSID as inert non-interactive text — never a link, button, or Web NFC call (FR-007, Principle IV)
- [ ] T014 [P] Create `src/_engine/pending.js`: on activating a pending entry show the [ES] notice (e.g. `"Pendiente de confirmar"`) without navigating; must not use localStorage/sessionStorage (FR-012, FR-024)
- [ ] T015 [P] Create `src/_data/site.json` for business-agnostic site values

**Checkpoint**: The engine renders a hub from any conforming `business.json`; both hubs can now be built in parallel

---

## Phase 3: User Story 1 — Cocktail-bar customer accesses their table's services (Priority: P1) 🎯 MVP

**Goal**: A working nocturnal-register hub for [ES] "Bar Ejemplo Copas" with 6 action entries plus inert WiFi, in the FR-016 priority order, with no vCard.

**Independent Test**: Open `/copas/` in a mobile browser; the 6 actions appear in the mandated order, each resolves correctly for its data state (navigating when confirmed, pending notice while placeholder), WiFi is non-actionable text, and no "save contact" entry exists.

### Tests for User Story 1

> Write these first and confirm they FAIL before implementing

- [ ] T016 [P] [US1] Write `tests/e2e/copas.spec.ts`: entry order per FR-016 (SC-001), every unconfirmed entry shows the notice and does not navigate (SC-002), WiFi is not interactive (SC-007), no vCard entry present (FR-017)
- [ ] T017 [P] [US1] Write `tests/e2e/table-param.spec.ts` covering copas: renders identically for `?m=12`, `?m=`, `?m=zzz`, and no parameter, and the parameter is never displayed or stored (SC-009, FR-021)

### Implementation for User Story 1

- [ ] T018 [US1] Create `src/businesses/copas/business.json`: `slug: "copas"`, `register: "nocturnal"`, `lang: "es"`, every value `[PLACEHOLDER - replace]`, no `contact` key (FR-017), and the 7 entries in exact FR-016 order with ids `menu`, `reserve`, `playlist`, `events`, `instagram`, `review`, `wifi` — ids are the Phase 2 `/r/<id>` route segments (contracts/hub-url.md)
- [ ] T019 [P] [US1] Create `src/businesses/copas/theme.css`: nocturnal / experiential register, distinct from tapas and not a recolored template (FR-015), meeting the contrast floor in FR-023
- [ ] T020 [US1] Create `src/businesses/copas/index.njk` binding this business to `layouts/hub.njk`
- [ ] T021 [US1] Make T016 and T017 pass for `/copas/`

**Checkpoint**: The cocktail-bar hub is fully functional and demoable on its own — this is the MVP

---

## Phase 4: User Story 2 — Gourmet-tapas customer explores the product and saves a contact (Priority: P1)

**Goal**: A working daytime-register hub for [ES] "Restaurante Ejemplo Tapas" with 8 entries including in-browser vCard generation.

**Independent Test**: Open `/tapas/` in a mobile browser; the 8 entries appear in the FR-018 order, and "save contact" offers a vCard with all four values once confirmed or shows the pending notice while any is a placeholder — with no server calls in either case.

### Tests for User Story 2

- [ ] T022 [P] [US2] Write `tests/e2e/tapas.spec.ts`: entry order per FR-018 (SC-001), pending entries show the notice (SC-002), WiFi inert (SC-007), and the vCard path in both data states — all four confirmed yields a `.vcf` containing all four values, any placeholder yields the notice and no file (SC-006, FR-020)
- [ ] T023 [US2] Extend `tests/e2e/table-param.spec.ts` with the same four URL variants for tapas (shared file with T017 — do not run these two in parallel)

### Implementation for User Story 2

- [ ] T024 [US2] Create `src/businesses/tapas/business.json`: `slug: "tapas"`, `register: "daytime"`, `lang: "es"`, a `contact` block (`phone`, `address`, `website`) all `[PLACEHOLDER - replace]`, and the 8 entries in exact FR-018 order with ids `menu`, `reserve`, `takeaway`, `review`, `newsletter`, `instagram`, `wifi`, `vcard`
- [ ] T025 [P] [US2] Create `src/businesses/tapas/theme.css`: daytime / product register, clearly distinct from the copas identity (FR-015), meeting FR-023 contrast
- [ ] T026 [P] [US2] Create `src/_engine/vcard.js` per contracts/vcard.md: vCard 3.0, `VERSION:3.0`, UTF-8, CRLF line endings, RFC 2426 escaping of `,` `;` `\` in every value, Blob + `<a download="tapas.vcf">`, object URL revoked after use, no network request
- [ ] T027 [US2] Create `src/_includes/partials/entry-vcard.njk` enforcing the all-or-nothing precondition: generate only when `name`, `phone`, `address`, and `website` are all confirmed; otherwise render as pending (FR-020, FR-024) — never a partial card
- [ ] T028 [US2] Create `src/businesses/tapas/index.njk` binding this business to `layouts/hub.njk`
- [ ] T029 [US2] Make T022 and T023 pass for `/tapas/`

**Checkpoint**: Both hubs work independently and are visibly distinct businesses (SC-005)

---

## Phase 5: User Story 3 — The owner replaces placeholders without touching structure (Priority: P2)

**Goal**: Replacing real data is a data edit only — no structure, markup, or layout file is touched.

**Independent Test**: Change one value in a `business.json`, rebuild, and confirm the hub reflects it while `git status` shows no other source file modified.

### Tests for User Story 3

- [ ] T030 [P] [US3] Write `tests/e2e/data-swap.spec.ts`: with a confirmed value substituted in a fixture, the entry navigates to the new destination and the corresponding pending notice disappears — proving the confirmed↔pending transition is data-driven (SC-004, FR-014)

### Implementation for User Story 3

- [ ] T031 [P] [US3] Create `scripts/audit-placeholders.mjs` listing every remaining `[PLACEHOLDER - replace]` with its file and JSON path, wired to `npm run audit:placeholders` (Constitution VII)
- [ ] T032 [US3] Confirm T008's validation rejects a malformed `business.json` (missing key, empty string, `null`) with a message naming the offending field, and add the failing fixtures under `tests/fixtures/`
- [ ] T033 [US3] Write `README.md` documenting the data-replacement workflow: which file to edit per business, the sentinel convention, the audit command, and the warning that `Entry.id` values are Phase 2 route segments and must not be renamed casually

**Checkpoint**: A non-developer can confirm real data without touching the engine

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates and deployment that span both hubs

- [ ] T034 [P] Write `tests/a11y/wcag.spec.ts` running axe against both hubs in both registers, asserting zero contrast and target-size violations (SC-010, FR-023)
- [ ] T035 [P] Write `tests/budget/payload.spec.ts` asserting each hub's initial payload ≤100 KB and that zero requests go to a third-party origin (SC-008, FR-022, SC-007)
- [ ] T036 [P] Add a throttled Playwright run asserting essential content visible ≤1.5 s on emulated 4G and ≤3 s degraded, in `tests/budget/timing.spec.ts` (SC-008)
- [ ] T037 Configure Cloudflare Pages deployment: build command `npm run build`, output `_site/`, and document the `npx wrangler pages deploy _site` flow in `README.md` (SC-003, D2)
- [ ] T038 Verify the Phase 2 seam by inspection: every destination resolves from `business.json` alone and no destination is hard-coded in any template, so a redirector can be introduced without touching markup (FR-004, Principle III)
- [ ] T039 Execute the manual device checks from quickstart.md and record the outcomes: **iOS Safari vCard import** (the known-fragile assumption, D5), Android Chrome vCard, nocturnal contrast in low light, and a real NFC tap with the phone locked and unlocked (FR-010, Principle VIII)
- [ ] T040 Run the full quickstart.md validation end-to-end and confirm every SC-001…SC-010 row passes

**⚠ T039 gates release**: if the iOS vCard flow fails, the static-`.vcf` fallback contradicts FR-020 and requires a spec amendment — not a silent substitution (contracts/vcard.md).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately (after Node 24 is installed)
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**
- **User Stories (Phases 3–5)**: all depend on Phase 2; can then proceed in parallel or in priority order
- **Polish (Phase 6)**: depends on US1 and US2 being complete

### User Story Dependencies

- **US1 (P1)**: depends only on Foundational. No dependency on other stories.
- **US2 (P1)**: depends only on Foundational. Independent of US1 — the sole shared file is `tests/e2e/table-param.spec.ts` (T017 → T023).
- **US3 (P2)**: depends on Foundational, and needs at least one business built (US1 or US2) to demonstrate a data swap.

### Within Each User Story

- Tests written and failing before implementation
- `business.json` before the template that binds it
- Engine partials (Phase 2) before any business consumes them
- Story complete and independently testable before moving on

### Parallel Opportunities

- Setup: T003, T004, T005, T006 together (T002 first — T003/T005 reference its scripts)
- Foundational: T008–T015 all together once T007 defines the resolution contract
- US1: T016 ‖ T017; then T019 ‖ T018
- US2: T022 ‖ T025 ‖ T026
- **Cross-story**: once Phase 2 is done, one developer can take US1 and another US2 — they touch disjoint files apart from the one shared test

---

## Parallel Example: Foundational Phase

```bash
# After T007 establishes the resolution contract, launch together:
Task: "Build-time data validation in src/_data/validate.js"
Task: "Shared hub layout in src/_includes/layouts/hub.njk"
Task: "Engine stylesheet in src/_engine/base.css"
Task: "entry-link partial in src/_includes/partials/entry-link.njk"
Task: "entry-pending partial in src/_includes/partials/entry-pending.njk"
Task: "entry-wifi partial in src/_includes/partials/entry-wifi.njk"
Task: "pending-notice behaviour in src/_engine/pending.js"
```

## Parallel Example: User Story 1

```bash
# Tests first, together:
Task: "copas E2E in tests/e2e/copas.spec.ts"
Task: "table parameter E2E in tests/e2e/table-param.spec.ts"

# Then implementation:
Task: "copas business data in src/businesses/copas/business.json"
Task: "nocturnal theme in src/businesses/copas/theme.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup
2. Phase 2: Foundational — blocks everything
3. Phase 3: User Story 1
4. **STOP and VALIDATE**: `/copas/` renders 6 actions plus inert WiFi in order, pending entries show the notice, no vCard
5. Deployable and demoable on its own

### Incremental Delivery

1. Setup + Foundational → engine ready
2. US1 → cocktail-bar hub → demo (**MVP**)
3. US2 → tapas hub with vCard → demo
4. US3 → data-replacement workflow → hand to the owner
5. Polish → a11y, budget, deploy, manual device verification

### Parallel Team Strategy

1. Complete Setup + Foundational together
2. Then: Developer A on US1, Developer B on US2 (disjoint files), either picking up US3 after
3. Polish once both hubs exist

---

## Notes

- Every value stays `[PLACEHOLDER - replace]` until the owner confirms it — nothing is invented (Constitution VII)
- `Entry.id` values are the Phase 2 `/r/<id>` route segments; renaming one breaks analytics continuity
- The final production host must be settled **before** any NFC tag is written — tags encode the full URL and re-tagging is manual, out-of-scope work
- Commit after each task or logical group; stop at any checkpoint to validate a story independently
