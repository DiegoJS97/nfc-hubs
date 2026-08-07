# Pivot summary — from two named archetypes to one generic one

**Date**: 2026-08-07
**Branch**: `master`
**Commits**: `c59e192`, `bd4aeae`, `a5e5a14`, `573b408`, `d567b22`, `7f1a42f`
**State**: working tree clean, `npm run build && npm run test` green (75 passed, 5 skipped), nothing pushed

---

## What changed, in one paragraph

`copas` and `tapas` turned out to be structurally near-identical, and mandating each of them by
name in `spec.md` is what made adding a business a *spec* change rather than a folder. They are
gone. In their place is one generic archetype: the engine supports a catalog of entry types, and
a business instance chooses which of them it uses and in what order. `demo` is the first instance
of it — a fictional venue, fully populated, meant to be shown to a prospect. The vCard is no
longer a property of a business category; it is an optional module a hub opts into by declaring a
`vcard` entry.

---

## Commit by commit

### `c59e192` — the archetype and two new entry types

- New business at `src/businesses/demo/` (`business.json`, `index.njk`, `theme.css`).
  The slug is deliberately **absent** from `validate.js`'s `ENTRY_ORDER` table. That table's
  existing skip-for-unknown-slug behaviour *is* the flexible path, so no slug table was edited.
- `resolve.js` gained two entry types:
  - **`maps`** — a plain link to the Google Maps place page, derived from the existing `placeId`.
    Deliberately not an "add to favourites" action: no web API does that, so the hub does not
    pretend to. The customer saves the place themselves from the page it opens.
  - **`tel`** — a `tel:` URI built from `contact.phone`, normalised for RFC 3966 (which forbids
    spaces). Formatting stays in the data; only the href is normalised.
- New partials `entry-maps.njk` and `entry-tel.njk`, both structurally identical to
  `entry-link.njk` so they inherit the 44×44 CSS px target floor and focus treatment.
- `hub.njk` dispatch restructured: `wifi` → `vcard` → pending → `maps` / `tel` / `link`. Adding a
  type is now a partial, a branch, and a `resolve.js` case — never a per-business change.

### `bd4aeae` — tests stopped naming businesses

Every cross-cutting suite carried a hardcoded `["copas", "tapas"]`. New `tests/lib/hubs.ts`
enumerates `src/businesses/` the way the build does and **throws** rather than returning an empty
array, because a silent empty list would turn each of those suites into zero assertions reporting
as green.

### `a5e5a14` — `copas/` and `tapas/` removed

Their two e2e specs went with them; the claims survive in `demo.spec.ts`, `data-swap.spec.ts` and
`vcard-module.spec.ts`. `validate.js` **keeps** its `ENTRY_ORDER` rows for both slugs on purpose:
`tests/fixtures/wrong-order.json` and `renamed-entry-id.json` use slug `copas` to prove the order
check and the Phase 2 route-segment warning still fire.

### `573b408` — the demo's `placeId` is the sentinel

The demo briefly carried a real, well-known Google place ID so the review and maps entries would
resolve instead of 404. Wrong trade: "Reseña Google" would have filed a review against a real,
unrelated venue, and "Cómo llegar" would have navigated a prospect to another city. Constitution
VII exists for that failure and a demo is not an exemption.

The maps entry carried the same place ID a *second* time inside its interim `link` URL, so that
went to the sentinel too — reverting only `placeId` would have left the wrong destination live on
the button most likely to be tapped.

Result: four confirmed entries, two pending. That is honest, and it doubles as a working
demonstration of the pending state — a feature a prospect would otherwise take on trust.

### `d567b22` — GitHub Pages base path, and rebuild isolation

**Path prefix.** Every asset reference was absolute, correct only on a root-served host. A GitHub
*project* page is served from `https://<user>.github.io/<repo>/`, so the deployed hubs would have
loaded their HTML and then 404'd on `base.css`, `theme.css` and `pending.js` — unstyled, no
pending behaviour, and invisible in any local root-served run.

- `scripts/lib/path-prefix.mjs` holds `PATH_PREFIX = "/nfc-hubs/"`. One constant, two consumers:
  `eleventy.config.js` feeds it to the `url` filter; `scripts/serve-static.mjs` strips it, so the
  suite requests assets at their real production URLs. A disagreement between those two would let
  the suite pass against paths that do not exist in production.
