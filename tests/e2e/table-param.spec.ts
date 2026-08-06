import { test, expect } from "@playwright/test";

/**
 * SC-009 / FR-021 - the table identifier parameter changes nothing in Phase 1.
 *
 * The parameter exists in the URL only so Phase 2 can attribute a tap to its table without
 * anyone physically rewriting the tags (contracts/hub-url.md). Phase 1 must not read,
 * render, store, or transmit it.
 *
 * T023 extends this file with the same four variants for tapas.
 */

/** An improbable token, so "the parameter is not displayed" is a meaningful assertion. */
const TOKEN = "ZZTOKEN99";

function variantsFor(slug: string) {
  return [`/${slug}/?m=12`, `/${slug}/?m=`, `/${slug}/?m=zzz`, `/${slug}/`];
}

/**
 * Prove the hub actually rendered before asserting that something is absent from it.
 * "The token is not displayed" and "nothing was stored" both pass trivially against a 404.
 */
async function expectHubRendered(page: import("@playwright/test").Page) {
  await expect(page.locator("main .entries__item").first()).toBeVisible();
}

test.describe("table parameter - copas", () => {
  test("SC-009: renders identically with, without, empty, and unknown ?m=", async ({ page }) => {
    const renders: string[] = [];

    for (const url of variantsFor("copas")) {
      await page.goto(url);
      renders.push(await page.locator("main").innerHTML());
    }

    for (const render of renders) {
      expect(render).toBe(renders[0]);
    }
  });

  test("FR-021: the parameter value is never displayed", async ({ page }) => {
    await page.goto(`/copas/?m=${TOKEN}`);
    await expectHubRendered(page);
    expect(await page.locator("body").innerText()).not.toContain(TOKEN);
  });

  test("FR-012/FR-021: nothing is persisted client-side", async ({ page }) => {
    await page.goto(`/copas/?m=${TOKEN}`);
    await expectHubRendered(page);

    const stored = await page.evaluate(() => ({
      local: window.localStorage.length,
      session: window.sessionStorage.length,
      cookies: document.cookie,
    }));

    expect(stored.local).toBe(0);
    expect(stored.session).toBe(0);
    expect(stored.cookies).toBe("");
  });
});
