/**
 * List every value still awaiting the owner's confirmation (Constitution VII, T031).
 *
 * The sentinel is the single source of truth for "unconfirmed", so this audit is just a
 * walk for that exact string. Every hit is a value someone still has to supply, and its
 * entry is intentionally non-navigating until they do (FR-024).
 *
 *   npm run audit:placeholders
 *
 * Exits 0 even when placeholders remain: outstanding placeholders are the expected state of
 * this project, not a failure. Pass --strict to exit 1 instead, for a pre-go-live check.
 */
import { readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

import { PLACEHOLDER, isPlaceholder } from "../src/_data/resolve.js";
import { parseJsonFile } from "./lib/read-json.mjs";

const BUSINESSES = resolve(fileURLToPath(new URL("../src/businesses/", import.meta.url)));
const STRICT = process.argv.includes("--strict");

/** Collect the JSON path of every value equal to the sentinel. */
function findPlaceholders(value, path = "") {
  if (typeof value === "string") {
    return isPlaceholder(value) ? [path] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, i) => findPlaceholders(item, `${path}[${i}]`));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      findPlaceholders(child, path ? `${path}.${key}` : key),
    );
  }

  return [];
}

const slugs = readdirSync(BUSINESSES, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

let total = 0;

for (const slug of slugs) {
  const path = join(BUSINESSES, slug, "business.json");
  if (!existsSync(path)) continue;

  // Reuses the loader's BOM-safe parse: one implementation, so a Windows BOM cannot break
  // the audit while the build still works, or vice versa.
  const hits = findPlaceholders(parseJsonFile(path));
  total += hits.length;

  console.log(`\nsrc/businesses/${slug}/business.json  (${hits.length})`);
  if (hits.length === 0) {
    console.log("  all values confirmed");
  } else {
    for (const hit of hits) console.log(`  ${hit}`);
  }
}

console.log(`\n${total} value(s) still marked "${PLACEHOLDER}".`);

if (total > 0) {
  console.log("Each one renders its entry as pending: the notice is shown, and nothing navigates.");
}

if (STRICT && total > 0) {
  console.error("\n--strict: placeholders remain, so this is not ready to go live.");
  process.exit(1);
}
