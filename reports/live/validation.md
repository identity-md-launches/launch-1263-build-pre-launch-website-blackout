# BLACKOUT live-app validation

Worker verification performed on 2026-10-14 against the production static export. These are local observations, not an independent certification or a claim that mainnet transactions were broadcast. The assignment's external verifier checks paths and bytes only.

## Delivered scope

The export retains the existing `blackout-mine-the-city-pray-the` label, original pixel city, dispatcher, hardware/district artwork, How to play, Launch, Coming soon, guide and risks. Header/hero links still target the separately served `https://playblackout.xyz/freepack`; no route at that path is generated. All supplied contract addresses, chain 4663, RPC, explorer, pool parameters and four launch numbers are configured.

Home reads epoch/timing, reward funding/availability, market price/tax, district stability and all eight Civic flags. Farm reads wallet inventory and rooms and provides placement, removal, quoted repair, scrap, room purchase and taxed reward claims. Packs provides quoted BLACKOUT purchases, gifts, ETH buys with explicit limits, verified NFT/free claims, log-discovered receipts, capture/rearming and the source reveal loop. City, Season and Billboards read chain state and gate disabled modules. Contracts and Field guide expose the addresses, buying constraints and risks.

## Commands and evidence

Final results: **72 browser checks passed**, with Chromium **154.0.8037.57** and WebKit **26.0**. The final interaction report has no errors or runtime limitations. Axe found zero violations in Packs and populated Farm for both engines. The pinned visual probe passed **16/16**. The final live-read report contains **75 successful distinct methods** and three explicitly expected conditional rejections. Earlier external CORS behavior remains documented below.

The current commands use the external toolchain at `/tmp/blackout-web-toolchain`, installed from `web/package-lock.json`. Existing root build/dependency files were unchanged.

