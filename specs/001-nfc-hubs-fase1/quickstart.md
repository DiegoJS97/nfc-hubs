# Quickstart & Validation Guide: NFC Hubs Phase 1

**Feature**: `001-nfc-hubs-fase1` | **Date**: 2026-07-21

How to run the hubs locally, validate them against the spec's success criteria, and deploy them. This
is a run/validate guide — implementation belongs to `/speckit-tasks` and the implementation phase.

## Prerequisites

- Node.js 24 LTS (current Active LTS). Node 22 is in maintenance LTS and will also work; Node 20 is
  **end-of-life since 2026-04-30** and must not be used — it no longer receives security patches.
- A Cloudflare account (deployment only; not needed for local work)

## Setup

```bash
npm install
npx playwright install --with-deps chromium webkit
```

## Run locally

```bash
npm run dev      # Eleventy dev server with live reload
```

| URL | What it is |
|-----|------------|
| `http://localhost:8080/copas/` | Cocktail bar hub — nocturnal register |
| `http://localhost:8080/tapas/` | Gourmet tapas hub — daytime register |
| `http://localhost:8080/copas/?m=12` | Same page with a table identifier — must look identical |

Use your browser's device emulation (mobile viewport) — desktop is not the design target (FR-009).

## Build

```bash
npm run build    # -> _site/
```

## Validate

```bash
npm test                 # everything below
npm run test:e2e         # entry order, pending behaviour, inert WiFi, vCard
npm run test:a11y        # WCAG 2.2 AA, both registers
npm run test:budget      # payload ceiling + no third-party requests
```

### What each success criterion maps to

| Criterion | How it's validated | Expected outcome |
|-----------|--------------------|------------------|
| SC-001 | `test:e2e` asserts the rendered entry sequence against the spec order | copas: 6 actions + WiFi last; tapas: 7 actions + WiFi + vCard |
| SC-002 | `test:e2e` taps every unconfirmed entry | Pending notice shown; URL unchanged (no navigation) |
| SC-003 | `npm run build` then serve `_site/` as static files | Both hubs work with no server process |
| SC-004 | Edit only `src/businesses/<slug>/business.json`, rebuild | Destination changes; `git status` shows no other source file touched |
| SC-005 | Manual side-by-side on a phone | Two clearly different identities, not one recolored template |
| SC-006 | `test:e2e` tapas vCard, both data states | All four fields confirmed → `.vcf` with all four; any placeholder → notice, no file |
| SC-007 | `test:e2e` + `test:budget` | No WiFi connection mechanism, no counters, no app/deep links |
| SC-008 | `test:budget` (size) + throttled Playwright run (time) | ≤100 KB initial payload; ≤1.5 s on 4G, ≤3 s degraded |
| SC-009 | `test:e2e` compares renders with `?m=12`, `?m=`, `?m=zzz`, and none | Identical output in all four cases |
| SC-010 | `test:a11y` (axe) | Zero contrast or target-size violations in either register |

### Manual checks that automation cannot cover

Per Constitution VIII, these must be done on real hardware and **not** signed off from CI alone:

1. **iOS Safari vCard** — tap [ES] "Guardar contacto" on a real iPhone and confirm the contact importer
   opens. This is the known-fragile assumption (see [contracts/vcard.md](./contracts/vcard.md)).
2. **Android Chrome vCard** — same check.
3. **Nocturnal contrast in low light** — read the copas hub on a phone in a dark room. Automated
   contrast checks only evaluate declared colours.
4. **Real NFC tap** — write one test tag with `https://<host>/copas/?m=1` and confirm it opens the hub
   with the phone both locked and unlocked (FR-010).

### Auditing outstanding placeholders

```bash
grep -rn "\[PLACEHOLDER - replace\]" src/businesses/
```

Every hit is a value the owner still has to confirm (Constitution VII). While a value is listed here,
its entry is intentionally non-navigating.

## Deploy

```bash
npm run build
npx wrangler pages deploy _site
```

⚠ **Settle the final host before writing any NFC tags.** The tag encodes the full URL and rewriting tags
is manual, out-of-scope work in both venues — see [contracts/hub-url.md](./contracts/hub-url.md).

## Related documents

- [spec.md](./spec.md) — requirements and success criteria
- [plan.md](./plan.md) — technical context and Constitution Check
- [research.md](./research.md) — decisions and assumptions to verify
- [data-model.md](./data-model.md) — business data shape and resolution states
- [contracts/](./contracts/) — business data schema, hub URL, vCard
