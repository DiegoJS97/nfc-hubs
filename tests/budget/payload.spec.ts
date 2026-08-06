import { test, expect, type Response } from "@playwright/test";

/**
 * SC-008 / FR-022 / SC-007 - payload ceiling and third-party isolation.
 *
 * Measured against the BUILT output (see playwright.config.ts webServer), not the Eleventy
 * dev server, whose injected live-reload client and WebSocket would both corrupt these
 * numbers and hide a real regression.
 */
const BUDGET_BYTES = 100 * 1024;

const HUBS = ["copas", "tapas"];

for (const slug of HUBS) {
  test.describe(`${slug} budget`, () => {
    test(`SC-008: initial payload stays under ${BUDGET_BYTES / 1024} KB`, async ({ page }) => {
      const responses: Response[] = [];
      page.on("response", (response) => responses.push(response));

      await page.goto(`/${slug}/`);
      await page.waitForLoadState("networkidle");

      let total = 0;
      const breakdown: string[] = [];

      for (const response of responses) {
        let size = 0;
        try {
          size = (await response.body()).length;
        } catch {
          // Redirects and cached entries expose no body; they contribute nothing to weight.
          continue;
        }
        total += size;
        breakdown.push(`${new URL(response.url()).pathname} ${size}`);
      }

      console.log(`${slug} payload: ${total} bytes\n  ${breakdown.join("\n  ")}`);
      expect(total).toBeLessThanOrEqual(BUDGET_BYTES);
    });

    test("FR-022/SC-007: every request is first-party", async ({ page, baseURL }) => {
      const foreign: string[] = [];
      page.on("request", (request) => {
        if (new URL(request.url()).origin !== new URL(baseURL!).origin) {
          foreign.push(request.url());
        }
      });

      await page.goto(`/${slug}/`);
      await page.waitForLoadState("networkidle");

      // No web font, no analytics beacon, no CDN. A single entry here means a customer's tap
      // is being reported to somebody, which Phase 1 forbids outright.
      expect(foreign).toEqual([]);
    });

    test("SC-007: no visit counter or client-side storage is used", async ({ page }) => {
      await page.goto(`/${slug}/`);
      await page.waitForLoadState("networkidle");

      const stored = await page.evaluate(() => ({
        local: window.localStorage.length,
        session: window.sessionStorage.length,
        cookies: document.cookie,
      }));

      expect(stored).toEqual({ local: 0, session: 0, cookies: "" });
    });
  });
}

test("FR-017: the copas hub ships no vCard code at all", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(new URL(request.url()).pathname);
  });

  await page.goto("/copas/");
  await page.waitForLoadState("networkidle");

  expect(scripts).not.toContain("/_engine/vcard.js");
});
