# BLACKOUT v10

BLACKOUT is a static, wallet-connected mining game on **Robinhood Chain (4663)**. The animated 16-bit city, dispatcher and hardware art remain. v10 adds resilient chain reads, a three-step mining guide, visual server rooms, rarity reveals, rewards and a chain leaderboard. The app reads the deployed contracts and asks the player's wallet to sign transactions. It contains no backend, keys or simulated player balances.

Keep the existing site label **`blackout-mine-the-city-pray-the`** (`blackout-mine-the-city-pray-the.sites.imd.fun`) and **https://playblackout.xyz**. The header and hero still link to **https://playblackout.xyz/freepack**. That service is separate; this export does not create a `/freepack` route.

## Install, preview and rebuild

Use Node.js 22.12+ and npm. The current app's pinned manifest and lockfile live in `web/`. Existing root build configuration and dependencies were preserved as required by the assignment. Use the commands below for this live app, rather than the historical root scripts.

```sh
node web/tools/run.mjs install
node web/tools/run.mjs typecheck
node web/tools/run.mjs build
node web/tools/run.mjs preview
```

The installer runs `npm ci` with `web/package-lock.json` in an external tool directory, default `/tmp/blackout-web-toolchain`. Set `BLACKOUT_TOOLCHAIN` to another writable directory **outside this repository** to retain dependencies between sessions. No repository `node_modules`, package archives or registry mirror is needed. `node web/tools/run.mjs dev` starts development on localhost:5173; preview uses localhost:4173.

Production builds typecheck, verify the ABI digest, reconstruct the NFT ownership snapshot, build both proof trees, verify all 2,011 proofs, compare both roots with the required roots **and live StarterClaim**, then emit **`dist/`** with `base: './'`. A mismatch fails the build. The checked-in export is the hosting deliverable; the publisher does not rebuild it.

For a disconnected rebuild with the installed toolchain:

```sh
BLACKOUT_OFFLINE=1 node web/tools/run.mjs build
```

This still checks the exact required roots and every proof, but explicitly skips the public-RPC root comparison. The recorded final production build used the live comparison. Serving the existing export needs only a static HTTP server, not Node packages. To verify gateway subpaths: `node web/tools/serve.mjs 4173`, then open `http://127.0.0.1:4173/preview/`.

## Routes and controls

| Hash route | Live behavior |
| --- | --- |
| `#/` | Animated city, Start mining, epoch/countdown, available rewards, district power and feature phases |
| `#/farm` | Level/XP, a ticking mining clock, four pixel rooms with six racks each, select-then-place or desktop drag, item gates, repair, scrap and room purchases |
| `#/rewards` | Pending rewards, simulated tax/net, aging schedule, next epoch, last-epoch earnings estimate and claim |
| `#/leaderboard` | Top 20 active farms by current epoch hash and best district, enumerated from chain |
| `#/more` | City, Leaderboard, Season, Billboards, Docs and Contracts |
| `#/packs` | ETH-first purchase in one transaction, 1–10 stepper, 3% slippage under Advanced, secondary BLACKOUT payment with allowance-aware approval, snapshot/free claims and automatic reveal recovery |
| `#/city` | Grid events, next plan, dispatcher letter/hash, district stakes and gated lock/lobby controls |
| `#/season` | Wallet-free week selection, pot/results and district scores; wallet gating only for reward claims |
| `#/billboards` | Current board messages and bids, gated next-week bid form and refunds |
| `#/docs` | Mechanics, exact-input buying rules, fees, launch, starter eligibility and risks |
| `#/contracts` | All 18 supplied addresses, explorer links, registry verification, launches 1628 / 1710 / 1722 / 1729 |

`#/wallet` is a compatibility alias for Rewards. Home, Packs, Farm, Rewards and More remain in the mobile bottom tab bar on every page. Onboarding persists until hardware is placed; the chain determines completion. Every page carries recent chain activity with transaction links. Guide sections have hash links, including `#/docs/risks`. No server rewrites are required. The former demo source remains for historical reference and shared artwork; its state and balances are not imported into the live app.

