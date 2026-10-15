# BLACKOUT gameplay update validation

## Four-finding revision — 2026-10-15

**Complete for the stated revision scope.** All four findings reproduced on the original export before application changes. [Before evidence](v13/gameplay-revision-before.json), [final focused browser results](v13/gameplay-revision-chromium.json) and [review responses](../.imd-responses.json) distinguish the original defects from the fixes. This revision retains the existing design, routes, contract addresses/ABI, wallet flows, proof files, manifests, lockfiles and build configuration. No deployment, publication or real signature was performed.

### Reproduction and repairs

| Finding / source | Reproduced behavior | Fix and recheck |
| --- | --- | --- |
| Theft ambiguity, `web/src/farm-rules.ts:8`, `today.ts:5` | With six Common items installed and a Rare Router in inventory, current stats matched both theft predicates. Preview promised +12.96 H/s; the two synthetic transactions reduced output from 57.6 to 50.4 H/s | Resolve the predicate using successful sync preparation and repairCable simulation at one fresh block. Unknown status stops optimization. Params, enhancement, epoch, room stats and Engine verification use that block. Fresh checks before Apply reject changed cable status. Final fixture preserves 57.6 H/s with no moves; also tested protected Routers, insufficient repair credits, unknown preparation/repair errors, healthy cable and status changing before Apply |
| Disabled confirmations, `web/src/gameplay.ts:73`, `main.ts:222` | Stop search left the next Claim dialog disabled | Finally restores confirmation state; failed searches close the inactive dialog; opening each actionable dialog resets both controls from transactionBusy. Stop search, Escape and worker-error tests then claim successfully and open Repair all; a held signature still disables confirmation |
| Hidden critical health, `web/src/today.ts:21`, `gameplay-views.ts:12` | Three 99% rows hid item #4 at 10%, with no expansion | Sort by health and stable ID. Show the three most urgent rows, then a native counted disclosure for the rest on both Farm and HUD. Item-specific meter names and repair review list all identities/costs. Keyboard expansion exposes all four rows; no overflow at 320/375/390/1440; axe passes |
| Literal rewards constants, `web/src/earnings-data.ts:9`, `earnings.ts:3`, `player.ts:34` | Farm/HUD issued zero EPOCH and PRECISION reads | Read both shared cached getters into the economy snapshot; propagate through current and historical earnings, daily rates, projection steps and payback. Retire the old economy cache namespace. Unit tests change both constants and check integer rounding. Browser fixture returns EPOCH=43200 and a different precision, verifies persisted values and a two-epoch daily estimate, then confirms refresh does not repeat static reads |

### Commands and results from this revision

Dependencies were installed from the unchanged lockfile in a fresh external task directory after the default install destination was not writable. No repository dependencies/configuration changed. Commands used `BLACKOUT_TOOLCHAIN=/tmp/blackout-revision-9867-toolchain` and browser runs used `PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-revision-9867-browsers`. The broader browser runner used `BLACKOUT_VISUAL_TOOLS=/tmp/blackout-revision-9867-visual/package.json` for external Sharp. The initial runtime lookup failure and unavailable WebKit are not reported as passing checks.

| Command actually run | Result |
| --- | --- |
| `npm ci --prefix /tmp/blackout-revision-9867-toolchain --cache /tmp/blackout-revision-9867-npm-cache --no-audit --no-fund` after copying the unchanged web manifest/lockfile | Passed; tooling remains outside the submission |
| `node web/tools/gameplay-revision.mjs --before` on original dist | Four findings reproduced, no real transactions |
| `node web/tools/run.mjs typecheck` | Passed on final source |
| `node web/tools/run.mjs build` | Passed on final source; ABI digest, 2,011 Merkle proofs and live roots checked. Nonfatal existing font URL and third-party annotation notices remain. Rebuilt relative-URL dist |
| `node web/tools/v13-check.mjs unit` | Seven groups, including 65 seeded exhaustive-oracle farms, legal transaction prefixes, minimal moves, referral prechecks, Today and RPC behavior. [Results](v13/unit.json) |
| `node web/tools/v12-check.mjs unit` | Eight groups, including new nondefault epoch/precision cases and existing integer math/projection/capacity/RPC/error/DEV-exclusion regressions. [Copied current report](v13/earnings-revision-unit.json); original historical report retained |
| `node web/tools/gameplay-revision.mjs` | All 11 focused Chromium groups pass, zero page exceptions; includes original counterexample, error/cancel recovery, health disclosure and changed getters. [Results](v13/gameplay-revision-chromium.json) |
| `node web/tools/v13-check.mjs browser` | All 13 original gameplay groups pass, including referral join/history, Claim, Repair all, Open all, notifications, failed simulation and partial-sequence stop. Four routes have zero axe violations. [Results](v13/chromium-browser.json) |
| `node web/tools/v13-check.mjs live` | Live registry and 18 candidate layouts/72 room previews pass under both theft predicates; optimized allocation checked for a real 23-item farm. Read-only. [Results](v13/live.json) |
| Pinned `taste.mjs --out test/scratch/taste --offline`, with explicit external `IMD_PLAYWRIGHT` | 16/16 checks pass at 320/390/1440. This is the offline entry route, supplemented by connected fixture/axe checks. [Results](v13/gameplay-revision-taste.json) |
| `BLACKOUT_TEST_ENGINE=webkit node web/tools/gameplay-revision.mjs` | WebKit launch failed because required runtime libraries were unavailable. No WebKit interaction pass is claimed. [Limitation](v13/gameplay-revision-webkit.json) |
| `node web/tools/v13-delivery.mjs` / `node web/tools/v13-bundle.mjs` | Final protected-path, static-asset, artifact-budget and complete accepted+revised tree size results are in [delivery](v13/delivery.json) and [bundle](v13/bundle-trial.json) |

