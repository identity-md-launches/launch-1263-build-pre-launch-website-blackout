# BLACKOUT art/landing validation — 2026-10-11

**Complete for the stated implementation and local-check scope.** The rebuilt `dist/` is ready for the job plane's publication step. Public publication/CID verification is not performed by this worker.

## Scope and assumptions

Updated the existing TypeScript/Vite site in place. Retained all six game tabs, localStorage save key, adapter, engine and numeric configuration. `src/game/` and all existing dependency/build files are unchanged. Only presentation changes were made to gameplay controls. Dockside reuses Night Market's ID and Solar Hill reuses The Fringe's ID; the other six IDs remain stable. Exact label: `blackout-mine-the-city-pray-the`; public metadata targets `playblackout.xyz`.

The city loop is decorative, independent of the existing 45-second demo event clock. Landing rarity cards are explicitly labeled examples. Launch tax copy is supplied by the assignment, not a claim that transactions or contracts are live. Sharing and rare-state checks use controlled fixtures, not changed drop odds. All fonts and art are local; no bitmap image service was needed because this extends an existing code-native pixel-art system.

Applied the pinned Better Interface workflow and core principles for all six domains. Consulted its documentation method after rendering/corrections. Existing MIT/Apache notices and local font licenses remain in `NOTICE.md` and `licenses/`.

## Six-domain coverage

| Domain | Status | Evidence and scope | Limits |
| --- | --- | --- | --- |
| Accessibility | Checked | Native links/buttons/disclosures/dialogs; names and states; keyboard pack → reveal → install → epoch → claim; Escape and dialog focus return; stable status/error regions; reduced-motion and visible pause control; axe on six game pages, dialog and two landing widths | No native screen-reader session, physical device, full forced-color walkthrough or exhaustive focus/background combinations |
| Layout | Checked | Actual production export at `/preview/`; all seven routes at 320/390/768/1440; no document overflow; 390px landing CTA and pack action visible; desktop title/main content visible; sticky HUD and mobile tabs; text enlarged to 200%; menus, sharing and warnings inspected | Text enlargement is not browser-native zoom; no RTL/localization variant exists; no claim of all possible widths |
| Writing | Checked | Action labels match behavior; demo/no-wallet copy, five FAQs, event letters, exact launch terms, rarity examples, cost/withdrawal confirmations and recoverable errors reviewed | X copy/intent checked locally; no live post or external unfurl test |
| Typography | Checked | Five resolved sizes through six tokens; minimum visible UI/body 14px; local Pixel/Mono fonts loaded; tabular timers; headings and long item names reviewed; no mobile input below 16px | No OS-specific font rendering or real iOS input test |
| Colors | Checked | Existing palette preserved; brighter supporting gray; text plus color for rarity/district/event; rendered opaque contrast sampled; axe returned no violations in checked states | Axe lists color-contrast as incomplete on complex surfaces. HUD alpha/image backgrounds are not comprehensively measured; no second theme is requested |
| UI/motion | Checked | Shared sprite atlas; hover/press/focus/disabled states; boot/skip, sequential pack opening, high-rarity flash, claim count-up/burst, level badge, city waves, lightning, parallax, pause and sound opt-in exercised | Sounds generated successfully, but no human listening test. Timing assertions use controlled browser clocks; no 10% DevTools timeline review |

## Findings, fixes and rechecks

| Severity/domain | Source | Reproduced finding | Fix and evidence |
| --- | --- | --- | --- |
| Medium / layout | `src/main.ts:147`, `src/style.css:949` | Original HUD, separate sync line and guide card pushed Farm content down; visible in before-farm-390.png | Compact sticky HUD, in-row sync and fixed coach. Desktop/390px screenshots and responsive scenario passed |
| Medium / accessibility, layout | `src/main.ts:159`, `src/style.css:972` | A warning appeared for any wear and multiple warnings stacked | Worn threshold now strictly below 50%, one dismissible strip. Fixtures at 50 and 49, dismiss and repair focus passed |
| Medium / typography, color | `src/style.css:7` | Original compact text used 12px and a dimmer supporting gray | Minimum token now 14px, gray `#b3bfd3`; rendered reflow and text-enlargement checks passed |
| Medium / UI | `src/sprites.ts:26`, `src/sprites.ts:36` | Art did not meet the requested 64px atlas/eight distinct district system; hero contained building text | Twelve shared 64×64 symbols, per-district landmarks/overlays, label-free skyline. Sprite/landmark counts and all five event overlay fixtures passed; screenshots inspected |
| Medium / layout | `src/main.ts:192` | First implementation hid desktop coach because header target ended above a hardcoded 60px cutoff | Header navigation is exempt from that cutoff; desktop and mobile coach flows rechecked |
| Medium / layout, UI | `src/style.css:1107` | First compact HUD hid explicit Sync on narrow widths | Sync retained in the narrow HUD; fresh/mobile and keyboard flows passed |
| Medium / performance | `index.html:27` | Initial local measurement detected small font-swap CLS (0.00134) | Preloaded both Mono weights as well as Pixel. Final local landing CLS is 0 at 390/1440; fonts loaded |
| Medium / layout | `src/style.css:1112` | At 390px the pack action originally sat behind the fixed tabs | Reduced phone pack art stage to 128px. Bounding-box assertion confirms action ends above tabs; actual screenshot inspected |
| Low / UI | `src/style.css:1033` | Fire animation selector affected both its SVG root and inner fire effect | Scoped animation to the inner SVG group. Corrected the overlapping test selector; all district event states passed |
| Low / UI | `src/style.css:1020` | Initial logo flicker ran behind the first-session boot | Delayed the 800ms flicker by one second; boot/flicker timing assertion passed |
| Low / color | `src/style.css:1102` | Launch line crossed the skyline without a stable backdrop | Added an inset navy caption surface; desktop/mobile/OG render inspected |

