import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

import { hubs, pendingCount } from "../lib/hubs";

/**
 * SC-010 / FR-023 - WCAG 2.2 AA on every hub, in whatever visual register it declares.
 *
 * Enumerated from src/businesses/ rather than a hardcoded pair: a new business instance is a
 * new folder, and it must clear the same accessibility floor as every other one. The nocturnal
 * register is where a contrast regression appears first, and it is not going to announce
 * itself in a spec that only knows about two named venues.
 *
 * ⚠ Limit worth naming (research.md D8): axe evaluates DECLARED colours. It cannot tell you
 * whether a nocturnal register is readable on a real phone in a dark room. That check is
 * manual and belongs to T039.
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const hub of hubs()) {
  test.describe(`${hub.slug} (${hub.data.register})`, () => {
    test("SC-010: no WCAG 2.2 AA violations", async ({ page }) => {
      await page.goto(`/${hub.slug}/`);
      await expect(page.locator(".entries__item").first()).toBeVisible();

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

      // Report the rule ids rather than a bare count, so a failure says what broke.
      expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual(
        [],
      );
    });

    test("FR-023: zero contrast and target-size failures specifically", async ({ page }) => {
      await page.goto(`/${hub.slug}/`);
      await expect(page.locator(".entries__item").first()).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withRules(["color-contrast", "target-size"])
        .analyze();

      // Prove the rules were actually EVALUATED. withRules() on an unknown rule id yields an
      // empty violations array, so "zero violations" would otherwise pass without axe having
      // checked anything at all.
      const evaluated = new Set(
        [
          ...results.violations,
          ...results.passes,
          ...results.incomplete,
          ...results.inapplicable,
        ].map((result) => result.id),
      );
      expect([...evaluated].sort()).toEqual(["color-contrast", "target-size"]);

      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });

    test("FR-023: the pending state survives without colour", async ({ page }) => {
      // A fully confirmed business has no pending entry to check. Skipping is honest here;
      // asserting over an empty set would report as green while checking nothing. The pending
      // path is exercised against rebuilt data in tests/e2e/data-swap.spec.ts, which includes
      // this same forced-colours assertion.
      test.skip(
        pendingCount(hub.data) === 0,
        `${hub.slug} has no pending entry - covered by tests/e2e/data-swap.spec.ts instead`,
      );

      await page.goto(`/${hub.slug}/`);

      // Every pending entry carries a text badge. Strip colour entirely and the state is
      // still readable - which is the actual requirement, not "the colours are distinct".
      await page.emulateMedia({ forcedColors: "active" });

      const pending = page.locator("[data-pending]");
      await expect(pending).toHaveCount(pendingCount(hub.data));

      const count = await pending.count();
      for (let i = 0; i < count; i += 1) {
        await expect(pending.nth(i).locator(".entry__badge")).toHaveText(/\S/);
      }
    });
  });
}