The initial post-fix browser harness had two timing/selector failures: its synthetic worker error closed the dialog before the harness waited for Stop search, and the new nested health list required selecting its outer container. Those harness assumptions were corrected; the final focused run passes. The broad screenshot run initially exceeded the existing screenshot path budget. The final curated 375/1440 full-page captures and 390 first-screen capture replace those intermediate images, preserving every required screenshot/recording within the unchanged budgets.

### Better Interface coverage and final screenshots

The pinned workflow and core principles in all six domains were read and applied to the changed surfaces. Existing tokens, pixel identity and other pages are retained. Source findings above supply the root causes; the table records the design review without duplicating them.

| Domain | Coverage and result |
| --- | --- |
| Accessibility — Checked | Native disclosure with a 44px minimum summary target, item-specific meter names, keyboard Enter expansion on Farm and HUD; confirmation disabled/busy states checked. Four-route axe and focused Farm axe pass. No manual screen-reader, native zoom or physical-device session |
| Layout — Checked | Lowest health appears first; all remaining rows are discoverable in the same block. Both surfaces retain existing responsive grids. Production checks at 320/375/390/1440 find no document overflow. At 390×844, Optimize spans y=445.94–493.94, above the fold |
| Writing — Checked | “Show all N worn items” reports the actual repair count. Cable uncertainty gives Refresh/repair guidance. Repair review names each item, health and cost. No unrelated copy or route changes |
| Typography — Checked | Existing 12px health/summary role, type scale, families and normal casing retained. Item labels wrap without clipping in inspected phone/desktop captures; numeric formatting tested under de-DE |
| Colors — Checked within automated limits | No new palette. Health has percentages and names in addition to meters. Axe and the offline probe report no measured contrast failures; no claim is made for unmeasured image/gradient pairs |
| UI — Checked | Cancel, Escape, worker failure, busy signature and subsequent confirmations tested. Native disclosure state is preserved on re-render; repair list reuses the existing scrollable review/footer pattern. No new animation, dependency or visual component system |

Final [375px](screenshots/gameplay-farm-375.webp), [390px first screen](screenshots/gameplay-farm-390.webp) and [1440px](screenshots/gameplay-farm-1440.webp) captures were made from the production export served at `/preview/` and visually inspected. They use synthetic wallet data with three 99% items and one at 10%; they are not claimed live player balances. [PR description](PR.md) embeds 375/1440 evidence. Other screenshots and all required recordings remain historical evidence. [DESIGN.md](../DESIGN.md) documents the final source's disclosure, meter, review and responsive behavior.

Limits: Chromium fixtures exercise synthetic signatures and RPC responses; no funds were signed. Live verification samples contract parity rather than proving every possible state. Future transaction inclusion can change state, and confirmed steps cannot be rolled back as a group. Unknown cable status intentionally blocks optimization until status can be verified. WebKit, native notifications, physical phones, screen readers and native zoom remain unverified. The exact search retains exponential worst-case cost. Final bundle measurement covers complete accepted/current trees; unavailable historical objects and publisher metadata are outside that measurement. No new failing design finding was observed in the revised surfaces.

---

## Historical initial gameplay update — 2026-10-15

The delivered source and relative-URL static export add exact farm optimization, combo hints, referrals, Today, installed-item leaderboard previews and RPC error handling to the existing site. Contract addresses, ABI, proof files, existing manifests/lockfiles and build configuration are unchanged. No chain deployment, real wallet signature, publication or remote PR creation was performed. [PR-ready description and screenshots](PR.md) accompany this submission. Reports below this section are historical.

### Contract behavior and useful validation

Rules were read from FarmCore, FarmEngine, FarmItems, FarmRewards and Params at deployment-source commit `77c962e6fce9652ee93dff2037b1a09e7a66bd04`, including Economy, Enhancement, ItemMath and EconomyMath dependencies. The existing ABI digest and live registry checks pass. Runtime Params are resolved through Core; current bonuses, upper bounds, enhancement table, room unlocks, level, capacity, health tiers, repair quotes and reward inputs come from views. Fixed constants without getters are identified in `farm-math.ts` and `referrals.ts`.

The exact worker optimizes productive hash. It separately mirrors the full-health/maximum-bonus allocation envelope and checks both outputs with Engine eth_calls. Integer division order, highest rarity set, mutually exclusive compute combos, theft, dead-item masks and enhancement caps are covered. Reachable placements satisfy gates/ownership/distinct kinds/room unlocks, and every transaction prefix fits inventory. A shortest-path fallback permits temporary placements when needed. Current-room slots remain stable; replacements use the outgoing kind’s slot to avoid crossing dependencies when inventory has only one free space. A targeted regression proves two such replacements take four transactions. Future token income is an estimate using live next-epoch competing allocation, pool/emission/tariff and boost, not a guarantee that maximum hash maximizes net tokens.

Referral tests cover malformed/zero/self/missing/existing inviters, accepted older farms, closed windows and younger inviters. Since serial and referralClosed have no getter, the actual setReferrer simulation is authoritative, including its implicit settlement. Event tests join ReferrerSet with subsequent Active settlements and verify the exact 5% gross credit. Today tests cover tax/net claim review, repair plus cable totals, exact approval, sequential repairs, pack opening, opt-in notifications, threshold deduplication and required sync before health-dependent quotes.

