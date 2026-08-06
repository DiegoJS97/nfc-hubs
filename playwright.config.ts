import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration - NFC Hubs Phase 1.
 *
 * Mobile-emulated projects ONLY. There is deliberately no desktop viewport:
 * real traffic is 100% mobile after an NFC tap (FR-009, Constitution VIII), so a
 * passing desktop run would be evidence about a case the product does not target.
 *
 * The server under test is the built _site/ output, not the Eleventy dev server -
 * the dev server injects a live-reload client that would inflate the payload
 * measured by tests/budget/ (SC-008).
 */
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "list" : "html",

  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },

  projects: [
    // iPhone -> WebKit. The iOS vCard path (D5) is the known-fragile assumption,
    // but emulation cannot settle it - T039 on real hardware does.
    { name: "iphone-webkit", use: { ...devices["iPhone 14"] } },

    // Pixel -> Chromium.
    { name: "pixel-chromium", use: { ...devices["Pixel 7"] } },
  ],

  webServer: {
    command: "npm run build && npm run serve",
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