Browser extensions are discovered with EIP-6963. The one Connect control also offers Coinbase Smart Wallet. On phones without a provider, it offers official MetaMask, Coinbase Wallet, Rabby and Phantom browser deep links carrying the current URL. Chain switching/addition uses chain 4663 and the supplied RPC/explorer. Public reads never need wallet authorization. Transactions are simulated, reviewed, signed by the selected wallet, and tracked as awaiting signature, pending, confirmed or reverted with decoded contract errors and explorer links.

## Contracts, proofs and source provenance

The complete config is **`web/src/config.ts`**. Game modules resolve through `GameRegistry.module(role)` on load. Successful immutable reads are cached for the session; unsuccessful reads are retried. Every module is compared with its supplied address; token, market, desk, fee router and both roots are also checked. A mismatch warns visibly and disables writes. Public reads use ordered viem fallback across `https://rpc.mainnet.chain.robinhood.com`, `https://robinhood.drpc.org` and `https://robinhood-rpc.publicnode.com`; explorer links use `https://robinhoodchain.blockscout.com`.

ABIs were compiled from [the public L4 contract source](https://github.com/identity-md-launches/launch-1729-blackout-l4-job-b/tree/77c962e6fce9652ee93dff2037b1a09e7a66bd04), pinned commit `77c962e6fce9652ee93dff2037b1a09e7a66bd04`, using Solidity 0.8.26. `web/data/abi-provenance.json` records the build and digest. To regenerate them with Foundry, curl and tar available:

```sh
node web/tools/build-abis.mjs
```

This compiles in a temporary directory, without modifying the existing repository's dependencies or deploying anything. `web/src/upstream-reveal.js` preserves the source `ui/reveal.js` receipt loop; the bridge adds simulation, account/chain checks, abortable waiting and decoded transaction states. v9 adds fully opened receipt detection, plain reveal/re-arm statuses and awareness of already captured starter entropy. A concurrent InvalidValue is treated as already opened only after the chain confirms completion. Entropy uses **ArbSys native blocks**, matching `ChainClock.sol`, including the 256-block capture window and expired-receipt rearming.

`web/data/starter-snapshot.json` contains all 2,000 latest owners at Ethereum head **26190561**, its block hash, and every collection Transfer after snapshot **26182375** through that head. Each build reverses the 17 transfers in descending block/transaction/log order, then constructs the snapshot tree. The leaf is single `keccak256(abi.encode(uint256,address))`; leaves and sibling pairs are sorted, and an odd node is promoted, exactly matching `tools/starter_merkle.py`. The captured evidence makes rebuilds reproducible without 2,000 historical owner calls.

To refresh the public evidence, run `node web/tools/run.mjs snapshot`, then rebuild. The default Ethereum RPC is publicnode; `ETHEREUM_RPC_URL` may select another public endpoint. No credential belongs in this repository or export.

| Tree | Verified root | Delivered proof file |
| --- | --- | --- |
| Identity MD, token IDs 0–1999 | `0xb7d282d1c46f6062963bf2d134d058aa4de3af4cb7b092c5a0fd12ed74dc0f2c` | `public/starter-tree.json`, copied to `dist/` |
| Exact ordered 11-wallet free list | `0xdc0842e9fd0017b08be09e787e877c53cfb446ca52aabdb9770e5c33b49d1325` | `public/free-tree.json`, copied to `dist/` |

The browser lazily loads the proof files on Packs, verifies the selected wallet's proofs against pinned and live roots, shows eligible snapshot token IDs and hides the free-claim button from unlisted wallets. NFT claims run from launch +48 hours until launch +16 days. Free claims end at the live `freeClaimEnds()` value. Receipts are recovered from wallet-filtered chain logs, with an optional local scan cursor and manual receipt-ID lookup. Local storage is only a cache; ownership and claims remain on chain.

## ETH purchase and reveal behavior

The pack price is `PackSale.quote(n)`; `V4Market.quote(1 ETH)` provides the fee-adjusted hook rate. All spend calculations use integer wei. For slippage `s` (300 basis points by default), `maxCost = ceil(quote × (10000+s)/10000)`. The ETH input funds that maximum even if the swap output falls by `s`; `minTokens = floor(hookQuote(input) × (10000-s)/10000)`. The app verifies `minTokens >= maxCost`, including hook rounding. Thus each leg has 3% protection; the combined input buffer is about 6.19% at the default. The ETH amount shown includes that buffer and fees, with gas separate. Exact amounts are shown before signing; surplus BLACKOUT is returned to the connected wallet. Quotes are refreshed for confirmation and simulation must pass before signing.

The primary path sends only `PackSale.buyWithETH(connectedWallet, n, minTokens, maxCost)` with its ETH value. BLACKOUT payment reads allowance, approves only if it is below the quote, then sends `openPack(n)`. That token method has no explicit maximum-cost argument; its final charge follows the inclusion-time price and available allowance. No gifting controls are provided.

A purchase creates a receipt. The app waits for its native reveal block, then offers Reveal for one pack. Expired entropy is re-armed through the existing contract flow and can require a second signature. Opened receipts disappear from the pending list; receipt and inventory reads reload automatically, while revealed art stays visible. Fully opened receipts, including a concurrent `InvalidValue` with verified completion, point to Farm without an error. The active confirmation dialog displays transaction progress and explorer links.

## Reliability and player feedback

The public client batches contract reads through deployless Multicall3. This uses read-only `eth_call`; it does not deploy a contract or assume a Multicall address. Account-sensitive transaction simulations preserve the player's caller, and balance/block/log RPC methods use JSON-RPC batching where possible. Each provider has a 6-second timeout; a failed fallback cycle retries twice with 500ms then 1,000ms backoff. The default endpoint order is fixed. Addresses, verified roots, launch constants, bundled ABIs, proof files and immutable activity item metadata are cached. Failed cache entries are evicted.

One 15-second scheduler loads shared status plus the visible route. It stops when the document is hidden. A transport-level visibility gate also pauses confirmation polling and fallback attempts until the page is visible. Navigation, Refresh and transaction completion can request an immediate read. Local one-second countdown updates make no RPC requests. A failed read retains the previous value and adds a small Reconnecting badge. New sessions show an explicit loading/unavailable state. Quotes are refreshed before purchase confirmation and every write is simulated; a stale display never bypasses those checks.

All 41 ABI error names have plain-language mappings, including action-specific handling for placement, sale status, inventory space, claim windows, liquidity, price limits and reveal timing. Level gates are visible before selecting hardware: Common/Rare any level, Epic 3, Legendary 5, Mythic 10; each room permits one of each type. Fresh placement reads and simulation protect against a stale selection. A successful reveal shakes/glows the pack, flips three rarity-colored cards and emits particles. Reduced motion removes these animations without hiding the items. Sound starts off and can be enabled with the Packs or footer toggle.

Dollar estimates use the actual Coinbase ETH/USD spot price and the on-chain BLACKOUT/ETH market rate. They are indicative, exclude execution impact and gas, and are labeled unavailable when no price exists. A retained ETH/USD quote older than two minutes says “last price.” Pending-reward tax/net comes from a caller-aware claim simulation. The deployed contract stores individual credit ages privately, so the UI explains the 20% to 5% seven-day schedule and approximately seven-minute basis-point steps rather than inventing one exact tax-drop timestamp for mixed-age credits. Estimated epoch earnings use the wallet's last settled epoch's shares, reward-per-hash, electricity tariff (including the district discount) and audit. It excludes redistributed tax, referrals and auto-repair; future earnings can differ.

The activity feed reads actual registrations, pack resolutions and settled mining payments. Initial history is bounded to 216,000 recent blocks, fetched in 20,000-block ranges; later reads scan the new tail with a 16-block reorg overlap. Pack labels use mint logs and immutable item kind/rarity; destroyed items omit erased detail. No synthetic event fills an empty feed. The leaderboard reads every registered farm in groups of 50 and ranks the current epoch's positive weights; it displays the top 20.

## Validation

See [reports/v10/validation.md](reports/v10/validation.md) for actual commands, results, six-domain design review, fixes and limitations. [DESIGN.md](DESIGN.md) describes the final source. Earlier reports are historical, not v10 evidence. Recorded results: build/typecheck passed; 94 wallet/RPC flow checks, 8 reveal/recovery groups and 16 visual checks passed in Chromium and WebKit; zero axe violations across 14 tested states; the pinned probe passed 16/16. Browser-native request diagnostics and untested real-wallet actions are documented in the report.

```sh
node web/tools/run.mjs typecheck
node web/tools/run.mjs build
node web/tools/v10-check.mjs unit
node web/tools/v10-check.mjs live
node web/tools/v10-check.mjs
node web/tools/check-proofs.mjs
node web/tools/render-og.mjs --check
node web/tools/check-delivery.mjs
node web/tools/bundle-trial.mjs
```

`web/tools/interactions.ts` serves the actual export under `/preview/` and uses deterministic ABI-aware wallet/RPC fixtures only inside test browser contexts. It covers the preserved ETH purchase, both slippage bounds, BLACKOUT allowances, reveal/re-arm/race flows, proof submission, post-reveal controls, dialog feedback, placement, rewards, three-provider failover, total outage, last-good data, visibility polling, claim windows and leaderboard reads. Separate checks exercise normal/reduced-motion reveals, mute, a ticking clock, native desktop drag and responsive/keyboard behavior. Fixtures never broadcast a transaction or supply a key.

Install Playwright browsers outside the repository with `/tmp/blackout-web-toolchain/node_modules/playwright/cli.js install chromium webkit`. `BLACKOUT_CHROME_PATH` and `BLACKOUT_WEBKIT_PATH` select installed executables; `BLACKOUT_BROWSER_CONSTRAINED=1` limits Chromium processes. `FIXTURE_ONLY=1` runs deterministic interactions (`FLOW_ONLY=1` isolates the wallet/RPC flow suite), `VISUAL_ONLY=1` runs live public-RPC rendering, and `JUICY_ONLY=1 FIXTURE_ONLY=1` isolates reveal/drag/recovery checks. `BLACKOUT_TEST_ENGINE=chromium` or `webkit` can isolate one engine while debugging. Tests write temporary screenshots in `test/scratch/` and named results in `artifacts/v10/`; the final retained copies are in `reports/v10/`. The supplied checkout excludes `artifacts/`, so no ignore file was changed. The social-image regression freshly renders the city and live badge and compares it with both delivered PNGs; regenerate with `node web/tools/render-og.mjs`, then rebuild.

No real wallet transaction was signed or broadcast. Native wallet signing, Coinbase account onboarding, physical phones, native screen readers, browser-native zoom, live social unfurls and the external `/freepack` service were not end-to-end tested. Automated checks and worker-written reports are not independent certification. Public RPC and price-service availability remain external; failed reads never substitute invented data.

## Delivery and attribution

The plane publishes the supplied `dist/` under the existing label after submission. No publishing command, contract deployment, token mint or domain change was performed. Preserve the independently served `/freepack` path when attaching the export to playblackout.xyz. Social metadata retains the canonical `https://playblackout.xyz/og.png`, also included locally.

The export and compact v10 review evidence fit within the **8 MiB** submission budget; a temporary standalone Git bundle checks the complete current-file snapshot. The byte report separately records the supplied checkout’s incomplete historical objects. All runtime city art, sprites, fonts, social images, source, lockfile and required proof assets remain. No ignore file was added or modified, and no submodule or dependency/cache directory is included. See the final byte audit in `reports/v10/delivery.json`.

Artwork/font notices remain in [NOTICE.md](NOTICE.md) and `licenses/`; this includes Better Interface guidance and official wallet marks.
