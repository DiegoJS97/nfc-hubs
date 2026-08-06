/**
 * Build-time validation of every business.json (T008, data-model.md).
 *
 * The build MUST fail on a missing key, an empty string, or null. That is the whole point:
 * without it, a typo in a field name would leave the value `undefined`, the entry would
 * quietly resolve as "not the sentinel" -> confirmed, and a customer would be sent to
 * `undefined`. Failing loudly at build time is the only safe behaviour (Constitution VII).
 *
 * Two layers:
 *   1. SHAPE   - contracts/business-data.schema.json (types, required keys, the sentinel)
 *   2. ORDER   - the customer-facing entry sequence mandated by FR-016 / FR-018, which is
 *                not expressible in JSON Schema and so is asserted here.
 */
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { PLACEHOLDER } from "./resolve.js";

const SCHEMA_PATH = new URL(
  "../../specs/001-nfc-hubs-fase1/contracts/business-data.schema.json",
  import.meta.url,
);

const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

/**
 * The mandated entry order, per business.
 *
 * Keyed by slug, mirroring how business-data.schema.json already special-cases copas and
 * tapas for `register` and `contact`: per-business CONTRACT constraints belong in the
 * validation layer. The engine itself stays business-agnostic and renders whatever order
 * the data gives it (Constitution VI).
 *
 * These ids are also the Phase 2 `/r/<entry-id>` route segments (contracts/hub-url.md).
 * Renaming one silently breaks analytics continuity once tags are in the field.
 *
 * A slug absent from this table gets no order check - a third business has no mandated
 * sequence until the spec defines one.
 */
const ENTRY_ORDER = {
  // FR-016: 6 actions, then WiFi as informational text. No vCard (FR-017).
  copas: ["menu", "reserve", "playlist", "events", "instagram", "review", "wifi"],
  // FR-018: 6 actions, WiFi, then "save contact" last.
  tapas: ["menu", "reserve", "takeaway", "review", "newsletter", "instagram", "wifi", "vcard"],
};

/**
 * Walk the object and collect the data errors that a JSON Schema `oneOf` reports in a way
 * nobody can read ("must match exactly one schema in oneOf"). Catching them first lets the
 * failure name the offending field directly.
 */
function findDataErrors(value, path = "") {
  const errors = [];

  if (value === null) {
    errors.push(`${path || "(root)"} is null - use "${PLACEHOLDER}" if it is not confirmed yet`);
    return errors;
  }

  if (typeof value === "string") {
    if (value.length === 0) {
      errors.push(`${path} is an empty string - use "${PLACEHOLDER}" if it is not confirmed yet`);
    } else if (value !== PLACEHOLDER && value.trim() === PLACEHOLDER.trim()) {
      // Catches "[PLACEHOLDER - replace] " and friends: near-misses that isPlaceholder()
      // would call confirmed, sending a customer to a literal placeholder string.
      errors.push(`${path} looks like the placeholder but is not exactly "${PLACEHOLDER}"`);
    }
    return errors;
  }

  if (Array.isArray(value)) {
    value.forEach((item, i) => errors.push(...findDataErrors(item, `${path}[${i}]`)));
    return errors;
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      errors.push(...findDataErrors(child, path ? `${path}.${key}` : key));
    }
  }

  return errors;
}

/** Render Ajv errors as one readable line each, naming the field. */
function formatSchemaErrors(errors) {
  return (errors ?? []).map((error) => {
    const field = error.instancePath
      ? error.instancePath.replace(/^\//, "").replaceAll("/", ".")
      : "(root)";
    const detail =
      error.keyword === "additionalProperties"
        ? `unknown property "${error.params.additionalProperty}"`
        : error.message;
    return `${field} ${detail}`;
  });
}

/**
 * Assert the entry id sequence against FR-016 / FR-018.
 *
 * Compares the full sequence rather than just the set, because array order IS the
 * customer-facing priority order (SC-001) - a correct set in the wrong order is a
 * spec violation, not a cosmetic difference.
 */
function findOrderErrors(data) {
  const expected = ENTRY_ORDER[data?.slug];
  if (!expected || !Array.isArray(data?.entries)) return [];

  const actual = data.entries.map((entry) => entry?.id);
  if (actual.length === expected.length && actual.every((id, i) => id === expected[i])) {
    return [];
  }

  const errors = [
    `entries are not in the order mandated for "${data.slug}"\n` +
      `      expected: ${expected.join(", ")}\n` +
      `      actual:   ${actual.join(", ") || "(none)"}`,
  ];

  const missing = expected.filter((id) => !actual.includes(id));
  const unexpected = actual.filter((id) => !expected.includes(id));
  if (missing.length > 0) errors.push(`missing entries: ${missing.join(", ")}`);
  if (unexpected.length > 0) {
    errors.push(
      `unexpected entries: ${unexpected.join(", ")} - note that entry ids are the Phase 2 ` +
        `/r/<entry-id> route segments and must not be renamed casually`,
    );
  }

  return errors;
}

/**
 * Validate one business.json. Throws with every problem listed at once - fixing data one
 * error per rebuild is miserable.
 *
 * @param {object} data          parsed business.json
 * @param {string} source        path, for the error message
 * @param {string} expectedSlug  the folder name, which `slug` must match (data-model.md)
 */
export function validateBusiness(data, source, expectedSlug) {
  const problems = [...findDataErrors(data)];

  if (!validateSchema(data)) {
    problems.push(...formatSchemaErrors(validateSchema.errors));
  }

  if (expectedSlug && data?.slug !== expectedSlug) {
    problems.push(
      `slug is "${data?.slug}" but the folder is "${expectedSlug}" - they must match, ` +
        `because the slug is the hub URL segment encoded in every NFC tag (contracts/hub-url.md)`,
    );
  }

  problems.push(...findOrderErrors(data));

  if (problems.length > 0) {
    throw new Error(
      `Invalid business data in ${source}:\n` +
        problems.map((p) => `  - ${p}`).join("\n") +
        `\n\nBuild aborted. See specs/001-nfc-hubs-fase1/data-model.md.`,
    );
  }

  return data;
}

export default { validateBusiness };
