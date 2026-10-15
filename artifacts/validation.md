# BLACKOUT final-polish validation

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
- Historical reads and leader enumeration grow with the chain. Caching, bounded chunks, paced requests and progressive feed updates reduce bursts; no backend indexer was introduced. Scrapped item metadata may be unavailable, so unavailable historical details are omitted rather than invented.
- The complete current-file bundle is measured. The supplied checkout lacks historical objects, so unseen history and the publisher's final metadata cannot be certified. No Git submodule or generated dependency/cache is delivered.
