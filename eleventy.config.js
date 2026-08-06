/**
 * Eleventy configuration - NFC Hubs Phase 1.
 *
 * The shared engine lives in src/_includes/ (markup) and src/_engine/ (styles + behaviour).
 * Business content is confined to src/businesses/<slug>/ (Constitution VI).
 *
 * Nothing here names a specific business: no slug, no destination, no label.
 * Both passthrough rules are globs, so adding a third business is a new folder,
 * not a config change.
 */
export default function (eleventyConfig) {
  // Shared engine assets -> _site/_engine/
  eleventyConfig.addPassthroughCopy("src/_engine");

  // Per-business theme -> _site/businesses/<slug>/theme.css
  eleventyConfig.addPassthroughCopy("src/businesses/**/theme.css");

  // business.json is loaded by src/_data/businesses.js, never rendered as a template.
  eleventyConfig.ignores.add("src/businesses/**/business.json");

  return {
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
