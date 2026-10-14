# BLACKOUT v9 validation

This is the worker’s record of local checks, not independent certification. Scope: simplify the existing Packs screen, repair the four v8 findings quoted in the brief, preserve the live integration and art, and deliver a static production export. `.imd-findings.json` was not present; the four supplied findings were used directly. Hosting and the final publisher bundle are outside this task.

The visual idea remains a mining game inside a neon pixel city. The site label is still `blackout-mine-the-city-pray-the.sites.imd.fun`, with `https://playblackout.xyz` and the separately served `/freepack` link unchanged. No contract was deployed, token minted, real wallet connected or real transaction broadcast.

## Requirements and regression evidence

| Requirement | Result and evidence |
| --- | --- |
| One primary “Buy pack with ETH” transaction | Implemented in `web/src/main.ts:173`. Browser fixtures decode exactly one `buyWithETH` call to the pinned PackSale, with connected wallet, quantity, value and both limits; no approval call. |
| ETH-first pricing, 3% default, Advanced settings | `web/src/packs.ts:15` combines `PackSale.quote(n)` with the fee-adjusted `V4Market.quote`. Integer rounding funds the maximum cost even at the minimum swap output. Tests check exact 3% and 5% calldata/value and reject invalid slippage before signing. |
| Smaller BLACKOUT payment, sufficient allowance skips approval | `web/src/wallet.ts:141` uses `allowance < amount`. Tests assert approve + openPack at zero allowance, and only openPack for equal and greater allowances. |
| No gift field or buyPacksFor UI | Removed from purchase handlers, views and the active field guide. The pinned ABI remains unchanged. |
| Stepper from 1 to 10 | Native buttons/output in `web/src/views.ts:45`; both bounds, quote updates and keyboard focus tested. |
| Plain pack description and demand note; no open-sale duplicates | Exact requested copy in `web/src/views.ts:43` and `:52`. Open-sale fixtures assert no “Opens at” or “Purchases open” text in the purchase panel. |
| Waiting, Reveal, re-arm, hardware, Farm | `web/src/views.ts:57`, `web/src/reveal.ts:31`, `web/src/upstream-reveal.js`. Tests cover waiting without a Reveal button, readiness, expired entropy, remaining-count reload, three hardware cards and Farm instruction. Captured starter entropy remains usable after 256 blocks. |
| Fully opened receipt handling | `web/src/views.ts:60` hides Reveal. Manual lookup and concurrent completion are tested. `InvalidValue` is suppressed only after an on-chain receipt read proves completion; an unrelated InvalidValue stays visible. |
| v8: View week without a wallet | `web/src/main.ts:72` gates only `data-write` controls. Both engines select week 2 before connecting, with no wallet authorization request; reward claims remain disabled. |
| v8: buy/claim controls recover after reveal | The same gate now enables as well as disables controls while retaining eligibility. Result state persists through reloads (`web/src/main.ts:193`). Tests use buy, NFT and free-claim controls after revealing, without reloading the page. |
| v8: progress inside the active dialog | `web/src/main.ts:76` renders transaction label, awaiting-wallet/pending state, detail, hash and explorer link in the dialog. Tests hold signature and mining, inspect the active modal, check failure/cancel, and assert Escape cannot dismiss while signing. |
| v8: live social image | `web/tools/render-og.mjs` renders the current SVG city at 1200×630 with “BLACKOUT on Robinhood Chain”. `--check` freshly renders it and compares bytes with both public and production PNGs; passed. |
| Static export, metadata, first phone screen | Production `dist/index.html`, JS/CSS, art/fonts and proof files included. Relative local references checked. Title, favicon, description, og:title/image checked by the pinned probe. Landing and populated Packs screenshots were viewed; main actions are visible at 390px. |
| Preserve addresses, proofs, root checks and dependencies | `preserved-inputs.json` records byte comparisons against the supplied checkout for both manifests/lockfiles, config, ABI/provenance, proof files and tree/guard scripts. All unchanged. Production build verifies both live roots and all 2,011 proofs. |

Purchase and reveal are distinct contract steps: the atomic ETH purchase creates the pack receipt; hardware arrives through its later entropy reveal. A ten-pack purchase is allowed by the pinned contract; the app reveals one at a time, respecting its separate resolution bound. The slippage buffer applies to both legs, so the default ETH funding buffer is approximately 6.19%, not merely 3% more ETH. The UI displays the funded ETH amount; exact limits appear before signing.

