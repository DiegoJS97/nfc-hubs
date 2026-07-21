# Phase 1 Data Model: NFC Hubs Phase 1

**Feature**: `001-nfc-hubs-fase1` | **Date**: 2026-07-21

All "data" here is build-time only: version-controlled JSON consumed by Eleventy. There is no database,
no runtime persistence, and no user data of any kind (FR-002, FR-012).

## The placeholder sentinel

```text
PLACEHOLDER = "[PLACEHOLDER - replace]"
```

A field holding exactly this string is **unconfirmed**. This single convention drives both the human
audit (Constitution VII) and the machine-readable pending state (FR-024). No other marker is valid — a
missing key, an empty string, or `null` is a **data error** and must fail the build rather than be
silently treated as pending, so a typo can never quietly hide an entry.

## Entity: Business

One JSON file per business at `src/businesses/<slug>/business.json`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `slug` | string | yes | URL segment, e.g. `copas`. Lowercase, `[a-z0-9-]+`. Must match the folder name. |
| `name` | string | yes | [ES] display name, e.g. `"Bar Ejemplo Copas"` (currently a placeholder name). |
| `register` | enum | yes | `nocturnal` \| `daytime` — selects the visual identity (FR-015). |
| `lang` | string | yes | BCP-47 page language, `es` (FR-023). |
| `wifiSsid` | string \| PLACEHOLDER | yes | Rendered as inert text only (FR-007). |
| `placeId` | string \| PLACEHOLDER | yes | Google place ID for the writereview link (FR-006). |
| `contact` | Contact | tapas only | Source of the vCard (FR-020). |
| `entries` | Entry[] | yes | Ordered; array order **is** the priority order (FR-016, FR-018). |

**Validation rules**
- `slug` unique across businesses.
- `register` must be `nocturnal` for `copas` and `daytime` for `tapas` (FR-015).
- `entries` must be non-empty and its order must match the spec's mandated sequence exactly.
- Exactly one entry of type `wifi` per business, and it must be last among non-vCard entries (FR-016(7),
  FR-018(7)).
- `contact` MUST be absent for `copas` (FR-017) and present for `tapas`.

## Entity: Entry

An element of `Business.entries`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Stable key, e.g. `menu`, `reserve`, `review`. **Becomes the Phase 2 `/r/<slug>` route segment** — do not rename casually. |
| `label` | string | yes | [ES] customer-facing text. Never translated. |
| `type` | enum | yes | `link` \| `review` \| `wifi` \| `vcard`. |
| `url` | string \| PLACEHOLDER | `type=link` only | Absolute `https://` URL when confirmed. |

**Resolution state** (derived, never stored):

| `type` | Confirmed when | Renders as | Pending renders as |
|--------|----------------|------------|--------------------|
| `link` | `url !== PLACEHOLDER` | `<a href="url">` | `<button>` + pending notice (FR-024) |
| `review` | `business.placeId !== PLACEHOLDER` | `<a>` to the writereview URL | `<button>` + pending notice |
| `wifi` | n/a — never actionable | inert text showing `wifiSsid`, or the pending marker if unconfirmed | n/a (never tappable, FR-007) |
| `vcard` | **all four** `contact` fields confirmed | `<button>` that generates the vCard | `<button>` + pending notice (FR-020) |

The `vcard` rule is deliberately all-or-nothing: a partially confirmed contact produces no vCard at all,
never a partial one.

## Entity: Contact (tapas only)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phone` | string \| PLACEHOLDER | yes | E.164 preferred when confirmed. |
| `address` | string \| PLACEHOLDER | yes | Single-line postal address. |
| `website` | string \| PLACEHOLDER | yes | Absolute `https://` URL. |

The vCard's fourth value is `Business.name`, not duplicated here.

## Entity: Table (implicit — no stored data)

A table exists only as the `?m=<id>` parameter encoded in its physical tag. Phase 1 **never** reads,
renders, stores, or transmits it (FR-021). It is modelled here solely to record that the identifier
space is owned by whoever writes the tags, and that Phase 2 will read it.

| Field | Type | Notes |
|-------|------|-------|
| `m` | string | Opaque to Phase 1. Recommended: the venue's own table number. |

## Relationships

```text
Business 1 ──< Entry          (ordered; array position = priority)
Business 1 ──? Contact        (tapas only; feeds the vCard)
Business 1 ──< Table          (many tables share one hub page, differing only by ?m=)
```

## State transitions

The only transition in the system is per-field, and it is one-way in practice:

```text
[PLACEHOLDER - replace]  ──(owner confirms the value)──>  confirmed value
```

Its observable effect: the affected entry flips from *pending* (notice on tap, no navigation) to
*confirmed* (navigates, or generates the vCard). This happens at **build time** — the transition is a
data edit followed by a redeploy, never a runtime state change. No structure or markup file is touched
(FR-014, SC-004).
