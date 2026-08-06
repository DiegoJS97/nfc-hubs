import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

/**
 * SC-010 / FR-023 - WCAG 2.2 AA on both hubs, in both visual registers.
 *
 * Both registers are checked because FR-015 pushes them deliberately far apart, and the
 * nocturnal palette is exactly where a contrast regression would appear first.
 *
 * ⚠ Limit worth naming (research.md D8): axe evaluates DECLARED colours. It cannot tell you
 * whether the nocturnal register is readable on a real phone in a dark room. That check is
 * manual and belongs to T039.
 */
const HUBS = [
  { slug: "copas", register: "nocturnal" },
  { slug: "tapas", register: "daytime" },
];

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const hub of HUBS) {
  test.describe(`${hub.slug} (${hub.register})`, () => {
    test("SC-010: no WCAG 2.2 AA violations", async ({ page }) => {
      await page.goto(`/${hub.slug}/`);
      await expect(page.locator(".entries__item").first()).toBeVisible();

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

      // Report the rule ids rather than a bare count, so a failure says what broke.
      expect(
        results.violations.map((violation) => `${violation.id}: ${violation.help}`),
      ).toEqual([]);
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
      await page.goto(`/${hub.slug}/`);

      // Every pending entry carries a text badge. Strip colour entirely and the state is
      // still readable - which is the actual requirement, not "the colours are distinct".
      await page.emulateMedia({ forcedColors: "active" });

      const pending = page.locator("[data-pending]");
      const count = await pending.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i += 1) {
        await expect(pending.nth(i).locator(".entry__badge")).toHaveText(/\S/);
      }
    });
  });
}
