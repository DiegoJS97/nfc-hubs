# NFC Hubs — Project Overview

**Status:** Phase 1 built, verified, and deployed. Live at
<https://diegojs97.github.io/nfc-hubs/demo/>.
**Last updated:** 2026-08-08

---

## What this is

Every table in a venue carries a small NFC tag. A customer holds their phone near it and a page
opens immediately — no app, no camera, no typing — showing a short list of the things that customer
is most likely to want: the menu, a reservation link, how to get there, the Instagram account, a
review link, the WiFi network name.

The obvious comparison is a QR code, so let's be precise about the difference.

**A QR code could serve exactly the same page.** Nothing here is technically impossible with QR,
and claiming otherwise would be dishonest. The differences are in interaction cost and in what the
tag is pointing at:

- **The tap is shorter than the scan.** A QR code needs the camera open, the code in frame, in
  adequate light, at a workable distance, then a tap on a notification. An NFC tag needs the phone
  brought near the table. In a dark cocktail bar, that gap is wider than it sounds.
- **One tag, many destinations.** The instinct with a QR code is to point it straight at the menu,
  because a sticker can only do one thing. Then the venue wants a reservation link, so a second
  code appears, and the table accumulates stickers. An NFC tag has the same one-destination
  limitation — but here that single destination is a *hub page*, so one tag covers everything and
  the list can change without touching the tag.
- **The table is identifiable.** Each tag encodes its own table number in the URL. Today that
  number is deliberately ignored. It exists so that later analytics can attribute activity to a
  specific table without anyone re-programming a single tag.

That last point is the architectural bet: **the tag is a permanent, physical object, and the page
it points to is not.** Everything expensive to change is decided once, up front; everything else
stays soft.

---

## One archetype, configured per business

The project started with two named archetypes — a cocktail bar and a tapas restaurant — each with
its entry list fixed in the specification. They turned out to be structurally near-identical, and
mandating them by name in the spec is exactly what made "onboard a venue" a spec change rather than
a folder.

Today there is **one generic archetype**. The engine supports a catalog of entry types, and each
venue picks which ones it uses and in what order:

| Type | What it does |
|---|---|
| **link** | Goes to an external destination: the menu, reservations, Instagram, whatever |
| **review** | Opens Google directly on that venue's write-review form |
| **how to get there** | Opens the venue's place page on Google Maps |
| **call** | Opens the phone's dialler with the venue's number |
| **WiFi** | Shows the network name as text. Never connects |
| **save contact** | Generates a contact card on the phone itself |

Adding a new **type** to the catalog is a product decision and goes through the specification.
Choosing **which types a venue uses and in what order** is editing a data file, and needs nobody's
permission.

That changes something important: a venue that resembles no previous pattern is no longer blocked
waiting for someone to specify its archetype. You configure it. The only brake left is the right
one — you cannot **invent values**.

### The save-contact module

"Save contact" is the clearest illustration of the difference. It used to be a property of a
business category: the restaurant had it and the bar did not, by specification. Now it is an
optional module: a hub has it exactly when its data declares that entry, and a hub that does not
declare it downloads not one byte of that code.

It still makes sense that a restaurant doing catering belongs in a customer's address book and a
cocktail bar does not. The difference is that this is now decided by whoever configures the venue,
not by the specification.

### The demonstration venue

There is a single instance configured: [ES] "Taberna Vela y Sal", a **fictional** venue built so
the product can be shown. It is not a client, and its data is invented on purpose.

Two of its values deliberately remain unconfirmed: the venue's Google place ID and its phone
number. They could have been filled with real data from somewhere so that every button worked in
the demo, and briefly they were — it was a bad trade. "Reseña Google" would have filed a review
against a real, unrelated business, and "Cómo llegar" would have navigated a prospect to another
city. Spain also reserves no fictional number range, so any plausible `+34` may belong to a real
person.

The result is a demo with four working entries and two pending. That is honest, and it turns the
pending state into something a prospect sees working rather than has to take on trust.

---

## How it's built

**One engine, many businesses.** A single site generator (Eleventy) produces every hub. All shared
logic — layout, styling, behaviour, accessibility — lives in one place. Adding a venue means adding
a folder, not copying a codebase.