| Command actually run | Result |
| --- | --- |
| `node web/tools/run.mjs install` | Passed using the existing lockfile; dependencies installed outside the repository |
| `node web/tools/run.mjs typecheck` | Passed after final application edits |
| `node web/tools/run.mjs build` | Passed after final application edits; 2,011 Merkle proofs, ABI identity and live roots checked; regenerated `dist/` |
| `node web/tools/v13-check.mjs unit` | Seven groups pass, including 65 seeded farms compared with an independent exhaustive assignment oracle, legal move prefixes, temporary minimal moves, integer math, referrals, Today and endpoint/log errors. [Report](v13/unit.json) |
| `node web/tools/v13-check.mjs live` | Actual read-only chain parity: 18 candidate arrays, 72 room previews, both theft predicates and the optimized allocation of a real 23-item farm. Registry checks pass. [Block, wallet, Params and outputs](v13/live.json) |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers node web/tools/v13-check.mjs browser` | 13 Chromium interaction groups pass. Includes accepted referral before placement, populated referral credits, repair/claim/open-all, notifications, failed simulation and a stopped sequence after its first confirmed move. Zero page exceptions; zero axe violations across Farm, Packs, Leaderboard and Rewards. German browser locale preserves dot decimals. [Report](v13/chromium-browser.json) |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers node web/tools/v13-check.mjs capture` | Six curated screenshots, first-screen Optimize at 375/390/1440, Escape/focus return and visible keyboard focus pass. [Measurements](v13/screenshots.json) |
| `node web/tools/v12-check.mjs unit` | Seven existing regression groups pass: economics, projection, placement/capacity, custom errors, log limits, RPC backoff and DEV exclusion. [Current rerun, separate from historical reports](v13/previous-regression.json) |
| Pinned `taste.mjs --out test/scratch/taste` with external Playwright | 15/16 pass. Only existing BLACKOUT/ETH casing is flagged; retained as product/token names. No missing local assets, page script errors, overflow, target, typography, measured contrast or reduced-motion failure. [Probe output](v13/taste.json) |
| `node web/tools/v13-delivery.mjs` | Source/export integrity, relative asset URLs, metadata, unchanged protected paths, required historical evidence and explicit artifact budgets checked. [Report](v13/delivery.json) |
| `node web/tools/v13-bundle.mjs` | Complete accepted + revised trees packed in a temporary Git repository; verified bundle is below 8 MiB. Exact bytes and the unavailable-history limitation are in [bundle report](v13/bundle-trial.json) |

Installed-hardware leaderboard snapshots use a new cache namespace, so an old inventory-based preview cannot be relabeled as installed after an upgrade.

The existing build emits nonfatal local-font URL and third-party annotation notices. The asset verifier and rendered export confirm the font/runtime files exist. An early live parity attempt timed out at the configured four-second RPC limit; the subsequent full run passed. No dependency archive, node_modules, package cache or submodule is included.

### Better Interface review

The pinned Better Interface workflow and all six core domains were applied during implementation, then reviewed against the final source and production export. The pinned critic ran at 320/390/1440. Additional connected-state Chromium checks ran at 320/375/390/1440, with reduced motion. Screenshots were visually inspected, including Home at 390: BLACKOUT, its product description and Buy a pack are visible. Connected Farm at 390 shows Your farm and Optimize at y≈446–494 in an 844px viewport.

| Domain | Coverage, finding and final result |
| --- | --- |
| Accessibility | Native named dialogs, buttons, disclosures, meters/progress, status/error regions and explicit notification opt-in. `main.ts:222` and `gameplay.ts:37`: disabling the initiating button before async search lost return focus; now the original trigger is passed explicitly and its stable ID survives refresh. Capture verifies Escape closes and focus returns. Four-route axe has zero violations. Manual assistive-device coverage remains limited |
| Layout | `gameplay.css:7`: a long mobile move list originally pushed Cancel outside the visible dialog. The body now scrolls inside a 90dvh dialog with both footer actions always visible. Today changes four → two columns; HUD disclosure becomes one column on phones. All checked widths have no document overflow. Existing city, pages and art are retained |
| Writing | `gameplay-views.ts:17`: near misses identify the actual owned hardware, including items in another room, gates and full-room replacement needs. `gameplay.ts:75`: completed settlement requires sync before repair quotes; failures retain confirmed step counts. Referral copy states who receives the bonus and that the visitor loses nothing. Income estimates disclose current assumptions and next-epoch placement timing |
| Typography | Existing local Pixel/System/Mono families and six roles retained. Gain uses the existing display/title tokens. Explicit en-US number formatting keeps dots in decimals under the de-DE browser test. No new fonts, decorative kickers or tracking. Probe passes type family/size checks |
| Colors | `gameplay.css:1` reuses surface/border/accent/muted tokens. Health, rarity, combo/protection and transaction states have text labels. Automated probe reports all measured text passing 4.5:1 (3:1 large); 39 image/gradient text boxes are unmeasured. Axe also passes the populated gameplay views; no unmeasured contrast claim is made |
| UI | `gameplay.ts:20`: slow historical pack scans originally held up Today; they now load independently while reward/repair controls become ready. Search has progress/cancel, exact review, per-step simulation/confirmation and decoded stopped state. Claim/repair/open-all and eligible/ineligible referral flows pass. `chain.ts:6` avoids treating contract Unauthorized reverts as provider authorization failures; HTTP denial is quarantined across clients. Multi-item health transitions share one notice |