| Actual command | Result / evidence |
| --- | --- |
| `node web/tools/build-abis.mjs` | Foundry compiled pinned source with Solidity 0.8.26; 19 ABI entries including IERC20/ERC-6093 errors; digest in `web/data/abi-provenance.json` |
| `node web/tools/run.mjs snapshot` | Enumerated 2,000 owners at Ethereum head 26190561 and captured 17 post-snapshot Transfers; public evidence retained in `web/data/starter-snapshot.json` |
| `node web/tools/run.mjs typecheck` | TypeScript strict/noEmit check passed |
| `node web/tools/run.mjs build` | Production build passed, including ABI digest, ownership rollback, 2,011 proof checks and both live root comparisons; local relative-URL export in `dist/` |
| `node web/tools/check-proofs.mjs` | Baseline passed; altered snapshot owner and reordered free list each failed with the required root mismatch; `build-guards.json` |
| `node web/tools/run.mjs check-live` | Live reads passed; all 14 registry modules and both claim roots matched; `live-reads.json` |
| `BLACKOUT_WEBKIT_PATH=/tmp/blackout-webkit-launch node web/tools/run.mjs test` | Chromium and WebKit production-export/browser-fixture results in `interaction-validation.json` |
| `IMD_PLAYWRIGHT=/tmp/blackout-web-toolchain/node_modules/playwright/index.mjs node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | Pinned probe passed 16/16 checks; `taste.json` and retained home screenshots |
| `node web/tools/check-delivery.mjs` | Checks protected paths, required files, relative assets, no submodules/caches and raw bytes; `delivery.json` |
| `node web/tools/bundle-trial.mjs` | Creates and verifies a complete current-file Git bundle entirely in a temporary bare repository; byte count and history limitation in `bundle-trial.json` |

The build's Rollup notices concern removable `/*#__PURE__*/` annotations inside third-party `ox`/`porto` dependencies. They did not prevent bundling. No source map, dependency archive, registry mirror or dependency directory is shipped.

The WebKit runtime initially lacked system libraries and TLS modules. Browser binaries and the required packages were downloaded/extracted under `/tmp`, and an external launcher supplied those library/module paths. No repository or system dependency directories were modified. The final WebKit checks use that working runtime. Chrome used the machine's installed headless Chrome.

## Real-chain checks and limits

`live-reads.json` records the block, time, chain ID, every successful distinct read method and conditional errors. It covers the displayed statistics, wiring, room eligibility/quotes, empty inventory enumeration, receipt tuple decoding, claim eligibility, district/season/billboard reads, token allowance and market quotes.

At verification, FarmCore had **zero registered farms** and FarmItems.nextId was **1**. RewardPool was **not endowed**, available rewards were **0**, PackSale.ready was **false**, epoch was **0**, and all eight Civic flags were **false**. The app reflects these values. Successful populated-item quote and mutation paths cannot be validated against nonexistent on-chain hardware. The live contracts correctly returned `InvalidValue` for nonexistent item output/repair quotes and `FeatureDisabled` for lobbying. These are explicitly recorded conditional paths, not successful populated reads.

The browser's real RPC requests occasionally encountered malformed upstream CORS headers: `Access-Control-Allow-Origin: *,*`. The app displayed a read failure and Retry recovered in observed checks. This is an external service limitation; a static client cannot repair an upstream CORS policy. No proxy or substitute RPC was introduced. Normal loading and fixture runs produced no uncaught application script errors; CORS failures are not counted as successful reads.

No wallet keys were used, no live transaction was signed or broadcast, and no contract was deployed or changed. External wallet onboarding, real Coinbase Smart Wallet support on this chain, physical phone deep-link handoff, real spending/gas estimation, the external freepack service, public-domain publication and X unfurl were not end-to-end tested.

## Interaction coverage

The test serves the actual export under `/preview/` to check gateway-relative assets. Real-RPC page states were checked at **320, 390, 768 and 1440px**, including the first 390px product/action placement, main hash routes, no horizontal overflow, 200% root-text reflow, preserved hardware carousel, mobile wallet links, modal Escape/focus restoration and script-error handling.

Separate controlled browser contexts intercept RPC and EIP-1193 requests with ABI-aware fixtures. They verify calldata and state transitions for named EIP-6963 discovery, unknown-chain addition followed by explicit switching, place/unplace, repair approval/quote, paid rooms, gross/tax/net reward claims, scrap cancellation/minimum, snapshot token #1927, exact free eligibility, unlisted-wallet exclusion, token purchases, gifts, ETH minTokens/maxCost/value, native capture-clock refresh without focus loss, expired-window rearming and reveal, user rejection, decoded preflight/custom/token errors, mined reverts, pending-to-confirmed explorer links, disabled phases, registry mismatch/recovery and RPC outage/retry. These fixture transactions cannot reach the chain.

Axe WCAG A/AA checks cover unconnected Packs and populated Farm in both engines. Native screen readers, switch devices and real browser-native zoom are not claimed; the enlarged-text test sets root text to 200%. Test screenshots under `test/scratch/` are disposable; selected evidence is retained under `reports/live/screenshots/`. The Farm image is clearly named as fixture data, not a live balance.

## Better Interface review: six domains

The pinned guide's workflow, all six core-principle sections, applicable browser/non-browser checks, and document-web-design section were read and applied while building. The final implemented tokens/components/responsive behavior are documented in root `DESIGN.md`.

| Domain | Coverage | Finding, location and fix | Remaining limitation |
| --- | --- | --- | --- |
| Accessibility | Semantic structure, labels, keyboard/focus, native dialogs, live regions, axe, reduced motion | `web/src/views.ts:13`: note text was a direct child of a description-list group; moved it inside `dd`. `web/src/wallet.ts:70`: dialog Escape/close returns focus to its trigger. `web/src/main.ts:287`: enlarged-text mode keeps chrome out of the content's way. | Native screen-reader and physical-device testing not performed; axe is not a complete conformance audit. |
| Layout | Actual production pages at four widths; 390px first screen; 200% root text; overflow and clipping probe | `web/src/live.css:131`: removed inherited clipping around the horizontal hardware rail. `web/src/live.css:137`: removed the landing's bottom-tab overlap while retaining game tabs. `web/src/live.css:142`: enlarged header now wraps; `web/src/live.css:155`: guide grid children can shrink and its links stack. | No foldable-device or browser-native zoom testing. |
| Writing | First-screen product/action, field labels/units, state/error copy, docs versus deployed source | `src/landing.ts:6`: live product description/action replace demo language; removed redundant eyebrow/slogan text. `web/src/views.ts:57`: season's second score value is counted token spend, not a farm count. `web/src/docs.ts:6`: exact-input price limit and fee separation explained. | External contract risk reports are linked, not independently audited here. |
| Typography | Local font loading, consistent scale, measured rendered families/weights, paragraph readability | `web/src/live.css:132` and `:139`: prose and dispatcher quotes use proportional system type; pixel headings/monospace values remain. Source scale has six sizes; probe found three families/two weights and at most five sizes on the landing. | Pixel typography is intentionally retained; readability preferences vary. |
| Colors | Six computed opaque WCAG contrast pairs, rendered probe, text labels alongside rarity/phase colors | `web/src/live.css:1`: success token supplements the inherited cyan/yellow/magenta palette. Error, pending and confirmed states have labels plus borders. `DESIGN.md` records the actual measured ratios. | Probe did not measure 20 text boxes over artwork/gradients. Ten inline targets passed spacing rules but are below 44px. |
| UI | Primary flows, loading/empty/error/retry states, confirmations, value limits, responsive controls, motion | `web/src/wallet.ts:56`: add-network now explicitly switches afterward. `web/src/chain.ts:41`: nested/raw revert bytes decode against built ABIs. `web/src/main.ts:63`: registry mismatch remains visible even if dependent reads fail. Receipt clocks update every three seconds without replacing forms; disabled Civic features stay Coming soon. | Successful on-chain writes and wallet-provider onboarding were not performed; controlled fixtures establish UI behavior, not chain execution. |

The pinned taste probe checks render, layout, targets, contrast, casing, tracking, eyebrow labels, type sizes/faces, glyphs, slogans, repetition, copy budget, component decoration, motion and metadata. All 16 final checks passed. The preserved 390px and 1440px screenshots were inspected; the first mobile screen shows the wordmark, main farm action, external starter link, Connect and hero city. Under reduced motion the probe found zero running animations.

## Packaging and handoff

All required public/runtime assets remain: proof JSON, wallet marks, original city/sprites, fonts, app/OG images and favicon. The original downloadable Legendary GPU art is retained. Sixty-four historical validation screenshots totaling **5,191,342 bytes** were removed; their reports remain marked historical. This reduction does not remove application art or required deliverables.

No ignore file was modified, no submodule was left, and dependencies/caches remain outside the repository. `delivery.json` records the exact raw size and export hashes. `bundle-trial.json` measures the complete current-file Git bundle and also conservatively adds the available base pack size. A full-history trial could not include unavailable historical object `05b93ddf7e55d6fa4f8f718114d0b47203176d16`; the plane's final metadata/history packaging is outside this worker. The current-file bundle contains every required deliverable and is below 8 MiB.

The plane publishes the supplied export under the existing site name. No publishing command was run and no new live CID or domain availability is claimed.
