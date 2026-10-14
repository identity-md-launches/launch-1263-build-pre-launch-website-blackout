# BLACKOUT

BLACKOUT is a static, wallet-connected mining game on **Robinhood Chain (4663)**. The existing pixel city, dispatcher, hardware art, How to play, Launch, Coming soon, guide and risks remain. The app reads the deployed contracts and asks the player's wallet to sign transactions. It contains no backend, keys or simulated player balances.

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
| `#/` | Epoch/countdown, pool funding and available rewards, hook price/tax, eight district stability readings, all eight Civic phases |
| `#/farm` | Wallet level/XP/district, rooms and paginated inventory, place/unplace, repair quote, scrap confirmation, room purchase, pending rewards and simulated claim tax |
| `#/packs` | ETH-first purchase in one transaction, 1–10 stepper, 3% slippage under Advanced, secondary BLACKOUT payment with allowance-aware approval, snapshot/free claims and automatic reveal recovery |
| `#/city` | Grid events, next plan, dispatcher letter/hash, district stakes and gated lock/lobby controls |
| `#/season` | Wallet-free week selection, pot/results and district scores; wallet gating only for reward claims |
| `#/billboards` | Current board messages and bids, gated next-week bid form and refunds |
| `#/docs` | Mechanics, exact-input buying rules, fees, launch, starter eligibility and risks |
| `#/contracts` | All 18 supplied addresses, explorer links, registry verification, launches 1628 / 1710 / 1722 / 1729 |

`#/wallet` is a compatibility alias for Farm. Guide sections have hash links, including `#/docs/risks`. No server rewrites are required. The former demo source remains for historical reference and shared artwork; its state and balances are not imported into the live app.

Browser extensions are discovered with EIP-6963. The one Connect control also offers Coinbase Smart Wallet. On phones without a provider, it offers official MetaMask, Coinbase Wallet, Rabby and Phantom browser deep links carrying the current URL. Chain switching/addition uses chain 4663 and the supplied RPC/explorer. Public reads never need wallet authorization. Transactions are simulated, reviewed, signed by the selected wallet, and tracked as awaiting signature, pending, confirmed or reverted with decoded contract errors and explorer links.

## Contracts, proofs and source provenance

The complete config is **`web/src/config.ts`**. Game modules resolve through `GameRegistry.module(role)` on load and refresh. Every module is compared with its supplied address; token, market, desk, fee router and both roots are also checked. A mismatch warns visibly and disables writes. The RPC is `https://rpc.mainnet.chain.robinhood.com`; explorer links use `https://robinhoodchain.blockscout.com`.

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

## Validation and current chain state

The v9 checks include a passing production build and typecheck, 78 wallet-fixture checks in Chromium and WebKit, 16 visual/read-state checks, zero axe violations across eight tested states, the OG regression, and 16/16 pinned design checks. The final combined run passed all 94 browser checks, with no script errors or RPC limitations after repairing the local WebKit TLS runtime. Current evidence is in [reports/v9/validation.md](reports/v9/validation.md), with browser checks, live reads, proof checks, the design probe and size audits. [DESIGN.md](DESIGN.md) describes the final tokens and components. Reports for v8 and older revisions are historical.

```sh
node web/tools/run.mjs typecheck
node web/tools/run.mjs build
node web/tools/run.mjs check-live
node web/tools/run.mjs test
node web/tools/check-proofs.mjs
node web/tools/render-og.mjs --check
node web/tools/check-delivery.mjs
node web/tools/bundle-trial.mjs
```

`web/tools/interactions.ts` runs Playwright Chromium and WebKit, with deterministic ABI-aware wallet/RPC fixtures confined to test browser contexts. It checks the ETH transaction and both slippage bounds, BLACKOUT allowance cases, waiting/re-armed/completed receipts, read-only week selection, post-reveal controls and in-dialog transaction feedback. The OG check is the fourth v8 regression. It compares a fresh rendering of the current city and badge with both delivered PNGs. To regenerate the card: `node web/tools/render-og.mjs`, then rebuild.

Install test browsers outside the repository using `/tmp/blackout-web-toolchain/node_modules/playwright/cli.js install chromium webkit`. `BLACKOUT_CHROME_PATH` and `BLACKOUT_WEBKIT_PATH` can select installed browser executables. `BLACKOUT_BROWSER_CONSTRAINED=1` limits Chromium renderer processes for constrained machines. Tool and browser caches belong outside this repository. Tests manage their own static server under `/preview/` and close browser sessions; disposable screenshots go to `test/scratch/`, retained results to `reports/v9/`. `FIXTURE_ONLY=1` runs wallet fixtures; `VISUAL_ONLY=1` runs the separate public-RPC visual pass. These produce `fixture-validation.json` and `visual-validation.json` respectively; the default runs both. No fixture broadcasts a transaction or supplies a key.

At the recorded v9 live read (2026-10-14, block 88416616), the chain reported **epoch 1**, **RewardPool.endowed = true**, **PackSale.ready = true**, two registered farms and all eight Civic flags disabled. Seventy-seven distinct live methods succeeded; all 14 module addresses and both proof roots matched. These values describe that observation and will change.

No real transaction was signed or broadcast. Native wallet signing, Coinbase account onboarding, physical phones, native screen readers, browser-native zoom, live X unfurls and the external `/freepack` service were not end-to-end tested. Automated browser checks and worker-written reports are not independent certification. Public RPC availability remains external; observed browser read failures and recovery are recorded in the v9 report. The UI offers Retry and never substitutes invented chain data.

## Delivery and attribution

The plane publishes the supplied `dist/` under the existing label after submission. No publishing command, contract deployment, token mint or domain change was performed. Preserve the independently served `/freepack` path when attaching the export to playblackout.xyz. Social metadata retains the canonical `https://playblackout.xyz/og.png`, also included locally.

The export and compact v9 review evidence fit within the **8 MiB** submission budget; a temporary standalone Git bundle checks the complete current-file snapshot. The byte report separately records the supplied checkout’s incomplete historical objects. All runtime city art, sprites, fonts, social images, source, lockfile and required proof assets remain. No ignore file was added or modified, and no submodule or dependency/cache directory is included. See the final byte audit in `reports/v9/delivery.json`.

Artwork/font notices remain in [NOTICE.md](NOTICE.md) and `licenses/`; this includes Better Interface guidance and official wallet marks.
