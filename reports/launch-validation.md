# BLACKOUT launch update — consolidated validation

## Scope and assumptions

Reviewed the production `dist/` export and all seven hash routes, with emphasis on the launch landing, packs, repairs, paid rooms, season rewards and guide. The existing artwork, fonts, style, demo architecture, storage key and site label are retained. No wallet, contract deployment or direct publication was introduced. The freepack service is an external destination, with no local page.

The pinned Better Interface workflow and core principles in all six domains were read and applied during implementation. The pinned documentation method informed `DESIGN.md`. Source/licensing attribution remains in `NOTICE.md` and `licenses/`.

The brief supplies no launch timestamp or contract source/ABI. No timestamp was invented. All address entries are explicitly permitted “TBA at launch” placeholders in one block. The docs follow the brief, identify other prices as demo values and no longer assert unverified owner/upgrade properties. Live contract parity cannot be established from this workspace.

Demo assumptions: exact durability thresholds use the higher tier; full-output mining and lost durability determine repairs; room prices are illustrative 150/300/600 nominal tokens with the existing spending bonus and sequential ownership; the local hardware lottery chooses Epic/Legendary equally. These are documented, centralized settings, not claimed live contract parameters. Saved legacy rooms and earned funds are preserved.

## Six-domain coverage

| Domain | Status | Checked evidence | Unperformed / not applicable |
| --- | --- | --- | --- |
| Accessibility | Checked | Native buttons/links/disclosures and dialogs; names/labels; keyboard pack purchase and sequential reveal; item disclosure; Cancel/Escape and focus return; purchase focus on new room; live feedback; reduced-motion and pause; axe on seven route states; visible focus screenshot | No native screen-reader session, physical touch device, or exhaustive assistive-tech audit. Axe incomplete native-meter/contrast checks are retained in JSON. |
| Layout | Checked | Screenshots at 390 and 1440; all routes measured at 320/390/768/1100/1440; header/HUD separation; first-screen actions; three-step grouping; teaser grid; nested table/carousel scrolling; 200% root text on Landing/Farm/Packs/Docs | Browser-native zoom not tested. RTL/localization not applicable to the current English-only product; no translated expansion test. |
| Writing | Checked | Sentence-case labels, explicit currency and simulation, exact tax periods, no max-buy cap, pack timing, four teaser names without numbers, season hardware prizes, recoverable errors, no-return/volume/contract-risk copy | Contract-level correctness and official launch timing unavailable. External claim service content not reviewed. |
| Typography | Checked | Retained local Pixel/Mono faces; five implemented font sizes via six tokens; readable labels and prices; tabular figures; wrapping and enlarged-text screenshot; both families load | No cross-platform font rasterization or native text-size settings test. |
| Colors | Checked | Existing tokens retained; written rarity/overheated states; measured opaque primary, hero starter and header starter pairs; axe results recorded | Art/translucent composite contrast remains partly unverified; no blanket contrast-compliance claim. Single dark theme, so alternate themes not applicable. |
| UI | Checked | Purchase/reveal/pending/full-capacity states; disabled room order; insufficient funds; overheating and repair; saved item prizes; confirmation controls; feedback stack; pause/reduced motion and offline use | No animation-panel 10% playback review, listening test, or cross-browser rendering test. Existing complex motion timing was not re-audited end to end in this revision. |

## Findings, fixes and rechecks

Locations below point to the final implementation; the descriptions record the behavior found during work.

