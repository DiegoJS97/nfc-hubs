/**
 * The placeholder sentinel and entry resolution (data-model.md, FR-024).
 *
 * This module is the single place that answers "is this entry confirmed or pending?".
 * Both hubs and every partial go through it, so the visible marker (Constitution VII)
 * and the runtime behaviour (FR-024) cannot drift apart.
 */

/**
 * A field holding EXACTLY this string is unconfirmed.
 *
 * No other marker is valid. A missing key, an empty string, or null is a data ERROR,
 * not a placeholder - src/_data/validate.js fails the build on those, so a typo can
 * never quietly hide an entry (data-model.md).
 */
export const PLACEHOLDER = "[PLACEHOLDER - replace]";

/**
 * The Google "write review" URL format (FR-006, research.md D6).
 *
 * This lives in engine code rather than business.json on purpose: it is the same for
 * every business, and business-data.schema.json forbids a `url` key on review entries.
 * The only business-specific part is `placeId`, which IS in business.json - so changing
 * where a review points is still a data edit, never a code edit (FR-004, T038).
 *
 * NOTE (Constitution VIII): the exact format is an assumption to verify against a real
 * place ID before go-live. While placeId is a placeholder the entry renders as pending,
 * so this URL is never actually emitted yet.
 */
const REVIEW_URL_BASE = "https://search.google.com/local/writereview?placeid=";

/** The four values the tapas vCard needs, all-or-nothing (FR-020, contracts/vcard.md). */
const VCARD_REQUIRED = ["name", "phone", "address", "website"];

/**
 * True only for the exact sentinel.
 *
 * Deliberately strict: no trimming, no case-folding, no "looks like a placeholder"
 * heuristic. A value that is merely *similar* to the sentinel is a data error for
 * validate.js to catch, not something to silently treat as pending.
 */
export function isPlaceholder(value) {
  return value === PLACEHOLDER;
}

/**
 * Resolve an entry against its business: "confirmed" | "pending".
 *
 * Per the data-model.md resolution table. Note that a `wifi` entry gets a state like any
 * other entry - it says whether the SSID is known, and NEVER implies interactivity.
 * The wifi partial renders inert text either way (FR-007, Principle IV).
 */
export function resolveEntry(entry, business) {
  switch (entry.type) {
    case "link":
      return isPlaceholder(entry.url) ? "pending" : "confirmed";

    case "review":
      return isPlaceholder(business.placeId) ? "pending" : "confirmed";

    case "wifi":
      return isPlaceholder(business.wifiSsid) ? "pending" : "confirmed";

    case "vcard": {
      // All-or-nothing. A partially confirmed contact produces NO vCard, never a partial
      // one - an address book entry is far harder for a customer to undo than a failed tap.
      const values = {
        name: business.name,
        ...(business.contact ?? {}),
      };
      const allConfirmed = VCARD_REQUIRED.every(
        (field) => values[field] !== undefined && !isPlaceholder(values[field]),
      );
      return allConfirmed ? "confirmed" : "pending";
    }

    default:
      // Unreachable if validate.js ran first. Throwing beats rendering an entry whose
      // behaviour nobody defined.
      throw new Error(
        `resolveEntry: unknown entry type "${entry.type}" on entry "${entry.id}" ` +
          `(business "${business.slug}")`,
      );
  }
}

/**
 * The destination for a CONFIRMED entry, or null when the entry has no destination.
 *
 * Throws if called on a pending entry: that is a template bug, and a pending entry must
 * never be handed a href (FR-024 forbids navigating to a fake or dead destination).
 */
export function resolveHref(entry, business) {
  if (resolveEntry(entry, business) !== "confirmed") {
    throw new Error(
      `resolveHref: entry "${entry.id}" (business "${business.slug}") is pending and has ` +
        `no destination. Render it with the pending partial instead.`,
    );
  }

  switch (entry.type) {
    case "link":
      return entry.url;
    case "review":
      return REVIEW_URL_BASE + encodeURIComponent(business.placeId);
    default:
      // wifi is inert text; vcard is a local browser action. Neither navigates.
      return null;
  }
}

export default { PLACEHOLDER, isPlaceholder, resolveEntry, resolveHref };
