/*
 * In-browser vCard generation (FR-020, contracts/vcard.md, research.md D5).
 *
 * Runs entirely on the device: Blob -> object URL -> <a download> -> revoke. No network
 * request of any kind, to our own backend or anyone else's (FR-002, FR-022).
 *
 * This file is loaded ONLY by a hub that has a save-contact entry, and the entry is only
 * rendered in its confirmed form when all four values are real - so this code never sees a
 * placeholder. The all-or-nothing precondition is enforced at BUILD time by
 * resolve.resolveEntry(); it is deliberately not re-implemented here, because two copies of
 * that rule could disagree and the failure mode is a bad contact in a customer's phone.
 *
 * ⚠ ASSUMPTION TO VERIFY (Constitution VIII, T039): that this flow opens the OS contact
 * importer on iOS Safari and Android Chrome. iOS Safari is historically the fragile case for
 * programmatic downloads. This CANNOT be verified by emulation - only on real hardware. If
 * it fails on iOS, the static-.vcf fallback contradicts FR-020 and requires a spec
 * amendment, not a silent substitution.
 */
(function () {
  "use strict";

  /**
   * Escape a value per RFC 2426.
   *
   * Backslash MUST be escaped first, otherwise the backslashes introduced by the later
   * replacements would themselves be escaped. Without this, a comma in a street address
   * silently splits the field and the imported contact is wrong rather than obviously broken.
   */
  function escapeValue(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");
  }

  function buildVcard(data) {
    var lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:" + escapeValue(data.name),
      "ORG:" + escapeValue(data.name),
      "TEL;TYPE=WORK,VOICE:" + escapeValue(data.phone),
      "ADR;TYPE=WORK:;;" + escapeValue(data.address) + ";;;;",
      "URL:" + escapeValue(data.website),
      "END:VCARD",
    ];

    // CRLF, which RFC 2426 requires and some importers enforce strictly.
    return lines.join("\r\n") + "\r\n";
  }

  function download(filename, content) {
    var blob = new Blob([content], { type: "text/vcard;charset=utf-8" });
    var url = URL.createObjectURL(blob);

    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Revoke on the next tick rather than immediately: revoking synchronously can cancel the
    // download before the browser has finished reading the blob.
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 0);
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-vcard]");
    if (!trigger) return;

    download(trigger.getAttribute("data-vcard-filename"), buildVcard({
      name: trigger.getAttribute("data-vcard-name"),
      phone: trigger.getAttribute("data-vcard-phone"),
      address: trigger.getAttribute("data-vcard-address"),
      website: trigger.getAttribute("data-vcard-website"),
    }));
  });
})();
