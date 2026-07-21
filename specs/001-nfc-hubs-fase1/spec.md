# Feature Specification: NFC Hubs Phase 1 — Cocktail Bar and Gourmet Tapas

**Feature Branch**: `001-nfc-hubs-fase1`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description (translated from Spanish): "Build PHASE 1 of an NFC hub-page system for two hospitality businesses, on a shared engine in a monorepo, servable as pure static content over HTTPS without a backend. Tap analytics is explicitly out of scope for this phase (it will be addressed in phase 2 with OpenSpec)."

> **User-facing strings policy**: Per project rule, labels the end customer sees (button labels,
> business placeholder names) stay in **Spanish** and are tagged `[ES]` and quoted, e.g.
> `[ES] "Carta de cócteles"`. **Do not translate `[ES]` strings.** Everything else in this document
> is technical/structural content in English.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cocktail-bar customer accesses their table's services (Priority: P1)

It is nighttime. A customer seated at their table in the cocktail bar brings their phone close to the
table's NFC tag. The phone automatically opens the cocktail bar's hub page. In a nocturnal,
experiential visual register, the customer sees a priority-ordered list of entries for the occasion:
cocktail menu, reserve VIP area, the venue's playlist, the events/DJs agenda, Instagram, leave a
Google review, and the WiFi network name as informational text. They tap the option they want and
are taken directly to the corresponding external destination.

**Why this priority**: It is the core flow of business 1 and the reason the project exists. Without
this hub rendering and linking correctly on mobile, there is no product. It delivers value on its own
even if business 2 does not exist yet.

**Independent Test**: Can be tested in isolation by opening the cocktail-bar hub URL in a mobile
browser and verifying that the 6 action buttons lead to their (placeholder) destinations and that
WiFi appears as non-actionable text, in the defined priority order.

**Acceptance Scenarios**:

1. **Given** a phone that opens the cocktail-bar hub URL, **When** the page loads, **Then** the
   entries are shown in this order ([ES] labels, keep in Spanish): [ES] "Carta de cócteles",
   [ES] "Reservar mesa / zona VIP", [ES] "Playlist / Spotify", [ES] "Agenda de eventos / DJs",
   "Instagram", [ES] "Reseña Google", and [ES] "WiFi" (informational text at the end).
2. **Given** the cocktail-bar hub loaded, **When** the customer taps [ES] "Carta de cócteles",
   **Then** the browser navigates to the menu's external destination (an identifiable placeholder).
3. **Given** the cocktail-bar hub loaded, **When** the customer taps [ES] "Reseña Google", **Then**
   the browser opens the link in "write review" (writereview) format with the business's place ID.
4. **Given** the cocktail-bar hub loaded, **When** the customer locates the WiFi block, **Then** they
   see the network name as informational text and there is no element that attempts to connect to
   WiFi from the page.
5. **Given** the cocktail-bar hub, **When** it is compared with the tapas hub, **Then** its visual
   identity is clearly distinct (nocturnal/experiential register), not the same template recolored.

---

### User Story 2 - Gourmet-tapas customer explores the product and saves a contact (Priority: P1)

It is lunchtime. A customer at the gourmet-tapas restaurant brings their phone close to the table's
tag. The restaurant's hub page opens, in a daytime visual register focused on the product. The
customer sees a priority-ordered list for their context: menu (product-focused), reserve table,
takeaway/catering, Google review, newsletter/members club, Instagram, informational WiFi, and "save
contact". On tapping "save contact", the browser generates a vCard with the business data (name,
phone, address, website) so the customer can add it to their address book.

**Why this priority**: It is the core flow of business 2. It shares priority P1 with story 1 because
both businesses are mandatory phase 1 deliverables; neither is optional. In-browser vCard generation
is the only local interactive capability and must work without a backend.

**Independent Test**: Can be tested in isolation by opening the tapas hub URL in a mobile browser,
verifying the order of the 8 entries and that "save contact" downloads/offers a vCard with the
business's placeholder data, with no server calls.

