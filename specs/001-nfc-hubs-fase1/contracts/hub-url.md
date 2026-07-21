# Contract: Hub URL

**Feature**: `001-nfc-hubs-fase1` | **Status**: binding on Phase 2

This is the contract between the **physical NFC tags** and the site. It is the one contract in this
project that is expensive to change: tags are written manually and are out of scope to rewrite
(Constitution, Scope & Exclusions), so a change here means physically re-tagging both venues.

## Shape

```text
https://<host>/<business-slug>/?m=<table-id>
```

| Part | Example | Owner | Notes |
|------|---------|-------|-------|
| `<host>` | `nfc-hubs.pages.dev` | Cloudflare Pages | Must be final **before** tags are written. A custom domain added later invalidates every tag. |
| `<business-slug>` | `copas`, `tapas` | `business.json` → `slug` | Stable. Renaming invalidates that venue's tags. |
| `m` | `12` | whoever writes the tags | Table identifier. Opaque to Phase 1. |

## Phase 1 behaviour (FR-021, SC-009)

The site MUST render **identically** for all of these:

```text
/copas/?m=12      /copas/?m=       /copas/?m=zzz      /copas/
```

Phase 1 MUST NOT read, display, store, or transmit `m`. No `localStorage`, no `sessionStorage`, no
analytics beacon (FR-012). The parameter travels in the URL purely so that Phase 2 can read it without
the tags ever being rewritten.

## Phase 2 forward-compatibility (Constitution III)

Phase 2 introduces `/r/<entry-id>` — a logging redirector. Two properties of this Phase 1 design make
that additive rather than breaking:

1. **Destinations are centralized.** Every destination lives in `business.json`, so Phase 2 rewrites
   one template binding, not each button.
2. **`Entry.id` is stable.** The entry ids (`menu`, `reserve`, `review`, …) are the intended
   `/r/<entry-id>` route segments. Renaming an id in Phase 1 silently breaks Phase 2 analytics
   continuity.

Because Cloudflare Pages Functions can serve `/r/*` on the same host, the tag URLs above remain valid
across the phase transition.

## Non-goals

- No per-table pages, no per-table build output — all tables of a business share one generated page.
- No validation or allow-list of table ids in Phase 1; an unknown `m` is indistinguishable from a
  valid one because neither is read.
