<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.0.1
Change type: PATCH (non-semantic: full ES→EN translation; principles, phases, scope, and
             governance are substantively unchanged)

Language policy: This document is technical/structural content and is written entirely in English.
             There are no customer-facing strings in the constitution, so no Spanish is retained here.
             (Customer-facing labels live in the specs and stay in Spanish, tagged [ES].)

Placeholder convention: the internal marker was normalized from `[PLACEHOLDER - sustituir]` to
             `[PLACEHOLDER - replace]` for cross-document consistency in English.

Principles (8):
  - I.    NFC architecture — a single entry point
  - II.   No native apps
  - III.  Phased development (NON-NEGOTIABLE)
  - IV.   WiFi outside the hub
  - V.    The hub is a thin routing layer
  - VI.   Monorepo with a shared engine
  - VII.  Real data always as placeholder until confirmed
  - VIII. Technical rigor and honesty about assumptions

Added sections:
  - Scope & Exclusions (out of scope in all phases)
  - Governance

Dependent templates:
  - .specify/templates/plan-template.md ✅ compatible (uses the dynamic "Constitution Check" gate,
      reads this file at /speckit.plan time; no hard-coded principles to update)
  - .specify/templates/spec-template.md ✅ compatible (feature-content placeholders, not constitution)
  - .specify/templates/tasks-template.md ✅ compatible (agnostic task categorization)
  - Skills .claude/skills/speckit-*/SKILL.md ✅ no agent-specific references to fix

Follow-up TODOs: none. All dates known; no deferred placeholders.
-->

# NFC Hubs Constitution

NFC-activated "hub" pages for hospitality businesses. Every table in a business has a physical NFC
tag that, when the phone is brought close, opens a hub page — not the menu directly — with several
useful entries depending on the type of business. Two distinct businesses are developed (a cocktail
bar and gourmet tapas) on top of a shared engine. These principles are NON-NEGOTIABLE and supersede
any later design or implementation decision.

## Core Principles

### I. NFC architecture — a single entry point

One tag per table MUST always point to its own hub URL, never directly to social media, the menu, or
reviews. The hub is the tag's only NDEF destination. It is PROHIBITED to configure any tag so that
its primary NDEF destination is anything other than its hub URL.

**Rationale**: the phone's operating system triggers a single action per tag; the hub works around
that limitation by offering several options from a single URL.

### II. No native apps

No business has an App Store / Play Store app. All hub links MUST be plain `<a href>` links to
existing websites. It is PROHIBITED to implement universal links, app links, or deep linking to
native apps.

**Rationale**: the project's model is 100% web over HTTPS; introducing routes to native apps would
break the "no apps" promise and add unsupported platform dependencies.

### III. Phased development (NON-NEGOTIABLE)

The product evolves in strict phases, and no phase may introduce contradictions with the next:

- **PHASE 1 — static hub**: MUST be servable as pure static HTML/CSS/JS over HTTPS, WITHOUT
  requiring a backend. Phase 1 links go directly to their external destinations.
- **PHASE 2 — redirector with logging** (later, via OpenSpec): a proprietary redirector with
  server-side logging for tap analytics will be introduced (a route like `/r/<slug>` that records
  the hit and issues a 301 to the real destination). The phase 1 design MUST NOT create obstacles to
  adding that redirector later; destinations MUST be centralized so they can later be rerouted
  without rewriting each button by hand.

In PHASE 1 it is PROHIBITED to rely on the chip's "NFC Counter" or on `localStorage`/`sessionStorage`
to count visits.

**Rationale**: separating an initial static deployment from server-side analytics avoids coupling
the hub to infrastructure that does not yet exist, and centralizing destinations keeps the door open
for the redirector.

### IV. WiFi outside the hub

WiFi connection MUST be handled as a native "Wi-Fi Simple Config" NDEF record on the physical tag
itself, not as a page feature. The hub MAY display the network name as informational text, but NEVER
as a connection mechanism.

**Rationale**: WiFi connection is an operating-system capability via NDEF; duplicating it on the web
would be fragile and would add nothing over the tag's native record.

### V. The hub is a thin routing layer

The hub NEVER reconstructs content that already exists on the business's own website (full menu,
photo gallery, etc.); it ONLY links to it. Both businesses already have a working website, and that
website is the source of truth for its content.

**Rationale**: keeping the hub as a thin layer avoids duplication, content drift, and redundant
maintenance.

### VI. Monorepo with a shared engine

The project MUST live in a single repository with a shared engine/base and content separated by
business. Business-to-business separation and the existence of a shared engine are fixed principles;
the concrete folder organization is decided in `/speckit.plan`.

**Rationale**: a shared engine with segregated content allows scaling to more businesses without
duplicating logic or mixing data between them.

### VII. Real data always as placeholder until confirmed

Every URL, phone number, address, Google place ID, social media handle, or any real business data
MUST be explicitly marked as `[PLACEHOLDER - replace]` until the owner confirms it. It is PROHIBITED
to invent or assume this data.

**Rationale**: publishing invented data for a real business can direct traffic to the wrong
destinations and damage the owner's trust; explicit marking makes it auditable what remains to be
confirmed.

### VIII. Technical rigor and honesty about assumptions

It is PROHIBITED to assume NFC hardware compatibility, chip specs, or mobile browser behavior without
explicitly marking it as an assumption to verify. Making a known limitation explicit MUST be
preferred over hiding it. Real traffic is 100% mobile after an NFC tap: the design is optimized for
that case, not for desktop.

**Rationale**: the product's reliability depends on hardware and browsers outside our control;
honesty about assumptions prevents silent field failures.

## Scope & Exclusions

The following areas are OUT OF SCOPE for the project in ALL phases:

- **Physically writing the NFC tags**: this is a manual task performed with a tag-writing app, not
  software in this repo.
- **Managing the menu content itself**: it lives on the business's external website (see Principle V).
- **A proprietary reservation system**: link to whatever each business already uses; do not build one.

Any proposal falling into these areas MUST be rejected or redirected to the corresponding external
system.

## Governance

This constitution supersedes any other practice, plan, or implementation decision in the project. In
case of conflict between a principle and a concrete proposal, the principle wins unless formally
amended.

- **Amendments**: every modification of a principle or section MUST be documented in this file,
  increment the version per the versioning policy, and update the last-amended date. Changes
  affecting phases (Principle III) MUST additionally be reviewed against the OpenSpec pipeline before
  merging.
- **Versioning policy** (document SemVer):
  - **MAJOR**: backward-incompatible removal or redefinition of governance or principles.
  - **MINOR**: addition of a principle/section or material expansion of existing guidance.
  - **PATCH**: clarifications, wording fixes, or non-semantic refinements.
- **Compliance**: every specification (`/speckit.specify`), plan (`/speckit.plan`), and task set
  (`/speckit.tasks`) MUST be verified against these principles via the "Constitution Check" gate. Any
  deviation MUST be explicitly justified or corrected before proceeding.

**Version**: 1.0.1 | **Ratified**: 2026-07-20 | **Last Amended**: 2026-07-20