| Severity / domain | Source | Finding and correction | Recheck |
| --- | --- | --- | --- |
| High / writing | `src/landing.ts:6`, `src/docs.ts:105`, `src/config.ts:12` | Old launch content stated a 0.5 ETH cap and a nonspecific decay. Replaced it with the three exact tax steps, normal fees after 30 minutes, all-tax-to-pool statement, no max buy limit and one-hour pack opening. Added the three short illustrated steps and four permitted teasers. | Browser assertions, rendered launch screenshot, both generated/in-site guide tests. |
| High / UI | `src/game/rules.ts:24`, `src/game/DemoAdapter.ts:330`, `src/game/DemoAdapter.ts:431`, `src/main.ts:241` | Previous packs defaulted to ETH, durability scaled linearly, repair was flat, rooms unlocked automatically and seasons paid token prizes. Implemented token-first/ETH actions, exact tiers, scaled repair, paid rooms and Epic/Legendary lottery items; migrated saves. | Unit checks cover boundaries, deductions, rejection paths, claims and migrations; browser performs purchases/repairs/claims. |
| Medium / accessibility & writing | `src/main.ts:51`, `src/config.ts:7` | Starter-pack destination was absent from the first screen. Added ordinary named links in header and hero, preserving the separate service. | Exact href and visible bounding-box checks at 390×844; no exported freepack route. |
| Medium / layout | `src/main.ts:212` | Initial 390px screenshot showed the first coach covering the token quote. Hid that coach during the self-explanatory purchase step; retained the later guide. Cleared stale navigation highlights when dismissing or changing guide steps. | Final screenshot shows the quote and both purchase actions; browser checks coach hidden and purchase above bottom navigation. |
| Medium / layout | `src/main.ts:65`, `src/style.css:1134` | At 768px the header was 111px high while the sticky HUD began at 64px. Replaced fixed assumptions with measured header/HUD/navigation offsets. | All five widths pass separation and overflow assertions. |
| Medium / UI | `src/main.ts:57`, `src/effects.ts:57`, `src/style.css:1135` | Level-up feedback intercepted clicks on the message dismiss button during room/keyboard flows. Both now occupy one scrollable feedback stack. | Room purchases, insufficient-funds recovery and keyboard flows pass without forced clicks. |
| Medium / typography & layout | `src/style.css:1139`, `src/style.css:1144` | At 200% root text the header and launch schedule overflowed; HUD/nav labels also overlapped. Allowed wrapping, made the tax list a single column, reflowed HUD/nav and reduced sticky chrome when text grows. | Four routes pass enlarged-text overflow tests; navigation labels fit; final screenshot visually inspected. |
| Medium / accessibility | `src/style.css:1141` | Source review found 32px guide-anchor clearance despite the measured sticky toolbar being much taller. Made anchor clearance depend on actual chrome height. | Keyboard/deep-link test asserts the launch heading is below the HUD; risk page screenshot inspected. |
| Medium / writing | `src/docs.ts:109`, `src/docs.ts:122`, `src/docs.ts:126` | Team-token accounting contradicted ETH fee wording; risk language suggested an early-player advantage and unverified contract properties. Team fees now display simulated ETH; docs explicitly cover no guaranteed returns, player/volume dependence and smart contract risk. Addresses render from one config block. | Unit guide checks, Wallet UI check, risk/address navigation and source review. |

No known required frontend interaction remains broken after rechecking. Earlier failed runs and an interrupted run exposed the findings above; their partial output is not presented as a pass. A test harness was also corrected to resume its controlled clock for axe and use a real clock for Performance API measurements.

## Actual verification

Performed on 2026-10-11 with the unchanged manifest and lockfile. Toolchain and Chromium were installed under `/tmp`, leaving repository dependency paths untouched.

| Command | Result |
| --- | --- |
| `/tmp/blackout-launch-tools/node_modules/.bin/tsc --noEmit` | Exit 0 |
| `/tmp/blackout-launch-tools/node_modules/.bin/vite build` | Exit 0, 13 modules |
| `/tmp/blackout-launch-tools/node_modules/.bin/vite-node scripts/export-docs.ts` | Exit 0, generated `docs.md` from the same sections as the website |
| `BLACKOUT_TOOLCHAIN=/tmp/blackout-launch-tools /tmp/blackout-launch-tools/node_modules/.bin/vitest run --reporter=dot` | Exit 0, 85 tests in two files |
| `BLACKOUT_TOOLCHAIN=/tmp/blackout-launch-tools PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-launch-browsers node scripts/launch-smoke.mjs` | Exit 0, 12 scenarios, 35 route/viewport combinations, zero console errors and failed resources |
| `node scripts/check-delivery.mjs` | Exit 0, complete local assets, social dimensions, file budget and export SHA-256 inventory |
| `git diff --check` | Exit 0 after removing trailing whitespace |

