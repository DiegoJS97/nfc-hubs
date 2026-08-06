# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NFC hub pages for two hospitality venues. Each table has a physical NFC tag encoding
`https://<host>/<slug>/?m=<table>`; tapping it opens a short list of links. Phase 1 is pure
static output on Cloudflare Pages — no backend, no analytics, no client framework.

Requirements live in `specs/001-nfc-hubs-fase1/` (spec.md FR-001–FR-024 / SC-001–SC-010,
plan.md, tasks.md T001–T040) and `.specify/memory/constitution.md`. When behaviour is in
question, those files are the authority — not this one.

## Commands

```bash
npm run build            # -> _site/
npm run dev              # Eleventy dev server, live reload, :8080
npm run serve            # plain static server over _site/ — what the tests use
npm test                 # e2e + a11y + budget

npx playwright test tests/e2e/tapas.spec.ts        # one file
npx playwright test --project=pixel-chromium       # one device
npx playwright test -g "SC-001"                    # one test by name
```

Playwright's `webServer` runs `npm run build && npm run serve`, **not** `npm run dev`, on
purpose: the dev server injects a live-reload client and opens a WebSocket, which would
corrupt the payload and third-party-request assertions in `tests/budget/`.

There are exactly two test projects, both mobile-emulated (`iphone-webkit`,
`pixel-chromium`). Do not add a desktop viewport — traffic is 100% phones after a tap
(FR-009), so a passing desktop run would be evidence about a case the product does not target.

`npm run audit:placeholders` is wired in `package.json` but `scripts/audit-placeholders.mjs`
does not exist yet (T031).

## Architecture

One shared engine, two content folders. Nothing in the engine names a business.

```
src/_data/businesses.js   scans src/businesses/*/business.json, validates, keys by slug
src/_data/validate.js     ajv schema check + the mandated entry-order table
src/_data/resolve.js      THE definition of confirmed vs pending
src/_includes/layouts/hub.njk   dispatches on entry.type -> partials/entry-*.njk
src/_engine/              base.css, pending.js, vcard.js (passthrough-copied)
src/businesses/<slug>/    business.json + theme.css + index.njk (binding only)
```

`index.njk` files contain front matter and nothing else. Every label, URL, and contact value
reaches the page through the data cascade, which is what makes confirming real data a data
edit and never a code edit (FR-014, SC-004).

`resolve.js` is the single source of truth for entry state. Do not re-implement the
confirmed/pending rule anywhere else — two copies can disagree, and the failure mode is a
customer sent to a dead link or a bad contact saved to their phone.

`vcard.js` loads only on a hub whose data contains a `vcard` entry (`resolve.hasVcard()`),
so the copas hub ships none of that code.

## The placeholder sentinel

Any unconfirmed value is the exact literal string:

```
[PLACEHOLDER - replace]
```

**Including `name`.** This is not cosmetic. `resolveEntry()` treats "not the sentinel" as
confirmed, so a friendly stand-in like `"Bar de Copas (nombre pendiente)"` reads as *real
data* — and once the other three contact fields are filled in, the tapas hub would write that
fake name into a customer's address book. Never invent a value to make a page look finished.

A missing key, an empty string, or `null` is a **data error**, not a placeholder. The build
fails on those by design (`validate.js`), so a typo can never silently mark an entry confirmed.

## Business archetypes: structure is fixed, values are not

`copas` and `tapas` are archetypes, not examples. Their entry sets are mandated verbatim:

- **copas** (FR-016, 7 entries): `menu, reserve, playlist, events, instagram, review, wifi`
- **tapas** (FR-018, 8 entries): `menu, reserve, takeaway, review, newsletter, instagram, wifi, vcard`

`validate.js` fails the build on any deviation in id, count, or order. Replacing a
placeholder with a real URL is expected. Adding, removing, renaming, or reordering an entry
is a spec change.

Entry ids are the **Phase 2 `/r/<entry-id>` route segments** (`contracts/hub-url.md`).
Renaming one is free today and breaks analytics continuity once tags are in the field.

