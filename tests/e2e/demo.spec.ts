import { test, expect } from "@playwright/test";

import { hubs, pendingCount, hasVcard } from "../lib/hubs";

/**
 * The generic archetype, rendered as a hub a prospect can be shown.
 *
 * `demo` is one INSTANCE of the archetype, not a business category: its entry set is chosen
 * in business.json and is not mandated anywhere. So this file asserts what a customer of THIS
 * venue sees, and deliberately does not assert a sequence any other business must copy.
 *
 * Its data is fully populated EXCEPT `placeId`, which is deliberately still the sentinel.
 * Inventing one would mean the review button files a review against a real, unrelated venue
 * and "Cómo llegar" navigates a prospect to a city the demo is not in - Constitution VII
 * exists for exactly that failure. Leaving it pending is honest, and it doubles as a live
 * demonstration of the pending state.
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

/** The two entries that depend on `placeId`, and so are pending together. */
const PENDING_LABELS = ["Cómo llegar", "Reseña Google"];

/** Confirmed destinations. WiFi is inert text and never an anchor. */
const CONFIRMED_LINKS = EXPECTED_LABELS.length - PENDING_LABELS.length - 1;

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

  test("exactly the place-ID-dependent entries are pending, and no sentinel text is rendered", async ({
    page,
  }) => {
    // Both directions: what the data implies, and what the page actually rendered. Asserting
    // only the page would let a data regression that also breaks rendering pass unnoticed.
    expect(pendingCount(demo.data)).toBe(PENDING_LABELS.length);

    const pending = page.locator("[data-pending]");
    await expect(pending).toHaveCount(PENDING_LABELS.length);
    expect(
      (await pending.locator(".entry__label").allTextContents()).map((label) => label.trim()),
    ).toEqual(PENDING_LABELS);

    // The sentinel marks data; it must never become something a customer reads.
    expect(await page.locator("body").innerText()).not.toContain("PLACEHOLDER");
  });

  test("every confirmed entry is a real link to a real destination", async ({ page }) => {
    const links = page.locator(".entries__item a.entry");
    await expect(links).toHaveCount(CONFIRMED_LINKS);

    const hrefs = await links.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href") ?? ""),
    );

    for (const href of hrefs) {
      expect(href).toMatch(/^https:\/\//);
      expect(href).not.toContain("PLACEHOLDER");
      expect(href).not.toContain("undefined");
    }

    expect(hrefs[0]).toBe(demo.data.entries[0].url);
  });

  test("FR-024: a pending entry shows its notice and navigates nowhere", async ({ page }) => {
    const pending = page.locator("[data-pending]");
    const count = await pending.count();
    expect(count).toBe(PENDING_LABELS.length);

    for (let i = 0; i < count; i += 1) {
      const entry = pending.nth(i);
      const urlBefore = page.url();

      await entry.click();
      expect(page.url()).toBe(urlBefore);

      const noticeId = await entry.getAttribute("aria-describedby");
      expect(noticeId).toBeTruthy();
      await expect(page.locator(`#${noticeId}`)).toBeVisible();

      // Perceivable beyond colour alone (FR-023): the state is carried by badge TEXT.
      await expect(entry.locator(".entry__badge")).toHaveText(/\S/);
    }
  });

  test("no entry points at a venue this business is not", async ({ page }) => {
    // The guard against the failure Constitution VII is about. While placeId is unconfirmed,
    // nothing on the page may resolve to a Google place or review destination - not through
    // the review entry, and not through a maps URL someone pasted in as a literal.
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));

    expect(hrefs.filter((href) => /google\.com\/maps|writereview|place_id/.test(href))).toEqual([]);
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
