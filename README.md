# NFC Hubs — Phase 1

Two NFC-activated hub pages for hospitality venues. Each table carries a physical tag; tapping
it opens a short list of useful links for that venue. Pure static output, no backend.

| Hub | URL | Register |
|-----|-----|----------|
| Cocktail bar | `/copas/` | nocturnal |
| Gourmet tapas | `/tapas/` | daytime |

Requirements live in [`specs/001-nfc-hubs-fase1/`](specs/001-nfc-hubs-fase1/). This file covers
running the project and, most importantly, replacing placeholder data with real values.

## Getting started

Requires **Node 24 LTS** (pinned in `.nvmrc`).

```bash
npm install
npx playwright install chromium webkit   # only needed to run the tests
npm run dev                              # http://localhost:8080/copas/
```

## Replacing placeholder data

**This is the whole maintenance workflow.** Going live with real values means editing one file
per business and nothing else:

```
src/businesses/copas/business.json
src/businesses/tapas/business.json
```

You never touch a template, a stylesheet, or any code to confirm real data.

### The sentinel

Every value the owner has not yet confirmed holds this exact string:

```
[PLACEHOLDER - replace]
```

Replace the string with the real value. That is the entire operation:

```diff
- { "id": "menu", "label": "Carta de cócteles", "type": "link", "url": "[PLACEHOLDER - replace]" }
+ { "id": "menu", "label": "Carta de cócteles", "type": "link", "url": "https://barejemplo.es/carta" }
```

Rebuild, and that entry changes from a non-navigating button showing
[ES] *"Pendiente de confirmar"* into a real link. Anything still holding the sentinel keeps
showing the pending notice, so a customer is never sent to a dead or wrong destination.

**The sentinel must be exact.** A trailing space, or a friendly stand-in like
`"Bar de Copas (nombre pendiente)"`, is read as a *confirmed value* — and would be shown to
customers as real. The build rejects near-misses, but it cannot detect an entirely different
invented string. This applies to `name` too.

### Check what is still outstanding

```bash
npm run audit:placeholders            # lists every unconfirmed value and its location
npm run audit:placeholders -- --strict # exits non-zero if any remain (pre-go-live gate)
```

### Rules that matter

- **Never rename an `id`.** Entry ids (`menu`, `reserve`, `review`, …) become the Phase 2
  `/r/<id>` analytics route segments. Renaming one is free today and silently breaks tap
  attribution once tags are in the field. See
  [`contracts/hub-url.md`](specs/001-nfc-hubs-fase1/contracts/hub-url.md).
- **Never add, remove, or reorder entries.** Each hub's entry set is fixed by the spec
  (FR-016 for copas, FR-018 for tapas). The build fails if the list deviates. Changing the set
  is a spec change, not a data edit.
- **Never add a WiFi password.** Only the network *name* is displayed, as inert text. The
  actual connection is handled by the tag's own Wi-Fi Simple Config NDEF record, written when
  the tag is programmed — not by this site.
- **The tapas contact card is all-or-nothing.** [ES] "Guardar contacto" produces a vCard only
  when `name`, `phone`, `address`, and `website` are *all* confirmed. Until then it shows the
  pending notice and generates nothing, rather than saving a half-complete contact to
  someone's phone.

### What the build refuses to accept

`npm run build` fails, naming the offending field, on:

- a missing required key
- an empty string or `null` (use the sentinel instead)
- a near-miss sentinel such as a trailing space
- an entry set in the wrong order, or with a renamed id
- a `slug` that does not match its folder name

This is deliberate: a typo that silently marked an entry "confirmed" would send customers to
`undefined`.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Eleventy dev server with live reload |
| `npm run build` | Build to `_site/` |
| `npm run serve` | Serve the built `_site/` (what the tests use) |
| `npm test` | Validation + E2E + accessibility + budget |
| `npm run test:validation` | Data-contract rejection cases |
| `npm run test:e2e` | Entry order, pending behaviour, inert WiFi, vCard, `?m=` |
| `npm run test:a11y` | WCAG 2.2 AA via axe, both registers |
| `npm run test:budget` | ≤100 KB payload, no third-party requests, load timing |
| `npm run audit:placeholders` | List unconfirmed values |

Run a single file or test:

```bash
npx playwright test tests/e2e/tapas.spec.ts
npx playwright test -g "SC-001"
```

Tests run on two mobile-emulated devices only (iPhone/WebKit, Pixel/Chromium). There is no
desktop viewport: traffic is 100% phones after a tap.

## The table parameter

Tags encode `https://<host>/<slug>/?m=<table>`. Phase 1 **ignores** `m` completely — it is
never read, displayed, stored, or transmitted. It exists in the URL so Phase 2 can attribute a
tap to its table without anyone physically rewriting the tags.

## Deployment

Not yet configured (T037). Output is plain static files in `_site/`, servable by any static
host over HTTPS.

> ⚠ **Settle the final production host before writing any NFC tag.** The tag encodes the full
> URL, and re-tagging both venues is manual work outside this project. Adding a custom domain
> after tags are written invalidates every one of them.

## Verification that cannot be automated

Some checks require real hardware and are not covered by the test suite (T039): iOS Safari
vCard import, Android Chrome vCard import, reading the nocturnal hub in a dark room, and a real
NFC tap with the phone both locked and unlocked. Automated contrast checks only evaluate
declared colours, and emulated WebKit says nothing about whether iOS opens the contact importer.
