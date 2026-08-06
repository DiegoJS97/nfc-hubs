# Implementation Plan: NFC Hubs Phase 1 — Cocktail Bar and Gourmet Tapas

**Branch**: `001-nfc-hubs-fase1` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-nfc-hubs-fase1/spec.md`

## Summary

Two NFC-activated hub pages — one per business — built from a single shared Eleventy engine, with each
business's values isolated in its own JSON data file. Every table's tag points at its business hub URL
carrying a table identifier (`?m=<table>`) that Phase 1 ignores and Phase 2 will read for analytics.
Entries whose data is still `[PLACEHOLDER - replace]` render in place but show a pending-confirmation
notice instead of navigating, so no customer is ever sent to a dead or wrong destination. Output is
plain static files on Cloudflare Pages over HTTPS, with no backend, within a ≤100 KB per-hub budget and
at WCAG 2.2 AA.

## Technical Context

**Language/Version**: Node.js 24 LTS (build-time only); HTML5, CSS3, ES2020 vanilla JS (runtime)

**Primary Dependencies**: Eleventy 3.x (static site generator, Nunjucks templates), plus `ajv` and
`ajv-formats` to validate each `business.json` against
[contracts/business-data.schema.json](./contracts/business-data.schema.json) at build time. All three
are build-time devDependencies: no runtime dependencies, no client-side framework, and nothing above
is shipped to the browser.

**Storage**: N/A — no database. Business values live in version-controlled JSON files.

**Testing**: Playwright (mobile-emulated E2E), `@axe-core/playwright` (WCAG 2.2 AA), custom payload-budget
check script

**Target Platform**: Mobile browsers after an NFC tap — iOS Safari and Android Chrome. Desktop is
explicitly not the design target (FR-009).

**Project Type**: Static multi-page site generated from a shared engine (monorepo, content separated by
business)

**Performance Goals**: Essential content visible ≤1.5 s on mid-range phone over typical 4G; ≤3 s on a
degraded venue connection (SC-008)

**Constraints**: ≤100 KB total initial payload per hub; no render-blocking third-party resources
(FR-022); no backend (FR-002); no localStorage/sessionStorage or visit counters (FR-012); WCAG 2.2 AA
(FR-023)

**Scale/Scope**: 2 businesses, 2 hub pages, 7 + 8 entries respectively (copas: 6 actions + WiFi;
tapas: 6 actions + WiFi + vCard). Table count per venue is
unbounded but costs nothing — all tables of a business share one page, differing only in the `?m=`
parameter.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | How this plan complies | Gate |
|---|-----------|------------------------|------|
| I | NFC — single entry point | Each tag's only NDEF destination is its business hub URL + `?m=<table>`. No tag points at a menu, social profile, or review link. | PASS |
| II | No native apps | Every entry is an `<a href>` to a website, or a local browser action (vCard, pending notice). No universal links, app links, or deep linking. | PASS |
| III | Phased development | Phase 1 is pure static output, no backend. Destinations are centralized per business in one JSON file, so Phase 2 can reroute them through `/r/<slug>` without touching markup. Cloudflare Pages Functions can host that redirector on the same domain, so the already-written tags stay valid. No NFC Counter, no localStorage/sessionStorage. | PASS |
| IV | WiFi outside the hub | The WiFi SSID renders as inert informational text — not a link, not a button, no Web NFC, no connection attempt. The real connection is the tag's own Wi-Fi Simple Config NDEF record, written manually and out of scope. | PASS |
| V | Thin routing layer | The hubs link to each business's existing website. No menu, gallery, or reservation content is reconstructed. The only locally generated artifact is the tapas vCard, which is contact data, not website content. | PASS |
| VI | Monorepo with shared engine | One repository. `src/_includes/` + `src/_engine/` hold the shared templates, base CSS, and behaviour; `src/businesses/<slug>/` holds each business's data and theme. No business-specific logic in the engine. | PASS |
| VII | Placeholders until confirmed | Every unconfirmed value is the literal `[PLACEHOLDER - replace]`, which is also the machine-readable trigger for the pending state. Nothing is invented. Auditable by grepping the sentinel. | PASS |
| VIII | Rigor and honesty | research.md records three explicit assumptions to verify: iOS Safari vCard download (D5), the writereview URL format (D6), and the limits of automated a11y checking in the nocturnal register (D8). Design is mobile-only by intent. | PASS |

**Scope & Exclusions check**: the plan writes no NFC tags, manages no menu content, and builds no
reservation system. PASS.

**Result**: all gates pass. Complexity Tracking is empty — no violations to justify.

### Post-design re-check (after Phase 1)

Re-evaluated against the generated data model and contracts. All eight gates still pass; the design
added no dependency, no backend, and no client framework. Three points worth recording:

- **Principle VII strengthened**: `[PLACEHOLDER - replace]` is now the single source of truth for
  "unconfirmed" — it drives both the human audit and the pending state, so the visible marker and the
  behaviour cannot drift apart.
- **Principle III strengthened**: `Entry.id` is contractually the future `/r/<entry-id>` route segment
  ([contracts/hub-url.md](./contracts/hub-url.md)), making the Phase 2 redirector additive.
- **Principle VIII — one live risk**: the iOS Safari vCard download
  ([contracts/vcard.md](./contracts/vcard.md)) is an assumption, not a verified fact. If it fails on
  real hardware, the static-`.vcf` fallback conflicts with FR-020 and requires a spec amendment rather
  than a silent substitution.

## Project Structure

### Documentation (this feature)

```text
specs/001-nfc-hubs-fase1/
├── plan.md              # This file
├── spec.md              # Feature specification (clarified)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── business-data.schema.json
│   ├── hub-url.md
│   └── vcard.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── _data/
│   └── site.json                 # site-wide, business-agnostic values
├── _includes/
│   ├── layouts/
│   │   └── hub.njk               # the single hub layout, shared by both businesses
│   └── partials/
│       ├── entry-link.njk        # confirmed entry  -> <a href>
│       ├── entry-pending.njk     # pending entry    -> <button> + notice (FR-024)
│       ├── entry-wifi.njk        # inert SSID text  (FR-007, Principle IV)
│       └── entry-vcard.njk       # tapas-only vCard trigger (FR-020)
├── _engine/
│   ├── base.css                  # reset, layout, type scale, a11y primitives (FR-023)
│   ├── pending.js                # pending-notice behaviour (FR-024)
│   └── vcard.js                  # in-browser vCard 3.0 generation (FR-020)
└── businesses/
    ├── copas/
    │   ├── business.json         # [ES] "Bar Ejemplo Copas" data + entry list
    │   ├── theme.css             # nocturnal / experiential register (FR-015)
    │   └── index.njk             # binds this business to the shared layout
    └── tapas/
        ├── business.json         # [ES] "Restaurante Ejemplo Tapas" data + entry list
        ├── theme.css             # daytime / product register (FR-015)
        └── index.njk

tests/
├── e2e/
│   ├── copas.spec.ts             # entry order, pending behaviour, inert WiFi
│   ├── tapas.spec.ts             # + vCard confirmed/pending paths
│   └── table-param.spec.ts       # SC-009: identical render with/without ?m=
├── a11y/
│   └── wcag.spec.ts              # SC-010, both registers
└── budget/
    └── payload.spec.ts           # SC-008: ≤100 KB, no third-party requests

eleventy.config.js
package.json
```

**Structure Decision**: A single Eleventy project. The shared engine is `src/_includes/` (markup) plus
`src/_engine/` (styles and the two small behaviours); business content is confined to
`src/businesses/<slug>/`, which is what makes Constitution VI concrete and FR-014 mechanically true —
replacing a placeholder means editing `business.json` and nothing else. Build output is `_site/copas/`
and `_site/tapas/`, deployed as-is to Cloudflare Pages.

## Complexity Tracking

> No Constitution Check violations. This section is intentionally empty.