- `hub.njk`'s four absolute references now go through `| url`. The skip-link `#entries` is left
  alone — an in-page fragment, not an asset.
- `pathPrefix` moves no files. Output is still `_site/<slug>/index.html`; it composes with the
  Pages mount point rather than duplicating it.
- `tests/validation/path-prefix.spec.ts` asserts **both** halves: that every first-party reference
  carries the prefix (catches a dropped `| url`), and that each maps to a file present in `_site/`
  (catches a prefix that is set but wrong).

**Rebuild isolation.** Verifying the above exposed a real race: `data-swap` and `phase2-seam` both
rewrite `business.json` and rebuild `_site/` while every other spec reads both. It surfaced as a
failure whose *expected* value was the sentinel — `demo.spec.ts` had read the data file
mid-mutation from another worker. The race predates this pivot (`data-swap` mutated `tapas` while
`tapas.spec.ts` ran) but the mutated field was never asserted, so it stayed invisible. It passed
twice before failing, which is worse than a hard failure.

Both mutating specs now live in `tests/rebuild/`, run **last** and with **`--workers=1`**.
`package.json` changed in the same commit deliberately: `playwright.config.ts` sets
`testDir: "tests"` but each script filters by path, so moving the files without wiring up
`test:rebuild` would have left the suite green while two of its strongest guards silently stopped
running.

### `7f1a42f` — corrected the skip rationale

Both rebuild specs justified their chromium-only guard as avoiding a race between browser
projects. `--workers=1` made that untrue. The skips remain correct for the stronger reason: a
rebuild's output and a scan of `src/` are browser-independent.

---

## Test topology after the pivot

| Suite | Contents | Notes |
|---|---|---|
| `test:validation` | business-data, resolve-types, path-prefix, source-hygiene | Node-level; 32 passed |
| `test:e2e` | demo, table-param, vcard-module | 26 passed |
| `test:a11y` | wcag | 6 passed |
| `test:budget` | payload, timing | 8 passed, 2 skipped (WebKit has no CDP throttling) |
| `test:rebuild` | data-swap, phase2-seam | 3 passed, 3 skipped (build-level, browser-independent) |

Instance counts are conserved across the move: 64 before, 64 after. Nothing silently stopped
running.

---

## Blocked pending your approval — in order

Each of these is a permission prompt. Nothing here was forced through.

### 1. `.github/workflows/deploy.yml` — **new file, rejected once**

Builds with Eleventy and publishes `_site/` via `actions/deploy-pages`. Needs re-attempting.
Two things must be true for a deploy to work at all:

- **`_site/` is gitignored**, so a branch-based Pages source would serve the raw repo —
  `package.json` and all. The Pages source must be set to **GitHub Actions** in repo settings.
  That is a change in the GitHub UI, not in this repo, and nobody but you can make it.
- `wrangler.toml` was left untouched, as instructed. Cloudflare Pages remains the candidate for
  the phase that needs a server-side `/r/<entry-id>` redirector, which GitHub Pages cannot run.

### 2. `specs/001-nfc-hubs-fase1/contracts/business-data.schema.json` — **governance-gated**

Until this lands, `maps` and `tel` are code-complete but **unreachable from data**. The demo binds
"Cómo llegar" as an ordinary `link` entry, and has no phone entry at all.

Proposed changes:

- `entries[].type` enum: `["link", "review", "wifi", "vcard"]` → add `"maps"`, `"tel"`.
- Delete the two root-level `allOf` blocks that special-case slug `copas` (forbid `contact`, force
  `register: nocturnal`) and slug `tapas` (require `contact`, force `register: daytime`). Those
  encode the two-archetype model this pivot removes.
- Reword `contact`'s description — it is no longer "present for tapas only".
- Consider adding: if `entries` contains an item with `type: "tel"` or `type: "vcard"`, then
  require `contact`. That is expressible with `contains` + `if/then` in 2020-12 and would catch
  at build time what `resolve.js` currently degrades to a pending entry.
- **Keep** the placeholder/sentinel mechanism intact. It stays valuable for onboarding real
  clients later, even though the demo instance uses it for only one field.

