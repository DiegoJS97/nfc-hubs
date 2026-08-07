import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { test, expect } from "@playwright/test";

import { PATH_PREFIX } from "../../scripts/lib/path-prefix.mjs";
import { hubs } from "../lib/hubs";

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
 *   1. no external URL literal may appear in src/ except the documented templates
 *   2. every url in the BUILT output must trace to a value that came from business.json
 *
 * Method 2 matters because grep cannot see a destination assembled at runtime from fragments.
 *
 * Mutates the data files and rebuilds, so it restores in a finally block. It lives in
 * tests/rebuild/, which npm run test invokes last and with --workers=1: rewriting every
 * business.json and rebuilding _site/ while any page-reading spec is running is a race, and
 * this file and data-swap.spec.ts would otherwise also race against each other.
 */

/**
 * The permitted external literals, and why each one is engine code rather than data.
 *
 * Both are URL TEMPLATES that are identical for every business, parameterised by `placeId`,
 * which IS in business.json. business-data.schema.json forbids a `url` key on these entry
 * types precisely so there is one place to change the format. Pointing either at a different
 * venue is still a data edit.
 *
 * This list is an allowlist, not a pattern: adding to it is a deliberate act that shows up in
 * review, which is the whole point of the guard.
 */
const ALLOWED_TEMPLATES = [
  "https://search.google.com/local/writereview?placeid=",
  "https://www.google.com/maps/place/?q=place_id:",
];

/** Marker host, so a destination that came from data is self-identifying in the output. */
const TRACER = "traced.example";

/**
 * A traceable phone number, and the tel: href it must normalise to.
 *
 * Distinctive DIGITS rather than a "TRACED-..." marker, because resolve.js strips everything
 * but the digits when it builds the URI - a word marker would vanish and the href would be
 * untraceable for the wrong reason.
 */
const TRACER_PHONE = "+34 555 000 111";
const TRACER_TEL_HREF = "tel:+34555000111";

function traceify(raw: string, slug: string) {
  const data = JSON.parse(raw);
  data.name = `Traced Name ${slug}`;
  data.wifiSsid = `TRACED-SSID-${slug}`;
  data.placeId = `TRACED-PLACEID-${slug}`;
  if (data.contact) {
    data.contact.phone = TRACER_PHONE;
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
    "build-level behaviour: the built output and the src/ scan are browser-independent, so a " +
      "second project would double the build time and prove nothing new",
  );

  test("T038: no external URL literal in src/ except the documented templates", () => {
    // Ripgrep is not assumed; the scan is done in Node so this works anywhere.
    const offenders = execSync('git ls-files "src/**/*.njk" "src/**/*.js" "src/**/*.css"', {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean)
      .flatMap((file) => {
        const matches = readFileSync(file, "utf8").match(/https?:\/\/[^\s"'`]+/g) ?? [];
        return matches
          .filter(
            (url) =>
              // Either the literal is one of the templates, or it is a prefix of one (the
              // regex stops at a quote, so a template split across a line still matches).
              !ALLOWED_TEMPLATES.some(
                (template) => template.startsWith(url) || url.startsWith(template),
              ),
          )
          .map((url) => `${file}: ${url}`);
      });

    expect(offenders).toEqual([]);
  });

  test("T038: every url in the built output traces to business.json", () => {
    test.setTimeout(180_000);

    const all = hubs();
    const originals = Object.fromEntries(
      all.map((hub) => [hub.slug, readFileSync(hub.dataPath, "utf8")]),
    );

    const untraceable: string[] = [];
    const fromData: string[] = [];

    try {
      for (const hub of all) {
        writeFileSync(hub.dataPath, traceify(originals[hub.slug], hub.slug), "utf8");
      }
      execSync("npm run build", { stdio: "pipe" });

      for (const hub of all) {
        const html = readFileSync(hub.htmlPath, "utf8");

        // Every href/src, plus any absolute url anywhere - including data- attributes, which
        // is where the vCard values live.
        const urls = new Set([
          ...[...html.matchAll(/(?:href|src)="([^"]*)"/g)].map((m) => m[1]),
          ...[...html.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((m) => m[0]),
        ]);

        for (const url of urls) {
          if (url.includes(TRACER)) {
            fromData.push(url);
          } else if (
            ALLOWED_TEMPLATES.some((template) => url.startsWith(template)) &&
            url.includes(`TRACED-PLACEID-${hub.slug}`)
          ) {
            // Documented exception: the template is engine code, the placeId is data.
          } else if (url === TRACER_TEL_HREF) {
            // Assembled from contact.phone, which the tracer rewrote - so it came from data.
            fromData.push(url);
          } else if (
            new RegExp(`^${PATH_PREFIX}(_engine|businesses)/`).test(url) ||
            url.startsWith("#")
          ) {
            // First-party asset or in-page anchor - not a business destination. The prefix is
            // required, not optional: an unprefixed asset path is a deploy bug that
            // tests/validation/path-prefix.spec.ts owns, and must not be waved through here.
          } else {
            untraceable.push(`${hub.slug}: ${url}`);
          }
        }
      }

      // Guard against a vacuous pass: every link entry defined in the real data must have
      // surfaced as a traced url. Without this the test would pass on an empty page.
      const expected = all.flatMap((hub) =>
        JSON.parse(originals[hub.slug])
          .entries.filter((entry: { type: string }) => entry.type === "link")
          .map((entry: { id: string }) => `https://${TRACER}/${hub.slug}/${entry.id}`),
      );
      expect(expected.length).toBeGreaterThan(0);
      expect(fromData.sort()).toEqual(expect.arrayContaining(expected.sort()));

      expect(untraceable).toEqual([]);
    } finally {
      for (const hub of all) {
        writeFileSync(hub.dataPath, originals[hub.slug], "utf8");
      }
      execSync("npm run build", { stdio: "pipe" });
    }
  });
});
