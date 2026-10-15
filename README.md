# BLACKOUT

A pixel-art mining game on **Robinhood Chain (4663)**, at https://playblackout.xyz. This revision fixes four reviewed defects in the existing optimizer, Today controls and earnings inputs. The rooftop, art, routes, earnings views and pack experience are retained.

The static hosting deliverable is **[dist/index.html](dist/index.html)** and its complete local assets. Routes use hashes and asset URLs are relative, including at a gateway subpath. No contracts were deployed, tokens replaced or real transactions signed. Existing contract addresses, ABIs, proof files, manifests, lockfiles and build configuration remain intact.

## Gameplay update

Farm now starts with **Optimize farm** and **Today**. Today also opens from the Mining HUD on every connected route. Claim shows the simulated tax and net first; Repair all reviews item and cable costs; Open all uses the existing receipt queue; supply drops have their own collection action. Pack-history scans run separately so they cannot hold up reward and repair controls. Notifications require an explicit click and browser permission, run only while this page is open, and deduplicate epoch/reward/health events. Several newly worn items share one health alert. There is no overclock action; the on-chain `overclock` data field is retained only as the enhancement level used in scoring.

The optimizer runs an exact branch-and-bound search in a cancellable Web Worker. It enforces current room unlocks, six slots, one kind per room, ownership, enhancement locks, rarity gates and inventory capacity at every transaction prefix. It includes every hash/power/protection combo and the highest qualifying rarity set. Equal-hash plans prefer lower power, then fewer transactions. Items staying in their room keep their slots and replacements match outgoing kinds; the sequence planner uses direct minimal moves or a shortest-path search for temporary placements when inventory is full. Search time is exponential in the worst case; the UI never silently returns a timed-out heuristic as the best plan.

`farm-math.ts` follows the deployed FarmEngine integer order. `farm-rules.ts` resolves Params through `FarmCore.params()`, reads current values and upper bounds, and reads enhancement bonuses from `Enhancement.table`. Productive room hash uses current health/bonuses; `allocationHash` uses full health and maximum allowed bonuses. The private theft deadline has no getter. Its active/inactive predicate comes from successful `sync` preparation and `repairCable(false)` simulations at the same fresh block, shared with Today. An unknown result blocks optimization; room stats alone cannot distinguish theft without an unprotected Router. Params, enhancement, epoch, room stats and Engine previews use that block, and Apply repeats the checks against fresh state. Fixed Solidity constants without getters (kinds/tags, base hash, rarity gates and the 5% referral credit) are mirrored from the pinned source, never substituted for available views.

Every proposed layout is checked against `FarmEngine.allocationHash` and all four `FarmEngine.preview` calls before review and again before application. The review lists the hash change, percentage, approximate net mining change per epoch and every move. The token estimate uses live pool/emission/tariff, next-epoch competing allocation and stake boost; it excludes future wear, events, governance changes, referral income, claim tax and gas. Maximizing hash does not guarantee the largest token yield. Each move is simulated and confirmed separately; a failed step stops the queue and retains confirmed steps. A settled but unsynced farm must sync before optimization or repair quotes. Cross-session placement changes and changed rules invalidate a plan.

Room hints display active bonuses, near misses, owned items in other rooms, full-room replacement notes and rarity locks. Inventory's “H/s if placed best” means the best legal currently empty slot; Optimize can additionally rearrange rooms. Leaderboard previews now read installed slots, never inventory. Numbers use a dot decimal separator even under a German browser locale.

Every connected farm has a copyable `https://playblackout.xyz/?ref=<address>` link and ready X/Telegram shares. A valid landing inviter is saved locally. Before the first eligible farm action, an optional review explains “the inviter earns +5% on top of your mining, and you lose nothing.” Public views reject self/missing/existing referrals; `eth_call` checks the older-farm and first-settlement rules because the contract exposes no serial/closed getter. Closed or younger-inviter cases show no offer. The Invite panel attributes the inviter and loads referees from `ReferrerSet`, their current allocation weight, and cumulative gross referral credits from subsequent `Active` events. History is checkpointed and can take time on a cold cache.