Once approved, both entries become one-line data edits, and the entry **ids** are already correct
— so the Phase 2 `/r/<entry-id>` route segments are preserved.

### 3. `specs/001-nfc-hubs-fase1/spec.md` — **governance-gated**

The repo currently **contradicts its own spec**: FR-016 and FR-018 mandate two hubs that no longer
exist. This is the pivot working as intended, but it should not outlive review.

- **FR-016 / FR-018** → replace the two business-specific fixed sequences with one generic
  entry-catalog requirement: the archetype supports a defined set of entry types; a business
  instance selects which ones it uses and in what order, and that selection is not spec-locked.
- **FR-017** ("the cocktail bar must not include save contact") → reframe as: the vCard is an
  optional entry type, neither required nor excluded for any business category.
- Knock-on edits: User Stories 1 and 2 are written around the two named venues; SC-001 and SC-005
  reference "both hubs" and their contrasting registers.

### 4. `.specify/memory/constitution.md` — **governance-gated**

The "no tracking, ever" framing overstates Phase 1's actual direction. Proposed replacement
wording, per your draft:

> Phase 1 collects nothing. Future phases may add anonymous, aggregate, single-site audience
> measurement with no client-side identifiers or cross-site tracking, consistent with the AEPD's
> audience-measurement cookie exemption — never personal data, never cross-client sharing.

This is an amendment to Principle III's scope, so per the constitution's own governance section it
needs a version bump (MINOR — material expansion of existing guidance) and a last-amended date.

---

## Honest limits and open risks

- **The fictional name is unverified.** "Taberna Vela y Sal" was invented and is not intended to
  resemble any real venue, but that has not been checked against a registry or a search. Worth
  five minutes before showing it to anyone.
- **`contact.phone` is the sentinel**, for the same reason as `placeId`. Spain has no reserved
  fictional number range, so any plausible-looking `+34` number may belong to someone, and the
  failure mode once the `tel` type ships is a customer dialling a stranger. It stays unconfirmed
  until a real number exists; the entry will render as pending in the meantime, which is correct.
- **No business declares a `vcard` entry**, so the confirmed branch of `entry-vcard.njk` has
  nothing to render it. `vcard-module.spec.ts` covers the shipped generator by loading it onto the
  demo page with an injected trigger, and states this limit in the file. It says nothing about
  whether iOS Safari opens the contact importer — only T039 on real hardware settles that.
- **T039 still cannot be done by Claude.** Real hardware: iOS Safari vCard import, Android Chrome
  vCard, nocturnal contrast in a dark room, and a real NFC tap locked and unlocked.
- **The Pages URL becomes the NFC tag URL.** `contracts/hub-url.md` requires the host be final
  before any tag is written; re-tagging is manual work in both venues. `PATH_PREFIX` is tied to the
  repository name, and a custom domain or a user/org Pages repo would change it to `/`.
- **`resolve.js` now holds two external URL templates**, not one. `T038`'s documented exception
  was singular; the seam guard's allowlist is now an explicit two-entry list. Adding a third should
  remain a deliberate act visible in review.

---

## Stale docs — need a rewrite pass in a future session

Not touched in this session. All of them describe the two-archetype world.

| File | Why it is stale |
|---|---|
| `README.md` | Describes the project as two hospitality venues |
| `CLAUDE.md` | "Business archetypes" section mandates the two entry sets; Commands cites `tests/e2e/tapas.spec.ts`; unaware of `tests/rebuild/`, `test:rebuild`, `pathPrefix`, and the `maps`/`tel` types; still says `scripts/audit-placeholders.mjs` does not exist, which it does |
| `docs/overview.md` | Two-business architecture |
| `docs/validation-report.md` | Phase 1 validation against FR-016/FR-018 |
| `docs/t039-device-checks.md` | Device procedure written around the tapas vCard |

---

## How to verify the current state

```bash
npm run build && npm run test    # 75 passed, 5 skipped
npm run audit:placeholders       # 3 remaining: placeId, contact.phone, the maps entry's interim url
```

The built demo hub is `_site/demo/index.html`; every first-party reference in it begins with
`/nfc-hubs/`.
