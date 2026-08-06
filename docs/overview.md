# NFC Hubs — Project Overview

**Status:** Phase 1 built and tested; not yet deployed.
**Last updated:** 2026-08-06

---

## What this is

Every table in a venue carries a small NFC tag. A customer holds their phone near it and a
page opens immediately — no app, no camera, no typing — showing a short list of the things
that customer is most likely to want: the menu, a reservation link, the Instagram account, a
review link, the WiFi network name.

The obvious comparison is a QR code, so let's be precise about the difference.

**A QR code could serve the same page.** Nothing here is technically impossible with QR, and
claiming otherwise would be dishonest. The differences are in interaction cost and in what the
tag is pointing at:

- **The tap is shorter than the scan.** A QR code needs the camera open, the code in frame, in
  adequate light, at a workable distance, then a tap on a notification banner. An NFC tag needs
  the phone brought near the table. In a dark cocktail bar, that gap is wider than it sounds.
- **One tag, many destinations.** The instinct with a QR code is to point it straight at the
  menu, because a sticker can only do one thing. Then the venue wants a reservation link, so a
  second code appears, and the table accumulates stickers. An NFC tag has the same
  one-destination limitation — but here that single destination is a *hub page*, so one tag
  covers everything and the list can change without touching the tag.
- **The table is identifiable.** Each tag encodes its own table number in the URL. Today that
  number is deliberately ignored. It exists so that later analytics can attribute activity to a
  specific table without anyone re-programming a single tag.

That last point is the architectural bet: **the tag is a permanent, physical object, and the
page it points to is not.** Everything expensive to change is decided once, up front; everything
else stays soft.

---

## The two pilot verticals

Two venues are being used as proof-of-concept pilots. Both are anonymous at this stage, and
neither has supplied real data yet — every value in the system is currently a marked
placeholder, by design (more on that below).

They were not chosen for variety's sake. They represent two structurally different **registers**
— different customer contexts producing different feature sets:

**A cocktail bar — nocturnal, action-oriented.**
The customer is seated, it's late, they're deciding what to do next. The hub leads with the
cocktail menu, then reserving a table or VIP area, then the venue's playlist, then the events
and DJ schedule, then Instagram, then leaving a review. Seven entries, six of them actions.
There is deliberately **no "save contact"** option: nobody adds a bar to their address book at
midnight.

**A gourmet tapas restaurant — daytime, contact-oriented.**
The customer is eating lunch and may want to come back, order for an event, or take something
away. The hub leads with the menu, then reservations, then takeaway and catering, then reviews,
then a newsletter or members' club, then Instagram — and ends with **"save contact"**, which
generates a proper contact card directly on the phone: name, phone number, address, website.

That last feature is the clearest illustration of why the two are treated as distinct archetypes
rather than one template with different colours. A restaurant that does catering has a real
reason to live in a customer's contacts. A cocktail bar does not. The feature exists in one and
is absent from the other — not hidden, not disabled, genuinely absent.

The visual identities follow the same logic. The bar is near-black with warm light and wide,
spaced lettering. The restaurant is warm paper with a serif heading and flat, square cards.
They are built from the same engine but are not the same page recoloured.

---

## How it's built

**One engine, many businesses.** A single site generator (Eleventy) produces every hub. All
shared logic — layout, styling, behaviour, accessibility — lives in one place. Adding a third
venue means adding a folder, not copying a codebase.

**Each business is a data file.** Everything specific to a venue — its name, links, phone
number, WiFi network name — lives in one small, version-controlled JSON file. Going live with
real values means editing that one file. No developer touches markup, styling, or code to put a
real menu link in place. That constraint is enforced by the build itself, not by convention.

**No backend in Phase 1.** The output is plain HTML, CSS and a few kilobytes of JavaScript.
There is no server, no database, no login, nothing to maintain or breach. Each hub weighs about
**11 KB and 15 KB** respectively, against a self-imposed 100 KB ceiling — meaningful on a
congested venue connection.

**Hosted on Cloudflare Pages, chosen for a specific reason.** Any static host could serve these
files today. Cloudflare Pages was picked because Phase 2's analytics redirector can run on the
*same web address* as the pages themselves. The alternative — adding analytics later on a
different host or domain — would invalidate every physical tag already placed on a table. The
hosting decision is really a decision about not having to re-tag two venues.

---

## Design principles

These are the choices that separate this from a template, described plainly.

**Unconfirmed data is marked, and the system knows it.**
Every value the owner hasn't yet supplied holds a specific marker string. The system reads that
marker: an entry whose destination is still unconfirmed renders normally in its place, but
tapping it shows a short "pending confirmation" notice instead of navigating anywhere. A
customer is never sent to a dead link, a placeholder page, or someone else's business. Nothing
is ever invented to make a page look finished.

**Data mistakes stop the build instead of shipping.**
A missing field, an empty value, or a subtly wrong marker doesn't quietly become a broken link
on a live page — it fails the build, naming the exact field at fault. The failure mode this
prevents is specific and real: a typo that made the system think a value was confirmed would
send customers to a nonexistent address.

**The contact card is all-or-nothing.**
The restaurant's "save contact" produces a card only when the name, phone, address, and website
are *all* confirmed. If any one is missing, it generates nothing and explains why. A
half-complete contact saved into someone's phone is worse than no contact: they keep it, they
trust it, and it's wrong. It is also harder for them to undo than a tap that politely did
nothing.

