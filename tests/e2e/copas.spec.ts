import { test, expect } from "@playwright/test";

/**
 * User Story 1 - the cocktail-bar hub.
 *
 * Asserts the CUSTOMER-FACING labels in order rather than internal entry ids: SC-001 is a
 * claim about what someone sees after tapping a tag, and entry ids are never rendered.
 * The id sequence is separately enforced at build time by src/_data/validate.js.
 *
 * [ES] labels are quoted verbatim from FR-016 and must never be translated.
 */
const FR016_ENTRIES = [
  "Carta de cócteles",
  "Reservar mesa / zona VIP",
  "Playlist / Spotify",
  "Agenda de eventos / DJs",
  "Instagram",
  "Reseña Google",
  "WiFi",
];

test.describe("copas hub", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/copas/");

    // Precondition, not an assertion about behaviour: several tests below assert that
    // something is ABSENT (no vCard entry, no interactive WiFi). Those pass trivially on a
    // 404 or a blank page, so the hub must be proven to have rendered first.
    await expect(page.locator(".entries__item")).toHaveCount(FR016_ENTRIES.length);
  });

  test("SC-001: shows every FR-016 entry, in priority order", async ({ page }) => {
    const labels = await page.locator(".entries__item .entry__label").allTextContents();
    expect(labels.map((label) => label.trim())).toEqual(FR016_ENTRIES);
  });

  test("FR-017: has no save-contact entry", async ({ page }) => {
    await expect(page.locator(".entry--vcard")).toHaveCount(0);
    await expect(page.getByText("Guardar contacto")).toHaveCount(0);
  });

  test("SC-007: WiFi is inert text, not an interactive control", async ({ page }) => {
    const wifi = page.locator(".entry--wifi");
    await expect(wifi).toHaveCount(1);

    // Nothing inside it may be activatable, and it must not be focusable itself.
    await expect(wifi.locator("a, button, [role=button], [onclick]")).toHaveCount(0);
    expect(await wifi.getAttribute("tabindex")).toBeNull();
    expect(await wifi.evaluate((el) => el.tagName.toLowerCase())).toBe("div");
  });

  test("SC-002: pending entries show the notice and never navigate", async ({ page }) => {
    const pending = page.locator("[data-pending]");
    const count = await pending.count();

    // While every destination is a placeholder, all six actions must be pending. If this is
    // zero the test is silently passing on an empty set.
    expect(count).toBe(6);

    for (let i = 0; i < count; i += 1) {
      const entry = pending.nth(i);
      const urlBefore = page.url();

      await entry.click();

      expect(page.url()).toBe(urlBefore);

      const noticeId = await entry.getAttribute("aria-describedby");
      expect(noticeId).toBeTruthy();
      await expect(page.locator(`#${noticeId}`)).toBeVisible();
    }
  });

  test("FR-024: the pending state is perceivable without colour", async ({ page }) => {
    // Every pending entry carries a text badge, so the state survives greyscale and does not
    // depend on the theme's palette.
    const pending = page.locator("[data-pending]");
    const count = await pending.count();

    for (let i = 0; i < count; i += 1) {
      await expect(pending.nth(i).locator(".entry__badge")).toHaveText(/\S/);
    }
  });

  test("FR-023: the page language is Spanish", async ({ page }) => {
    expect(await page.locator("html").getAttribute("lang")).toBe("es");
  });
});