Contract mechanics were cross-checked against the pinned primary sources: [PackSale.sol](https://github.com/identity-md-launches/launch-1729-blackout-l4-job-b/blob/77c962e6fce9652ee93dff2037b1a09e7a66bd04/src/PackSale.sol) and [V4Market.sol](https://github.com/identity-md-launches/launch-1729-blackout-l4-job-b/blob/77c962e6fce9652ee93dff2037b1a09e7a66bd04/src/V4Market.sol). No on-chain implementation changed.

## Better Interface review

The pinned workflow and core principles of all six domains were read and applied during implementation. Existing pixel typography, palette, city art and component styling take precedence over a different stylistic preference.

| Domain | Coverage | Findings, fixes and limits |
| --- | --- | --- |
| Accessibility | Checked | Native stepper buttons/output, named fields, field-specific slippage errors, modal progress live region, keyboard activation/focus retention and Escape behavior. Axe checked populated Farm, Packs and the signature dialog in both engines. Native screen readers and physical devices were not tested. |
| Layout | Checked | ETH price and the sole filled purchase action lead the panel; token payment is subordinate and settings use disclosure. Populated Packs reflows at 320/390/768/1440. Phone screenshot shows the primary action above bottom navigation. Live routes and 200% root-text reflow are also tested. Native browser zoom is not claimed. |
| Writing | Checked | Exact plain hardware/demand lines, action labels and recoverable receipt messages. Removed gifting and stale manual-ETH-input directions from the active guide. Technical limits remain in Advanced and the spending confirmation. |
| Typography | Checked | Reused the existing six-size system and local Pixel/Mono fonts; longer new explanations use system sans. Exact amounts and hashes wrap. The landing probe found three families, two weights and four recurring sizes per width. No new font added. |
| Colors | Checked | Existing semantic palette and one yellow purchase action retained. `contrast.json` recalculates six opaque token pairs, all passing their thresholds. The rendered probe and axe checks passed measured-text contrast. Twenty text boxes over artwork/gradients remain unmeasured by the probe. |
| UI | Checked | Rest, focus, disabled, signature, pending, failure, receipt wait/re-arm and success states exercised. Existing reduced-motion rules remain; the probe measured zero running animations under reduced motion. No new animation or surface system. 10%-speed animation-panel review was not performed. |

All four quoted v8 findings were repaired. Related applicable corrections were keyboard focus across quote renders (`web/src/main.ts:43`), an inline invalid-slippage state (`web/src/main.ts:279`, `web/src/views.ts:51`), and distinguishing captured starter entropy from an expired uncaptured receipt (`web/src/upstream-reveal.js:27`). A timing regression also caught the re-arm label persisting briefly after hardware appeared; the reveal finalizer now renders its cleared state immediately (`web/src/main.ts:211`). The receipt assertion checks that the label is gone when controls recover. Their browser regressions passed. No new design finding remains open within the tested scope.

## Commands and actual evidence

- `node web/tools/run.mjs install`: installed the existing pinned frontend dependencies under `/tmp/blackout-web-toolchain`; no manifest, lockfile or repository dependency directory changed.
- `node web/tools/run.mjs typecheck`: strict TypeScript check passed.
- `node web/tools/run.mjs build`: production build passed with live root comparison and 2,011 valid proofs. Rollup emitted harmless PURE-annotation warnings from installed dependencies. See `build.json`.
- `node web/tools/check-proofs.mjs`: baseline and both negative root guards passed. Changed snapshot ownership and a reordered free list are rejected; see `build-guards.json`.
- `node web/tools/run.mjs check-live`: 77 distinct successful methods, no registry mismatch, both roots matched; disabled lobbying returned the expected conditional error. See `live-reads.json`.
- `node web/tools/run.mjs test`: the final combined run passed 94 checks across Chromium 141.0.7390.37 and WebKit 26.0: 78 deterministic interaction checks and 16 live visual/read-state checks, including eight axe states with zero violations. A local Playwright server serves the actual export at `/preview/`; writes are intercepted inside fixture contexts. Live visual checks use the real RPC. The final run reported no uncaught script errors or RPC limitations. See `interaction-validation.json`. Earlier failing reports were replaced by this actual successful run, not combined into a synthetic pass.
- `node web/tools/render-og.mjs --check`: deterministic current-city render equals both delivered PNGs. See `og-validation.json`.
- `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste`: 16/16 pinned checks passed at 320, 390 and 1440; see `taste.json`. First-screen prose: 30 words at 390. No horizontal overflow, overlapping text, missing local assets or script errors in the measured entry page.
- `node web/tools/check-delivery.mjs` and `node web/tools/bundle-trial.mjs`: protected paths, static references, required assets, submodules, dependency/cache exclusions and bytes checked; see the final `delivery.json` and `bundle-trial.json`.

Browser commands used these machine-specific overrides, with all browsers/libraries/caches outside the repository:

```sh
XDG_CACHE_HOME=/tmp/blackout-browser-cache \
XDG_CONFIG_HOME=/tmp/blackout-browser-config \
BLACKOUT_BROWSER_CONSTRAINED=1 \
BLACKOUT_CHROME_PATH=/tmp/hive-review/browsers/chromium-1194/chrome-linux/chrome \
BLACKOUT_WEBKIT_PATH=/tmp/blackout-webkit-networking/webkit.sh \
node web/tools/run.mjs test
# FIXTURE_ONLY=1 or VISUAL_ONLY=1 can select one part when diagnosing failures.
```

The pinned probe used `IMD_PLAYWRIGHT=/tmp/blackout-taste-playwright.mjs`, a launcher-only adapter to the installed Playwright module selecting Chromium and limiting renderer processes. The probe source and measurements were unchanged. Its final successful run used the normal multiple-process browser. Initial runtime attempts failed because of unwritable Chrome cache paths, thread pressure, and a missing WebKit library search path; the overrides above resolved them. The supplied MCP browser could not reach the shell preview (`ERR_CONNECTION_REFUSED` / `ERR_ABORTED`), so actual rendering and interaction inspection used local Playwright plus viewed screenshots.

During test development, a fixture returned a constant block number, which stalled receipt polling after a deliberately held transaction. The fixture now advances block numbers and gives receipt logs their commit block. A test-only BigInt serialization issue from that addition was also fixed. The quantity boundary test now waits for each asynchronous quote before the next gesture. The simulated 503 outage response includes CORS headers, and the outage/retry assertion remains. Diagnostics subsequently showed that the initial WebKit runtime lacked TLS support. Adding only the GnuTLS GIO module under `/tmp/blackout-webkit-networking/tls-only` restored successful live registry reads with no failed requests (`webkit-network-check.json`); enabling the unrelated proxy module caused an internal WebKit error and was removed from the launcher. No repository dependency or RPC endpoint changed. Final results refer to the corrected harness and browser runtime, not those failed runs.

Retained screenshots:

- `screenshots/home-390.png`: final production landing, viewed after the probe.
- `screenshots/packs-fixture-390.png`: populated purchase panel and its mobile hierarchy.
- `screenshots/pending-dialog-fixture-390.png`: exact spend, pending state and explorer link inside the modal.

Other desktop/mobile screenshots are generated under disposable `test/scratch/interaction-shots/` and `test/scratch/taste/shots/`. No screenshot is claimed as a screen-reader or physical-device test.

## Limits and completion

No real spending, wallet onboarding, native app deep-link handoff, native screen reader, live social unfurl, or external `/freepack` service was tested end to end. Early Chromium reads needed one Retry, and an early WebKit run reported 98 access-control errors while its local TLS module was missing. After repairing that browser runtime, both engines completed live reads and all fixtures with no recorded RPC limitations or uncaught script errors in the final combined run. Separate raw HTTP probes with Origin headers returned 403 (`rpc-headers.json`); those earlier observations do not override the successful final browser reads. The public client read check succeeded on 77 methods. No replacement endpoint or proxy was introduced. Deterministic fixtures validate successful transactions and errors, but do not certify production liquidity, wallet support or gas costs.

The full current-file submission bundle is measured in a separate temporary Git repository; this checkout’s `.git` is read only. Supplied historical objects are incomplete, so the report separately states that limit and conservatively adds available base pack bytes to the candidate snapshot. No required runtime asset, proof or dependency manifest was removed. No ignore file changed, no submodule was created, and no publishing command was run.

Complete for the stated implementation scope, with the external-service and manual-check limits above. Final numerical results and byte counts are in the companion machine-readable files.