**WiFi is displayed, never connected.**
The hub shows the network *name* as plain text and nothing more — it is not a button, not a
link, and cannot initiate a connection. No password is stored anywhere in the system. Where a
venue wants tap-to-connect, that is handled by the tag's own built-in WiFi record, written when
the tag is programmed. Credentials never touch the website.

**No tracking, no cookies, no stored data.**
Phase 1 collects nothing. No analytics, no cookies, no browser storage, no third-party scripts,
no external fonts. A customer's tap is not reported to anyone, including us. This is verified by
an automated test that fails if the page contacts any outside address at all. It is also why the
pages are so small.

**Accessibility is a floor, not a finish.**
Both hubs meet WCAG 2.2 AA — verified automatically on every build across both visual registers.
Tap targets meet minimum size, contrast is checked, and the "pending" state is communicated with
text rather than colour alone, so it survives colour-blindness and greyscale. The nocturnal
design does not get an exemption; it meets the same bar as the daylight one.

**Each archetype has a fixed feature set.**
A venue owner fills in real values; they cannot casually add, remove, or reorder entries. This
sounds restrictive and is deliberate. The identifiers behind each entry are destined to become
the analytics routes in Phase 2 — renaming one is free today and silently breaks measurement
later, after tags are in the field. The build rejects any deviation. A genuinely new kind of
venue gets a specified archetype of its own, rather than an improvised list.

---

## Where the project stands

**Built and verified.**
Both hubs are complete. The project defines 90 automated checks: **85 pass, 5 are deliberately
skipped.** Of those, 69 run in a real browser against emulated iPhone (Safari engine) and
Android (Chrome engine) — the only two environments that matter, since all real traffic arrives
from a phone — and 16 are data-contract checks that verify the build rejects malformed venue
data. Coverage includes entry order, the pending-confirmation behaviour, the contact card in
both its working and withheld states, the inert WiFi display, accessibility, page weight, and
load timing. The five skipped checks measure build-level or network-throttled behaviour that
only one browser engine can report; they are recorded as a known coverage gap rather than
quietly omitted.

Measured, not estimated: hub weights of 11.1 KB and 14.9 KB against a 100 KB budget; essential
content visible in roughly a quarter of a second on a typical 4G connection and under two-thirds
of a second on a deliberately degraded one, against targets of 1.5 and 3 seconds.

**Deferred by design to Phase 2.**
Tap analytics. There is currently no way to know how many people used a hub, or from which
table. This is a conscious sequencing decision, not an oversight: the measurement layer needs a
server component, and Phase 1 was kept static so it could ship and be validated without one. The
groundwork is in place — table numbers already travel in the tag URLs, and every destination is
centralised so it can be rerouted through a measurement endpoint without rewriting the pages.

**Open before go-live.**

1. **Real business data.** Every value is still a placeholder — 19 of them across the two
   venues. This is the expected state, and the system is explicit about what remains: a single
   command lists every outstanding value. Collecting them from the two owners is a business task,
   not a technical one, and it is the largest remaining item.

2. **The production web address.** Deliberately not yet fixed. Because each tag physically
   encodes the full address, this must be settled *before* any tags are written — changing it
   afterwards means re-programming every tag in both venues by hand. Deployment configuration is
   ready; the address is a decision, not a task.

3. **Real-device verification of the contact card — the one unresolved technical risk.**
   The "save contact" feature generates its card entirely on the phone. This works in automated
   testing, but automated testing runs a browser *engine*, not an actual iPhone. Whether iOS
   Safari opens the contacts importer when handed a generated file is a known-fragile behaviour
   that cannot be confirmed by any amount of automation. It must be checked on real hardware.

   If it fails, there is a fallback — serving a pre-built contact file as an ordinary link — but
   it works differently from what the specification currently requires, so it would be handled as
   a documented change rather than a silent substitution. This is the single item most likely to
   require rework, and it is deliberately being surfaced now rather than discovered at launch.

Alongside these, a short list of real-device checks remains: the contact card on Android, reading
the nocturnal design in an actually dark room (automated contrast checking only evaluates
declared colours, not perception), and confirming a tag opens correctly with the phone both
locked and unlocked.

---

## Roadmap

**Phase 1 — static hubs.** *(built; pending data, address, and device verification)*
Two working hubs on a shared engine, servable as plain files over HTTPS with no backend. Ends
when both venues have real data, tags are written, and the pages are live.

**Phase 2 — measurement.** *(requires explicit sign-off before work starts)*
A server-side redirector that records a tap and forwards to the real destination, turning table
numbers already present in every tag into usable information: which venue, which table, which
entry, at what time. Phase 1 was built specifically so this is an addition rather than a rebuild
— same address, same tags, no re-programming. It has not been started and will not be until it
is explicitly approved.

**Phase 3 — additional venues.** *(potential)*
The engine already separates shared machinery from per-venue content, so a third venue is a data
folder rather than a new project. The honest constraint is the archetype rule above: a venue
resembling one of the two existing patterns is straightforward, while a materially different one
needs its feature set specified first. That is a deliberate brake against onboarding venues into
a shape nobody designed for them.

---

## Summary

Phase 1 is functionally complete and independently verified against its own specification. The
engineering risk is low and concentrated in one identified place — the contact-card behaviour on
real iPhones. The remaining work before launch is mostly not engineering: collecting real
information from two business owners, and settling a web address that then becomes permanent.

The project's central design choice is that everything physical and expensive to change is
decided once, and everything else stays editable. That is what makes a second phase an addition
rather than a rebuild, and a third venue a folder rather than a project.
