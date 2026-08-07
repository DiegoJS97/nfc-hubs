/**
 * The base path the built site is served from.
 *
 * GitHub Pages serves a PROJECT page from https://<user>.github.io/<repo>/, not from the
 * root of the host. Every asset reference in src/_includes/layouts/hub.njk is absolute, so
 * without this prefix the deployed hubs would load their HTML and then fail to find
 * base.css, theme.css and pending.js - an unstyled page with no pending behaviour.
 *
 * One constant, two consumers, on purpose:
 *   - eleventy.config.js feeds it to the `url` filter, which is what rewrites the markup
 *   - scripts/serve-static.mjs strips it, so the test suite exercises the same URLs the
 *     browser will request in production
 *
 * If those two ever disagreed, the suite would pass against paths that do not exist on the
 * deployed site - the failure this file exists to make impossible.
 *
 * ⚠ Tied to the REPOSITORY NAME. Renaming the repo, moving to a user/org Pages repo, or
 * attaching a custom domain all change this value (a custom domain or user page makes it
 * "/"). It is NOT the same decision as the hostname in the NFC tags, but both must be final
 * before any tag is written - contracts/hub-url.md.
 */
export const PATH_PREFIX = "/nfc-hubs/";
