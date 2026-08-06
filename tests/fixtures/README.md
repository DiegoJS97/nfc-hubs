# Validation fixtures

Deliberately malformed `business.json` files. Each one isolates a single data error that
`src/_data/validate.js` must reject at build time, with a message naming the offending field
(T008, T032).

These exist because the dangerous failure is the *quiet* one: if a missing key or an empty
string were treated as "not the sentinel", the entry would resolve as **confirmed** and send a
customer to `undefined`. Every file here proves that cannot happen silently.

| File | Error under test |
|------|------------------|
| `missing-key.json` | required `placeId` absent |
| `empty-string.json` | `wifiSsid` is `""` |
| `null-value.json` | `placeId` is `null` |
| `near-miss-sentinel.json` | trailing space: `"[PLACEHOLDER - replace] "` |
| `wrong-order.json` | correct entry set, wrong order (FR-016) |
| `renamed-entry-id.json` | `menu` renamed to `carta` — a Phase 2 route-segment break |

They are never loaded by the build: `businesses.js` only scans `src/businesses/`.
