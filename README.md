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
| `#/packs` | BLACKOUT quote and exact approval, `openPack`, gifts, atomic ETH purchase with minimum output and maximum pack cost, snapshot/free claims, capture and reveal receipts |
| `#/city` | Grid events, next plan, dispatcher letter/hash, district stakes and gated lock/lobby controls |
| `#/season` | Week selection, pot/results, district token-spend scores and eligible claims |
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

This compiles in a temporary directory, without modifying the existing repository's dependencies or deploying anything. `web/src/upstream-reveal.js` preserves the source `ui/reveal.js` receipt loop; the bridge adds simulation, account/chain checks, abortable waiting and decoded transaction states. The only helper edit is naming its default status argument for TypeScript inference. Entropy uses **ArbSys native blocks**, matching `ChainClock.sol`, including the 256-block capture window and expired-receipt rearming.

`web/data/starter-snapshot.json` contains all 2,000 latest owners at Ethereum head **26190561**, its block hash, and every collection Transfer after snapshot **26182375** through that head. Each build reverses the 17 transfers in descending block/transaction/log order, then constructs the snapshot tree. The leaf is single `keccak256(abi.encode(uint256,address))`; leaves and sibling pairs are sorted, and an odd node is promoted, exactly matching `tools/starter_merkle.py`. The captured evidence makes rebuilds reproducible without 2,000 historical owner calls.

To refresh the public evidence, run `node web/tools/run.mjs snapshot`, then rebuild. The default Ethereum RPC is publicnode; `ETHEREUM_RPC_URL` may select another public endpoint. No credential belongs in this repository or export.

| Tree | Verified root | Delivered proof file |
| --- | --- | --- |
| Identity MD, token IDs 0–1999 | `0xb7d282d1c46f6062963bf2d134d058aa4de3af4cb7b092c5a0fd12ed74dc0f2c` | `public/starter-tree.json`, copied to `dist/` |
| Exact ordered 11-wallet free list | `0xdc0842e9fd0017b08be09e787e877c53cfb446ca52aabdb9770e5c33b49d1325` | `public/free-tree.json`, copied to `dist/` |

The browser lazily loads the proof files on Packs, verifies the selected wallet's proofs against pinned and live roots, shows eligible snapshot token IDs and hides the free-claim button from unlisted wallets. NFT claims run from launch +48 hours until launch +16 days. Free claims end at the live `freeClaimEnds()` value. Receipts are recovered from wallet-filtered chain logs, with an optional local scan cursor and manual receipt-ID lookup. Local storage is only a cache; ownership and claims remain on chain.

## Validation and current chain state

Final checks passed: strict typecheck and production build; 75 distinct successful live read methods plus three expected conditional error cases; both roots and all 2,011 proofs; 72 browser checks across Chromium 154 and WebKit 26; zero axe violations in the four tested engine/page states; 16/16 pinned design-probe checks.

Current evidence is in [reports/live/validation.md](reports/live/validation.md), with machine-readable live reads, proof checks, interaction checks and design-probe results. [DESIGN.md](DESIGN.md) documents the final implemented design. Earlier reports describe historical demo revisions and are not current validation.

```sh
node web/tools/run.mjs typecheck
node web/tools/run.mjs build
node web/tools/run.mjs check-live
node web/tools/run.mjs test
node web/tools/check-proofs.mjs
node web/tools/check-delivery.mjs
node web/tools/bundle-trial.mjs
```

The browser tests use Playwright Chrome and, when installed, WebKit. Install browsers outside the repository using the external toolchain's Playwright binary. `BLACKOUT_CHROME_PATH` can select Chromium; otherwise the test uses installed Chrome. `BLACKOUT_WEBKIT_PATH` can select a WebKit launcher; otherwise Playwright uses its installed browser. Tests own their local server and close browser sessions. Screenshots go to disposable `test/scratch/`; results go to `reports/live/`. Fixture providers intercept requests only inside test browser contexts and never broadcast a transaction. The test suite also exercises real public-RPC reads in the exported app.

At verification on 2026-10-14, the chain reported **epoch 0**, **RewardPool.endowed = false**, **PackSale.ready = false**, and all eight Civic flags disabled. The app shows these states and blocks unavailable purchases. This interface cannot fund the pool or activate swarm-controlled phases. There were no live farms or minted items, so populated inventory and successful write flows were tested with deterministic ABI-aware browser fixtures. Existing-item quote methods correctly rejected nonexistent items with `InvalidValue`; disabled lobbying rejected with `FeatureDisabled`.

No real transaction was signed or broadcast. Native-wallet signing, Coinbase account onboarding on this chain, physical phones, native screen readers, live X unfurls and the external `/freepack` service were not end-to-end tested. Public RPC availability remains an external dependency. Browser inspection observed an intermittent duplicate `Access-Control-Allow-Origin: *,*` response from the supplied RPC; the app reports the read failure and offers Retry, which recovered in validation. A static app cannot correct an upstream CORS header. A disconnected static UI can load local assets, but it cannot invent chain data or submit transactions.

## Delivery and attribution

The plane publishes the supplied `dist/` under the existing label after submission. No publishing command, contract deployment, token mint or domain change was performed. Preserve the independently served `/freepack` path when attaching the export to playblackout.xyz. Social metadata retains the canonical `https://playblackout.xyz/og.png`, also included locally.

Old report screenshots were removed to keep the complete submission below **8 MiB**. All runtime city art, sprites, fonts, social images, source, lockfile and required proof assets remain. No ignore file was added or modified, and no submodule or dependency/cache directory is included. See the final byte audit in `reports/live/delivery.json`.

Artwork/font notices remain in [NOTICE.md](NOTICE.md) and `licenses/`; this includes Better Interface guidance and official wallet marks.
