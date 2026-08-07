import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

import { test, expect } from "@playwright/test";

import { PATH_PREFIX } from "../../scripts/lib/path-prefix.mjs";
import { hubs } from "../lib/hubs";

/**
 * Every first-party asset reference in the BUILT output resolves under the deployed base path.
 *
 * This repo deploys as a GitHub *project* page, served from https://<user>.github.io/<repo>/
 * rather than from the root of the host. That makes an absolute "/_engine/base.css" a link to
 * a file that does not exist there - and it fails in the worst possible way: the HTML still
 * loads, so the hub renders unstyled, with no pending behaviour, and nothing in a root-served
 * local run can tell you. The local static server deliberately answers on both paths, so this
 * check has to read the markup rather than watch for a 404.
 *
 * Two assertions per reference, because each catches a different mistake:
 *   1. it carries the prefix          - catches a `| url` filter dropped from a template
 *   2. it maps to a file in _site/    - catches a prefix that is set but WRONG
 *
 * Runs in Node against _site/; no page fixture is used.
 */
const SITE = resolve(fileURLToPath(new URL("../../_site/", import.meta.url)));

/** External destinations and in-page anchors are not ours to prefix. */
function isFirstParty(reference: string) {
  return !/^(https?:|tel:|mailto:|#|data:)/.test(reference);
}

test.describe("deployed base path", () => {
  for (const hub of hubs()) {
    test(`${hub.slug}: every first-party reference is served from ${PATH_PREFIX}`, () => {
      const html = readFileSync(hub.htmlPath, "utf8");

      const references = [...html.matchAll(/(?:href|src)="([^"]*)"/g)]
        .map((match) => match[1])
        .filter(isFirstParty);

      // Guard against a vacuous pass: a hub always loads at least base.css, theme.css and
      // pending.js. Zero references would otherwise report as green.
      expect(references.length).toBeGreaterThanOrEqual(3);

      const unprefixed = references.filter((reference) => !reference.startsWith(PATH_PREFIX));
      expect(unprefixed).toEqual([]);

      const missing = references.filter(
        (reference) => !existsSync(join(SITE, `.${reference.slice(PATH_PREFIX.length - 1)}`)),
      );
      expect(missing).toEqual([]);
    });
  }
});
