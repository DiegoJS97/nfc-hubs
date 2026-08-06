/*
 * Pending-entry behaviour (FR-024).
 *
 * Tapping an entry whose destination is not yet confirmed reveals an inline notice in
 * Spanish instead of navigating. The entry is a <button type="button">, so there is no
 * navigation to prevent - the button simply has no destination to go to.
 *
 * Constraints this file exists under:
 *   - NO localStorage, NO sessionStorage, no counters of any kind (FR-012, Constitution III)
 *   - no network request, no beacon, no third-party anything (FR-022)
 *   - the ?m=<table> parameter is never read, stored, or transmitted (FR-021)
 *
 * This is the entire client-side runtime of a hub with no vCard entry.
 */
(function () {
  "use strict";

  // Delegated: one listener for the whole list, and it keeps working regardless of how many
  // entries a business has.
  document.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-pending]");
    if (!trigger) return;

    var noticeId = trigger.getAttribute("aria-describedby");
    if (!noticeId) return;

    var notice = document.getElementById(noticeId);
    if (!notice) return;

    // The notice is already in the markup; revealing it (rather than injecting text) is what
    // makes role="status" announce it to assistive technology.
    notice.hidden = false;
  });
})();