Contract source reviewed: [FarmCore, FarmEngine, FarmItems, FarmRewards and Params at the pinned deployment commit](https://github.com/identity-md-launches/launch-1729-blackout-l4-job-b/tree/77c962e6fce9652ee93dff2037b1a09e7a66bd04/src), plus their Economy/Enhancement/math dependencies. Runtime addresses and ABI provenance remain in the existing `web/src/config.ts` and `web/data/abi-provenance.json`. No new deployment is used.

Current checks: production build/typecheck pass; all four review findings reproduced before changes; 11 focused Chromium regression groups and all 13 broader gameplay groups pass. These include the theft counterexample, search cancellation/error recovery, all worn-item disclosures, nondefault rewards getters and cached refreshes. Seven optimizer/referral/Today unit groups and eight earnings/regression groups pass. Live read-only parity passes for 18 candidate arrays and 72 room previews. The pinned design probe passes 16/16 on the offline export. [PR description and 375/1440 screenshots](artifacts/PR.md), [actual validation and limitations](artifacts/validation.md), [review responses](.imd-responses.json), and [design system](DESIGN.md) accompany the export. WebKit could not start; no real signatures, physical-phone or screen-reader session was performed.

Today shows the three lowest-health items first, with **Show all N worn items** exposing the remaining named health bars in both Farm and the Mining HUD. Repair all lists every item and quote before signing. Stopping or failing an optimizer search restores subsequent confirmation controls while retaining the pending-transaction guard.

After installing the unchanged toolchain and Playwright Chromium, run:

```sh
node web/tools/run.mjs typecheck
node web/tools/run.mjs build
node web/tools/v13-check.mjs unit
node web/tools/v12-check.mjs unit
PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers node web/tools/gameplay-revision.mjs
node web/tools/v13-check.mjs live
PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers node web/tools/v13-check.mjs browser
PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers node web/tools/v13-check.mjs capture
node web/tools/v13-delivery.mjs
node web/tools/v13-bundle.mjs
```

`capture` follows `browser` to leave the curated screenshots in the submission. Browser/capture tools use Sharp installed externally at `/tmp/blackout-validation` as shown below; fixtures live only under `web/tools` and do not enter `dist`. All review records for this update are in `artifacts/v13/`; older reports below describe earlier revisions.

## Install, preview and rebuild

Use Node.js 22.12+ and npm. The live app uses `web/package.json` and its existing lockfile; the root manifest belongs to the earlier demo.

```sh
node web/tools/run.mjs install
node web/tools/run.mjs typecheck
node web/tools/run.mjs build
node web/tools/run.mjs preview
```

Install uses `npm ci` in `/tmp/blackout-web-toolchain`. Set `BLACKOUT_TOOLCHAIN` to another writable directory outside the repository if needed. Preview serves localhost:4173. To verify gateway paths, use `node web/tools/serve.mjs 4173` and visit `http://127.0.0.1:4173/preview/`.

Development with optimizer files kept outside the repository:

```sh
node web/tools/v12-dev.mjs
```

The build runs TypeScript, checks the pinned ABI digest, reconstructs the historical ownership snapshot, verifies all 2,011 retained Merkle proofs and compares both roots with the live contract. It emits `dist/` with `base: './'`. `BLACKOUT_OFFLINE=1 node web/tools/run.mjs build` skips only the live root comparison; local proof verification still runs. Final delivery uses the online build. The publisher can serve the supplied export without installing anything.

The hero and header are pre-rendered in `index.html`. After editing `src/landing.ts`, `web/src/shell.ts` or `web/src/critical.css`, regenerate that shell, then rebuild:

```sh
node web/tools/v11-check.mjs prerender
node web/tools/run.mjs build
```

`web/src/bootstrap.ts` paints the first screen before loading the game. Fonts, rooftop art, favicon and social preview are local. Build notices about existing font URLs and third-party pure annotations are nonfatal; the export asset check verifies the resulting files. Design tokens and component behavior are in [DESIGN.md](DESIGN.md); provenance and licenses are in [NOTICE.md](NOTICE.md).

## Routes and primary interactions

| Route | Behavior |
| --- | --- |
| `#/` / `#/home` | Living rooftop, Buy a pack, See earnings, live pool/epoch/price, terminal with every revealed item, top farms, hardware cards, slim roadmap |
| `#/packs` | Bright ETH purchase opens Connect when disconnected; 1–10 packs; secondary BLACKOUT payment; individual and bulk receipt resolution; 3D reveal and placement/scrap shortcuts |
| `#/farm` | Visitors peek at the actual #1 farm. Players optimize/review room placement, use Today and Invite, inspect combos, drag or tap hardware, repair, scrap, expand and sync |
| `#/rewards` | Claimable and tax preview, mining/claim history, last 20 settled epochs, 1/7/30-day estimates and pack payback; visitors get a live calculator |
| `#/leaderboard` | Hash rankings, shortened addresses with explorer links, district badges, item previews and top-three medals |
| `#/city` | Grid events, district standings, existing stake/unlock/lobby controls when enabled |
| `#/season` | Week selection, results, existing eligible claims |
| `#/billboards` | Live boards and existing bid/refund controls when enabled |
| `#/more` | Secondary game navigation |
| `#/docs` | Field guide and existing section anchors |
| `#/contracts` | All 18 configured addresses, copy/explorer links and registry verification |
| `#/wallet` | Compatibility alias for Rewards |

Connected players get the Mining HUD on every route: hash, city share, estimated epoch/day tokens, ETH/USD equivalents, claimable and a one-second epoch clock. Values animate when confirmed readings change. They do not invent accruing balances between chain updates. Spot conversions are estimates, not executable sale quotes.

The single wallet control retains EIP-6963 discovery, Coinbase Smart Wallet and official phone-wallet browser links. No relay or project ID is required. Registry mismatches disable writes. Every write is simulated with `eth_call` and the connected caller before going through the wallet. The ETH path remains `PackSale.buyWithETH(player, count, minTokens, maxCost)`; token purchases use an exact approval when needed and `openPack(count)`.

## Earnings model

`web/src/earnings.ts` uses bigint arithmetic from the deployed `FarmRewards` model. The economy snapshot reads and caches `EPOCH()` and `PRECISION()`; no literal substitutes authorize earnings calculations. Historical mining also reads the shared cached precision. Old snapshots without these fields are ignored:

- Mining allocation: `available × emission × miningSeconds / (40,000 × EPOCH)`.
- Allocation rate: `mining × PRECISION / city allocation hash`.
- Farm gross: productive hash times that rate. Electricity uses power hash times the rate and tariff; net cannot go below zero.
- Historical mining uses settled on-chain shares, including audit and district tariff adjustments. Claimed totals come from actual `Claimed` logs and show net received. History excludes referrals, redistributed tax and scrap credits.

Projection starts with the live pool, current productive/power output, allocation hash, farm count and scheduled endowment release. It advances in the epoch duration returned by the contract and derives daily rates from that duration (currently four six-hour epochs per day). The band models **+5% / unchanged / −1% active farms per day**, holding average competing farm hash constant. Pool depletion reduces future emission amounts; **the deployed emission rate has no automatic rate decay**. The model holds that governance-controlled rate fixed and includes the 1% season allocation. Growth applies only to other farms while your hash stays fixed; with no competitors the scenarios coincide. Future purchases, governance changes, wear, events, audit, referrals, claim tax and gas are excluded and disclosed beside the chart. These are scenarios, not promised returns.

Pack payback uses today's one-pack token quote and the actual weighted drop odds, including support hardware's 60% base hash and the below-level-10 Mythic fallback. It reports the first modeled epoch when cumulative projected mining reaches the purchase price, or over 365 days. It assumes all three items can be placed; gates, duplicates, gas and maintenance can extend payback. Per-item values are estimated contributions apportioned within their room, not separately payable balances.

## Pack opening and recovery

Buying creates an on-chain receipt. The confirmed purchase receipt is read directly, so delayed log indexing does not lose a newly purchased pack. Opening waits on **native ArbSys blocks**, handles the existing entropy window and rearming, then shows only confirmed hardware. Tap or hold to rip; flip individual cards or Flip all. Bulk reveal sorts rarest last. Sound defaults off, haptics are optional and reduced motion preserves every control and result.

`Open all (N)` reconciles ownership and resolution from chain, checks total inventory space, and resolves up to eight packs per paid receipt per call. Separate receipts queue wallet confirmations with one progress bar. Contract methods do not permit arbitrary receipt batching. Place all queues valid slots; unplace, reveal and supply-drop collection check capacity. Claiming mining credits does not require inventory space. Expansion quotes the actual quadratic cost and uses the existing `expand(true)` call. Scrapping requires an explicit irreversible-action review.

Legacy receipts remain recoverable, and the original contracts/proof assets remain available; the site offers no new promotional claims. All 41 custom ABI errors map to human messages, with retry/farm recovery controls. A concurrent resolution is reconciled instead of sending a duplicate transaction.

## RPC behavior

Ordinary reads race the official Robinhood RPC and dRPC, each with a **4-second** timeout and no automatic transport retry. Reveal-block reads use a separate client with the same transport settings: pruned historical state backs off independently and cannot disable current reads or simulations. The failing PublicNode endpoint is removed. HTTP 400/401/403 authorization failures quarantine the endpoint across read clients for this page session; contract reverts and explicit log-range failures do not. Other endpoint errors trigger exponential cooldowns from 15 to 120 seconds. Writes always use the wallet.

Historical logs use the official archive endpoint: dRPC rejects those ranges even below its advertised cap. Ranges are at most 10,000 blocks, adaptively shrink on range errors, retain checkpoints and overlap 16 blocks for reorgs. All indexers share a 600ms pacing queue to avoid archive quota bursts. Cold historical totals can take longer than the primary live numbers; the terminal publishes decoded ranges incrementally. These limits are also tested. No backend, indexer credential or vendored registry is required.

Optional local storage holds display snapshots only. Fresh simulations and quotes authorize writes. A visible-page scheduler refreshes every 15 seconds; clocks tick locally once a second. Failed reads retain the last confirmed display with a reconnecting label. The earlier accepted build’s live route sweep recorded zero console errors and zero HTTP errors; external providers can still become unavailable or rate-limit a shared IP.

## Rehearsal and validation

Dev-only rehearsal: start `node web/tools/v12-dev.mjs`, then open `http://127.0.0.1:5173/?pack-lab=1#/packs`. Pick rarity and single/bulk. It uses clearly labeled synthetic hardware and economy, without a wallet, key or transaction. Vite's `import.meta.env.DEV` guard removes the module from production; the same query does nothing in the export.

The earlier accepted build’s mobile Lighthouse run scored **87** (LCP 1.4s), with a background-history load-time warning retained in its report. In that earlier round, Chromium and WebKit each passed 11 interaction groups and zero axe violations on populated Farm, Rewards and Packs.

[artifacts/validation.md](artifacts/validation.md) records actual checks, six-domain Better Interface coverage, screenshots of every route at 375/1440, connected fixture screenshots and all ten rarity recordings. Live public reads are separate from controlled wallet fixtures. No real-money signing, physical phone/haptic session or screen-reader certification was performed.

Checks use the locked toolchain and external Playwright browsers. Visual tooling is optional and installed outside the repository:

```sh
npm install --prefix /tmp/blackout-validation --no-audit --no-fund sharp@0.35.5 lighthouse@13.5.0
# Use the Playwright CLI in the selected external toolchain to install browsers.
node /tmp/blackout-web-toolchain/node_modules/playwright/cli.js install chromium webkit ffmpeg
node web/tools/v12-check.mjs unit
node web/tools/v12-check.mjs browser
BLACKOUT_TEST_ENGINE=webkit node web/tools/v12-check.mjs browser
node web/tools/v12-check.mjs live
node web/tools/v12-check.mjs record
BLACKOUT_LIGHTHOUSE=/tmp/blackout-validation/node_modules/lighthouse/core/index.js node web/tools/v11-performance.mjs --detail
node web/tools/v12-delivery.mjs
node web/tools/v12-bundle.mjs
```

`PLAYWRIGHT_BROWSERS_PATH` selects external browser binaries. `BLACKOUT_FFMPEG` selects the Playwright FFmpeg executable for compact WebM evidence; `BLACKOUT_VISUAL_TOOLS` selects an external package manifest with Sharp. WebKit supports `BLACKOUT_PLAYWRIGHT_PATH` and `BLACKOUT_WEBKIT_PATH` when a matching runtime is installed elsewhere. The pinned taste probe is assignment input, so only its compact results ship.

Generated dependencies/caches stay outside Git at every nesting level. [Artifact budgets](artifacts/PATH-BUDGET.md) retain all requested screenshots and recordings. A standalone Git bundle containing both the complete accepted tree and complete revised tree is measured (shared objects and deltas are counted once) in `artifacts/v13/bundle-trial.json`, without modifying this checkout's `.git`. The provided shallow/partial history omits some historical objects; publisher metadata and unavailable history are outside that measurement. No publishing command or PR creation was run.

## Earlier five-finding review

In the prior revision, all five reported findings were reproduced and fixed without changing the wallet, contracts, routes, manifests or lockfiles. Reveal history reads the reveal block, rejects deleted zero-holder records and discards the old display cache. Projection growth uses only competing farms. Epoch history has 44px targets with local scrolling, dragging previews invalid slots immediately, and public/Farm epoch clocks show seconds.

That revision’s build, typecheck, seven unit groups, eleven broader Chromium interaction groups and eleven focused revision checks pass. The pinned design probe remains 15/16, with only the retained BLACKOUT/ETH casing exception. WebKit could not launch for this revision; its earlier result below is historical. An initial live sweep exposed historical-state errors poisoning ordinary RPC backoff; separate historical-client backoff fixed that regression. The final strict sweep reaches live connected state but stops at an existing Packs button-position threshold at 375×812. The final 24-route/width live capture completes in connected state with no console/HTTP errors or page overflow. Current results and limitations are recorded at the start of [artifacts/validation.md](artifacts/validation.md), and prior reviewer evidence is retained in [the historical regression report](artifacts/v12/revision-chromium.json).

Run the focused regression suite after rebuilding (Playwright Chromium must be installed):

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers node web/tools/revision-check.mjs
```

`--before` asserts the reported defects and is intended only for the original accepted export/source, before applying this revision. Fixtures are explicitly synthetic, use no keys and never ship in the production bundle.
