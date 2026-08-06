# Phase 1 Validation Report (T040)

**Date:** 2026-08-06
**Suite:** 94 automated checks defined — **87 pass, 7 deliberately skipped**, 0 failing
**Build:** `_site/copas/index.html`, `_site/tapas/index.html`
**Outstanding placeholders:** 19 across the two businesses

This is the quickstart.md validation run. It records the state of every success criterion
SC-001…SC-010, including the ones that **cannot pass yet** and why.

> **T040 is not complete.** Seven of ten criteria pass outright. Three cannot be closed from
> this machine — they depend on a real deployment or real hardware. They are listed as
> BLOCKED with the specific dependency, rather than being marked green on partial evidence.

## Summary

| Criterion | Status | Blocked on |
|-----------|--------|------------|
| SC-001 entry order | ✅ PASS | — |
| SC-002 pending behaviour | ✅ PASS | — |
| SC-003 static over HTTPS | ⛔ BLOCKED | host decision → deployment |
| SC-004 data-only replacement | ✅ PASS | — |
| SC-005 visually distinct identities | ⚠️ PARTIAL | human judgement on a phone (T039) |
| SC-006 vCard both states | ⚠️ PARTIAL | real-device import (T039) |
| SC-007 no WiFi/counters/app links | ✅ PASS | — |
| SC-008 payload and timing | ⚠️ PARTIAL | iOS timing unmeasurable (see below) |
| SC-009 identical render with `?m=` | ✅ PASS | — |
| SC-010 WCAG 2.2 AA | ⚠️ PARTIAL | low-light perception (T039) |

## Detail

### ✅ SC-001 — Both hubs render every entry in the specified priority order

`tests/e2e/copas.spec.ts`, `tests/e2e/tapas.spec.ts` assert the rendered label sequence against
FR-016 (7 entries) and FR-018 (8 entries) on both emulated devices. Entry **ids** are separately
enforced at build time by `src/_data/validate.js`, so a correct-looking page built from
wrongly-ordered data cannot exist.

### ✅ SC-002 — Every unconfirmed entry shows the notice and never navigates

`tests/e2e/*.spec.ts` tap every `[data-pending]` control, assert the URL is unchanged and the
notice becomes visible. Counts are asserted explicitly (6 on copas, 7 on tapas) so the check
cannot pass against an empty set.

### ⛔ SC-003 — Deployable as static content over HTTPS with no server component

**Blocked on the production host decision.**

What is verified: `npm run build` emits plain files; the suite runs against those files served
by a static server with no application process; `wrangler.toml` declares the build contract.

What is not verified: the criterion says *over HTTPS*. Nothing has been deployed, so TLS,
real-world routing, and the live URL are untested. This closes when the host is settled and
`npx wrangler pages deploy _site` runs.

### ✅ SC-004 — Replacing placeholder data touches no structure or layout file

`tests/e2e/data-swap.spec.ts` substitutes one confirmed value, rebuilds, and asserts the entry
becomes a real link with its notice gone — then restores the sentinel and asserts the pending
state returns exactly. No template, stylesheet, or engine file is touched in either direction.

`tests/validation/phase2-seam.spec.ts` additionally proves no destination is hardcoded anywhere,
by trace rather than by inspection.

### ⚠️ SC-005 — A user identifies the two hubs as visually distinct businesses

**Partial — automated evidence only; the criterion is about human perception.**

Verified: the two hubs load different themes and differ structurally, not just by palette —
near-black ground with tracked uppercase sans and soft lifted cards versus warm paper with a
system serif heading and square flat cards.

Not verified: that *a person* comparing them on a phone reads them as different businesses.
No automated check can settle this. Included in the T039 manual checklist.

### ⚠️ SC-006 — vCard produced only when all four values are confirmed

**Partial — logic verified, real-device import unverified.**

Verified: with any value a placeholder, tapping produces the notice and **no download**
(asserted by waiting for a download event that must not fire). With all four confirmed, the
shipped generator produces a vCard 3.0 containing all four values, with CRLF line endings and
RFC 2426 escaping of `,` `;` `\`, and no network request. Both emulated engines.

Not verified: **whether iOS Safari actually opens the contact importer.** This is the known
fragile assumption (research.md D5). Emulated WebKit exercises the Blob and `download`
attribute; it does not exercise iOS's handling of the resulting file. T039.

### ✅ SC-007 — No WiFi connection mechanism, visit counters, or app links

WiFi renders as a `<div>` with no `<a>`, `<button>`, `role`, or `tabindex`, asserted on both
hubs. `localStorage`, `sessionStorage`, and `document.cookie` are all asserted empty after load.
Every request is asserted first-party, so no beacon or counter can be reaching anything.

### ⚠️ SC-008 — ≤100 KB payload; essential content ≤1.5 s on 4G, ≤3 s degraded

**Partial — comfortably met on Chromium; unmeasurable on WebKit.**

| | payload | typical 4G | degraded |
|---|---|---|---|
| copas | 11.1 KB | 247 ms | 609 ms |
| tapas | 14.9 KB | 235 ms | 602 ms |
| budget | 100 KB | 1500 ms | 3000 ms |

Payload and first-party assertions run on both engines. **Timing runs on Chromium only**:
throttling requires CDP, which WebKit does not expose. iOS load timing on a degraded venue
connection is therefore unverified — a real coverage gap, folded into T039.

### ✅ SC-009 — Identical render with, without, empty, and unknown `?m=`

`tests/e2e/table-param.spec.ts` compares `<main>` innerHTML across all four variants for both
hubs and asserts byte equality, plus that an improbable token passed as `?m=` never appears in
the rendered text and nothing is persisted client-side.

### ⚠️ SC-010 — WCAG 2.2 AA with zero contrast or target-size failures

**Partial — automated checks clean; perceptual check outstanding.**

Verified: axe reports zero violations across `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
`wcag22aa` on both hubs in both registers. `color-contrast` and `target-size` are additionally
asserted to have actually been *evaluated*, since an unknown rule id would otherwise yield zero
violations and pass having checked nothing.

Not verified: axe evaluates **declared** colours. It cannot report whether the nocturnal
register is comfortable to read on a real phone in a dark room, which is precisely the scenario
FR-015 pushes toward (research.md D8). T039.

## What must happen to close T040

1. **Settle the production host**, deploy, and re-check SC-003 against the live HTTPS URL.
2. **Complete T039** on real hardware — see [`t039-device-checks.md`](./t039-device-checks.md).
   This closes the outstanding halves of SC-005, SC-006, SC-008, and SC-010.
3. **Collect real business data** from both owners (19 values). Not a criterion in itself, but
   until then every hub is a page of pending notices, and SC-002 is the only entry behaviour a
   customer would ever see.

Only after those does a full end-to-end quickstart pass mean what it claims.