Final implementation tokens, typography, components, responsive behavior and reuse points are documented in [DESIGN.md](../DESIGN.md). There are no unfixed first-screen or repeated layout failures found in this review. The single casing exception preserves the existing product identity under the requested “keep everything else as is” scope.

### Evidence and limitations

- Current screenshots are `screenshots/gameplay-farm-{375,390,1440}.webp`, `gameplay-optimize-{375,1440}.webp` and `gameplay-combos-1440.webp`. These show clearly documented synthetic populated wallet data, not a claimed player balance. Existing historical screenshots and all ten required rarity recordings remain intact.
- The optimizer is exact and cancellable, with exponential worst-case cost. A 24-item/four-room synthetic benchmark completed in about 2.93 seconds after symmetry pruning (740,582 visited nodes); this is one local fixture, not a maximum-inventory performance guarantee. Per-card gain is explicitly the best current legal empty slot, while Optimize can rearrange all hardware.
- Private cable state is inferred by verified room outputs for optimization and transaction simulation for repair eligibility. Unknown reads remain labeled/disabled rather than guessed. Rules and state can change between transactions; simulations stop the sequence, but confirmed moves cannot be rolled back as a group. The repair method has no on-chain maximum-price argument; quotes are rechecked and approval is limited, while transaction inclusion remains subject to chain state changes.
- No real signatures/funds, physical wallet phone flow, browser-native notification delivery, screen-reader or native zoom session was tested. Notification API behavior is covered with a controlled browser implementation. Chromium production rendering works; WebKit could not launch because its runtime libraries were unavailable. The supplied browser tool also failed startup, so working external Playwright supplied rendered validation. No new Lighthouse run was made.
- The live test proves sampled engine parity and registry wiring, not exhaustive on-chain state coverage or future provider availability. Random candidate arrays deliberately test Engine math independently of placement legality; legality is checked by the unit oracle and simulated application. Referral event history can take longer on a cold cache and earnings are gross credits before withdrawal tax.
- The source checkout has missing historical Git objects. Size validation imports both complete accepted/current file trees and preserves shared objects; unavailable history and publisher metadata cannot be measured here. No upload or PR publication is claimed.

---

## Historical five-finding review

**Scope:** the five reopened findings only. All five were reproduced against the unchanged accepted source/export before editing. The existing wallet, contract addresses/ABIs, transaction flows, routes, dependencies and build configuration are retained. The original response sidecar is not present in this checkout; the linked historical regression reports retain the evidence. The earlier delivery report below is historical where a current result differs. During live rechecking, both providers rejected pruned historical state; using the shared transport initially put ordinary reads into backoff. The final source gives historical reads their own transport instance, preserving current quotes and simulations. The regression fixture now reproduces this RPC-level failure, rather than only a failed inner multicall.

### Reproduction and fixes

| Finding / source | Before | Final behavior and evidence |
| --- | --- | --- |
| Destroyed reveal item, `web/src/community.ts:19`, `public-views.ts:18` | ABI-encoded fixture returned a deleted zero struct; terminal showed ASIC/Rare, Fan/Common, GPU/Common and no Epic+ emphasis | Reads `data(id)` at the reveal block. Cache keys include transaction/block/item; both persisted activity namespaces are versioned. Successful zero structs and unreadable details become an explicit unavailable chip. Latest-state fallback requires a nonzero holder. `chain.ts:49` isolates historical-read backoff from the current read/simulation client, using the same RPC race and four-second timeouts. Incomplete reveals do not claim a best rarity. Test now shows the original Router/Mythic and Epic+ row; also checks archive failure, zero historical struct, obsolete cache data and reload |
| Epoch targets, `web/src/polish.css:9`, `rewards-view.ts:31` | At 375px, three populated buttons were 11.34375–11.359375px wide | 44px minimum width and height; three available bars use the panel width, all 20 scroll locally. Full-history test measures 44px targets, selects first/last payouts with the keyboard and checks document reflow at 320/375/390/1440 |
| Projection, `web/src/earnings.ts:34` | Given example returned 378,613.534468 / 577,548.456418 / 588,323.380325 tokens | Excludes the player's hash and active contribution from the competing baseline. Same example returns 566,082.597173 / 577,548.456418 / 578,892.883496. No-competitor scenarios remain equal. Current-scenario integer arithmetic, tariff and pool depletion are preserved |
| Drag feedback, `web/src/main.ts:505` | Duplicate-kind target stayed enabled with “Choose hardware” until drop | Existing slot buttons update disabled state and visible reason immediately, preserving the dragged DOM node. Other-room slots remain available; drag-end restores the prior selection. A valid drop still opens the existing review for the selected item/slot |
| Public clocks, `web/src/views.ts:20`, `main.ts:498`, `player-views.ts:18` | Two successive samples both showed “1h 59m” | Shared `epochCountdown()` uses existing `miningTime()` for HH:MM:SS. Fixture samples are 01:59:59 → 01:59:58; Farm includes seconds; expired public epochs retain “Due now” and HUD settling is unchanged |

Machine-readable observations: [before](v12/revision-before.json), [final targeted checks](v12/revision-chromium.json). These use deterministic synthetic provider data, not claimed live player outcomes. No real wallet signature or transaction was performed.

### Commands actually run in this revision