No reproduced high/medium issue remains open in the requested scope. Some checks do not establish full accessibility, device compatibility or production network performance; limits are explicit above.

## Actual checks

- `/tmp/blackout-tools/node_modules/.bin/tsc --noEmit`: passed.
- `/tmp/blackout-tools/node_modules/.bin/vite build`: passed after the final source change, 13 modules. Source build uses unchanged configuration and lockfile.
- `BLACKOUT_TOOLCHAIN=/tmp/blackout-tools /tmp/blackout-tools/node_modules/.bin/vitest run`: **67/67 passed**, two files, including 100,000 drop samples and existing engine/economic assertions.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers BLACKOUT_TOOLCHAIN=/tmp/blackout-tools node scripts/smoke.mjs`: **21/21 scenarios passed**, zero console errors and zero failed resources.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers BLACKOUT_TOOLCHAIN=/tmp/blackout-tools node scripts/motion-smoke.mjs`: **12/12 groups passed**, zero console errors and zero failed requests. The test clock's scroll event is explicitly dispatched before advancing its mocked animation frame; no real-time epoch wait is needed.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers BLACKOUT_TOOLCHAIN=/tmp/blackout-tools node scripts/render-assets.mjs`: rendered 1200×630 `og.png`, logo SVG and 512×512 app icon, followed by production rebuild. PNG dimensions were checked from file headers.
- `node scripts/check-delivery.mjs`: passed. The live byte report includes raw source, export, historic evidence and all new artifact/evidence files; it is a conservative file budget, not an independently created Git bundle.

An initial motion-test axe call needed an explicit browser context; corrected and rerun. A parallax check initially raced the mocked browser scroll dispatch; explicit dispatch corrected the test harness and the complete timing suite passed. Those initial failures are not hidden passes. One manual browser preview expired at its configured 20-minute lifetime; a fresh bounded preview was started, and final source inspection used a full reload. This was a local inspection-server timeout, not an export resource failure.

Both suites own and close their `/preview/` server and Chromium. Browser-tool screenshots were also inspected directly, including original vs final hero/farm, below-hero sections, desktop districts, mobile Epic+ cards, the share PNG and social preview. Before images were captured from the original `dist/` before any source/build changes.

### Results and evidence

- `reports/polish/interaction-results.json`: full scenario names, 28 route/viewport observations, axe incomplete checks, measured opaque contrasts and screenshot list. Full original outputs also in `artifacts/interaction-results.json`.
- `reports/polish/motion-results.json`: timed effects, local resource timing and CLS, landing axe results. Full original output also in `artifacts/motion-results.json`.
- `reports/polish/screenshots/`: before/after desktop and 390px landing, before/after mobile Farm (including a fresh coach-mark view), final desktop Farm/City, mobile sharing and full mobile landing. The complete screenshot set is in `artifacts/screenshots/`.
- `artifacts/BLACKOUT-Legendary-GPU.png` and repo copy `reports/polish/BLACKOUT-Legendary-GPU.png`: an actual 1000×1200 download produced by the UI, using a Legendary fixture.
- `reports/bundle-budget.json`: file totals, remaining 8 MiB budget and export SHA-256 hashes.

Local performance: final unthrottled cold-context measurements recorded **CLS 0** at both widths, 3,074 DOM nodes and one 80ms/68ms long task respectively. This is not a Lighthouse score or mobile field measurement. Initial runtime transfer consisted of local JS/CSS and three WOFF2 fonts; no remote asset dependency was used. Offline game interactions passed after initial loading.

Opaque rendered contrast: primary button 14.94:1, page text 18.04:1 and warning strip 13.17:1. HUD figures in the JSON are explicitly page-background references, not measured alpha composites. No fabricated ratio is assigned to the hero/scanline/art backgrounds.

## Delivery limits and publication

All requested source/runtime assets remain complete. The shared SVG atlas avoids sixty separate image downloads. Existing manifest/lockfile/build configuration and `src/game/` were checked unchanged. No `.git/`, `.github/`, `.env`, repository `node_modules/`, submodule or ignore file was modified. Installed tools, browser binaries and npm cache stayed under `/tmp`.

The worker's existing exclusion rules omit `artifacts/` from Git, so required review evidence has a repository copy under `reports/polish/`. No ignore rule was changed. Required artifacts were retained; no vendored npm registry, dependency archive or build cache is delivered.

npm ci reported four advisories in the locked development tools (one moderate, one high, two critical). Those dependencies were protected and unchanged; this task does not claim a dependency security audit.

The static export is the publication handoff. The job plane must publish it under the existing label/domain after submission. No new public CID, domain update, on-chain deployment, live X post or live unfurl is claimed. Chromium-only checks, no listening/native screen-reader/physical-device testing and incomplete complex-background contrast coverage remain the stated limitations.
