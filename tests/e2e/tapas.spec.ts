import { readFileSync } from "node:fs";

import { test, expect } from "@playwright/test";

/**
 * User Story 2 - the gourmet-tapas hub.
 *
 * [ES] labels quoted verbatim from FR-018; never translate them.
 */
const FR018_ENTRIES = [
  "Carta",
  "Reservar mesa",
  "Para llevar / catering",
  "Reseña Google",
  "Newsletter / club de socios",
  "Instagram",
  "WiFi",
  "Guardar contacto",
];

/**
 * Five link entries + the review entry + the vCard entry. WiFi is never interactive, so it
 * is the one entry that never carries the pending affordance regardless of its data state.
 */
const EXPECTED_PENDING = 7;

test.describe("tapas hub", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tapas/");

    // Precondition: the assertions below about absent behaviour (no download, no
    // interactive WiFi) would all pass trivially against a 404.
    await expect(page.locator(".entries__item")).toHaveCount(FR018_ENTRIES.length);
  });

  test("SC-001: shows every FR-018 entry, in priority order", async ({ page }) => {
    const labels = await page.locator(".entries__item .entry__label").allTextContents();
    expect(labels.map((label) => label.trim())).toEqual(FR018_ENTRIES);
  });

  test("SC-007: WiFi is inert text, not an interactive control", async ({ page }) => {
    const wifi = page.locator(".entry--wifi");
    await expect(wifi).toHaveCount(1);

    await expect(wifi.locator("a, button, [role=button], [onclick]")).toHaveCount(0);
    expect(await wifi.getAttribute("tabindex")).toBeNull();
    expect(await wifi.evaluate((el) => el.tagName.toLowerCase())).toBe("div");
  });

  test("SC-002: pending entries show the notice and never navigate", async ({ page }) => {
    const pending = page.locator("[data-pending]");
    await expect(pending).toHaveCount(EXPECTED_PENDING);

    const count = await pending.count();
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

  test("FR-018: the save-contact entry exists and is last", async ({ page }) => {
    await expect(page.locator(".entry--vcard")).toHaveCount(1);

    const labels = await page.locator(".entries__item .entry__label").allTextContents();
    expect(labels[labels.length - 1].trim()).toBe("Guardar contacto");
  });

  test("SC-006/FR-020: while any contact value is a placeholder, no vCard is produced", async ({
    page,
  }) => {
    const vcard = page.locator(".entry--vcard");

    // All four values (name, phone, address, website) are the sentinel today, so the
    // all-or-nothing precondition must hold the entry in the pending state.
    await expect(vcard).toHaveAttribute("data-pending", /.*/);

    // A download firing here would mean a card containing placeholder text reached a
    // customer's address book - the exact outcome contracts/vcard.md forbids.
    const download = page.waitForEvent("download", { timeout: 1500 }).catch(() => null);

    await vcard.click();

    expect(await download).toBeNull();

    const noticeId = await vcard.getAttribute("aria-describedby");
    expect(noticeId).toBeTruthy();
    await expect(page.locator(`#${noticeId}`)).toBeVisible();
  });

  test("FR-023: the page language is Spanish", async ({ page }) => {
    expect(await page.locator("html").getAttribute("lang")).toBe("es");
  });

  /**
   * SC-006 confirmed path - exercises the SHIPPED src/_engine/vcard.js on the real page.
   *
   * The production data is all placeholders, so a confirmed trigger is injected rather than
   * rendered. That is an honest limit worth naming: this covers the generator (escaping,
   * CRLF, all four values, no network), NOT the confirmed branch of entry-vcard.njk, which
   * is verified separately by building with confirmed data.
   *
   * The values below deliberately contain the three characters RFC 2426 escaping exists for.
   */
  test("SC-006/FR-020: a confirmed contact produces a valid vCard with all four values", async ({
    page,
  }) => {
    const contact = {
      name: "Bar, Ejemplo; Tapas \\ SL",
      phone: "+34 600 000 000",
      address: "Calle Mayor, 1; 2º izq",
      website: "https://example.com/a,b",
    };

    await page.evaluate((data) => {
      const button = document.createElement("button");
      button.type = "button";
      button.id = "test-vcard-trigger";
      button.setAttribute("data-vcard", "");
      button.setAttribute("data-vcard-filename", "tapas.vcf");
      button.setAttribute("data-vcard-name", data.name);
      button.setAttribute("data-vcard-phone", data.phone);
      button.setAttribute("data-vcard-address", data.address);
      button.setAttribute("data-vcard-website", data.website);
      document.body.appendChild(button);
    }, contact);

    const downloadPromise = page.waitForEvent("download");
    await page.locator("#test-vcard-trigger").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("tapas.vcf");

    const path = await download.path();
    const vcf = readFileSync(path!, "utf8");

    expect(vcf.startsWith("BEGIN:VCARD\r\n")).toBe(true);
    expect(vcf).toContain("VERSION:3.0");
    expect(vcf.trimEnd().endsWith("END:VCARD")).toBe(true);

    // CRLF throughout: a bare LF would be a line ending some importers reject.
    expect(vcf).not.toMatch(/(?<!\r)\n/);

    // RFC 2426 escaping. An unescaped comma in the street address silently splits the field.
    expect(vcf).toContain("FN:Bar\\, Ejemplo\\; Tapas \\\\ SL");
    expect(vcf).toContain("ORG:Bar\\, Ejemplo\\; Tapas \\\\ SL");
    expect(vcf).toContain("TEL;TYPE=WORK,VOICE:+34 600 000 000");
    expect(vcf).toContain("ADR;TYPE=WORK:;;Calle Mayor\\, 1\\; 2º izq;;;;");
    expect(vcf).toContain("URL:https://example.com/a\\,b");

    // Nothing from the placeholder world may ever reach a contact card.
    expect(vcf).not.toContain("PLACEHOLDER");
  });
});