| Command | Result |
| --- | --- |
| `node web/tools/run.mjs install` | Installed unchanged locked dependencies outside the repository |
| `node web/tools/revision-check.mjs --before` with external Playwright Chromium | Reproduced all five original defects before source/export edits |
| `node web/tools/run.mjs typecheck` | Passed |
| `node web/tools/run.mjs build` | Passed after the final application-source change; ABI identity, 2,011 proofs and live roots checked; relative static export regenerated |
| `node web/tools/v12-check.mjs unit` | Seven groups passed: economics, projection, placement/capacity, custom errors, log limits, RPC timeout/backoff and production DEV exclusion |
| `node web/tools/revision-check.mjs` with external Playwright Chromium | Eleven targeted regression groups passed; no captured application/console errors. Includes a populated 20-epoch chart, deleted hardware and archive-failure branches |
| `node web/tools/v12-check.mjs browser` with external Playwright Chromium | Eleven broader groups passed: claim, placement, expansion, single/bulk reveal, concurrent receipts, scrap, error recovery, all 12 routes/HUD/reflow and axe. Zero axe violations on populated Farm, Rewards and Packs |
| Pinned `taste.mjs --out test/scratch/taste`, with `IMD_PLAYWRIGHT` pointing to the external toolchain | 15/16, [current probe checks](v12/revision-taste.json). Retained BLACKOUT/ETH currency casing is the sole exception; no overflow, target, contrast, motion or first-screen failure |
| `BLACKOUT_TEST_ENGINE=webkit node web/tools/revision-check.mjs` | Did not run: browser launch failed because required runtime libraries were unavailable. Earlier WebKit evidence is not a current pass |
| `node web/tools/v12-check.mjs live` | The initial sweep exposed shared historical/current backoff; that was fixed. The final strict sweep reaches connected state, then stops at the pre-existing Packs first-screen threshold at 375×812. No console errors or HTTP 4xx/5xx were captured. See [strict live attempt](v12/live-browser.json); this is not a full live-suite pass |
| Diagnostic live capture in `test/scratch/revision-live.ts` | Captured all 24 route/width combinations, exercised the visitor calculator and wallet prompt, and observed no document overflow, console errors or HTTP 4xx/5xx. After isolating historical backoff, all routes reach connected state. The only viewport limitation is the same original Packs button bottom of 814.77px at 375×812; it fits at 375×844. Its results/limitations are [recorded separately](v12/revision-live-routes.json); it does not turn the strict failure into a pass |
| Original-export comparison in `test/scratch/compare-live.mjs` | Unchanged accepted export also puts the Packs buy button at y=758.77 with height=56 at 375×812 (bottom=814.77). Thus the strict 812px threshold also fails on the unchanged export; the final revision matches the original 814.77px bottom after the RPC fix. No unrelated Packs layout change was made. [Observation](v12/revision-original-live.json) |
| `node web/tools/v12-delivery.mjs` | Relative export assets, metadata, proof identity, protected paths, complete screenshot/recording set and artifact path budgets checked |
| `node web/tools/v12-bundle.mjs` | Creates/verifies a temporary two-commit bundle containing complete accepted and revised trees, with shared objects counted once. Actual final bytes and the unavailable-history limitation are in [bundle-trial.json](v12/bundle-trial.json). Source Git metadata is not changed |

Playwright commands used `PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers`. The app build retains its existing nonfatal font-URL and third-party annotation notices; asset-reference checks and browser loads verify the runtime files. The initially exceeded screenshot budget was repaired by re-encoding captures, preserving every required image and all ten rarity recordings. No ignore rule, dependency or lockfile was changed.

### Better Interface coverage for the revised surfaces

| Domain | Coverage / outcome |
| --- | --- |
| Accessibility — checked | Native named epoch buttons, actual 44px full-history targets, keyboard payout selection, local scrolling, disabled slot reasons and unchanged tap/keyboard placement. Broad Chromium axe passes. Physical touch, screen readers and switch devices not tested |
| Layout — checked | Full 20-epoch chart stays within the page at 320/375/390/1440; only the chart scrolls. Drag preview preserves the source node. Actual Home at 390 visually inspected in the supplied browser: product and Buy a pack visible. No redesign of existing page composition |
| Writing — checked | Missing chain details say “Hardware details unavailable”; no fabricated hardware or best rarity. Slot reasons precede a drop. Scroll guidance sits with the epoch chart. Existing estimate and transaction language retained |
| Typography — checked | Existing six-role type scale and fonts retained. Monospaced HH:MM:SS clocks include seconds. Probe reports three families/two weights with no type-scale failure. No new font or display style |
| Colors — checked | Existing cyan targets, muted invalid-slot state and named rarity colors retained. Inspected drag preview shows the duplicate room greyed with readable text. Existing automated contrast checks pass; image/gradient contrast is not asserted |
| UI — checked | Valid/invalid drag states and cancellation, review dialog continuity, complete/unknown reveal metadata, cache migration, clock expiry, empty/three/full epoch history structure. Reduced-motion browser context used; pack effects and real-wallet behavior unchanged |

The [drag preview capture](screenshots/revision-drag-preview-fixture-1440.webp) is synthetic fixture evidence. Connected Farm/Rewards/Packs screenshots were refreshed from the final export. All 24 public route screenshots were refreshed after the RPC isolation fix; all ten DEV-only rarity recordings remain included and were not regenerated. The original Lighthouse score below was not rerun for this scoped revision.

**Complete for the five reported fixes.** Remaining validation limits: the strict live sweep above, unavailable WebKit runtime, no real-money signing, no physical phone/screen-reader session, and no new Lighthouse measurement. Browser-rendered evidence and deterministic tests do not establish external RPC availability or certify real-world performance.

---

## Earlier accepted delivery report

This report covers the delivered source and static export for playblackout.xyz. It separates live chain reads, controlled wallet fixtures and synthetic visual rehearsals. No real funds were signed, no contract was deployed and no publishing command was run. Earlier `artifacts/v11/` and `reports/` are historical unless a command below explicitly produced a current result.

