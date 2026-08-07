/**
 * Minimal static file server for the built _site/ output.
 *
 * Exists so the test suite measures the artifact that actually deploys. The Eleventy
 * dev server injects a live-reload client and opens a WebSocket, which would show up
 * in the tests/budget/ payload and request assertions (SC-008, FR-022).
 *
 * Zero dependencies by design - node:http only. This is a test harness, never deployed:
 * Cloudflare Pages serves _site/ itself (FR-002, SC-003).
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, join, resolve, sep } from "node:path";

import { PATH_PREFIX } from "./lib/path-prefix.mjs";

/**
 * fileURLToPath, not URL.pathname: on Windows the latter yields "/C:/path/with/slashes"
 * while path.join produces "C:\path\with\backslashes". Comparing those two forms is how the
 * traversal guard below silently 403'd every request on first writing.
 */
const ROOT = resolve(fileURLToPath(new URL("../_site/", import.meta.url)));
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".vcf": "text/vcard; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".png": "image/png",
};

const server = createServer(async (req, res) => {
  // The ?m=<table> parameter is discarded here just as the hub itself ignores it (FR-021) -
  // it never selects a file.
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
  const decoded = decodeURIComponent(pathname);

  /*
   * Strip the deployed base path, so _site/ is reachable both at the root and under the
   * prefix the built markup actually asks for.
   *
   * GitHub Pages mounts the artifact AT /<repo>/, so in production "/nfc-hubs/_engine/
   * base.css" and "/_engine/base.css" name the same file. Emulating that here is what lets
   * the suite request assets at their real production URLs - if `| url` were dropped from a
   * template, the request would arrive unprefixed, and tests/validation/path-prefix.spec.ts
   * would catch it in the built output rather than after a deploy.
   */
  const unprefixed = decoded.startsWith(PATH_PREFIX)
    ? decoded.slice(PATH_PREFIX.length - 1)
    : decoded;

  const requested = unprefixed.endsWith("/") ? `${unprefixed}index.html` : unprefixed;
  const filePath = resolve(join(ROOT, `.${requested}`));

  // Refuse anything that escapes _site/ via ../ traversal.
  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" }).end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}`);
});
