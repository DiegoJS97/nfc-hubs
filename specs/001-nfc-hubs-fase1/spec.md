# Feature Specification: NFC Hubs Phase 1 — Generic Hub Archetype

**Feature Branch**: `001-nfc-hubs-fase1`

**Created**: 2026-07-20

**Last revised**: 2026-08-07

**Status**: Draft

**Input**: User description (translated from Spanish): "Build PHASE 1 of an NFC hub-page system for hospitality businesses, on a shared engine in a monorepo, servable as pure static content over HTTPS without a backend. Tap analytics is explicitly out of scope for this phase (it will be addressed in phase 2 with OpenSpec)."

> **User-facing strings policy**: Per project rule, labels the end customer sees (button labels,
> business placeholder names) stay in **Spanish** and are tagged `[ES]` and quoted, e.g.
> `[ES] "Carta de cócteles"`. **Do not translate `[ES]` strings.** Everything else in this document
> is technical/structural content in English.

## Clarifications

### Session 2026-08-07 — archetype pivot

- Q: Should each business category have its own spec-mandated entry sequence? → A: No. The two
  original archetypes proved structurally near-identical. The spec defines a CATALOG of entry
  types; a business instance selects which it uses and in what order. That selection is data, not
  a spec change. Supersedes the previous FR-016 and FR-018.
- Q: Is the vCard tied to a business category? → A: No. It is an optional entry type. A hub gets
  it by declaring a `vcard` entry and by nothing else. Supersedes the previous FR-017.
- Q: What entry types does the Phase 1 catalog contain? → A: `link`, `review` (writereview from
  the place ID), `maps` (plain link to the Google Maps place page, from the same place ID), `tel`
  (`tel:` URI from the contact phone), `wifi` (inert text), `vcard` (optional local action).
- Q: Does the hub offer to save a place to the customer's Google saved list? → A: No. No web API
  can do that. The `maps` entry is a plain link; the customer saves it themselves.

### Session 2026-07-21

- Q: Do the tags of different tables in the same business point to the same hub URL, or does each table
  have its own identity in the URL? → A: One hub page per business, with the table identifier as a URL
  query parameter (e.g. `?m=12`); phase 1 ignores it when rendering, phase 2 reads it for analytics.
- Q: How should the vague load-speed criterion (SC-008 "near-instant") be made measurable? → A: Both a
  time target and a payload budget — essential content visible in ≤1.5 s on a mid-range phone over
  typical 4G and ≤3 s on a degraded connection, with a total initial payload ≤100 KB and no
  render-blocking third-party resources.
- Q: What accessibility baseline must the hubs meet, given the nocturnal visual register and
  mobile-only, one-handed use? → A: WCAG 2.2 level AA — text contrast ≥4.5:1, tap targets ≥44×44 px,
  visible focus, semantic links, and a correct page language attribute.
- Q: How must an entry behave while its destination is still an unreplaced placeholder? → A: The entry
  renders normally in its priority position, and tapping it shows an inline "pending confirmation"
  notice instead of navigating (no navigation to a fake or dead destination).