## Review at a glance

| Area | Result |
| --- | --- |
| Product and primary action at 390px | Yes: BLACKOUT, mining-game description and Buy a pack on the first screen |
| Required pages | All 12 routes retained; every route captured at 375px and 1440px |
| Mobile overflow | None in production route sweep; connected fixture routes also checked at 320/375/390/1440 |
| Lighthouse mobile | 87; FCP 1.1s, LCP 1.4s, speed index 2.1s, TBT 470ms, CLS 0.062. Background-read load-time warning disclosed below |
| Production build / typecheck | Passed using unchanged existing manifest, lockfile and build configuration |
| Live public visit | All 24 route/width combinations passed; no console exceptions/errors or HTTP 4xx/5xx in the final sweep |
| Transaction behavior | Chromium and WebKit fixture results in `v12/*-interactions.json`; real wallet signing not exercised |
| Custom errors | All 41 ABI custom errors decode to human messages; failed simulations send no transaction |
| Pack visual evidence | Ten DEV-only recordings: single and bulk for Common/Rare/Epic/Legendary/Mythic |
| Better Interface | All six domains reviewed with source and browser checks; findings/fixes below |
| Pinned taste probe | 15/16: only canonical BLACKOUT/ETH currency casing flagged, below the first screen |
| Share metadata | Title, favicon, description, og:title and local og:image present |
| Submission | Source, unchanged lockfiles, full dist, complete proofs and budgeted evidence; no dependency/cache directories or submodules |

The visual idea remains a night-time pixel mining city, with a restrained interface and brighter light around hardware and earnings.

## Scope and acceptance coverage

| Requested behavior | Implementation / evidence |
| --- | --- |
| Remove promotional pack UI and token launch content | Removed landing actions/sections, Packs offers and corresponding guide/FAQ copy. No separate offer route is exported. Existing contracts and proofs retained. Production routes scanned for removed terms |
| Keep hero, live stats, terminal, leaders, hardware | Existing rooftop and sections retained; terminal now shows every mint's sprite/name/rarity. Live sweep observed four reveal rows with three chips each |
| Sticky connected Mining HUD everywhere | `rewards-view.ts:12`, `main.ts:102`, `polish.css:5`; all routes checked in both browser fixtures |
| Earnings, history, projections and payback | Claimable/tax/net, mined/claimed totals, last-20 history slots, interactive 1/7/30-day band, weighted pack payback; visitor calculator tested against live readings |
| Real on-chain formula and decay | Bigint mining allocation and tariff arithmetic verified against pinned FarmRewards source. Decay is through pool depletion; the contract does not automatically decay its governance-set emission rate. Assumptions disclosed beside chart |
| Pack tilt, waiting, confirmed rip, 3D cards and rarity effects | `pack-opening.ts` and `polish.css`; DEV recordings use the production presentation module. No rarity cracks before confirmed/mock-known results. Sound off, optional haptics, reduced-motion fallback |
| Bulk open, progress, rarest last, summary and shortcuts | Up to eight per receipt per `resolve`; other receipts queue. Tests inspect actual simulated/wallet calldata, place only valid slots and preserve non-common items when scrapping |
| Farm room building, sprite motion and placement | Existing cross-section retained; live top farm for visitors, earnings for rooms/items, capacity meter, desktop drag/tap placement, disabled slot reasons and rarity level labels |
| Fix disconnected Buy and leader addresses | Bright primary opens named wallet picker; token payment secondary. Short addresses link to complete explorer records; badges, previews and top-three medals present |
| RPC reliability | Removed failing provider; race normal reads with 4s timeout; archive ranges ≤10k, shared pacing and exponential cooldown. Unit and live browser evidence |
| Error/capacity/resolved-pack handling | All custom errors mapped; inventory full blocks reveal, unplace and claims; Scrap/Expand with costs; fresh chain checks before writes; resolved receipts hidden/reconciled |
| Global motion | Existing smog/windows/sparks plus rare lightning, count-up readings, clocks, real pool sparkline, pressed buttons, page arrival and pause/reduced-motion controls |
| Static delivery | Relative assets verified under `/preview/`; runtime assets/proofs intact; DEV module absent from production bundle and query cannot enable it |

Hardware contribution estimates are allocations within the current room, not independent on-chain payouts. Projection scenarios hold equipment and average competitor hash constant. Claim tax, gas, future governance, wear, purchases, events and referrals are excluded from projections and explicitly listed. Pack payback assumes valid placement and full output; it is not guaranteed. Exact current claim tax is obtained from caller-aware simulation.

## Commands and actual results

Run the app commands after `node web/tools/run.mjs install`. Dependencies and validation tooling were installed outside the repository. No manifest or lockfile was changed.

