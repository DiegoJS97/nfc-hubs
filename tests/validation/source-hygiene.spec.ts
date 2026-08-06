import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extname, join, relative, resolve } from "node:path";

import { test, expect } from "@playwright/test";

/**
 * No raw U+FEFF anywhere in source.
 *
 * This character has been introduced into this repository four times while writing the very
 * code meant to strip it - the fourth was in this file's own comment, caught by this test on
 * its first run. It is invisible in a diff and in most editors, editors and formatters
 * silently drop it, and when it lands inside a regex like /^<BOM>/ the guard becomes a no-op
 * that still looks correct on review.
 *
 * Write the escape \uFEFF instead. This test is the cheap insurance.
 *
 * Note this file never contains the character either: it is built with fromCharCode.
 */
const BOM_CHAR = String.fromCharCode(0xfeff);

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));

/** Executed or parsed as data - the places where a stray BOM actually causes failures. */
const SCANNED_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".njk", ".css", ".json"]);

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  "_site",
  ".git",
  "test-results",
  "playwright-report",
  ".wrangler",
]);

function collectSourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      collectSourceFiles(join(dir, entry.name), found);
    } else if (SCANNED_EXTENSIONS.has(extname(entry.name))) {
      found.push(join(dir, entry.name));
    }
  }
  return found;
}

test.describe("source hygiene", () => {
  test("no source file contains a raw U+FEFF character", () => {
    const files = collectSourceFiles(ROOT);

    // Guard the guard: if the walk silently returned nothing, the assertion below would pass
    // while checking zero files.
    expect(files.length).toBeGreaterThan(20);

    const offenders: string[] = [];

    for (const file of files) {
      if (statSync(file).size === 0) continue;
      const contents = readFileSync(file, "utf8");
      const index = contents.indexOf(BOM_CHAR);
      if (index !== -1) {
        const line = contents.slice(0, index).split("\n").length;
        offenders.push(
          `${relative(ROOT, file).replace(/\\/g, "/")}:${line} — write the escape instead`,
        );
      }
    }

    expect(offenders).toEqual([]);
  });
});
