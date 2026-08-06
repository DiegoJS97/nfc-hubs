# T039 — Real-Device Checks

Four checks that cannot be automated. Each one covers a claim the test suite is structurally
unable to make: emulated WebKit is not an iPhone, and axe cannot see a dark room.

**Time needed:** ~30 minutes, plus tag-writing.
**You need:** an iPhone, an Android phone, one blank NFC tag, a tag-writing app
(NFC Tools or similar), and a genuinely dark room.

Record results in the table at the end and commit it.

---

## Setup

### 1. Serve the hubs somewhere your phone can reach

Nothing is deployed yet, so serve from this machine over your local network.

```bash
npm run build
npm run serve            # binds all interfaces on port 8080
```

Find this machine's LAN address:

```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' }).IPAddress
```

Your phone then opens `http://<that-address>:8080/copas/`. Both devices must be on the same
network, and Windows Firewall may prompt to allow Node — allow it for private networks.

> ⚠ **This is HTTP, not HTTPS.** Good enough for checks 1–3. If check 1 fails over HTTP, retry
> after deployment before concluding the vCard flow is broken — browsers restrict some
> behaviour in non-secure contexts, and that would be a false negative.

### 2. Temporary contact data (required for checks 1 and 2 only)

Every value is currently a placeholder, so **"Guardar contacto" shows the pending notice and
generates nothing** — that is correct behaviour, not a bug. To exercise the vCard path you must
temporarily confirm the four values.

Edit `src/businesses/tapas/business.json` and replace the four placeholders. Use values that
deliberately contain a comma and a semicolon, so the check also exercises escaping:

```json
  "name": "Restaurante Ejemplo, Tapas SL",
  "contact": {
    "phone": "+34 600 000 000",
    "address": "Calle Mayor, 1; 2º izq, Madrid",
    "website": "https://example.com"
  },
```

Then `npm run build` and restart `npm run serve`.

> ⚠ **Revert immediately after checks 1 and 2.** Invented data must never be committed
> (Constitution VII):
>
> ```bash
> git checkout src/businesses/tapas/business.json && npm run build
> npm run audit:placeholders    # must report 19 again
> ```

---

## Check 1 — iOS Safari vCard import ⚠ THE CRITICAL ONE

This is the project's one unresolved technical risk (research.md D5).

1. On the **iPhone**, open **Safari** (not Chrome, not an in-app browser) at
   `http://<address>:8080/tapas/`
2. Confirm the last entry reads [ES] **"Guardar contacto"** and is **not** showing a
   "Pendiente" badge. If it still shows the badge, the setup step above did not take effect —
   rebuild and reload.
3. Tap it.

**PASS** requires all of:

- iOS offers the file or opens Contacts directly — not a blank tab, not a silent no-op
- the **"Add Contact"** screen appears, in Contacts
- all four values are present and correct: business name, phone, address, website
- the address reads as one field — **`Calle Mayor, 1; 2º izq, Madrid`**, not split across
  fields or truncated at the comma
- no stray backslashes appear in any field

**Record on failure — this determines what happens next:**

| Symptom | What it means |
|---|---|
| Nothing happens at all | The Blob/`download` flow is not supported. **This is the D5 failure.** |
| File downloads to Files but Contacts never opens | Partial support; may be acceptable, your call |
| Contacts opens but fields are missing | Generation bug in `vcard.js`, not a platform issue |
| Address split at the comma, or `\,` visible | RFC 2426 escaping bug in `vcard.js` |

Also record: **iOS version**, and whether you tapped from Safari directly or from a link
opened inside another app.

> ⚠ **If this fails outright:** the fallback is a pre-built static `.vcf` served as an ordinary
> link. That **contradicts FR-020**, which mandates in-browser generation. It requires a spec
> amendment, not a silent substitution (`contracts/vcard.md`). Report the failure and stop —
> do not let anyone quietly swap the implementation.

---

## Check 2 — Android Chrome vCard import

1. On the **Android phone**, open **Chrome** at `http://<address>:8080/tapas/`
2. Tap [ES] **"Guardar contacto"**

**PASS:** the file downloads and opening it offers to import into Contacts, with all four
values correct and the address intact as a single field.

Record the same details as check 1, plus the **Android version**.

Android is historically the reliable case here. A failure would suggest a generation bug rather
than a platform limitation — check whether iOS failed the same way.

---

## Check 3 — Nocturnal contrast in a dark room

Automated contrast checks evaluate *declared* colours. They cannot tell you whether the design
is comfortable for a real eye, dark-adapted, at low screen brightness (research.md D8).

1. Revert the test data first (see Setup 2) so the hub shows its real pending state
2. Go into a genuinely dark room. Let your eyes adjust for a minute or two
3. Set the phone to the brightness you would actually use at a bar table — **low**, not
   auto-maximum
4. Open `http://<address>:8080/copas/`

**PASS** requires all of:

- every entry label is readable without squinting or raising brightness
- the [ES] "Pendiente" badge is legible, not just a smudge
- the screen is not uncomfortably bright — a nocturnal design that dazzles has failed even if
  its contrast ratios are perfect
- the focus outline is visible when tabbing (use a Bluetooth keyboard if you have one; skip if
  not)

Then open `/tapas/` alongside it and answer one question:

- **Do these read as two different businesses, or one template in two colours?**
  This is SC-005, and it is a human judgement no test can make.

Record: readable yes/no, too bright yes/no, and your one-line answer on distinctness.

---

## Check 4 — Real NFC tap, locked and unlocked

Requires a reachable URL. If still on the LAN address, use a **throwaway tag** and mark it for
rewriting — do **not** program venue tags until the production host is final
(`contracts/hub-url.md`).

1. With a tag-writing app, write a **URL / URI record**:
   `http://<address>:8080/copas/?m=1`
   (after deployment: `https://<production-host>/copas/?m=1`)
2. **Unlocked test:** phone unlocked, screen on, hold it to the tag
3. **Locked test:** lock the phone, screen off, hold it to the tag
4. Repeat both on the second phone

**PASS** requires, for each phone and each state:

- the phone reacts to the tag within about a second
- the hub opens — either directly or via a single notification tap
- no extra steps beyond the OS's normal flow (FR-010)
- the page looks identical to opening it by typing the URL; the `?m=1` is **nowhere visible**
  (SC-009)

**Record on failure:**

- which phone, and which state (locked / unlocked) failed
- whether nothing happened, or a notification appeared but did not open
- whether NFC is enabled in settings (Android can have it off; iPhones from XS onward read tags
  in the background, older models need Control Centre)

Older iPhones and some Android models do not scan while locked. That is a hardware limitation
worth recording as a known constraint, not a defect to fix in this codebase.

---

## Results

| # | Check | Result | Device / OS | Notes |
|---|-------|--------|-------------|-------|
| 1 | iOS Safari vCard | ⬜ pass / ⬜ fail | | |
| 2 | Android Chrome vCard | ⬜ pass / ⬜ fail | | |
| 3a | Nocturnal readable in the dark | ⬜ pass / ⬜ fail | | |
| 3b | Two distinct identities (SC-005) | ⬜ pass / ⬜ fail | | |
| 4a | NFC tap, unlocked | ⬜ pass / ⬜ fail | | |
| 4b | NFC tap, locked | ⬜ pass / ⬜ fail | | |

**Before finishing, confirm the repository is clean:**

```bash
npm run audit:placeholders    # must report 19 values
git status                    # no modified business.json
```

Then fill in this table, commit it, and tick T039 in `tasks.md`.

Check 1 is the one that can change the plan. Everything else either passes or produces a
documented constraint.
