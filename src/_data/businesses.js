/**
 * Loads every business.json into the Eleventy data cascade, keyed by slug.
 *
 * This is the seam that makes FR-014 mechanically true: a hub template asks for
 * `businesses[slug]` and never for a destination, so confirming real data is a data edit
 * and nothing else. It is also the only place that reads business files from disk, so
 * validation cannot be bypassed by adding a template that forgets to call it.
 *
 * Discovery is a directory scan, not a list - adding a third business means adding a
 * folder (Constitution VI).
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { validateBusiness } from "./validate.js";
import { parseJsonFile } from "../../scripts/lib/read-json.mjs";

const BUSINESSES_DIR = new URL("../businesses/", import.meta.url);

/**
 * \u26A0 THIS MODULE MUST HAVE A DEFAULT EXPORT AND NOTHING ELSE.
 *
 * Eleventy inspects a data file's module shape: with only a default export it calls that
 * function and uses the result, but adding any named export makes it expose the module
 * namespace instead. That turns the `businesses` global into `{ default: fn, ... }`, and
 * every `businesses[slug]` lookup silently becomes undefined in every template.
 *
 * Shared helpers go in scripts/lib/, not here.
 */

export default function () {
  const root = BUSINESSES_DIR.pathname.replace(/^\/([A-Za-z]:)/, "$1");

  const slugs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const businesses = {};

  for (const slug of slugs) {
    const path = join(root, slug, "business.json");
    if (!existsSync(path)) {
      throw new Error(
        `src/businesses/${slug}/ has no business.json. Every business folder must carry ` +
          `its data file (plan.md, Project Structure).`,
      );
    }

    // Throws and fails the build on any problem, naming the field (T008).
    businesses[slug] = validateBusiness(
      parseJsonFile(path),
      `src/businesses/${slug}/business.json`,
      slug,
    );
  }

  if (Object.keys(businesses).length === 0) {
    throw new Error("No businesses found under src/businesses/.");
  }

  return businesses;
}