| Command | Actual coverage/result |
| --- | --- |
| `node web/tools/run.mjs typecheck` | Passed; also performed by the production build |
| `node web/tools/v11-check.mjs prerender` | Regenerated the initial hero/header after removing retired actions |
| `node web/tools/run.mjs build` | Passed online; ABI digest, 2,011 Merkle proofs, historical snapshot and both live roots verified; current dist emitted |
| `node web/tools/v12-check.mjs unit` | Seven groups: integer formula/partial epochs/tariff, projection/drip/payback, capacity/gates, 41 errors, contiguous bounded log scans, timeout/race/backoff/pacing, production DEV exclusion |
| `node web/tools/v12-check.mjs browser` | Chromium: named wallet connect, claim preview/claim/history, chart periods, placement/unplace, full inventory/expansion, ETH purchase, batched and queued reveals, place all, scrap commons, partial/concurrent receipts, decoded simulation failure, all-route HUD/reflow, axe |
| `BLACKOUT_TEST_ENGINE=webkit node web/tools/v12-check.mjs browser` | Same interaction scenarios in WebKit. This machine used a matching external WebKit runtime and supporting libraries; these do not ship |
| `node web/tools/v12-check.mjs live` | Actual production export against actual chain: all 12 routes × 2 widths, visitor calculator, wallet prompt, feed chips, first-screen action, no production mock, no console/HTTP errors |
| `node web/tools/v12-check.mjs record` | Five rarities × single/bulk; verifies every card flips and no application exception. WebM recordings compressed without dropping any requested scenario |
| `node web/tools/v11-performance.mjs --detail` with external Lighthouse | Mobile simulated-throttling result in `v12/lighthouse-mobile.json`; performance metrics below |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | 15/16; compact output retained in `v12/taste.json`. Probe input itself is not part of delivery |
| `node web/tools/v12-delivery.mjs` | Relative local references, required metadata/assets, protected paths, proof identity, no caches/archives/symlinks/submodules and artifact budget |
| `node web/tools/v12-bundle.mjs` | Complete temporary current-file Git bundle plus conservative available base-pack allowance; source `.git` untouched. Actual bytes in `v12/bundle-trial.json` |

Lighthouse 13.5.0 used Chromium 141 with the default mobile profile, 4× CPU simulation and cold storage against the production export. The measured score was **87**. It emitted “The page loaded too slowly to finish within the time limit. Results may be incomplete.” Long-running background archive reads kept the load active; this warning is retained in the JSON, and the score is not presented as a complete page-load certification. First paint and primary actions were separately observed in browser tests.

The production build emits nonfatal notices for retained font URLs and dependency pure annotations. Export reference checks and browser requests verify the fonts/assets exist. These notices are not browser console errors.

### Failures found and repaired

1. **Archive-provider mismatch:** dRPC returned HTTP 400 for historical logs despite small ranges. PublicNode had returned 403. `web/src/config.ts:4` now retains two working ordinary-read providers; `chain.ts:29` sends log reads only to the capable archive endpoint. Normal reads continue to race.
2. **Archive rate-limit bursts:** independent log scanners could combine eight expensive queries in a rapid batch. The official server's 429 response also supplied duplicate CORS headers, which browsers rejected. `chain.ts:18–25` now shares a paced 600ms log queue. The repaired live sweep has zero such errors. Future shared-IP quotas are outside frontend control.
3. **Invalid definition-list content:** HUD and earnings notes were direct `<small>` children of grouped `<dl>` rows. `rewards-view.ts:16,31` now nests notes in `<dd>`. Axe's definition-list finding is resolved.
4. **Interactive history marked as an image:** `.epoch-bars` contained buttons under `role="img"`. `rewards-view.ts:31` now uses a labeled group, resolving the nested-interactive finding while preserving keyboard drilldown.
5. **Gated item label contrast:** inherited `.65` opacity reduced metadata to a measured 4.32:1. `polish.css:36` now dims only the sprite, keeping gate/name text readable. Populated Farm axe checks pass.
6. **Phone purchase placement:** the large pack pushed the purchase below the first screen. `polish.css:30` tightens the phone heading/padding and keeps supporting price explanation below the purchase. Actual 375px button bounds pass the first-screen assertion.
7. **Delayed receipt indexing:** a purchase could be confirmed before its event appeared in `getLogs`. `main.ts:274` reads PackCommitted directly from the confirmed transaction receipt and freezes those receipt IDs for the opening control.
8. **Concurrent resolution:** providers can wrap/omit simulation revert data. `reveal.ts:45` re-reads the receipt after every failed reveal attempt and accepts only chain-confirmed completion; unresolved/unreadable state still surfaces an error. The race test verifies no duplicate write.
9. **Invalid-slot explanation and stale capacity:** `main.ts:230` includes disabled slot options with reasons, and `requireInventorySpace` refreshes capacity before relevant writes. Bulk checks total required space before resolving any pack.
10. **Dev preview removed during refresh:** the rehearsal control was initially placed inside the route container. `pack-lab.ts:10` mounts outside that replaced content. Production tree-shaking and query behavior are tested separately.

## Better Interface review: six domains

| Domain | Source review | Browser review, findings and coverage |
| --- | --- | --- |
| Accessibility | Landmarks/skip link, labels, native dialogs, named fields/progress, non-color rarity/gate labels, keyboard alternatives, reduced motion and forced colors | Chromium/WebKit connected Farm/Rewards/Packs axe; corrected definition lists, interactive chart semantics and gated contrast. Taste probe found no measured text contrast failures. Real screen reader and physical switch input not exercised |
| Layout | `.wrap`, minmax grids, measured sticky chrome, card/grid overflow, slot picker, controlled dialog scrolling | All 12 routes at 375/1440 live and 320/375/390/1440 connected; no document overflow. 390 first screen visually inspected. Fixed purchase vertical placement; images intentionally clip only inside artwork |
| Writing | Product/action first, plain transaction amounts, claim aging, inventory recovery, exact estimate labels and assumptions | Removed obsolete offer/launch/demo copy; compact roadmap replaces eight tiles. Buttons use actions. Probe's only casing exception is the required BLACKOUT/ETH ticker label below the fold |
| Typography | Local Pixel headings, system prose, Mono data; six size roles; wrapping/exact review amounts; natural tracking | Probe finds three families/two weights, no content tracking issue, no repeated slogan stack and a 14-word first-screen prose budget. Compact annotations standardized to 12px |
| Colors | Shared tokens, cyan data, yellow primary, rarity labels and named district badges | Axe contrast issue repaired. Probe passed measured solid-background text; 39 image/gradient text boxes were not automatically measurable. Manual scene review performed without claiming unmeasured ratios |
| UI | Visible purchase/connect, all receipt states, fresh simulations, tax/net review, capacity blocks, atomic ETH buy, queued resolution, irreversible scrap review | Both browser fixtures exercise primary flows, failures and recovery; live visitor calculator/navigation tested. Effects are optional; no spinner during entropy wait. Physical haptics/audio quality and real wallet-app onboarding untested |

