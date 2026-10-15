# BLACKOUT

A pixel-art mining game on **Robinhood Chain (4663)**. This revision gives the live game a full-screen rooftop scene, public city statistics, a pack terminal, mobile navigation and building-style farms. The deployed contracts, addresses, claim proofs, wallet connectors and transaction methods remain unchanged.

The static hosting deliverable is **[`dist/`](dist/index.html)**. Keep the existing site label `blackout-mine-the-city-pray-the` and https://playblackout.xyz. **Claim free pack** continues to open https://playblackout.xyz/freepack, the existing separate service. No `/freepack` page is exported by this app. Nothing was deployed or signed on chain during this task.

## Install, preview and rebuild

Use Node.js 22.12+ and npm. The live app's existing manifest and lockfile are in `web/`; root scripts belong to the earlier demo. All existing manifests, lockfiles and build configuration are preserved.

```sh
node web/tools/run.mjs install
node web/tools/run.mjs typecheck
node web/tools/run.mjs build
node web/tools/run.mjs preview
```

The installer uses `npm ci` with `web/package-lock.json` in `/tmp/blackout-web-toolchain`. Set `BLACKOUT_TOOLCHAIN` to another writable directory **outside the repository** if desired. No repository `node_modules`, npm mirror or vendored packages are required. Development: `node web/tools/run.mjs dev` (localhost:5173). Preview: localhost:4173. To check a gateway subpath, run `node web/tools/serve.mjs 4173` and open `http://127.0.0.1:4173/preview/`.

The production build typechecks, verifies the pinned ABI digest, reconstructs the ownership snapshot, verifies all 2,011 Merkle proofs and both roots (including live StarterClaim), then writes `dist/` with relative URLs and `base: './'`. The export is delivered alongside the source and locked dependencies; hosting does not need to rebuild it. `BLACKOUT_OFFLINE=1 node web/tools/run.mjs build` explicitly skips the live root comparison while still checking the pinned roots and all proofs. Final validation used the online build.

The first-screen HTML and critical CSS are pre-rendered inline for fast paint. After editing the hero, header or `web/src/critical.css`, regenerate that checked-in shell before building:

```sh
node web/tools/v11-check.mjs prerender
node web/tools/run.mjs build
```

`web/src/bootstrap.ts` paints the remaining landing content and loads the full game after the hero has decoded and painted (or immediately on a game action). It preserves the initial hero, hash links and early Connect requests. Fonts, art and runtime assets are local. The supplied 93 KB JPG has a 35 KB WebP counterpart and a dark CSS placeholder. See [DESIGN.md](DESIGN.md) for the implemented design system and [NOTICE.md](NOTICE.md) for asset provenance.

## Navigation and game flows

| Route | Behavior |
| --- | --- |
| `#/` or `#/home` | Rooftop hero; Buy a pack; external Claim free pack; public reward pool, epoch countdown, ETH pack quote, latest 20 pack events, top 10 farms and totals; all existing explanatory sections |
| `#/packs` | 1–10 packs, ETH-first purchase, advanced slippage, BLACKOUT payment, starter/free eligibility, receipt recovery, reveal and rarity cards |
| `#/farm` | Wallet-free building illustration; connected farm, rooms, inventory, placement/drag, filters, repair, scrap, room purchases and auto-repair; onboarding only for an empty connected farm |
| `#/rewards` | Same public city dashboard, then connected pending rewards, tax/net estimate and claim |
| `#/leaderboard` | Existing top 20 active farms and district standings |
| `#/city` | Events, dispatcher letter/plan, district stakes and gated controls |
| `#/season` | Public week selection and pot/results; connected claim |
| `#/billboards` | Public boards/bids and connected bid/refund controls |
| `#/more` | Secondary game pages, guide and contracts |
| `#/docs`, including `#/docs/risks` | Existing field guide with section anchors |
| `#/contracts` | All 18 supplied addresses, explorer links, registry comparisons |
| `#/wallet` | Compatibility alias for Rewards |

The header has Home, Packs, Farm, Rewards, Docs and one Connect control. On phones a burger opens those same links. Connection status is a small footer dot with a text label and Refresh. Public data never requires wallet authorization. Browser wallets use EIP-6963; Coinbase Smart Wallet and official MetaMask, Coinbase Wallet, Rabby and Phantom phone-browser links remain in the same picker. There is no relay or project ID.

## Reliability and public data

Every read races all three configured providers: `rpc.mainnet.chain.robinhood.com`, `robinhood.drpc.org` and `robinhood-rpc.publicnode.com`. Each has a **4-second timeout**, no transport retries, and the first successful response wins. Error responses cannot win the race. Revert data is retained for the existing transaction error mapper. JSON-RPC batching, deployless read-only Multicall3 and the hidden-tab visibility gate remain.

