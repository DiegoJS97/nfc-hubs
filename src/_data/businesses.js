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
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { validateBusiness } from "./validate.js";

const BUSINESSES_DIR = new URL("../businesses/", import.meta.url);

/** UTF-8 byte order mark, written as an escape: a literal here would be invisible in review. */
const BOM = /^\uFEFF/;

/**
 * Strip a UTF-8 BOM before parsing.
 *
 * Windows editors add one readily, and JSON.parse rejects it with "Unexpected token" and
 * no indication of which file or why. Since the whole point of this data layer is that a
 * non-developer edits these files (US3), an invisible byte must not produce an inscrutable
 * build failure.
 */
function parseJsonFile(path) {
  const raw = readFileSync(path, "utf8").replace(BOM, "");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`);
  }
}

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