**A new business with no FR defining its entries is a gap to flag, not to improvise.** Do not
invent a plausible entry list by analogy with these two. Say the requirement is missing and
stop. `validate.js` deliberately skips the order check for unknown slugs, so nothing will
catch an invented list for you.

## Governance: spec artifacts are gated

Do not edit `spec.md`, `plan.md`, `tasks.md`, or `constitution.md` without explicit
confirmation from the user. If an inconsistency turns up between them, report it and propose
a concrete edit — these documents are the contract every automated check validates against,
so a silent edit invalidates the checks rather than fixing the problem.

## Release gates

- **T038** — no destination may be hardcoded outside `business.json`. The one deliberate
  exception is the Google writereview URL *template* in `resolve.js`, because the schema
  forbids a `url` key on `review` entries; the business-identifying part (`placeId`) is still
  data.
- **T039 — cannot be completed by Claude.** Requires real hardware: iOS Safari vCard import
  (historically fragile, research.md D5), Android Chrome vCard, nocturnal contrast in a dark
  room, and a real NFC tap with the phone locked and unlocked. Emulated WebKit passing proves
  the Blob and `download` attribute work; it proves nothing about whether iOS opens the
  contact importer. **If iOS Safari fails, the static-`.vcf` fallback contradicts FR-020 and
  requires a spec amendment — not a silent substitution.**

WiFi is display-only. `business.json` has no password field and must never gain one: the real
connection is the tag's own Wi-Fi Simple Config NDEF record (Principle IV). The WiFi entry
renders as a `<div>` with no `<a>`, `<button>`, `role`, or `tabindex`.

## Traps that have already bitten

**UTF-8 BOM.** Files created by Windows editors get a BOM, and `JSON.parse` rejects it with a
useless "Unexpected token" and no filename. `businesses.js` strips it. Write the escape
`/^\uFEFF/` — never paste the literal character, which is invisible in review and gets
silently normalised away by editors and formatters.

**`oneOf` with a placeholder branch.** `business-data.schema.json` originally used
`oneOf: [nonEmpty, placeholder]`. The sentinel is a non-empty string, so it matched *both*
branches and `oneOf` — which requires exactly one — rejected every placeholder. Use `anyOf`
for any `real-value | sentinel` pair.

**Tests that pass against a 404.** Assertions of the form "X is absent" pass trivially on a
missing page. Every spec here opens with a render precondition
(`expect(page.locator(".entries__item")).toHaveCount(N)`) before asserting anything absent.
Keep that pattern; four tests once went green against a blank page.

**Windows path separators.** `new URL(...).pathname` yields `C:/a/b`; `path.join` yields
`C:\a\b`. Comparing the two forms made `scripts/serve-static.mjs` return 403 for every
request. Use `fileURLToPath` + `resolve`.

## Permission model

`.claude/settings.json` allows Read, edits under `src/`, `tests/`, `scripts/`, and the
routine build/test/git commands. It routes to a confirmation prompt: any edit to `specs/**`,
the constitution, or `.claude/**`; `git push`/`reset`/`clean`; all `rm`/`rmdir`/`del`; and
`curl`/`wget`/`WebFetch`/`WebSearch`. The two lists share no patterns, so the gates do not
depend on ask-vs-allow precedence. `defaultMode` is intentionally unset.

Three limits worth knowing rather than trusting:

1. **Network is not sealed.** The prompts cover Claude's own tools; `npm install` and
   `npx playwright*` are allowed and are themselves network egress. Real enforcement needs
   `sandbox.network.strictAllowlist`, which is ignored in project settings.
2. **Deletion scoping is not expressible.** Rules match command prefixes, not resolved paths,
   so "anywhere except `_site/`" cannot be written. All deletions prompt.
3. **Bash prefix matching is evadable** via compound commands and aliases — and
   `npm run build`/`test` execute whatever `package.json` defines.
