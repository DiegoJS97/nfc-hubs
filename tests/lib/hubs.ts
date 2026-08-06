import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

/**
 * Discover the businesses that actually exist, the same way the build does.
 *
 * Every cross-cutting spec (a11y, payload, timing, table parameter, the Phase 2 seam) used to
 * carry a hardcoded `["copas", "tapas"]`. That was correct while the spec mandated exactly
 * two named businesses; it is wrong now that the archetype is generic and a business instance
 * chooses its own entry set. A hardcoded list also fails in the quietest possible way - add a
 * business and every one of those suites keeps passing while never opening its page.
 *
 * Enumerating from src/businesses/ instead means those suites cover whatever the repo
 * contains, today and after the old archetypes are removed.
 *
 * Not a *.spec.ts file, so Playwright does not collect it as a suite.
 */

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const BUSINESSES_DIR = join(ROOT, "src", "businesses");

/**
 * Built with fromCharCode, like tests/validation/source-hygiene.spec.ts: this file must not
 * contain a raw U+FEFF, and that guard would otherwise fail on the very code that strips it.
 */
const BOM = String.fromCharCode(0xfeff);

export type Entry = {
  id: string;
  label: string;
  type: "link" | "review" | "wifi" | "vcard" | "maps" | "tel";
  url?: string;
};

export type BusinessData = {
  slug: string;
  name: string;
  register: string;
  lang: string;
  wifiSsid: string;
  placeId: string;
  contact?: { phone: string; address: string; website: string };
  entries: Entry[];
};

export type Hub = {
  slug: string;
  /** Repo-relative, forward slashes - safe to hand to execSync and to readFileSync. */
  dataPath: string;
  htmlPath: string;
  data: BusinessData;
};

/** The same BOM strip the build does: JSON.parse rejects a leading U+FEFF outright. */
function parse(path: string): BusinessData {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw.startsWith(BOM) ? raw.slice(1) : raw);
}

export function hubs(): Hub[] {
  const found = readdirSync(BUSINESSES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .filter((slug) => existsSync(join(BUSINESSES_DIR, slug, "business.json")))
    .map((slug) => ({
      slug,
      dataPath: `src/businesses/${slug}/business.json`,
      htmlPath: `_site/${slug}/index.html`,
      data: parse(join(BUSINESSES_DIR, slug, "business.json")),
    }));

  // Guard the guard. Every caller loops over this array, and an empty one would turn each of
  // those suites into zero assertions that report as green.
  if (found.length === 0) {
    throw new Error(
      "tests/lib/hubs.ts found no business under src/businesses/ - every suite that loops " +
        "over hubs would silently run zero tests.",
    );
  }

  return found;
}

/**
 * How many entries a hub renders as pending, derived from the data rather than the page.
 *
 * Lets a spec assert an exact count instead of "however many there happen to be", which is
 * the assertion that quietly passes against an empty set.
 *
 * This deliberately mirrors src/_data/resolve.js rather than importing it: a spec that reuses
 * the implementation it is checking cannot catch that implementation being wrong.
 */
export function pendingCount(data: BusinessData): number {
  const PLACEHOLDER = "[PLACEHOLDER - replace]";

  return data.entries.filter((entry) => {
    switch (entry.type) {
      case "link":
        return entry.url === PLACEHOLDER;
      case "review":
      case "maps":
        return data.placeId === PLACEHOLDER;
      case "tel":
        return data.contact?.phone === undefined || data.contact.phone === PLACEHOLDER;
      case "vcard":
        return [data.name, data.contact?.phone, data.contact?.address, data.contact?.website].some(
          (value) => value === undefined || value === PLACEHOLDER,
        );
      // WiFi is inert text in every data state, so it never carries the pending affordance.
      case "wifi":
        return false;
      default:
        throw new Error(`pendingCount: unknown entry type "${entry.type}"`);
    }
  }).length;
}

export function hasVcard(data: BusinessData): boolean {
  return data.entries.some((entry) => entry.type === "vcard");
}
