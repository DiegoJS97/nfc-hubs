/**
 * BOM-safe JSON reading, shared by the build, the audit script, and the validation tests.
 *
 * WHY THIS IS NOT IN src/_data/
 * -----------------------------
 * Everything in src/_data/ is an Eleventy *data file*. Eleventy inspects the module's shape:
 * with only a default export it calls that function and uses the result, but adding a second
 * named export makes it expose the module namespace instead. Putting a shared helper next to
 * businesses.js therefore turned the `businesses` global into
 * `{ default: fn, parseJsonFile: fn }`, and every `businesses[slug]` lookup silently became
 * undefined. Shared build helpers live out here so that cannot happen again.
 */
import { readFileSync } from "node:fs";

/** UTF-8 byte order mark, written as an escape: a literal here would be invisible in review. */
const BOM = /^\uFEFF/;

/**
 * Parse a JSON file, tolerating a UTF-8 BOM.
 *
 * Windows editors add one readily, and JSON.parse rejects it with "Unexpected token" and no
 * indication of which file or why. Since a non-developer edits these files (US3), an
 * invisible byte must not produce an inscrutable build failure.
 */
export function parseJsonFile(path) {
  const raw = readFileSync(path, "utf8").replace(BOM, "");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`);
  }
}
