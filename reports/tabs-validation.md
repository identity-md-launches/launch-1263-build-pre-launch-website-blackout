# BLACKOUT focused-tabs validation

## Scope and assumptions

**Complete for the stated local implementation and checking scope.** Production export: `dist/`. Source: TypeScript/Vite, retaining the existing build configuration, dependencies, pixel assets, palette and async adapter boundary. No chain deployment, wallet connection or real transaction was added. Publication is the job plane’s subsequent step; its new live CID is not verified here.

Read the pinned project record, Better Interface workflow and all six core domains, relevant keyboard/forms/contrast/disclosure guidance, documentation method, and license. Applied those principles during construction and reviewed the final export. Existing visual conventions remain authoritative. All numerical gameplay parameters are beta values, may change.

Consequential demo choices are explicit in README and player docs: above-100-H/s configurable audit threshold; day gates require both XP and elapsed farm age; first 12 inactive epochs can earn, later idle epochs cannot; only scores synced before a season boundary enter that week; a farm’s scoring district is fixed for a week; final-total wallet capping requires at least ten active wallets. The demo has 96 farms, initially twelve per district. This avoids disguising a total-mining ranking as an average or allowing one wallet to dominate after normalization. Launch parameters remain unannounced.

The new evidence uses the existing `reports/` delivery path. No ignore file was changed. Older reports/screenshots are historical and do not describe this build.

## Actual checks

On 2026-10-11, after the last source correction:

| Command / check | Result |
| --- | --- |
| `/tmp/blackout-tabs-deps/node_modules/.bin/tsc --noEmit` | Passed, strict TypeScript, exit 0 |
| `/tmp/blackout-tabs-deps/node_modules/.bin/vite build` | Passed, exit 0; complete static export with relative asset URLs |
| `BLACKOUT_TOOLCHAIN=/tmp/blackout-tabs-deps /tmp/blackout-tabs-deps/node_modules/.bin/vitest run` | Passed: 67 tests in 2 files, exit 0 |
| `BLACKOUT_TOOLCHAIN=/tmp/blackout-tabs-deps PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-tabs-browser node scripts/smoke.mjs` | Passed: 16 scenarios; 0 page/console errors; 0 failed resources |
| Seven routes × 320, 390, 768, 1440 CSS-pixel viewports | 28 document-overflow checks passed |
| Landing first viewport at 390×844 | Product, plain description, Play demo and beta label fit; metadata/favicon/local fonts verified |
| Axe WCAG A/AA checks | 0 reported violations across Farm, Packs, City, Season, Wallet, Docs and overclock dialog; incomplete rules retained in JSON |
| 200% root text enlargement at 390px | No document overflow; sync remained usable; separate from native browser zoom |
| Storage denied / loaded-page offline | In-memory actions worked with a storage warning; loaded-page navigation/installation worked offline |
| `node scripts/check-delivery.mjs` | Final file, relative-asset, runtime-asset, metadata and byte accounting recorded in `reports/bundle-budget.json` |

The production suite starts its own foreground HTTP server under `/preview/`, opens the built export in Chromium, and closes browser/server. It advances a controlled browser clock; it does not wait for simulated days. The supplied browser connector was also used for direct rendered inspection and interaction. Saved production screenshots were opened and visually reviewed, including landing, mobile onboarding/packs, item menus, overclock, desktop farm/city/season and focused controls.

Engine checks exercise deterministic rarity distribution, room and inventory constraints, strongest rarity set, Triple Core replacement, five overclock costs/effects, tariff-only electricity, threshold audit balance preservation, spending allocations, supply events, capped district averages, weekly eligibility/rewards, idle preservation/resumption, daily XP cap/day gates, save migration, cross-instance persistence, repair, referral and holder-credit behavior. Removed tests for merging and decile audits were replaced by the current rules.

Browser checks exercise the whole guide and replay/skip persistence, page separation and shared status, item install/remove/repair/scrap, expansion, modal cancellation and focus return, costs, real timer-driven idle/sync, low-fund recovery, City lobbying/movement/letters, withdrawal preview/confirmation and stale tax rejection, referrals, holder-pack consumption, season entry/prize claim, event warnings, day gates, docs links and a keyboard-only pack → install → epoch → claim walkthrough.

Current machine evidence: [tabs-results.json](tabs-results.json). Screenshots: [screenshots/tabs](screenshots/tabs/). Earlier script names are compatibility entry points for the same current suite; no extra independent runs are claimed.

## Six-domain Better Interface review

| Domain | Coverage | Evidence and limits |
| --- | --- | --- |
| Accessibility | **Checked** | Native links/buttons/disclosures/forms/dialogs, labels, skip link, route focus, stable status/error regions, text status cues, 44px controls, keyboard-only primary flow and modal Escape/return. Seven axe states checked. Actual screen-reader session and physical assistive technology **not performed** |
| Layout | **Checked** | Shared alignment, six task-specific tabs, compact item-local menus, first-screen actions, mobile fixed bottom bar with clearance, 28 route/width combinations, mobile menus and desktop map/standings screenshots. Native zoom, RTL and pseudo-localization **not performed**; alternate languages are not implemented |
| Writing | **Checked** | Action labels match effects; demo funds are named; warnings state reason and fix; all tabs have the beta label. Config, adapter, in-site guide and generated Markdown cross-checked by tests. Withdrawal/overclock confirmation consequences are explicit |
| Typography | **Checked** | Existing two local families and six role sizes retained; loaded-font checks; text wrapping, two-column mobile inventory, aligned ranking columns, numeric stability and 200% text enlargement. No additional script/font fallback/language variants tested |
| Colors | **Checked** | Existing hex tokens retained; rarity/status has written cues. Five opaque rendered text/background pairs measured; all exceed 4.5:1. Axe incomplete contrast checks on some illustrated/complex states remain unverified. No second theme exists |
| UI | **Checked** | Empty, available, disabled, open-menu, confirmation, success, error and loading/reveal states exercised. Pixel shapes/art retained; native disclosure replaces crowded action controls; reduced-motion browser contexts used. Motion replay at 10% speed in DevTools **not performed** |

