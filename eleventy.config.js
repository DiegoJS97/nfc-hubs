/**
 * Eleventy configuration - NFC Hubs Phase 1.
 *
 * The shared engine lives in src/_includes/ (markup) and src/_engine/ (styles + behaviour).
 * Business content is confined to src/businesses/<slug>/ (Constitution VI).
 *
 * Nothing here names a specific business: no slug, no destination, no label.
 * Both passthrough rules are globs, so adding a third business is a new folder,
 * not a config change.
 *
 * `pathPrefix` is the one deployment-shaped setting here. It does NOT change where files are
 * written - the output stays _site/<slug>/index.html - it only feeds Eleventy's `url` filter,
 * which is what rewrites the absolute asset references in the hub layout. GitHub Pages mounts
 * the artifact at /<repo>/, so those two facts compose: the file at _site/_engine/base.css is
 * served as /nfc-hubs/_engine/base.css, and that is exactly what the markup now asks for.
 */
import { PATH_PREFIX } from "./scripts/lib/path-prefix.mjs";

export default function (eleventyConfig) {
  // Shared engine assets -> _site/_engine/
  eleventyConfig.addPassthroughCopy("src/_engine");

  // Per-business theme -> _site/businesses/<slug>/theme.css
  eleventyConfig.addPassthroughCopy("src/businesses/**/theme.css");

  // business.json is loaded by src/_data/businesses.js, never rendered as a template.
  eleventyConfig.ignores.add("src/businesses/**/business.json");

  return {
    pathPrefix: PATH_PREFIX,
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
