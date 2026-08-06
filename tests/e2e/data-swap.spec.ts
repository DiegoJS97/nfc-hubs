import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { test, expect } from "@playwright/test";

import { hubs, pendingCount } from "../lib/hubs";

/**
 * Confirming (and un-confirming) real data is a DATA edit - SC-004, FR-014, FR-024.
 *
 * This runs in the opposite direction from the version it replaces. The demo instance is
 * fully populated, so the interesting move is putting the sentinel BACK: the entry must fall
 * out of the confirmed state into the pending one, show its notice instead of navigating, and
 * then return to a live link when the real value is restored - all without touching a single
 * file under src/_includes/ or src/_engine/.
 *
 * That direction also keeps FR-024 covered. With no placeholders left in the shipped data,
 * this is now the only place the pending path is exercised end to end, including the
 * requirement that the state be perceivable without colour (FR-023).
 *
 * The test mutates a tracked file and rebuilds, so it restores in a finally block, and runs
 * on a single project - two projects in parallel would race on the same file.
 */
const demo = hubs().find((hub) => hub.slug === "demo")!;

const PLACEHOLDER = "[PLACEHOLDER - replace]";
const CONFIRMED_URL = demo.data.entries[0].url!;

/**
 * The demo does not start from zero pending entries: `placeId` is deliberately unconfirmed.
 * Both counts are derived rather than written down, so this test keeps measuring a DELTA of
 * exactly one entry however the demo's data changes.
 */
const BASELINE_PENDING = pendingCount(demo.data);
const BASELINE_LINKS = demo.data.entries.filter(
  (entry) => entry.type !== "wifi" && entry.url !== PLACEHOLDER && entry.type === "link",
).length;

test.describe("data swap", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "build-level behaviour; running both projects would race on business.json",
  );

  test("SC-004/FR-014/FR-024: one value moves an entry between linked and pending", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // Baseline: the first entry is a live link, alongside whatever is already pending.
    await page.goto("/demo/");
    const baseline = page.locator(".entries__item").first();
    await expect(baseline.locator("a.entry--link")).toHaveAttribute("href", CONFIRMED_URL);
    await expect(page.locator("[data-pending]")).toHaveCount(BASELINE_PENDING);

    const original = readFileSync(demo.dataPath, "utf8");

    try {
      const data = JSON.parse(original);
      data.entries[0].url = PLACEHOLDER;
      writeFileSync(demo.dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

      execSync("npm run build", { stdio: "pipe" });
      await page.goto("/demo/");

      const swapped = page.locator(".entries__item").first();

      // The link is gone entirely, not merely styled differently...
      await expect(swapped.locator("a.entry--link")).toHaveCount(0);

      // ...and the entry still occupies its priority position, with its own label (FR-024).
      const pending = swapped.locator("[data-pending]");
      await expect(pending).toHaveCount(1);
      await expect(pending.locator(".entry__label")).toHaveText(demo.data.entries[0].label);

      // Exactly one entry changed state: the swap is scoped to the value that changed.
      await expect(page.locator("[data-pending]")).toHaveCount(BASELINE_PENDING + 1);
      await expect(page.locator(".entries__item a.entry")).toHaveCount(BASELINE_LINKS - 1);

      // FR-024: tapping shows the notice and navigates nowhere.
      const urlBefore = page.url();
      await pending.click();
      expect(page.url()).toBe(urlBefore);

      const noticeId = await pending.getAttribute("aria-describedby");
      expect(noticeId).toBeTruthy();
      await expect(page.locator(`#${noticeId}`)).toBeVisible();

      // FR-023: strip colour entirely and the state is still readable, because it is carried
      // by badge TEXT rather than by the palette.
      await page.emulateMedia({ forcedColors: "active" });
      await expect(pending.locator(".entry__badge")).toHaveText(/\S/);
      await page.emulateMedia({ forcedColors: "none" });
    } finally {
      writeFileSync(demo.dataPath, original, "utf8");
      execSync("npm run build", { stdio: "pipe" });
    }

    // Fully reversible and purely data-driven: the real value returns the live link, and the
    // pending affordance disappears rather than lingering hidden.
    await page.goto("/demo/");
    await expect(page.locator(".entries__item").first().locator("a.entry--link")).toHaveAttribute(
      "href",
      CONFIRMED_URL,
    );
    await expect(page.locator("[data-pending]")).toHaveCount(BASELINE_PENDING);
    await expect(page.locator("#pending-menu")).toHaveCount(0);
  });
});