The production preview serves **`dist/` at `/preview/`**, exercising gateway-subpath URLs. The script owns and closes its HTTP server and browser. The supplied MCP browser was attempted but could not start: it expected an absent Chrome-for-Testing binary under `/home/seat/.cache/ms-playwright/chromium-1246/`. Testing instead used Playwright Chromium 141 installed under `/tmp/blackout-launch-browsers`.

The 12 scenarios verify landing/launch metadata; all three demo pack payment options and saved reveals; room purchase confirmations and persistence; wear tiers/repair/install/claim; season item claims and full inventory; City/Wallet actions; guide/risk/address navigation; keyboard and focus; five viewport widths and enlarged text; axe/contrast; pause/reduced motion/offline use; and real local resource/performance measurements.

Axe found zero violations in the seven tested states. The JSON preserves incomplete checks rather than treating them as passes. Measured opaque foreground/background pairs:

| Pair | Foreground / background | Ratio |
| --- | --- | --- |
| Primary action | `rgb(11,16,32)` / `rgb(255,230,0)` | 14.94:1 |
| Hero starter action | `rgb(237,242,255)` / `rgb(16,25,50)` | 15.53:1 |
| Header starter link | `rgb(57,230,255)` / `rgb(5,6,15)` | 13.41:1 |

The local unthrottled 390px measurement reported CLS **0** and only local runtime requests. Raw resource sizes/timing are in the browser JSON. This is neither a mobile-network benchmark nor a field Core Web Vitals certification. Title, description, favicon, OG title/image, 1200×630 image dimensions and relative HTML asset references were checked. The retained OG image was visually inspected.

## Submission size and integrity

The production export contains 10 files totaling **426,068 bytes**. A verified Git bundle containing the complete current website snapshot was generated in an isolated temporary repository: **5,306,916 bytes**, below the **8,388,608-byte** limit. The raw deliverable, including historical evidence, is also below the limit; `reports/bundle-budget.json` records its current total and hashes.

The source repository’s Git metadata was not changed. A separate attempt to include all original history could not clone this partial/promisor checkout because a historical object was unavailable and lazy fetching was disabled. The current-file snapshot was therefore checked independently; the publisher’s eventual bundle is not available here. See `reports/launch/bundle-trial.json`. Temporary check repositories and bundles were removed. Only the small measurement report remains.

Protected build/dependency paths, `.github`, `.env` and repository `node_modules` have no diff. No ignore file or submodule was added. The existing package manifest and lockfile remain part of the deliverable.

## Rendered evidence

Actual screenshots saved by Playwright and visually inspected:

- [390px landing](launch/screenshots/landing-390.png) and [full mobile landing](launch/screenshots/landing-full-390.png)
- [1440px landing](launch/screenshots/landing-1440.png) and [launch tax schedule](launch/screenshots/launch-1440.png)
- [Pack quote and both payment actions](launch/screenshots/packs-390.png)
- [Overheated hardware and repair quote](launch/screenshots/overheated-390.png)
- [Visible keyboard focus](launch/screenshots/keyboard-focus-390.png)
- [Enlarged text](launch/screenshots/packs-text-200-percent.png)
- [Risk statements](launch/screenshots/risks-390.png)

Additional captured states (farm desktop and a fixture-based season item prize) are included in the machine-readable screenshot list. Season claim browser fixtures represent controlled demo rewards; the engine tests exercise actual lottery settlement for both prize rarities.

## Completion and limitations

**Complete for the implemented website scope.** The source, lockfile, rebuilt static export and documentation are present. The host must publish the export under the existing label; publication is intentionally not performed here.

Contract parity remains unverified because no contract source/ABI was supplied; placeholders, demo-only coefficients and that limitation are documented. No live transactions, public-domain/claim-service test or X unfurl was performed. No physical device, native screen reader, browser-native zoom, Safari/Firefox or audio listening test was performed. Contrast over artwork and translucent layers remains partly unverified. The unchanged development dependencies reported four npm advisories. This is worker evidence, not independent network certification.