**Each business is a data file.** Everything specific to a venue — its name, its links, its phone
number, its WiFi network name — lives in one small, version-controlled JSON file. Going live with
real values means editing that file. No developer touches markup, styling, or code to put a real
menu link in place. That constraint is enforced by the build itself, not by good intentions.

**No backend in Phase 1.** The output is HTML, CSS, and a few kilobytes of JavaScript. There is no
server, no database, no login, nothing to maintain or breach. The hub weighs **10.1 KB** against a
self-imposed 100 KB ceiling — which is noticeable on the congested connection of a busy venue.

**Deployed on GitHub Pages.** The site publishes itself on every change: it builds, runs the full
test suite as a condition of publication, and only deploys if everything passes. Cloudflare Pages
remains the candidate for Phase 2, because the analytics redirector needs to run server-side code
and GitHub Pages cannot. That is a Phase 2 decision, not this one — but it is the reason the web
address must be settled **before** any tag is written: changing it afterwards means re-programming
every tag by hand.

---

## Design principles

These are the choices that separate this from a template, described plainly.

**Unconfirmed data is marked, and the system knows it.**
Every value the owner hasn't yet supplied holds a specific marker string. The system reads that
marker: an entry whose destination is still unconfirmed renders normally in its place, but tapping
it shows a short "pending confirmation" notice instead of navigating anywhere. A customer is never
sent to a dead link, a placeholder page, or someone else's business. Nothing is ever invented to
make a page look finished.

**Data mistakes stop the build instead of shipping.**
A missing field, an empty value, or a subtly wrong marker doesn't quietly become a broken link on a
live page — it fails the build, naming the exact field at fault. The failure this prevents is
specific and real: a typo that made the system think a value was confirmed would send customers to
a nonexistent address.

**The contact card is all-or-nothing.**
"Save contact" produces a card only when the name, phone, address, and website are *all* confirmed.
If any one is missing, it generates nothing and explains why. A half-complete contact saved into
someone's phone is worse than no contact: they keep it, they trust it, and it's wrong. It is also
much harder for them to undo than a tap that politely did nothing.

**WiFi is displayed, never connected.**
The hub shows the network *name* as plain text and nothing more — it is not a button, not a link,
and cannot initiate a connection. No password is stored anywhere in the system. Where a venue wants
tap-to-connect, that is handled by the tag's own built-in WiFi record, written when the tag is
programmed. Credentials never touch the website.

**No tracking, no cookies, no stored data.**
Phase 1 collects nothing. No analytics, no cookies, no browser storage, no third-party scripts, no
external fonts. A customer's tap is not reported to anyone, including us. This is verified by an
automated test that fails if the page contacts any outside address at all. It is also part of why
the pages are so small.

And there is a limit written down for later, not only for today: the project's constitution bounds
what measurement may ever become — anonymous, aggregate, single-site audience measurement, with no
client-side identifiers and no cross-site tracking. Personal data and cross-client data sharing are
out of scope **in all phases**, not just this one.

**Accessibility is a floor, not a finish.**
The hub meets WCAG 2.2 AA — verified automatically on every build. Tap targets meet the minimum
size, contrast is checked, and the "pending" state is communicated with text rather than colour
alone, so it survives colour-blindness and greyscale. The nocturnal design gets no exemption: it
meets the same bar a daylight one would.

**Identifiers are permanent even though everything else is soft.**
A venue can add, remove, and reorder its entries freely. What it cannot do is **rename** one: each
entry's identifier is destined to become its analytics route in Phase 2, and renaming it today is
free and silently breaks measurement later, once the tags are on the tables. It is the same logic
as the web address — what is expensive to change is decided once.

---

## Where the project stands

**Built, verified, and live.**
The project defines 80 automated checks: **75 pass, 5 are deliberately skipped**, none fail. Most
run in a real browser against an emulated iPhone (Safari engine) and an emulated Android (Chrome
engine) — the only two environments that matter, since all real traffic arrives from a phone — and
the rest are data-contract checks that verify the build rejects malformed venue data. Coverage
includes entry order, the pending behaviour, the contact card in both its states, the inert WiFi
display, accessibility, page weight, load timing, and the deployed site's base path. The 5 skipped
checks measure build-level or network-throttled behaviour that only one browser engine can report;
they are recorded as a known coverage gap rather than quietly omitted.

