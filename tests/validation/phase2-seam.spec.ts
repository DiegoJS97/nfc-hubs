import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { test, expect } from "@playwright/test";

/**
 * T038 as a permanent guard - every destination resolves from business.json alone.
 *
 * The task asked for verification by inspection, which proves the seam holds today but not
 * that it keeps holding. A future change could hardcode a destination in a template and every
 * other test would still pass, because the suite checks BEHAVIOUR and a hardcoded link
 * behaves perfectly - right up until Phase 2 tries to reroute it and has to edit markup
 * instead of one expression (FR-004, Constitution III).
 *
 * Two methods, because either alone is weak:
 *   1. no external URL literal may appear in src/ except the documented exception
 *   2. every url in the BUILT output must trace to a value that came from business.json
 *
 * Method 2 matters because grep cannot see a destination assembled at runtime from fragments.
 *
 * Mutates the data files and rebuilds, so it restores in a finally block and runs on a single
 * project - two would race on the same files.
 */
const DATA: Record<string, string> = {
  copas: "src/businesses/copas/business.json",
  tapas: "src/businesses/tapas/business.json",
};

const HTML: Record<string, string> = {
  copas: "_site/copas/index.html",
  tapas: "_site/tapas/index.html",
};

/** The one permitted external literal (FR-006, research.md D6). */
const REVIEW_BASE = "https://search.google.com/local/writereview?placeid=";

/** Marker host, so a destination that came from data is self-identifying in the output. */
const TRACER = "traced.example";

function traceify(raw: string, slug: string) {
  const data = JSON.parse(raw);
  data.name = `Traced Name ${slug}`;
  data.wifiSsid = `TRACED-SSID-${slug}`;
  data.placeId = `TRACED-PLACEID-${slug}`;
  if (data.contact) {
    data.contact.phone = `TRACED-PHONE-${slug}`;
    data.contact.address = `TRACED-ADDRESS-${slug}`;
    data.contact.website = `https://${TRACER}/${slug}/contact-website`;
  }
  for (const entry of data.entries) {
    if (entry.type === "link") entry.url = `https://${TRACER}/${slug}/${entry.id}`;
  }
  return `${JSON.stringify(data, null, 2)}\n`;
}

test.describe("Phase 2 seam", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "rebuilds the site; running both projects would race on the data files",
  );

  test("T038: no external URL literal in src/ except the writereview template", () => {
    // Ripgrep is not assumed; the scan is done in Node so this works anywhere.
    const offenders = execSync(
      'git ls-files "src/**/*.njk" "src/**/*.js" "src/**/*.css"',
      { encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean)
      .flatMap((file) => {
        const matches = readFileSync(file, "utf8").match(/https?:\/\/[^\s"'`]+/g) ?? [];
        return matches
          .filter((url) => !REVIEW_BASE.startsWith(url) && !url.startsWith(REVIEW_BASE))
          .map((url) => `${file}: ${url}`);
      });

    expect(offenders).toEqual([]);
  });

  test("T038: every url in the built output traces to business.json", () => {
    test.setTimeout(120_000);

    const originals = Object.fromEntries(
      Object.entries(DATA).map(([slug, path]) => [slug, readFileSync(path, "utf8")]),
    );

    const untraceable: string[] = [];
    const fromData: string[] = [];

    try {
      for (const [slug, path] of Object.entries(DATA)) {
        writeFileSync(path, traceify(originals[slug], slug), "utf8");
      }
      execSync("npm run build", { stdio: "pipe" });

      for (const [slug, htmlPath] of Object.entries(HTML)) {
        const html = readFileSync(htmlPath, "utf8");

        // Every href/src, plus any absolute url anywhere - including data- attributes, which
        // is where the vCard values live.
        const urls = new Set([
          ...[...html.matchAll(/(?:href|src)="([^"]*)"/g)].map((m) => m[1]),
          ...[...html.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((m) => m[0]),
        ]);

        for (const url of urls) {
          if (url.includes(TRACER)) {
            fromData.push(url);
          } else if (url.startsWith(REVIEW_BASE) && url.includes(`TRACED-PLACEID-${slug}`)) {
            // Documented exception: the template is engine code, the placeId is data.
          } else if (/^\/(_engine|businesses)\//.test(url) || url.startsWith("#")) {
            // First-party asset or in-page anchor - not a business destination.
          } else {
            untraceable.push(`${slug}: ${url}`);
          }
        }
      }

      // Guard against a vacuous pass: every link entry defined in the real data must have
      // surfaced as a traced url. Without this the test would pass on an empty page.
      const expected = Object.entries(originals).flatMap(([slug, raw]) =>
        JSON.parse(raw)
          .entries.filter((entry: { type: string }) => entry.type === "link")
          .map((entry: { id: string }) => `https://${TRACER}/${slug}/${entry.id}`),
      );
      expect(fromData.sort()).toEqual(expect.arrayContaining(expected.sort()));

      expect(untraceable).toEqual([]);
    } finally {
      for (const [slug, path] of Object.entries(DATA)) {
        writeFileSync(path, originals[slug], "utf8");
      }
      execSync("npm run build", { stdio: "pipe" });
    }
  });
});
