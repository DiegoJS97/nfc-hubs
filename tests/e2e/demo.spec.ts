import { test, expect } from "@playwright/test";

import { hubs, pendingCount, hasVcard } from "../lib/hubs";

/**
 * The generic archetype, rendered as a finished hub.
 *
 * `demo` is one INSTANCE of the archetype, not a business category: its entry set is chosen
 * in business.json and is not mandated anywhere. So this file asserts what a customer of THIS
 * venue sees, and deliberately does not assert a sequence any other business must copy.
 *
 * Every value in the data is confirmed, which makes the shape of the assertions different
 * from the old copas/tapas specs: there is nothing pending here, so the claim under test is
 * that every entry is a live destination. The pending behaviour (FR-024) is exercised by
 * tests/e2e/data-swap.spec.ts, which puts the sentinel back and rebuilds.
 *
 * [ES] labels are quoted verbatim and must never be translated.
 */
const EXPECTED_LABELS = [
  "Carta",
  "Reservar mesa",
  "Cómo llegar",
  "Instagram",
  "Reseña Google",
  "WiFi",
];

const demo = hubs().find((hub) => hub.slug === "demo")!;

test.describe("demo hub", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/");

    // Precondition, not a behavioural claim: several assertions below are about something
    // being ABSENT, and those pass trivially against a 404 or a blank page.
    await expect(page.locator(".entries__item")).toHaveCount(EXPECTED_LABELS.length);
  });

  test("SC-001: shows every entry of its own catalog, in the order the data defines", async ({
    page,
  }) => {
    const labels = await page.locator(".entries__item .entry__label").allTextContents();
    expect(labels.map((label) => label.trim())).toEqual(EXPECTED_LABELS);

    // The rendered order must be the array order in business.json - nothing sorts or filters.
    expect(demo.data.entries.map((entry) => entry.id)).toEqual([
      "menu",
      "reserve",
      "maps",
      "instagram",
      "review",
      "wifi",
    ]);
  });

  test("the demo is fully populated: no entry is pending and no sentinel reaches the page", async ({
    page,
  }) => {
    // Both directions: what the data implies, and what the page actually rendered. Asserting
    // only the page would let a data regression that also breaks rendering pass unnoticed.
    expect(pendingCount(demo.data)).toBe(0);

    await expect(page.locator("[data-pending]")).toHaveCount(0);
    await expect(page.locator(".entry__badge")).toHaveCount(0);
    expect(await page.locator("body").innerText()).not.toContain("PLACEHOLDER");
  });

  test("every actionable entry is a real link to a real destination", async ({ page }) => {
    // One anchor per entry except WiFi, which is inert text by design.
    const links = page.locator(".entries__item a.entry");
    await expect(links).toHaveCount(EXPECTED_LABELS.length - 1);

    const hrefs = await links.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href") ?? ""),
    );

    for (const href of hrefs) {
      expect(href).toMatch(/^https:\/\//);
      expect(href).not.toContain("PLACEHOLDER");
      expect(href).not.toContain("undefined");
    }

    expect(hrefs[0]).toBe("https://example.com/carta");
  });

  test("FR-006: the review entry uses the writereview format with the place ID", async ({
    page,
  }) => {
    const review = page.locator(".entries__item a.entry").nth(4);
    await expect(review).toHaveAttribute(
      "href",
      `https://search.google.com/local/writereview?placeid=${demo.data.placeId}`,
    );
  });

  test("the maps entry is a plain link to the place page, not a saved-list action", async ({
    page,
  }) => {
    const maps = page.locator(".entries__item a.entry").nth(2);

    // Asserted on the href rather than on the entry TYPE, so this keeps holding when the
    // entry flips from an interim `link` binding to the `maps` type after the schema enum is
    // approved. The destination is the contract; the binding is an implementation detail.
    const href = await maps.getAttribute("href");
    expect(href).toBe(
      `https://www.google.com/maps/place/?q=place_id:${demo.data.placeId}`,
    );

    // A link and nothing else: no web API can add a place to a Google saved list, so there
    // must be no script-driven control here pretending otherwise.
    await expect(maps).toHaveJSProperty("tagName", "A");
  });

  test("SC-007: WiFi is inert text, not an interactive control", async ({ page }) => {
    const wifi = page.locator(".entry--wifi");
    await expect(wifi).toHaveCount(1);

    await expect(wifi.locator("a, button, [role=button], [onclick]")).toHaveCount(0);
    expect(await wifi.getAttribute("tabindex")).toBeNull();
    expect(await wifi.evaluate((el) => el.tagName.toLowerCase())).toBe("div");

    // The network NAME is shown - and only the name. business.json has no password field.
    await expect(wifi.locator(".entry__value")).toHaveText(demo.data.wifiSsid);
  });

  test("the vCard module is opt-in and this instance does not opt in", async ({ page }) => {
    expect(hasVcard(demo.data)).toBe(false);
    await expect(page.locator(".entry--vcard")).toHaveCount(0);
  });

  test("FR-023: the page language is Spanish", async ({ page }) => {
    expect(await page.locator("html").getAttribute("lang")).toBe("es");
  });
});