Optional local storage retains successful display snapshots with exact bigint serialization. They render immediately on reload, visibly marked as saved, while independent public reads refresh. One **15-second** scheduler refreshes the visible page; countdowns tick locally once a second. Storage denial, corrupted storage and unavailable RPCs do not block navigation or wallet UI. Missing values use explicit loading/unavailable states, never invented data. Cached values never authorize a write: registry checks, fresh quotes and caller-aware simulations still run.

The public pool is `RewardPool.available()`; its ETH estimate uses the existing market spot. The displayed pack ETH input uses the same fee/slippage calculation as Packs, labeled with its default 3% protection. The terminal reads **PackCommitted and PackOpened** events from PackSale, newest first, last 20. Reveal rarity comes from actual minted item metadata; erased metadata is omitted. History scanning uses adaptive ranges and retained checkpoints, with 16-block reorg overlap. Cold history starts near the head and walks backward as needed. Provider-limited ranges shrink without skipping unreadable blocks.

Farm count comes from FarmCore. Packs opened sums actual completed units across paid receipts plus StarterResolved events, including free/starter resolutions; it does not mistake receipt IDs or minted items for opened packs. Completed immutable receipts and the starter-event index are cached. The leaderboard enumerates farms and ranks their current epoch hash, with ten shown in public dashboards and twenty on its dedicated route. Larger future populations/history will increase cold-load work; no hosted indexer was added.

## Transaction and proof preservation

`web/src/config.ts`, `wallet.ts`, `packs.ts`, `reveal.ts`, `proofs.ts`, the ABI and upstream reveal helper are unchanged. The registry must match all configured modules, token, market, desk, fee router and roots before writes are enabled. The primary ETH path remains `PackSale.buyWithETH(connectedWallet, n, minTokens, maxCost)` with its exact ETH value, without a token approval. Each leg retains 3% protection by default; the combined input buffer is about 6.19%, gas separate. Confirmation refreshes quotes and simulation must succeed. Token payment checks allowance, approves only if needed and calls `openPack(n)`.

Reveal still uses ArbSys native blocks, the 256-block entropy window, existing rearming, partial-receipt recovery and concurrent-completion checks. Three cards animate in sequence with rarity colors; a single flash/shake and optional synthesized sound accompany the result. Sound defaults off. Reduced motion and Pause city disable the effects without hiding content.

The 2,000-owner historical snapshot, deployment evidence, ABI provenance and both complete proof files remain. Starter root: `0xb7d282d1c46f6062963bf2d134d058aa4de3af4cb7b092c5a0fd12ed74dc0f2c`. Free root: `0xdc0842e9fd0017b08be09e787e877c53cfb446ca52aabdb9770e5c33b49d1325`. NFT claims follow launch +48 hours through +16 days; free claims use the live deadline. Eligibility and window enforcement are unchanged.

## Validation and review

The final production build and typecheck passed. Three cold mobile Lighthouse runs scored **88, 86 and 86**. Both browsers passed 48 transaction-flow groups plus four effects/recovery groups; 85 live contract read methods passed. The pinned design probe passed 15/16, with only the requested uppercase token/currency label flagged.

Actual commands, results, six-domain Better Interface review, screenshots and limitations are in **[artifacts/validation.md](artifacts/validation.md)**. The requested Home, Packs, Farm and Rewards screenshots at **375 and 1440 pixels** are linked there for PR review. No PR or deployment is created by this delivery.

Useful checks, after installing the locked toolchain and Playwright browsers:

```sh
node web/tools/run.mjs typecheck
node web/tools/run.mjs build
node web/tools/v10-check.mjs unit
node web/tools/v10-check.mjs logs
node web/tools/v11-check.mjs reliability
node web/tools/v11-check.mjs live
FIXTURE_ONLY=1 FLOW_ONLY=1 BLACKOUT_TEST_ENGINE=chromium node web/tools/v10-check.mjs
FIXTURE_ONLY=1 FLOW_ONLY=1 BLACKOUT_TEST_ENGINE=webkit node web/tools/v10-check.mjs
node web/tools/v11-browser.mjs
node web/tools/v11-startup.mjs
node web/tools/v11-delivery.mjs
node web/tools/bundle-trial.mjs
```

Use `PLAYWRIGHT_BROWSERS_PATH` for an external browser installation; `BLACKOUT_WEBKIT_PATH` can select a WebKit executable. This machine needed temporary external WebKit runtime libraries; these are not dependencies of the shipped website. The pinned taste probe is an assignment input and will not be included in the submitted repository; its compact result is retained in the validation artifacts.

Live validation is read-only. Signing, receipt transitions and claim edge cases are tested with controlled browser fixtures, not real money. Provider rate limits and outages remain external constraints; results and cached state stay usable. Physical phones, real external wallet onboarding and screen readers were not tested. Previous `reports/` are historical; obsolete generated PNGs and a verbose old probe dump were replaced with the budgeted screenshots for this revision. The explicit artifact allowance is [artifacts/PATH-BUDGET.md](artifacts/PATH-BUDGET.md); no runtime or proof assets were removed to meet it.