The guide's workflow and core principles were applied during implementation, then checked against source and rendered pages. The requested pixel aesthetic and canonical brand/currency spelling take precedence over the probe's isolated casing preference. No repeated/first-screen probe failure remains. Ten small secondary links are below the comfortable 44px target, but satisfy the probe's 24px-or-spacing criterion; primary controls meet the larger target. Automated checks are not a WCAG certification.

## Screenshots

These are full-page captures of the actual production export with live public reads, not design mockups. The 390 first screen is [captured separately](screenshots/home-first-390.webp).

| Route | 375px | 1440px |
| --- | --- | --- |
| Home | [Mobile](screenshots/home-375.webp) | [Desktop](screenshots/home-1440.webp) |
| Packs | [Mobile](screenshots/packs-375.webp) | [Desktop](screenshots/packs-1440.webp) |
| Farm, actual #1 | [Mobile](screenshots/farm-375.webp) | [Desktop](screenshots/farm-1440.webp) |
| Rewards calculator | [Mobile](screenshots/rewards-375.webp) | [Desktop](screenshots/rewards-1440.webp) |
| Leaderboard | [Mobile](screenshots/leaderboard-375.webp) | [Desktop](screenshots/leaderboard-1440.webp) |
| City | [Mobile](screenshots/city-375.webp) | [Desktop](screenshots/city-1440.webp) |
| Season | [Mobile](screenshots/season-375.webp) | [Desktop](screenshots/season-1440.webp) |
| Billboards | [Mobile](screenshots/billboards-375.webp) | [Desktop](screenshots/billboards-1440.webp) |
| More | [Mobile](screenshots/more-375.webp) | [Desktop](screenshots/more-1440.webp) |
| Docs | [Mobile](screenshots/docs-375.webp) | [Desktop](screenshots/docs-1440.webp) |
| Contracts | [Mobile](screenshots/contracts-375.webp) | [Desktop](screenshots/contracts-1440.webp) |
| Wallet alias | [Mobile](screenshots/wallet-375.webp) | [Desktop](screenshots/wallet-1440.webp) |

Additional connected views use the explicitly controlled transaction fixture, not live player balances:

| Page | 375px | 1440px |
| --- | --- | --- |
| Farm | [Fixture mobile](screenshots/farm-connected-fixture-375.webp) | [Fixture desktop](screenshots/farm-connected-fixture-1440.webp) |
| Rewards | [Fixture mobile](screenshots/rewards-connected-fixture-375.webp) | [Fixture desktop](screenshots/rewards-connected-fixture-1440.webp) |
| Packs | [Fixture mobile](screenshots/packs-connected-fixture-375.webp) | [Fixture desktop](screenshots/packs-connected-fixture-1440.webp) |

## Pack recordings

Each clip uses DEV-only rehearsal with a visible synthetic-result label. Single shows three individual flips; bulk shows three packs/nine cards, a cascade and the summary. All use the same pack presentation code as the real reveal. No wallet or real transaction is involved. WebM evidence is encoded at 20fps to meet the submission size budget; this is not a measurement of runtime frame rate.

| Best rarity | Single pack | Bulk opening |
| --- | --- | --- |
| Common | [Recording](recordings/common-single.webm) | [Recording](recordings/common-bulk.webm) |
| Rare | [Recording](recordings/rare-single.webm) | [Recording](recordings/rare-bulk.webm) |
| Epic | [Recording](recordings/epic-single.webm) | [Recording](recordings/epic-bulk.webm) |
| Legendary | [Recording](recordings/legendary-single.webm) | [Recording](recordings/legendary-bulk.webm) |
| Mythic | [Recording](recordings/mythic-single.webm) | [Recording](recordings/mythic-bulk.webm) |

## Limitations

- Live verification is read-only. Signatures, simulations, receipt races and destructive actions use controlled providers; no real wallet signing or irreversible chain state was exercised.
- Real phone GPUs, mobile wallet browsers, haptics, audio playback quality and assistive technology were not measured. Effects use bounded CSS/rAF work and reduced motion, but a universal 60fps claim on midrange phones is not established by a desktop browser recording.
- An external RPC/price service can fail or throttle. The repaired final normal-visit sweep was error-free; that is an observation, not an availability guarantee. One archive endpoint supports the required historical logs without a key; this method cannot honestly race a second incompatible endpoint.
- Historical reads and leader enumeration grow with the chain. Caching, bounded chunks, paced requests and progressive feed updates reduce bursts; no backend indexer was introduced. This earlier report claimed unavailable historical details were omitted. The reopened review disproved that claim for deleted zero structs; the current revision above reads reveal-block metadata and explicitly labels unavailable details.
- The complete current-file bundle is measured. The supplied checkout lacks historical objects, so unseen history and the publisher's final metadata cannot be certified. No Git submodule or generated dependency/cache is delivered.
