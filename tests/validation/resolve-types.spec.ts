import { test, expect } from "@playwright/test";

import { resolveEntry, resolveHref } from "../../src/_data/resolve.js";

/**
 * The `maps` and `tel` entry types, which no business can declare yet.
 *
 * business-data.schema.json restricts entries[].type to link/review/wifi/vcard and lives under
 * specs/, which is governance-gated. So these two types are code-complete but unreachable from
 * data, and every browser-level spec in this repo is therefore blind to them - including the
 * Phase 2 seam guard, which can only see URLs that reach a built page.
 *
 * Testing them directly is the honest way to keep that work from rotting between now and the
 * schema approval. These run in Node; no page fixture is used.
 */
const PLACEHOLDER = "[PLACEHOLDER - replace]";

const business = (overrides: Record<string, unknown> = {}) => ({
  slug: "fixture",
  name: "Fixture",
  placeId: "PLACE-ID-1",
  contact: { phone: "+34 600 000 000", address: "Calle 1", website: "https://example.com/" },
  entries: [],
  ...overrides,
});

const MAPS_ENTRY = { id: "maps", label: "Cómo llegar", type: "maps" };
const TEL_ENTRY = { id: "tel", label: "Llamar", type: "tel" };

test.describe("maps entries", () => {
  test("confirm with placeId, and are pending while it is the sentinel", () => {
    expect(resolveEntry(MAPS_ENTRY, business())).toBe("confirmed");
    expect(resolveEntry(MAPS_ENTRY, business({ placeId: PLACEHOLDER }))).toBe("pending");
  });

  test("resolve to the place page, with the placeId url-encoded", () => {
    expect(resolveHref(MAPS_ENTRY, business())).toBe(
      "https://www.google.com/maps/place/?q=place_id:PLACE-ID-1",
    );

    // A place ID is opaque; encoding it means a future format cannot break the query string.
    expect(resolveHref(MAPS_ENTRY, business({ placeId: "a&b c" }))).toBe(
      "https://www.google.com/maps/place/?q=place_id:a%26b%20c",
    );
  });

  test("never hand a destination to a pending entry (FR-024)", () => {
    expect(() => resolveHref(MAPS_ENTRY, business({ placeId: PLACEHOLDER }))).toThrow(/pending/);
  });
});

test.describe("tel entries", () => {
  test("confirm with a phone, and are pending without one", () => {
    expect(resolveEntry(TEL_ENTRY, business())).toBe("confirmed");

    const sentinel = business({ contact: { phone: PLACEHOLDER, address: "x", website: "y" } });
    expect(resolveEntry(TEL_ENTRY, sentinel)).toBe("pending");

    // A missing contact block is a data error the schema should reject. Resolving it to
    // "pending" rather than throwing means the worst case is a notice, never tel:undefined.
    expect(resolveEntry(TEL_ENTRY, business({ contact: undefined }))).toBe("pending");
    expect(resolveEntry(TEL_ENTRY, business({ contact: {} }))).toBe("pending");
  });

  test("normalise the number into a tel: URI (RFC 3966 allows no spaces)", () => {
    expect(resolveHref(TEL_ENTRY, business())).toBe("tel:+34600000000");

    const local = business({ contact: { phone: "91 123 45 67", address: "x", website: "y" } });
    expect(resolveHref(TEL_ENTRY, local)).toBe("tel:911234567");

    const punctuated = business({
      contact: { phone: "+34 (600) 00-00-00", address: "x", website: "y" },
    });
    expect(resolveHref(TEL_ENTRY, punctuated)).toBe("tel:+34600000000");

    // The formatting stays in the data - only the href is normalised, never the label.
    expect(local.contact.phone).toBe("91 123 45 67");
  });

  test("never hand a destination to a pending entry (FR-024)", () => {
    const sentinel = business({ contact: { phone: PLACEHOLDER, address: "x", website: "y" } });
    expect(() => resolveHref(TEL_ENTRY, sentinel)).toThrow(/pending/);
  });
});

test("an unknown entry type fails loudly rather than rendering undefined behaviour", () => {
  expect(() => resolveEntry({ id: "x", label: "x", type: "carousel" }, business())).toThrow(
    /unknown entry type/,
  );
});