Measured, not estimated: 10.1 KB of weight against a 100 KB budget; essential content visible in
286 ms on a typical 4G connection and 577 ms on a deliberately degraded one, against targets of 1.5
and 3 seconds.

The suite is also the condition of publication: nothing deploys that does not pass it in full, on a
clean Ubuntu and not only on the development machine.

**Deferred by design to Phase 2.**
Tap analytics. There is currently no way to know how many people used a hub, or from which table.
This is a conscious sequencing decision, not an oversight: the measurement layer needs a server
component, and Phase 1 was kept static so it could ship and be validated without one. The
groundwork is in place — table numbers already travel in the tag URLs, and every destination is
centralised so it can be rerouted through a measurement endpoint without rewriting the pages.

**Open before a real client.**

1. **An actual venue.** What is configured is a fictional demo. Contacting a venue, collecting its
   data, and configuring it is the next real task, and it is a business one, not a technical one.

2. **The definitive web address.** The current one is a GitHub Pages URL tied to the repository
   name. It serves perfectly well for showing the product, but because each tag physically encodes
   the full address, this must be settled *before* writing any venue's tags — changing it afterwards
   means re-programming them all by hand.

3. **Real-device verification of the contact card — the one unresolved technical risk.**
   "Save contact" generates its card entirely on the phone. It works in automated testing, but
   automated testing runs a browser *engine*, not an iPhone. Whether iOS Safari opens the contacts
   importer when handed a generated file is a known-fragile behaviour that no amount of automation
   can confirm. It must be checked on real hardware.

   If it fails, there is a fallback — serving a pre-built contact file as an ordinary link — but it
   works differently from what the specification currently requires, so it would be handled as a
   documented change rather than a silent substitution. It is the item most likely to require
   rework, and it is deliberately on the table now rather than discovered on launch day.

   With one honest wrinkle added by the archetype change: since no venue currently declares the
   save-contact entry, the device test requires temporarily enabling it with test data. The
   procedure is described in [`t039-device-checks.md`](./t039-device-checks.md).

Alongside that, a short list of device checks remains: the contact card on Android, reading the
nocturnal design in an actually dark room (automated contrast checking only evaluates declared
colours, not perception), and confirming a tag opens correctly with the phone both locked and
unlocked.

---

## Roadmap

**Phase 1 — static hubs.** *(built and deployed; pending a real client and device verification)*
A configurable archetype on a shared engine, servable as plain files over HTTPS with no backend.
Ends when a real venue has its data in place, its tags written, and its pages live.

**Phase 2 — measurement.** *(requires explicit sign-off before work starts)*
A server-side redirector that records a tap and forwards to the real destination, turning the table
numbers already travelling in every tag into usable information: which venue, which table, which
entry, at what time. Phase 1 was built specifically so this is an addition rather than a rebuild —
same address, same tags, nothing re-programmed. It has not been started and will not be until it is
explicitly approved. Its limits are already written into the constitution: aggregate, anonymous,
single-site.

**Phase 3 — more venues.** *(potential)*
The engine already separates shared machinery from per-venue content, so a new venue is a data
folder, not a new project. The brake that used to exist — "a materially different venue needs its
archetype specified first" — is gone with the move to a generic archetype. What remains is a better
brake: a new venue is configured by picking from the catalog, and any value its owner has not
confirmed stays marked as pending until they do.

---

## Summary

Phase 1 is functionally complete, independently verified against its own specification, and
deployed. The engineering risk is low and concentrated in one identified place: the contact card's
behaviour on real iPhones. The work remaining before a real launch is mostly non-technical: getting
a venue, collecting its information, and settling a web address that becomes permanent from then
on.

The central design choice is that everything physical and expensive to change is decided once, and
everything else stays editable. That is what makes a second phase an addition rather than a
rebuild, and a second venue a folder rather than a project.
