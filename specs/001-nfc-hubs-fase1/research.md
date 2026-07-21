# Phase 0 Research: NFC Hubs Phase 1

**Feature**: `001-nfc-hubs-fase1` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

This document resolves every unknown in the plan's Technical Context. Per Constitution Principle VIII,
anything that depends on hardware or browser behaviour outside our control is recorded as an
**assumption to verify**, not as a settled fact.

## D1. Build approach — Eleventy (11ty) 3.x

**Decision**: Static site generator Eleventy 3.x on Node 24 LTS, with Nunjucks templates as the shared
engine and one JSON data file per business.

> **Correction (2026-07-21)**: this decision originally read "Node 20 LTS". That was wrong — Node 20
> reached **end-of-life on 2026-04-30** and no longer receives security patches. Corrected to **Node 24**,
> the current **Active LTS**; Node 22 is in maintenance LTS and remains supported but is not the default
> for a new project. The error came from the assistant's training data predating the current Node
> release schedule; the correction was supplied by the project owner against the live schedule, not
> inferred by the model. Anything else in these documents that depends on a moving external release
> calendar deserves the same scepticism.

**Rationale**: Eleventy emits plain HTML with zero client-side JavaScript unless we add it, which is
what makes the ≤100 KB budget (SC-008) and the no-render-blocking rule (FR-022) achievable by default
rather than by fighting the tool. Its data cascade maps one-to-one onto FR-014: a business's values
live in a JSON file, the layout lives in a template, and replacing a placeholder never touches markup.
Templates shared across both businesses satisfy Constitution VI (shared engine, content separated by
business) without duplicating markup.

**Alternatives considered**:
- *Astro* — equally zero-JS by default and a nicer authoring model, but a heavier dependency tree than
  a two-page project justifies. Reconsider if more businesses are onboarded.
- *Plain HTML with no build* — simplest to deploy, but duplicates the markup of each hub, which works
  directly against Constitution VI and makes any structural change a two-file edit.
- *Custom Node build script* — no third-party build dependency, but we would own a generator whose job
  Eleventy already does.

## D2. Hosting — Cloudflare Pages

**Decision**: Deploy the built `_site/` output to Cloudflare Pages with automatic HTTPS.

**Rationale**: Satisfies SC-003 (static over HTTPS, no proprietary server). Critically for Constitution
III, Pages Functions can later serve the Phase 2 `/r/<slug>` redirector **on the same domain**, so
Phase 2 becomes an added route rather than a host migration — and the physical NFC tags, which are out
of scope to rewrite, keep pointing at a URL that stays valid.

**Alternatives considered**:
- *GitHub Pages* — no new account needed since the repo is already on GitHub, but static-only, so the
  Phase 2 redirector would force a migration or a second service.
- *Netlify* — functionally equivalent to Cloudflare Pages for this purpose.

**Note**: the build output is plain static files, so the provider remains swappable at any time.

## D3. Business data shape and the placeholder sentinel

**Decision**: Each business is one JSON file. Any unconfirmed value is the exact string
`[PLACEHOLDER - replace]`. An entry is *pending* (FR-024) if and only if the data it depends on equals
that sentinel.

**Rationale**: FR-005 already mandates that marker in the spec, so reusing it as the machine-readable
signal means there is exactly one source of truth for "is this confirmed?" — no parallel `confirmed:
true` flag that can drift out of sync with the visible marker. It also makes the audit trivial: grep
for the sentinel and you have the outstanding-data list.

**Alternatives considered**: a separate boolean per field (redundant, driftable); `null` for
unconfirmed (loses the auditable marker required by Constitution VII).

## D4. Rendering the pending state — build time, not runtime

**Decision**: Eleventy decides at build time whether each entry is confirmed or pending. A confirmed
entry renders as `<a href="…">`. A pending entry renders as a `<button type="button">` carrying the
pending state, and a small inline script shows the notice on tap.

**Rationale**: Keeps the shipped JS to the minimum required by FR-024, and means a confirmed hub ships
essentially no logic at all. Rendering a pending entry as a `<button>` rather than a dead `<a>` is what
makes FR-023 hold: assistive technology announces it as an action, not as a broken link.

