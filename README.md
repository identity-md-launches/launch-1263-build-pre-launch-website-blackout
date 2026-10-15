# BLACKOUT

A pixel-art mining game on **Robinhood Chain (4663)**, at https://playblackout.xyz. This revision keeps the rooftop, live city data, terminal, hardware and game routes while adding personal earnings, a persistent Mining HUD, interactive pack reveals and queued bulk opening. Retired promotional offers and token-launch sections are removed.

The static hosting deliverable is **[dist/index.html](dist/index.html)** and its complete local assets. Routes use hashes and asset URLs are relative, including at a gateway subpath. No contracts were deployed, tokens replaced or real transactions signed. Existing contract addresses, ABIs, proof files, manifests, lockfiles and build configuration remain intact.

## Review revision

All five reported findings were reproduced and fixed without changing the wallet, contracts, routes, manifests or lockfiles. Reveal history reads the reveal block, rejects deleted zero-holder records and discards the old display cache. Projection growth uses only competing farms. Epoch history has 44px targets with local scrolling, dragging previews invalid slots immediately, and public/Farm epoch clocks show seconds.

The current build, typecheck, seven unit groups, eleven broader Chromium interaction groups and eleven focused revision checks pass. The pinned design probe remains 15/16, with only the retained BLACKOUT/ETH casing exception. WebKit could not launch for this revision; its earlier result below is historical. An initial live sweep exposed historical-state errors poisoning ordinary RPC backoff; separate historical-client backoff fixed that regression. The final strict sweep reaches live connected state but stops at an existing Packs button-position threshold at 375×812. The final 24-route/width live capture completes in connected state with no console/HTTP errors or page overflow. Current results and limitations are recorded at the start of [artifacts/validation.md](artifacts/validation.md), and every reviewer finding is answered in [.imd-responses.json](.imd-responses.json).

Run the focused regression suite after rebuilding (Playwright Chromium must be installed):

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers node web/tools/revision-check.mjs
```

`--before` asserts the reported defects and is intended only for the original accepted export/source, before applying this revision. Fixtures are explicitly synthetic, use no keys and never ship in the production bundle.

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
| `#/farm` | Visitors peek at the actual #1 farm. Players manage rooms, drag or tap hardware into slots, see earnings and level gates, repair, scrap, expand inventory and sync |
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

`web/src/earnings.ts` uses bigint arithmetic from the deployed `FarmRewards` model:

- Six-hour mining allocation: `available × emission × miningSeconds / (40,000 × 21,600)`.
- Allocation rate: `mining × 10^27 / city allocation hash`.
- Farm gross: productive hash times that rate. Electricity uses power hash times the rate and tariff; net cannot go below zero.
- Historical mining uses settled on-chain shares, including audit and district tariff adjustments. Claimed totals come from actual `Claimed` logs and show net received. History excludes referrals, redistributed tax and scrap credits.

Projection starts with the live pool, current productive/power output, allocation hash, farm count and scheduled endowment release. It advances four epochs per day. The band models **+5% / unchanged / −1% active farms per day**, holding average competing farm hash constant. Pool depletion reduces future emission amounts; **the deployed emission rate has no automatic rate decay**. The model holds that governance-controlled rate fixed and includes the 1% season allocation. Growth applies only to other farms while your hash stays fixed; with no competitors the scenarios coincide. Future purchases, governance changes, wear, events, audit, referrals, claim tax and gas are excluded and disclosed beside the chart. These are scenarios, not promised returns.

Pack payback uses today's one-pack token quote and the actual weighted drop odds, including support hardware's 60% base hash and the below-level-10 Mythic fallback. It reports the first quarter-day cumulative projected mining reaches the purchase price, or over 365 days. It assumes all three items can be placed; gates, duplicates, gas and maintenance can extend payback. Per-item values are estimated contributions apportioned within their room, not separately payable balances.

## Pack opening and recovery

Buying creates an on-chain receipt. The confirmed purchase receipt is read directly, so delayed log indexing does not lose a newly purchased pack. Opening waits on **native ArbSys blocks**, handles the existing entropy window and rearming, then shows only confirmed hardware. Tap or hold to rip; flip individual cards or Flip all. Bulk reveal sorts rarest last. Sound defaults off, haptics are optional and reduced motion preserves every control and result.

`Open all (N)` reconciles ownership and resolution from chain, checks total inventory space, and resolves up to eight packs per paid receipt per call. Separate receipts queue wallet confirmations with one progress bar. Contract methods do not permit arbitrary receipt batching. Place all queues valid slots; unplace, reveal and claims check capacity. Expansion quotes the actual quadratic cost and uses the existing `expand(true)` call. Scrapping requires an explicit irreversible-action review.

Legacy receipts remain recoverable, and the original contracts/proof assets remain available; the site offers no new promotional claims. All 41 custom ABI errors map to human messages, with retry/farm recovery controls. A concurrent resolution is reconciled instead of sending a duplicate transaction.

## RPC behavior

Ordinary reads race the official Robinhood RPC and dRPC, each with a **4-second** timeout and no automatic transport retry. Reveal-block reads use a separate client with the same transport settings: pruned historical state backs off independently and cannot disable current reads or simulations. The failing PublicNode endpoint is removed. Endpoint errors trigger exponential cooldowns from 15 to 120 seconds. Writes always use the wallet.

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

Generated dependencies/caches stay outside Git at every nesting level. [Artifact budgets](artifacts/PATH-BUDGET.md) retain all requested screenshots and recordings. A standalone Git bundle containing both the complete accepted tree and complete revised tree is measured (shared objects and deltas are counted once) in `artifacts/v12/bundle-trial.json`, without modifying this checkout's `.git`. The provided shallow/partial history omits some historical objects; publisher metadata and unavailable history are outside that measurement. No publishing command or PR creation was run.