- Q: How must the tapas "save contact" entry behave while the vCard data is still placeholder? → A:
  The same rule as FR-024 — while any of the four vCard fields is unconfirmed, tapping shows the
  pending notice and generates no vCard at all. (Answer unchanged; it now applies to ANY hub
  declaring a `vcard` entry rather than to one named business — see Session 2026-08-07.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A customer at a table accesses that venue's services (Priority: P1)

A customer seated at their table brings their phone close to the table's NFC tag. The phone
automatically opens that venue's hub page, in the visual register the venue has configured. The
customer sees a priority-ordered list of the entries THAT VENUE has selected from the catalog — for
example menu, reserve a table, how to get there, Instagram, leave a Google review, and the WiFi
network name as informational text. They tap the option they want and are taken directly to the
corresponding destination.

**Why this priority**: It is the core flow and the reason the project exists. Without a hub
rendering and linking correctly on mobile, there is no product. It delivers value with a single
business instance configured.

**Independent Test**: Can be tested in isolation by opening a hub URL in a mobile browser and
verifying that its action entries resolve correctly for their current data state (navigating when
the destination is confirmed, showing the pending notice while it is a placeholder) and that WiFi
appears as non-actionable text, in the order that business's data defines.

**Acceptance Scenarios**:

1. **Given** a phone that opens a hub URL, **When** the page loads, **Then** the entries are shown
   in exactly the order that business's data declares, each with its own [ES] label, with no entry
   omitted, reordered, or inserted by the engine.
2. **Given** a hub loaded and a confirmed link destination, **When** the customer taps it, **Then**
   the browser navigates to that external destination; **and given** the destination is still a
   placeholder, **Then** the inline pending-confirmation notice is shown and no navigation occurs.
3. **Given** a hub loaded and a confirmed place ID, **When** the customer taps [ES] "Reseña Google",
   **Then** the browser opens the link in "write review" (writereview) format with that place ID;
   **and given** the place ID is still a placeholder, **Then** the pending notice is shown instead.
4. **Given** a hub loaded and a confirmed place ID, **When** the customer taps the maps entry,
   **Then** the browser opens that business's Google Maps place page as an ordinary link, with no
   element claiming to save the place to the customer's account; **and given** the place ID is
   still a placeholder, **Then** the pending notice is shown instead.
5. **Given** a hub loaded and a confirmed phone number, **When** the customer taps the call entry,
   **Then** the phone's dialler opens with that number; **and given** the number is still a
   placeholder, **Then** the pending notice is shown instead.
6. **Given** a hub loaded, **When** the customer locates the WiFi block, **Then** they see the
   network name as informational text and there is no element that attempts to connect to WiFi
   from the page.
7. **Given** a hub, **When** it is viewed, **Then** its visual identity reads as that venue's own
   page rather than a default-generated result.

---

### User Story 2 - A venue that needs save-contact opts into the vCard module (Priority: P2)

A venue whose customers benefit from keeping its details adds a `vcard` entry to its data. On that
hub — and only on that hub — the customer sees a "save contact" entry; tapping it makes the browser
generate a vCard from the business data (name, phone, address, website) for their address book. A
hub that does not declare the entry shows nothing of the sort and downloads none of that code.

**Why this priority**: P2 rather than P1 — it is an optional module, so no business instance is
blocked by its absence. It matters because in-browser vCard generation is the only local
interactive capability in the system and must work without a backend.

**Independent Test**: Can be tested in isolation by adding a `vcard` entry to a business's data and
verifying that "save contact" behaves correctly for its data state — offering a vCard with the four
values once confirmed, or showing the pending notice while any is a placeholder — with no server
calls in either case; and by verifying that a hub without the entry requests no vCard code at all.

**Acceptance Scenarios**:

1. **Given** a hub whose data declares a `vcard` entry and whose four contact values are confirmed,
   **When** the customer taps [ES] "Guardar contacto", **Then** the browser generates and offers a
   vCard with the business's name, phone, address, and website, without making any network request
   to a proprietary backend; **and given** any of those four values is still a placeholder, **Then**
   the pending notice is shown and no vCard is generated.
2. **Given** a hub whose data declares no `vcard` entry, **When** the page loads, **Then** no
   save-contact entry is rendered and no vCard code is requested by the page.
3. **Given** a business declaring a `vcard` or `tel` entry, **When** its data omits the contact
   block entirely, **Then** the build fails naming the missing field, rather than rendering an
   entry that is indistinguishable from an ordinary unconfirmed one.

---

### User Story 3 - The owner replaces placeholders with real data without touching structure (Priority: P2)

The owner (or whoever maintains the project) confirms a business's real data: URLs, phone, address,
Google place ID, social handles. They need to replace the `[PLACEHOLDER - replace]` markers with real
values by editing only the business data, without modifying the structure or layout of any hub.

**Why this priority**: It is an explicit requirement of the phase 1 "done" criteria and determines
whether the project is maintainable by a non-developer, but it does not block the visual
demonstration of the hubs. Moreover, the centralization of destinations it requires is the foundation
on which phase 2 will build the analytics redirector.

**Independent Test**: Can be tested by changing one business data value (e.g., the menu URL) and
verifying that the corresponding button points to the new destination without having edited the
markup or the hub logic.

**Acceptance Scenarios**:

1. **Given** a business's data set, **When** a placeholder is replaced with a real value, **Then** the
   hub reflects the new value with no changes to the structure/markup.
2. **Given** the destinations of all buttons, **When** they are audited, **Then** they are defined
   centrally per business (not scattered button by button), so that changing a value is a data change
   and not a code change.
3. **Given** a business data value not yet confirmed, **When** it is inspected, **Then** it appears
   explicitly marked as `[PLACEHOLDER - replace]`.

---

### Edge Cases

- **WiFi is never actionable**: on every hub, the WiFi block must be informational text; no tap on it
  must attempt to connect to the network (the real connection is handled by the tag's NDEF record).
- **Maps is never a saved-list action**: the maps entry is a plain link to the place page. No web
  API adds a place to a customer's Google saved list, and the hub must not imply that it does.
- **Google review without a confirmed place ID**: while the place ID is a placeholder, the review
  entry must behave as a pending entry per FR-024 — showing the pending-confirmation notice rather
  than navigating — so it can never direct a customer to an incorrect real business.
- **External destination down or changed**: since links go directly to the external destination in
  phase 1, if an external destination changes its URL, the hub must be updatable by changing only the
  centralized destination value.
- **Locked/unlocked screen**: the hub must open and be usable whether the tap is made with the phone
  locked or unlocked, without extra steps beyond the OS's normal navigation.
- **Per-business absent buttons**: each hub shows only the entries its own data declares, with no
  empty gaps, empty buttons, or placeholders for entry types it does not use. A hub that declares no
  `vcard` entry must ship none of the vCard code.
- **Missing or malformed table identifier**: if the hub URL arrives with no table parameter, an empty
  one, or an unrecognized value (a mistyped tag, a shared link, a direct visit), the hub must render
  and behave exactly as it does with a valid one; it must never show an error or a degraded page.
- **Loading on a slow mobile connection**: the hub must remain usable and render its essential content
  within the budget defined in SC-008, including on the degraded connection typical of a busy venue.

## Requirements *(mandatory)*

### Functional Requirements

**Common to every hub**

- **FR-001**: The system MUST offer, per business, a single hub page as the destination of all its
  tables' NFC tags. Each table's tag MUST encode that same hub URL carrying a table identifier as a
  query parameter (e.g. `?m=12`), so that the table of origin travels in the URL without requiring a
  distinct page per table.
- **FR-002**: The system MUST be servable as pure static content (HTML/CSS/JS) over HTTPS, without
  requiring any proprietary backend in phase 1.
- **FR-003**: Each "link" entry whose destination is confirmed MUST be a direct link to that external
  destination in phase 1. Entries whose destination is still a placeholder behave per FR-024.
- **FR-004**: All of a hub's link destinations MUST be defined centrally and in a structured way per
  business (not hard-coded button by button in a scattered way), so that phase 2 can introduce an
  analytics redirector without rewriting each hub.
- **FR-005**: Every business data value (URLs, phone, address, Google place ID, social handles, WiFi
  network name) MUST be marked as `[PLACEHOLDER - replace]` until the owner confirms it; the system
  MUST NOT invent or assume this data.
- **FR-006**: Each "Google review" entry MUST use the "write review" (writereview) link format
  parameterized with the business's place ID.
- **FR-007**: Each hub MUST display the WiFi network name as informational text and MUST NOT include
  any WiFi connection mechanism on the page.
- **FR-008**: The system MUST NOT rely on native apps, universal links, app links, or deep linking to
  apps; all entries MUST be web links (`<a href>`) or local browser actions.
- **FR-009**: The system MUST be strictly mobile-first optimized; it MUST NOT be designed for desktop
  as the primary case.
- **FR-010**: Each hub MUST load and be usable with the phone both locked and unlocked, without extra
  steps beyond the operating system's normal flow after the tap.
- **FR-011**: The system MUST NOT reconstruct content that already exists on the business's own
  website (full menu, gallery, etc.); it MUST limit itself to linking to it.
- **FR-012**: The system MUST NOT rely on the chip's "NFC Counter" or on localStorage/sessionStorage
  to count visits in phase 1 (tap analytics is phase 2).
- **FR-013**: The system MUST be organized as a monorepo with a shared engine/base and content
  separated by business.
- **FR-014**: Replacing a placeholder with real data MUST be a data change, not a structure or code
  change (data lives separately from the structure/layout).
- **FR-015**: Each hub MUST carry a visual identity configured for that business instance, and MUST
  NOT look like a default-generated result. Where two or more instances exist, each MUST be
  distinguishable from the others as a different venue rather than the same template recolored. No
  visual identity may be achieved at the cost of the accessibility baseline in FR-023.
- **FR-021**: The table identifier query parameter MUST NOT affect what phase 1 renders: each hub MUST
  render identically whether the parameter is present, absent, empty, or carries an unknown value, and
  phase 1 MUST NOT store it, display it, or send it anywhere.
- **FR-022**: Each hub MUST render its essential content without depending on any render-blocking
  third-party resource (externally hosted fonts, stylesheets, scripts, or trackers), and MUST stay
  within the load budget defined in SC-008.
- **FR-023**: Every hub MUST meet WCAG 2.2 level AA: text contrast ratio ≥4.5:1 against its
  background (≥3:1 for large text), interactive targets of at least 44×44 CSS px, a visible focus
  indicator, entries exposed as real links/buttons rather than non-semantic tappable elements, and
  the page language declared as Spanish (matching the [ES] user-facing labels).
- **FR-024**: An entry whose destination is still an unreplaced placeholder MUST render normally in
  its priority position with its own label, and tapping it MUST show an inline notice in Spanish that
  the destination is pending confirmation (e.g. [ES] "Pendiente de confirmar") INSTEAD of navigating.
  It MUST NOT navigate to a fake, dead, or incorrect destination, and MUST NOT be silently
  unresponsive. The notice MUST be perceivable beyond colour alone and announced to assistive
  technology, per FR-023.

**The entry catalog**

- **FR-016**: The system MUST support this catalog of entry types, and each MUST behave as described
  regardless of which business uses it: (1) **link** — an external destination held in that entry's
  own URL value; (2) **review** — a Google "write review" (writereview) link parameterized by the
  business's place ID (FR-006); (3) **maps** — a plain link to the business's Google Maps place
  page, derived from that same place ID, which MUST NOT claim to add the place to a customer's
  saved list because no web API provides that; (4) **tel** — a `tel:` link to the business's phone
  number; (5) **wifi** — the network name as informational text, never a connection mechanism
  (FR-007); (6) **vcard** — a locally generated contact card (FR-020). Adding a type to this
  catalog is a spec change. Selecting from it is not.
- **FR-017**: The vCard MUST be an optional entry type. It MUST NOT be required or excluded for any
  particular business category. A hub includes it exactly when its data declares a `vcard` entry,
  and a hub without one MUST ship none of the vCard code.
- **FR-018**: Each business instance MUST select which catalog entry types it uses and in what
  order, in its own business data. That selection MUST NOT be fixed by this specification, and
  changing it MUST be a data change rather than a structure or code change. Array order IS the
  customer-facing priority order. Entry ids MUST be stable once chosen, because they are the Phase 2
  `/r/<entry-id>` route segments and renaming one breaks analytics continuity once tags are in the
  field.
- **FR-019**: Any entry that would otherwise require a form processed by a proprietary backend
  (newsletter signup, members club, reservation forms) MUST be resolved in phase 1 as an external
  link to whatever system the business already uses.
- **FR-020**: A `vcard` entry MUST generate a vCard dynamically in the browser itself with the
  business's name, phone, address, and website, without making requests to a proprietary backend.
  While ANY of those four values is still an unreplaced placeholder, the entry MUST instead behave
  as a pending entry per FR-024 (pending notice, no vCard generated); it MUST NEVER produce a vCard
  containing placeholder text or partial contact data.

### Key Entities *(include if feature involves data)*

- **Business**: a hospitality venue with its visual identity and its data set. Attributes: name,
  visual register, WiFi network name, Google place ID, and optionally phone/address/website — which
  are required only when the business uses an entry type that derives from them (`tel`, `vcard`).
  Every unconfirmed value is a placeholder.
- **Hub entry**: an option visible on a hub. Attributes: label, priority order, type (external link /
  writereview review / informational text / local vCard action), destination (external URL or place
  ID), and resolution state — confirmed or pending — derived from whether the data it depends on is
  still a placeholder. Link-type destinations are defined centrally per business.
- **Business data**: the set of a business's real values, separate from the hub's structure, editable
  without touching the layout. Each unconfirmed value is marked as a placeholder.
- **Table**: a physical table within a business, identified by a table identifier carried as a query
  parameter in the hub URL written to its NFC tag. Phase 1 does not read, render, or persist it; it
  exists in the URL so that phase 2 can attribute a tap to its table without rewriting the tags.
- **Business vCard** (only where a `vcard` entry is declared): a contact representation generated in
  the browser from the business data (name, phone, address, website), produced only when all four
  values are confirmed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every hub renders correctly in a mobile browser and shows 100% of the entries its own
  data declares, in the order that data defines.
- **SC-002**: 100% of link-type entries whose destination is still unconfirmed show the inline
  "pending confirmation" notice when tapped, and none of them navigates anywhere; each such entry is
  identifiable as pending replacement in the business data.
- **SC-003**: The project can be deployed as static content over HTTPS without any proprietary server
  component.
- **SC-004**: Replacing all of a business's placeholder data with real data requires editing no
  structure/layout file (it is achieved by editing only the business data).
- **SC-005**: A hub reads as a venue's own page rather than a default-generated result. Where two or
  more instances exist, a user comparing them identifies them as visually distinct businesses rather
  than as the same template recolored. NOTE: with a single instance configured, only the first half
  of this criterion is testable.
- **SC-006**: On a hub that declares a `vcard` entry, once the four data values (name, phone,
  address, website) are confirmed, "save contact" produces a vCard containing all four without any
  request to a proprietary backend; while any of them is still a placeholder, it produces no vCard
  and shows the pending notice instead.
- **SC-007**: No hub contains WiFi connection mechanisms, visit counters, or links to native
  apps/deep links.
- **SC-008**: The essential content of each hub (business identity and the full list of entries)
  becomes visible in ≤1.5 s on a mid-range phone over a typical 4G connection, and in ≤3 s on a
  degraded venue connection, with a total initial payload of ≤100 KB and no render-blocking
  third-party resources.
- **SC-009**: Each hub renders identically when opened with a table identifier parameter, with an
  empty or unknown one, and with none at all (the parameter changes nothing a customer can perceive
  in phase 1).
- **SC-010**: Every hub passes a WCAG 2.2 level AA check on every entry and text block, in its own
  visual register, with zero contrast or target-size failures.

## Assumptions

- Traffic is 100% mobile after an NFC tap; the design is optimized for that case and not for desktop.
- Physically writing the NFC tags (including the "Wi-Fi Simple Config" NDEF WiFi record) is a manual
  task outside this repo; phase 1 only produces the hub pages. Whoever writes the tags is responsible
  for including each table's identifier parameter in the URL, since phase 2 analytics depends on it
  and rewriting the tags later would be manual work in both venues.
- Each business already has its own working website acting as the source of truth for its content
  (menu, gallery, reservations); the hub only links to it.
- The Google place ID is used in a standard Google Maps writereview link; the exact format will be
  confirmed when the placeholder is replaced.
- Entries that would need a form (newsletter, members club) are resolved as external links to
  whatever provider the business already uses, because there is no proprietary backend in phase 1 to
  process forms.
- Tap analytics and the `/r/<slug>` redirector are phase 2 (via OpenSpec) and are out of this scope;
  phase 1 must only avoid creating obstacles to adding them (centralized destinations).
- `demo` ([ES] "Taberna Vela y Sal") is a fictional business instance built to demonstrate the
  archetype. It is not a client, and its data is invented — its place ID and phone number
  deliberately remain placeholders rather than borrowing a real venue's, because a review link or a
  `tel:` link pointing at someone else's business is worse than an entry that is visibly pending.
- HTTPS is mandatory for deployment; the specific static hosting provider is decided in the plan and
  does not affect this specification.
