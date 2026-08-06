import { test, expect } from "@playwright/test";

import { hubs } from "../lib/hubs";

/**
 * SC-008 - essential content visible within budget on a throttled connection.
 *
 * "Essential content" is read literally from the spec: the business identity and the FULL
 * list of entries. The measurement therefore waits for the LAST entry, not for first paint -
 * a hub whose header renders instantly but whose list arrives late has not met the criterion.
 * The entry count comes from each business's own data, so a hub with a longer list is still
 * measured to its own last entry.
 *
 * ⚠ Chromium only. Network and CPU throttling go through CDP, which WebKit does not expose,
 * so this cannot be measured on the emulated iPhone. That is a real coverage gap: iOS Safari
 * timing on a degraded venue connection is unverified here and belongs with the T039 device
 * checks.
 */

/** Chrome DevTools "Fast 4G": 4 Mbit/s down, 3 Mbit/s up, 20 ms RTT. */
const TYPICAL_4G = {
  offline: false,
  downloadThroughput: (4 * 1024 * 1024) / 8,
  uploadThroughput: (3 * 1024 * 1024) / 8,
  latency: 20,
};

/** A busy venue: little bandwidth and a long round trip. */
const DEGRADED = {
  offline: false,
  downloadThroughput: (400 * 1024) / 8,
  uploadThroughput: (400 * 1024) / 8,
  latency: 400,
};

/** Mid-range phone rather than a development machine. */
const CPU_SLOWDOWN = 4;

async function measure(
  page: import("@playwright/test").Page,
  slug: string,
  entryCount: number,
  conditions: object,
) {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", conditions);
  await client.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });

  const started = Date.now();
  await page.goto(`/${slug}/`, { waitUntil: "commit" });
  await page
    .locator(".entries__item")
    .nth(entryCount - 1)
    .waitFor({ state: "visible" });

  return Date.now() - started;
}

test.describe("load timing", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "network throttling requires CDP, which WebKit does not expose",
  );

  for (const hub of hubs()) {
    const entryCount = hub.data.entries.length;

    test(`SC-008: ${hub.slug} essential content visible within 1.5s on typical 4G`, async ({
      page,
    }) => {
      const elapsed = await measure(page, hub.slug, entryCount, TYPICAL_4G);
      console.log(`${hub.slug} @ typical 4G: ${elapsed} ms`);
      expect(elapsed).toBeLessThanOrEqual(1500);
    });

    test(`SC-008: ${hub.slug} essential content visible within 3s on a degraded connection`, async ({
      page,
    }) => {
      const elapsed = await measure(page, hub.slug, entryCount, DEGRADED);
      console.log(`${hub.slug} @ degraded: ${elapsed} ms`);
      expect(elapsed).toBeLessThanOrEqual(3000);
    });
  }
});
