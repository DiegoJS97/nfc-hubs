import { fileURLToPath } from "node:url";

import { test, expect } from "@playwright/test";

import { validateBusiness } from "../../src/_data/validate.js";
import { parseJsonFile } from "../../scripts/lib/read-json.mjs";

/**
 * T032 - confirm the build actually refuses malformed business data, and says which field.
 *
 * The dangerous failure here is the quiet one. If a missing key or an empty string were
 * treated as "not the sentinel", the entry would resolve as CONFIRMED and send a customer to
 * `undefined`. Each case below proves that cannot happen silently.
 *
 * These run in Node, not a browser - no page fixture is used.
 */
const fixture = (name: string) =>
  parseJsonFile(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)));

function expectRejection(name: string, ...expectedFragments: string[]) {
  let message = "";
  try {
    validateBusiness(fixture(name), `tests/fixtures/${name}`, "copas");
    throw new Error(`ASSERTION: ${name} was accepted, but it must be rejected`);
  } catch (error) {
    message = (error as Error).message;
    if (message.startsWith("ASSERTION:")) throw error;
  }

  for (const fragment of expectedFragments) {
    expect(message).toContain(fragment);
  }

  return message;
}

test.describe("business.json validation", () => {
  /**
   * Positive control. Without this, every assertion below would still pass if
   * validateBusiness simply threw on everything.
   */
  test("accepts the real copas data", () => {
    const real = parseJsonFile(
      fileURLToPath(new URL("../../src/businesses/copas/business.json", import.meta.url)),
    );
    expect(() => validateBusiness(real, "src/businesses/copas/business.json", "copas")).not.toThrow();
  });

  test("rejects a missing required key, naming it", () => {
    expectRejection("missing-key.json", "placeId");
  });

  test("rejects an empty string rather than treating it as a placeholder", () => {
    expectRejection("empty-string.json", "wifiSsid", "empty string");
  });

  test("rejects null rather than treating it as a placeholder", () => {
    expectRejection("null-value.json", "placeId", "null");
  });

  test("rejects a near-miss sentinel that would otherwise read as confirmed", () => {
    // "[PLACEHOLDER - replace] " with a trailing space is NOT the sentinel, so isPlaceholder()
    // would call it confirmed and render the literal string as a destination.
    expectRejection("near-miss-sentinel.json", "wifiSsid", "looks like the placeholder");
  });

  test("rejects the correct entries in the wrong order", () => {
    expectRejection("wrong-order.json", "not in the order mandated");
  });

  test("rejects a renamed entry id, warning about Phase 2 route segments", () => {
    expectRejection("renamed-entry-id.json", "carta", "route segments");
  });
});