Measured final opaque pairs (from computed colors): HUD label `#a1aec5` on `#090e1d` **8.58:1**; cyan HUD value **12.76:1** on the same background; enabled primary text `#111323` on `#ffe600` **14.52:1**; page text `#edf2ff` on `#05060f` **18.04:1**; warning text `#ffe600` on `#211d13` **13.26:1**. These are specific measurements, not a blanket contrast certification. Disabled-control opacity is excluded from the primary-button measurement.

## Findings, corrections and rechecks

All applicable findings below were fixed. Locations point to the final source implementing the correction.

| Severity / domain | Source | Evidence, impact and fix | Recheck |
| --- | --- | --- | --- |
| High / layout | `src/main.ts:248`, `src/style.css:618` | Farm mixed unrelated tasks and mobile actions were hard to locate. Split six game tabs; shared status; bottom navigation with content clearance | All routes/widths and focused-tab scenario passed |
| High / writing & behavior | `src/game/DemoAdapter.ts:226`, `src/game/DemoAdapter.ts:280` | Polling previously acted as settlement/activity, so “sync” and idle rules could not be truthful. Separated city epochs, pending mining, sync and submitted score; preserved rewards through idle/season boundaries | Unit idle/season tests and browser clock/sync scenario passed |
| High / writing | `src/game/rules.ts:89`, `src/game/DemoAdapter.ts:178`, `src/game/DemoAdapter.ts:184`, `src/game/rules.ts:100` | Audit rank, revenue, purchase XP, age gates and district totals disagreed with the requested rules. Corrected shared parameters/accounting/scoring and both guides; removed merging | 67 engine/docs tests plus targeted production checks passed |
| Medium / layout | `src/main.ts:178`, `src/style.css:754` | Initial 390px screenshot showed an overly tall guide. Compacted the guide and epoch secondary text; in-page guide controls now open/reveal the pack directly with a price | Final onboarding and pack screenshots reviewed; full guide flow passed |
| Medium / accessibility | `src/main.ts:156`, `src/main.ts:317` | Warning recovery used deferred focus, leaving the broken item unfocused with a controlled clock and a fragile route transition. Focus directly on same page; carry focus request through a route change | Broken-item recovery and repair scenario passed |
| Medium / accessibility | `src/main.ts:190`, `src/main.ts:240`, `src/main.ts:263` | Local guide actions needed button semantics; rerenders needed to preserve item-room selectors; warning/error changes needed stable announcement regions | Native controls, preserved fields, status/error regions; keyboard and axe checks passed |
| Medium / writing & UI | `src/main.ts:383` | A farm-age change could make an open withdrawal preview stale. Recheck tax before charging and request a new preview when changed | Stale-preview browser scenario proved no tokens were deducted, then a refreshed preview succeeded |
| Low / typography | `src/style.css:762`, `src/main.ts:112` | Ranked-list markers aligned with the second line, and tag text made similar item cards uneven. Use explicit rank/name/score columns and short hash labels in closed inventory menus; keep equal row heights | Final desktop standings and mobile item-menu screenshots reviewed |

During validation, two test-harness issues were corrected: a float comparison for a 0.6-token simulated referral credit now uses tolerance; axe runs with the controlled clock resumed rather than stalling on frozen browser timers. These were not reported as product defects. All final scenarios passed after the product and harness corrections.

## Limitations and handoff

- Worker evidence is self-reported and does not independently certify behavior, accessibility, economics or security.
- No screen reader, physical device, Safari/Firefox, browser-native zoom, alternate locale/RTL, forced-colors rendering or slowed DevTools animation inspection was performed. Source supports reduced motion and forced-color focus; only reduced-motion Chromium behavior was exercised.
- Browser demo state is editable and local. Referrals, NFT credits, fees, rivals and prizes are simulations. No live-chain/gas, production adapter or multiplayer service exists.
- Dependency installation reported four findings in the existing protected development toolchain (one moderate, one high, two critical). Its manifest/lockfile were retained as required; no dependency upgrade or claim of remediation was made.
- Exact finalized Git-bundle measurement belongs to the submission plane. An optional historical-bundle attempt could not complete because the partial clone would need missing objects and Git metadata is read-only; it was not retried. No Git metadata was changed. The final complete source/export/documentation/evidence tree is measured below the 8 MiB limit in `bundle-budget.json`; generated dependencies, caches, temporary artifacts and archives are excluded/removed.
- The new CID/live publication and host-specific social unfurl remain unverified before the job plane publishes. `blackout` is preferred; the existing automatic name is a valid fallback. No publication approval is pending.
