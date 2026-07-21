# Contract: vCard output (tapas only)

**Feature**: `001-nfc-hubs-fase1` | **Requirements**: FR-020, SC-006

The tapas hub's [ES] "Guardar contacto" entry generates a contact card **in the browser**, with no
network request to any proprietary backend.

## Precondition — all four values confirmed

The vCard is produced only when **none** of these is `[PLACEHOLDER - replace]`:

`business.name`, `contact.phone`, `contact.address`, `contact.website`

If **any** is unconfirmed, the entry behaves as a pending entry (FR-024): it shows the pending notice
and generates nothing. A partial vCard is never produced — an address book entry is far harder for a
customer to undo than a failed tap.

## Format — vCard 3.0

- `VERSION:3.0`
- UTF-8 encoded
- **CRLF** (`\r\n`) line endings — RFC 2426 requires it and some importers are strict
- Filename: `<slug>.vcf`
- MIME type: `text/vcard`

```text
BEGIN:VCARD
VERSION:3.0
FN:<business.name>
ORG:<business.name>
TEL;TYPE=WORK,VOICE:<contact.phone>
ADR;TYPE=WORK:;;<contact.address>;;;;
URL:<contact.website>
END:VCARD
```

Commas, semicolons, and backslashes inside any value MUST be escaped per RFC 2426 (`\,` `\;` `\\`),
otherwise a comma in the street address silently splits the field.

## Delivery

Build a `Blob` with type `text/vcard`, create an object URL, trigger it via an `<a download="<slug>.vcf">`,
then revoke the object URL. No server round-trip, no third-party library.

## ⚠ Assumption to verify (Constitution VIII)

That this flow actually opens the OS contact importer on **iOS Safari** and **Android Chrome**. iOS
Safari is historically the fragile case for programmatic downloads. **This MUST be verified on real
devices before the tapas hub is accepted.**

If iOS Safari fails: the fallback is a pre-built static `.vcf` served as an ordinary link. Note that
this fallback **conflicts with FR-020's "generated dynamically in the browser"**, so taking it requires
amending the spec rather than quietly substituting the implementation.
