# BLACKOUT v10 validation

This is a worker-side implementation and review record, not independent certification. The delivered website is the production static export in `dist/`, with its TypeScript source and unchanged pinned frontend manifest/lockfile. No contract was deployed, token minted, transaction broadcast, publication command run, or site label/domain changed.

## Actual checks

| Check | Actual result | Evidence |
| --- | --- | --- |
| Production build and live proof roots | Passed, exit 0; Vite export and all 2,011 proofs verified | `build-results.json` |
| Typecheck | Passed, exit 0 | `build-results.json` |
| Unit fixtures | 7 groups passed, including all 41 ABI errors, claim windows, rarity/type gates and epoch estimates | `unit-results.json` |
| Wallet/RPC flows | 94 checks passed across Chromium 153.0.8010.12 and WebKit 26.0 | `flow-validation.json` |
| Reveal / drag / recovery | 8 grouped checks passed across both engines | `juicy-validation.json` |
| Live visual / keyboard / phone-picker checks | 16 passed across both engines, 320/390/768/1440px | `visual-validation.json` |
| Automated accessibility | Zero axe violations in 14 tested engine/state combinations | Browser JSON reports |
| Pinned design probe | 16/16 checks passed at 320/390/1440px; 390px and desktop screenshots viewed | `taste.json` |
| Social preview regression | Passed: freshly rendered 1200×630 live city/badge equals public and dist PNGs | `og-validation.json` |
| Live reads | Passed: all three providers returned chain 4663; module wiring, roots, farm, leaderboard and actual activity read successfully | `live-reads.json` |
| Preservation | 9 byte-identical files; all 21 config address/root occurrences unchanged | `preservation.json` |
| Delivery integrity and size | Passed; final raw/export counts and verified complete candidate Git bundle are recorded separately | `delivery.json`, `bundle-trial.json` |

The live read observed block **88516748**, epoch **1**, **5 farms** and **12 recent events**, at 2026-10-14T16:39:56.846Z. These are observations, not fixed game data. The build/root check and browser fixture values are distinguished in their reports.

Application-script error arrays are empty in the final successful runs. Browser/network limitations were retained explicitly:

- webkit: 5 browser-native request cancellation/access-control diagnostics during fixture reload/outage tests. RPCs are intercepted; all recovery assertions above must still pass. /rpc.mainnet.chain.robinhood.com/ due to access control checks. /robinhood.drpc.org/ due to access control checks.

- webkit: 4 public-RPC access-control errors reported by the browser: /rpc.mainnet.chain.robinhood.com/ due to access control checks. These external provider failures were captured separately; connection state and recovery are tested above. A connected state requires successful registry and home reads.


The production build runs the TypeScript check, verifies the ABI provenance, reconstructs the ownership snapshot, verifies all **2,000 NFT proofs and 11 free proofs**, compares the two required roots with live StarterClaim, and writes the relative-URL export. Its only warnings were removed third-party PURE annotations in the unchanged dependency tree. `preservation.json` verifies nine byte-identical protected/provenance/art files and all 21 config address/root occurrences. No build configuration, manifest, lockfile, dependency tree, ignore file or submodule was added or changed.

The browser fixtures intercept every write inside controlled browser contexts; they do not hold a key or send a real transaction. The fixture USD price and wallet balances are test data only. The live read check uses the actual three public providers, registry and contracts. All test browsers serve the actual export at `/preview/`, exercising relative assets rather than development-server rewrites.

## Reproducing the checks

```sh
node web/tools/run.mjs install
node web/tools/run.mjs typecheck
node web/tools/run.mjs build
node web/tools/v10-check.mjs unit
node web/tools/v10-check.mjs live
FIXTURE_ONLY=1 FLOW_ONLY=1 node web/tools/v10-check.mjs
FIXTURE_ONLY=1 JUICY_ONLY=1 node web/tools/v10-check.mjs
VISUAL_ONLY=1 node web/tools/v10-check.mjs
node web/tools/render-og.mjs --check
node web/tools/check-delivery.mjs
node web/tools/bundle-trial.mjs
```

This machine used `BLACKOUT_CHROME_PATH=/home/imd-worker/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell` and `BLACKOUT_WEBKIT_PATH=/tmp/blackout-webkit.sh`. The pinned probe ran unchanged:

```sh
IMD_PLAYWRIGHT=/tmp/blackout-taste-playwright.mjs \
  node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

The adapter only selects the installed Chromium executable. The default browser tool lacked `/opt/google/chrome/chrome`, so local Playwright supplied real rendering and interaction inspection. WebKit initially lacked the EGL vendor library needed to open a page. Matching Mesa/GnuTLS libraries and a software-rendering launcher were extracted under `/tmp`; no runtime package/cache/archive was placed in the submission. The test harness records browser-native access-control/cancellation diagnostics separately from application exceptions. Its explicit fallback, retained-data and recovery assertions remain mandatory; unknown page errors still fail the run.

Named tool outputs are initially written to `artifacts/v10/`. Because the supplied checkout excludes `artifacts/`, final compact evidence is copied to `reports/v10/` without changing any ignore rule. The probe report retains its exact checks, metadata and raw-report digest; bulky per-element DOM measurements remain in scratch. Screenshots remain disposable in `test/scratch/`; they were generated and viewed but are not runtime requirements or submitted evidence images.

## Brief coverage

| Requested behavior | Implemented evidence |
| --- | --- |
| RPC reliability | Three ordered providers, exponential retries, deployless multicall, immutable caches, 15-second visible-route schedule and a transport-level visibility guard. Failed reads retain prior data. |
| Player errors | All 41 ABI names, nested revert decoding, action-specific recovery and fresh placement preflight. |
| Living pixel city | Existing district skyline, flickering windows, rig pulses, substation sparks, parallax and chain-event blackout/recovery; pause and reduced-motion controls. |
| Pack moment | Shake/glow, three staggered card flips, labeled rarity colors/rainbow Mythic frame and particles; opt-in sound, off initially. |
| Visual farm | Four pixel rooms, six rack positions each, level/XP, touch/keyboard selection, desktop drag, active LEDs and elapsed mining clock. |
| Chain activity | Latest real event above every page; recent history on More; pack resolutions/mint metadata, registrations and settled total credits. |
| Numbers and value | Rounded BLACKOUT/ETH displays and indicative USD from real ETH/USD plus the market hook. Exact spend remains in confirmation. |
| Onboarding | Connected-wallet chain state drives Connect → Buy your first pack → Place hardware, then mining/placed status. |
| Placement gates | Common/Rare any level, Epic 3, Legendary 5, Mythic 10; one type per room; unavailable items and reasons visible before selecting. |
| Rewards | Pending amount, simulated tax/net, public tax-aging schedule, next epoch, +100 XP and the wallet's last settled mining estimate. |
| Pack pricing | Average-farm yield/demand explanation directly beside Buy pack with ETH, including current ETH and indicative USD. |
| Starter/free claims | Launch +48h opening, +16d Closed state, exact 11-wallet free proof list and its on-chain end; no free button for unlisted wallets. |
| Leaderboard | Every registered farm read in batches, current-epoch positive weights ranked, top 20 and best district shown. |
| Mobile | Five bottom tabs, large primary controls, responsive layouts, relative assets, product/action at 390px and retained 16-bit art. |


## Better Interface: coverage across all six domains

The pinned workflow and core principles were read and applied during implementation. `DESIGN.md` documents the resulting source tokens, typography, spacing, components, shapes, responsive layout and motion behavior using the guide's document-web-design method.

| Domain | Coverage and evidence | Limits |
| --- | --- | --- |
| Accessibility — Checked | Source review of names, native buttons/selects/dialogs, associated labels, progress/meter labels, status/error regions, rarity text, disabled reasons and focus styles. Browser checks cover keyboard stepper focus, dialog Escape/focus restoration, touch alternative to drag, normal/reduced motion and axe on populated game states. | Native screen readers, switch control, physical touch devices and every OS high-contrast combination not verified. This is not complete WCAG conformance. |
| Layout — Checked | 320, 390, 768 and 1440px routes; populated Farm/Packs fixtures; first-screen product/action; independent overflow and pinned overlap/clipping checks. 200% root-text enlargement reflows the primary routes. Confirmed status is compact and the five tabs reserve safe-area space. | Native browser zoom and RTL localization not verified. RTL is not offered. |
| Writing — Checked | Plain action labels, visible level/type gates, all 41 ABI error mappings, date/window/closed wording, unavailable/stale price wording, actual-chain activity and honest estimates. Technical details remain in Docs/Contracts and Advanced purchase controls. | No user research, localization or external-service copy audit. |
| Typography — Checked | Existing local Pixel, Mono and system UI families; two weights; six-size source scale, tabular numerical displays and readable long-copy line heights. Probe checks recurring sizes, casing and tracking. | Font rendering on physical mobile OS versions not verified. Pixel identity is intentionally retained. |
| Colors — Checked | Semantic navy/cyan/yellow palette and rarity colors with text labels. Rendered opaque text contrast probe plus exact token calculations in `token-contrast.json`. Main text 18.04:1, muted text 10.36:1 and primary action 15.94:1 on their implemented solid backgrounds. | Pixel artwork, gradients, transparency and every dynamic composited frame are not fully measured; probe reports skipped image-backed text. |
| UI — Checked | Loading, no-wallet, wrong-network, not-ready, empty, gated, pending, confirmed, rejected, reverted, RPC outage, last-good-data and retry states. Purchase, reveal, room placement, rewards, leaderboard, history and navigation use the same component/token system. | Real signing, gas/market execution, Coinbase account creation and native wallet-app handoffs not exercised. |

## Findings and repairs

| Location | Finding | Repair / validation |
| --- | --- | --- |
| `web/src/chain.ts:5` | A primary-provider failure disrupted reads. | Three-provider fallback with bounded timeouts/backoff, deployless multicall and immutable cache; primary-down, first-two-down and all-down browser fixtures. |
| `web/src/main.ts:358` | Broad polling wasted requests and replaced useful data after failures. | Visible-only 15-second route refresh, one-second local clocks, last-good states and a compact badge. The transport also pauses receipt polling and fallback attempts while hidden. Hidden-tab, pending-transaction and Docs polling assertions. Route-local failures affect the badge only on that route; a recovered Farm is no longer marked reconnecting by an old Packs error. |
| `web/src/data.ts:36`, `web/src/views.ts:58` | A failed claim preview could erase net/tax; failed eligibility could hide prior eligible IDs. | Transport failures retain the last Farm state; eligibility keeps the previously verified display. Dedicated recovery fixtures. |
| `web/src/errors.ts:64`, `web/src/wallet.ts:141` | Contract failures could expose revert names without context. | All ABI names decoded to plain copy; action context also comes from mined transaction calldata. Seven requested errors and nested revert bytes tested. |
| `web/src/player.ts:4`, `web/src/main.ts:189` | Invalid placements reached a transaction too late. | Level, ownership, pending upgrade, room lock, occupancy and duplicate-type gates before selection, then fresh farm preflight and simulation. |
| `web/src/main.ts:77` | A background render cleared an invalid slippage message. | Revalidate the preserved field after rendering; keep details/focus. Invalid values stay visible and cannot reach a wallet prompt. |
| `web/src/main.ts:350` | WebKit emitted a ResizeObserver loop during enlarged-text reflow. | Schedule measurements in an animation frame and update only changed chrome heights. Repeated two-engine visual pass. |
| `web/src/live.css:252`, `web/src/live.css:260` | The city caption and tall confirmed status crowded mobile actions. | Measure top chrome, reserve bottom-tab space, compact confirmed feedback, and give the mobile hero one full-width primary action. Viewed 390px export. |
| `web/src/views.ts:35`, `web/src/player-views.ts:25` | Mobile placement and claim actions sat too low, especially after a confirmed transaction. | Move Select hardware into the placement guide, and Claim immediately after its tax/net breakdown. A browser assertion checks Claim above the mobile tabs; populated screens inspected. |
| `web/src/views.ts:32`, `web/tools/interactions.ts:312` | A one-step automated cross-scroll drag did not initiate native dragging. | Dedicated draggable identity area; background rendering is deferred during a native drag so the source stays attached. The test uses a real pointer gesture, starts a refresh during the drag, scrolls and drops. Same confirmation/gates as touch and keyboard. |
| `web/src/player-views.ts:37` | Leaderboard statistics needed a definition-list parent. | Use a semantic `dl`; axe covers Leaderboard and More. |
| `web/src/main.ts:39` | Activity below long page content was easy to miss. | Latest actual event appears above main content on every route; More includes recent history. Plain status prose uses the body sans font, so it reads as feedback instead of a decorative heading label. |
| `web/src/player.ts:34`, `web/src/data.ts:40` | Earnings needed the wallet's own settlement and cheap-electricity adjustment. | Last settled wallet epoch, exact integer gross/electricity/audit math, discount and nonnegative floor; exclusions are visible and unit-tested. |
| `web/src/community.ts:7` | Historical item-state reads returned provider 403. | Mint/resolve logs remain authoritative; current immutable kind/rarity is cached, destroyed item metadata omitted, and network errors retain the feed. Independent ranges, receipts and item reads are batched; failed loads commit neither the event list nor its cursor. Live activity reads succeeded. |

No known first-screen or repeated design-probe failure is left open. Secondary inline links may be smaller than the preferred 44px comfort size while meeting the probe's 24px-or-spacing rule. Every required primary control uses a large target. Browser screenshots of Home at 390/1440, Farm, Packs, reveal and Rewards were inspected; screenshot observations are not substituted for interaction results.

## Remaining practical limits

Public RPCs and Coinbase ETH/USD can fail independently. The app retries and retains real previous values; USD estimates are labeled unavailable or “last price” rather than invented. Activity is a bounded recent window, not a full archive. The leaderboard reads every registered farm in batches; very large future populations may need an indexer, which is outside this static build.

The animation harness waits for a connected reveal card instead of reading computed style from a node that a refresh can replace. The WebKit clock check brings the page to the foreground and samples with a timer; relying on animation-frame polling under reduced motion was unreliable. These are harness corrections; the production one-second clock remains unchanged.

Individual reward credit vintages are private in the deployed contract. The UI shows a live simulated claim tax/net plus its public 20%→5% seven-day aging schedule and roughly seven-minute basis-point step, rather than fabricating a single exact next-drop timestamp for mixed-age credits. The epoch estimate excludes redistribution, referrals and auto-repair, and future grid/hardware changes affect earnings.

No real spending, wallet signup, native phone handoff, native screen reader, live social-network unfurl or separate `/freepack` service was tested end to end. The final Git snapshot and available-base size audit are recorded separately; the supplied checkout lacks some historical objects, so unavailable history and publisher metadata cannot be measured here. All source, required runtime assets, proofs and static export remain complete.
