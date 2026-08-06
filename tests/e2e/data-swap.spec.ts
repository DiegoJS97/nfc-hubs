import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { test, expect } from "@playwright/test";

/**
 * User Story 3 - confirming real data is a DATA edit (SC-004, FR-014).
 *
 * Substitutes one confirmed value, rebuilds, and checks that the entry flips from pending to
 * a real link. Nothing under src/_includes/ or src/_engine/ is touched, which is the whole
 * claim: the owner can go live by editing business.json and nothing else.
 *
 * The test mutates a tracked file and rebuilds, so it restores in a finally block. It also
 * runs on a single project - the behaviour is build-level rather than browser-level, and two
 * projects in parallel would race on the same file.
 */
const DATA = "src/businesses/tapas/business.json";
const SWAPPED_URL = "https://example.com/carta-confirmada";

/** 5 link entries + review + vCard. WiFi is never interactive. */
const PENDING_WHEN_ALL_PLACEHOLDER = 7;

test.describe("data swap", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "build-level behaviour; running both projects would race on business.json",
  );

  test("SC-004/FR-014: one value change moves an entry from pending to linked", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // Baseline: the menu entry is pending, like everything else.
    await page.goto("/tapas/");
    const firstEntry = page.locator(".entries__item").first();
    await expect(firstEntry.locator("[data-pending]")).toHaveCount(1);
    await expect(firstEntry.locator("a.entry--link")).toHaveCount(0);

    const original = readFileSync(DATA, "utf8");

    try {
      const data = JSON.parse(original);
      data.entries[0].url = SWAPPED_URL;
      writeFileSync(DATA, `${JSON.stringify(data, null, 2)}\n`, "utf8");

      execSync("npm run build", { stdio: "pipe" });
      await page.goto("/tapas/");

      // The entry is now a real link to the new destination...
      const swapped = page.locator(".entries__item").first();
      await expect(swapped.locator("a.entry--link")).toHaveAttribute("href", SWAPPED_URL);

      // ...and its pending affordance is gone entirely, not merely hidden.
      await expect(swapped.locator("[data-pending]")).toHaveCount(0);
      await expect(page.locator("#pending-menu")).toHaveCount(0);

      // Every other entry is untouched: the swap is scoped to the value that changed.
      await expect(page.locator("[data-pending]")).toHaveCount(PENDING_WHEN_ALL_PLACEHOLDER - 1);
    } finally {
      writeFileSync(DATA, original, "utf8");
      execSync("npm run build", { stdio: "pipe" });
    }

    // The transition is reversible and purely data-driven: putting the sentinel back restores
    // the pending state exactly.
    await page.goto("/tapas/");
    await expect(page.locator("[data-pending]")).toHaveCount(PENDING_WHEN_ALL_PLACEHOLDER);
    await expect(page.locator(".entries__item").first().locator("a.entry--link")).toHaveCount(0);
  });
});