**Alternatives considered**: runtime detection in JS (adds weight to every hub and makes the pending
state invisible to anything that doesn't run JS); `<a>` with `aria-disabled` (announced as a link that
goes nowhere, and FR-024 explicitly forbids silent unresponsiveness).

## D5. vCard version — 3.0

**Decision**: Generate vCard **3.0** (`VERSION:3.0`), UTF-8, CRLF line endings, delivered as a Blob via
an `<a download="…vcf">` object URL.

**Rationale**: vCard 3.0 has the broadest native import support across iOS Contacts and Android; 4.0 is
newer but historically less uniformly handled by mobile contact importers. CRLF is what RFC 2426 wants
and some importers are strict about it. This resolves the item deliberately deferred from clarification.

**⚠ Assumption to verify (Constitution VIII)**: that the Blob + `download` flow actually opens the
contact importer on **iOS Safari** and **Android Chrome**. iOS Safari has historically been the fragile
case for programmatic downloads. This MUST be tested on real devices before the tapas hub is
considered done. If it fails on iOS, the fallback is a pre-built static `.vcf` file served as a normal
link — note this would require revisiting FR-020, which mandates in-browser generation.

## D6. Google review link format

**Decision**: `https://search.google.com/local/writereview?placeid=<PLACE_ID>`.

**⚠ Assumption to verify**: the spec's own Assumptions section already flags that the exact format is
confirmed when the placeholder is replaced. Since the place ID is a placeholder today, this entry
renders as pending (FR-024) and the URL format cannot be validated end-to-end yet. Verify with the real
place ID before go-live.

## D7. Typography and assets — system fonts, no third-party resources

**Decision**: System font stack only (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
No web fonts, no icon fonts, no external CSS/JS. Any imagery must be inlined SVG or a compressed local
asset counted against the budget.

**Rationale**: FR-022 forbids render-blocking third-party resources outright, and web fonts are the
single largest and most common cause of both budget overrun and flash-of-invisible-text on the degraded
venue connections SC-008 targets.

## D8. Testing — Playwright + axe-core

**Decision**: Playwright for end-to-end validation in emulated mobile viewports, `@axe-core/playwright`
for the WCAG 2.2 AA checks, and a build-time script that fails if a hub's initial payload exceeds
100 KB.

**Rationale**: The success criteria are mostly observable browser behaviour — entry order (SC-001),
pending behaviour (SC-002), identical render with/without the table parameter (SC-009), accessibility
(SC-010), payload (SC-008) — and Playwright can assert all of them, including device emulation and
network throttling.

**⚠ Assumption to verify**: automated axe checks catch a large share of WCAG failures but not all of
them. Contrast in the *nocturnal* register in particular should also get a manual check on a real
phone in low light, since that is the exact scenario FR-015 pushes toward and automated tooling
evaluates contrast only against declared colours.

## D9. Table identifier parameter — `?m=`

**Decision**: Parameter name `m` (for *mesa*), e.g. `https://…/copas/?m=12`. Phase 1 does not read,
render, store, or transmit it (FR-021).

**Rationale**: Short, so it costs little in a hand-written NDEF record and keeps the encoded URL small;
Spanish-mnemonic, consistent with the customer-facing language. The name must be fixed **now** even
though Phase 1 ignores it, because it gets written into physical tags that are out of scope to rewrite.

**⚠ Operational dependency**: whoever writes the tags must include this parameter per table. This is
recorded in the spec's Assumptions but is a manual, non-software step — if it is skipped, Phase 2
analytics cannot attribute taps to tables without physically rewriting every tag.

## Open items intentionally NOT resolved here

- **Real business data** — every URL, phone, address, place ID, social handle, and WiFi SSID remains
  `[PLACEHOLDER - replace]` until the owners confirm it (Constitution VII).
- **Custom domain** — the Cloudflare Pages default domain is sufficient for Phase 1; the production
  domain must be settled before tags are written, since the tag encodes the final URL.
