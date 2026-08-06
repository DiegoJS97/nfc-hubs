/**
 * The placeholder sentinel and entry resolution (data-model.md, FR-024).
 *
 * This module is the single place that answers "is this entry confirmed or pending?".
 * Every hub and every partial goes through it, so the visible marker (Constitution VII)
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

/**
 * The Google Maps "place" URL format, for the `maps` entry type.
 *
 * Same reasoning as REVIEW_URL_BASE and the same trade-off: the template is identical for
 * every business, so it is engine code, while the only business-identifying part - `placeId`
 * - stays in business.json. Pointing a hub at a different place is still a data edit.
 *
 * This is deliberately a plain link to the place page. There is no web API that adds a place
 * to someone's Google saved list, so the hub must not pretend to; the customer saves it
 * themselves from the page this opens.
 *
 * NOTE (Constitution VIII): like the writereview format, the exact URL shape is an assumption
 * to verify against a real place ID before go-live.
 */
const MAPS_URL_BASE = "https://www.google.com/maps/place/?q=place_id:";

/** The four values a vCard needs, all-or-nothing (FR-020, contracts/vcard.md). */
const VCARD_REQUIRED = ["name", "phone", "address", "website"];

/**
 * Reduce a display phone number to the digits (and leading +) a `tel:` URI may contain.
 *
 * business.json holds the number as a human writes it ("+34 600 000 000"); RFC 3966 does not
 * allow spaces in the URI. Formatting stays in the data and is what the customer reads on the
 * label; only the href is normalised.
 */
function toTelUri(phone) {
  const digits = String(phone).replace(/[^\d]/g, "");
  return `tel:${String(phone).trimStart().startsWith("+") ? "+" : ""}${digits}`;
}

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

    // Both `review` and `maps` are parameterised by the same placeId, so they confirm
    // together. There is no second field to keep in sync and nothing to get half-right.
    case "maps":
      return isPlaceholder(business.placeId) ? "pending" : "confirmed";

    case "tel": {
      // A missing `contact` block is a data error the schema should reject, but resolving it
      // to "pending" rather than throwing means the worst case is an entry that shows the
      // notice - never `tel:undefined` in a customer's dialler.
      const phone = business.contact?.phone;
      return phone !== undefined && !isPlaceholder(phone) ? "confirmed" : "pending";
    }

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
    case "maps":
      return MAPS_URL_BASE + encodeURIComponent(business.placeId);
    case "tel":
      return toTelUri(business.contact.phone);
    default:
      // wifi is inert text; vcard is a local browser action. Neither navigates.
      return null;
  }
}

/**
 * Does this business have a save-contact entry?
 *
 * The save-contact feature is an OPTIONAL module of the archetype, not a property of a
 * business category: a hub gets it by declaring a `vcard` entry and by nothing else. This
 * predicate is what lets a hub without one ship none of that code, keeping its payload at
 * the FR-022 minimum.
 */
export function hasVcard(business) {
  return (business.entries ?? []).some((entry) => entry.type === "vcard");
}

export default { PLACEHOLDER, isPlaceholder, resolveEntry, resolveHref, hasVcard };