**Acceptance Scenarios**:

1. **Given** a phone that opens the tapas hub URL, **When** the page loads, **Then** the entries are
   shown in this order ([ES] labels, keep in Spanish): [ES] "Carta", [ES] "Reservar mesa",
   [ES] "Para llevar / catering", [ES] "Reseña Google", [ES] "Newsletter / club de socios",
   "Instagram", [ES] "WiFi" (informational text), [ES] "Guardar contacto".
2. **Given** the tapas hub loaded, **When** the customer taps [ES] "Guardar contacto", **Then** the
   browser generates and offers a vCard with the business's name, phone, address, and website
   (placeholder values), without making any network request to a proprietary backend.
3. **Given** the tapas hub loaded, **When** the customer taps [ES] "Newsletter / club de socios",
   **Then** it navigates to an external destination (e.g., an email provider), not to a form that
   requires a proprietary server.
4. **Given** the tapas hub loaded, **When** the customer taps [ES] "Reseña Google", **Then** the
   browser opens the writereview link with the business's place ID.
5. **Given** the tapas hub, **When** it is compared with the cocktail bar's, **Then** its visual
   identity is clearly distinct (daytime/product register).

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

- **WiFi is never actionable**: in both hubs, the WiFi block must be informational text; no tap on it
  must attempt to connect to the network (the real connection is handled by the tag's NDEF record).
- **Google review without a confirmed place ID**: while the place ID is a placeholder, the
  writereview link must remain identifiable as a placeholder and must not direct to an incorrect real
  business.
- **External destination down or changed**: since links go directly to the external destination in
  phase 1, if an external destination changes its URL, the hub must be updatable by changing only the
  centralized destination value.
- **Locked/unlocked screen**: the hub must open and be usable whether the tap is made with the phone
  locked or unlocked, without extra steps beyond the OS's normal navigation.
- **Per-business absent buttons**: the cocktail bar does NOT have "save contact"; tapas DOES. The
  cocktail bar includes no vCard. Each hub shows only its own set of entries, with no empty gaps or
  empty buttons.
- **Loading on a slow mobile connection**: the hub must remain usable and render its essential
  content quickly on a typical venue mobile connection.

## Requirements *(mandatory)*

### Functional Requirements

**Common to both hubs**

- **FR-001**: The system MUST offer, per business, a single hub page as the destination of its
  tables' NFC tags.
- **FR-002**: The system MUST be servable as pure static content (HTML/CSS/JS) over HTTPS, without
  requiring any proprietary backend in phase 1.
- **FR-003**: Each "link" entry MUST be a direct link to its external destination in phase 1.
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
- **FR-015**: The two hubs MUST have a clearly differentiated visual identity from each other
  (cocktail bar = nocturnal/experiential register; gourmet tapas = daytime/product register), and
  MUST NOT look like the same template recolored or a default-generated result.

**Business 1 Hub — Cocktail Bar** (business placeholder name: [ES] "Bar Ejemplo Copas")

- **FR-016**: The cocktail-bar hub MUST present exactly these entries, in this priority order
  (user-facing labels in Spanish, tagged [ES]): (1) cocktail menu — [ES] "Carta de cócteles"
  [external link]; (2) reserve table / VIP area — [ES] "Reservar mesa / zona VIP" [external link];
  (3) playlist / Spotify — [ES] "Playlist / Spotify" [external link]; (4) events / DJs agenda —
  [ES] "Agenda de eventos / DJs" [external link]; (5) Instagram [external link]; (6) Google review —
  [ES] "Reseña Google" [writereview with place ID]; (7) WiFi — [ES] "WiFi" [informational text].
- **FR-017**: The cocktail-bar hub MUST NOT include the "save contact"/vCard feature.

**Business 2 Hub — Gourmet Tapas** (business placeholder name: [ES] "Restaurante Ejemplo Tapas")

- **FR-018**: The tapas hub MUST present exactly these entries, in this priority order (user-facing
  labels in Spanish, tagged [ES]): (1) menu — [ES] "Carta" [external link, product-focused if the
  site allows]; (2) reserve table — [ES] "Reservar mesa" [external link]; (3) takeaway / catering —
  [ES] "Para llevar / catering" [external link]; (4) Google review — [ES] "Reseña Google"
  [writereview with place ID]; (5) newsletter / members club — [ES] "Newsletter / club de socios"
  [external link]; (6) Instagram [external link]; (7) WiFi — [ES] "WiFi" [informational text];
  (8) save contact — [ES] "Guardar contacto" [vCard].
- **FR-019**: The tapas hub's "newsletter / members club" entry MUST be resolved in phase 1 as an
  external link (e.g., to an email provider) and MUST NOT depend on a form with a proprietary backend.
- **FR-020**: The tapas hub's "save contact" entry MUST generate a vCard dynamically in the browser
  itself with the business's name, phone, address, and website, without making requests to a
  proprietary backend.

### Key Entities *(include if feature involves data)*

- **Business**: a hospitality venue with its visual identity (nocturnal or daytime register) and its
  data set. Attributes: name (placeholder), type (cocktail bar / gourmet tapas), WiFi network name
  (placeholder), Google place ID (placeholder), phone/address/website (placeholder; only tapas uses
  these for the vCard).
- **Hub entry**: an option visible on a hub. Attributes: label, priority order, type (external link /
  writereview review / informational text / local vCard action), and destination (external URL or
  place ID). Link-type destinations are defined centrally per business.
- **Business data**: the set of a business's real values, separate from the hub's structure, editable
  without touching the layout. Each unconfirmed value is marked as a placeholder.
- **Business vCard** (tapas only): a contact representation generated in the browser from the
  business data (name, phone, address, website).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Both hubs render correctly in a mobile browser and show 100% of their entries in the
  priority order defined for each business.
- **SC-002**: 100% of link-type entries lead to a placeholder destination clearly identifiable as
  pending replacement.
- **SC-003**: The project can be deployed as static content over HTTPS without any proprietary server
  component.
- **SC-004**: Replacing all of a business's placeholder data with real data requires editing no
  structure/layout file (it is achieved by editing only the business data).
- **SC-005**: A user comparing both hubs identifies them as visually distinct businesses (nocturnal
  vs. daytime register), not as the same template.
- **SC-006**: On the tapas hub, "save contact" produces a vCard with the four data values (name,
  phone, address, website) without any request to a proprietary backend.
- **SC-007**: No hub contains WiFi connection mechanisms, visit counters, or links to native
  apps/deep links.
- **SC-008**: The essential content of each hub becomes visible quickly on a typical venue mobile
  connection (near-instant perceived load), without blocking on heavy resources.

## Assumptions

- Traffic is 100% mobile after an NFC tap; the design is optimized for that case and not for desktop.
- Physically writing the NFC tags (including the "Wi-Fi Simple Config" NDEF WiFi record) is a manual
  task outside this repo; phase 1 only produces the hub pages.
- Both businesses already have their own working website that acts as the source of truth for their
  content (menu, gallery, reservations); the hub only links to it.
- The Google place ID is used in a standard Google Maps writereview link; the exact format will be
  confirmed when the placeholder is replaced.
- The "newsletter / members club" entry will be resolved as an external link to an email provider
  (e.g., Mailchimp) because there is no proprietary backend in phase 1 to process forms.
- Tap analytics and the `/r/<slug>` redirector are phase 2 (via OpenSpec) and are out of this scope;
  phase 1 must only avoid creating obstacles to adding them (centralized destinations).
- The names [ES] "Bar Ejemplo Copas" and [ES] "Restaurante Ejemplo Tapas" are business placeholder
  names.
- HTTPS is mandatory for deployment; the specific static hosting provider is decided in the plan and
  does not affect this specification.
