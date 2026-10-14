# BLACKOUT v10 revision validation

Checked on 2026-10-14. This revision addresses the three reopened findings, preserving the accepted pixel design, site label, contract addresses, ABIs, proof files, root guards and v9 purchase/reveal behavior. The source and rebuilt relative-URL `dist/` are the deliverables. Nothing was published or deployed and no real transaction was signed.

## Reproduction and fixes

| Finding | Evidence and correction |
| --- | --- |
| `b28c9f4b…` — fallback log ranges | The old receipt reader requested genesis through 9,999,998 and the activity reader used 20,000-block ranges. Real fallback errors include dRPC code 35 (over 10,000 blocks unsupported) and PublicNode HTTP 403 (archive token required). `web/src/logs.ts:27` now probes at most 10,000 blocks, halves rejected ranges, retains the learned size and commits contiguous successful ranges. HTTP 400/403/413 are recognized through viem's wrappers; 429/5xx outages do not cause recursive splitting. Single-block failures propagate without skipping history. `web/src/receipts.ts:16` and `web/src/community.ts:19` checkpoint each range and coalesce concurrent scans. Receipt checkpoints persist in optional localStorage; both readers retain a 16-block overlap. `web/src/chain.ts:16` caps dRPC JSON-RPC batches at three because its free endpoint also rejected larger batches with code 31. |
| `69524115…` — filter refresh | The original export reconstructed from HEAD reproduced the defect in Chromium and WebKit at 390×844: both filters retained their labels after Refresh but showed item 1 and item 2. `web/src/main.ts:53` defines the shared predicate, called after form restoration at line 81 and on change at line 327. Final fixtures verify spare/installed after Refresh and spare plus keyboard focus after a 16.5-second wait for the normal poll. |
| `e7d1d111…` — player wording | Original Packs, City, Season and Billboards displayed the reported wording in both engines. `web/src/views.ts:57`, `:70`, `:74`, `:78` replace it with wallet eligibility, automatic city-event selection and plain coming-soon messages. Removing the snapshot paragraph closes its space in normal document flow; the starter panel measured about 290px in Chromium and 286px in WebKit. Exact snapshot block and proof guidance remain in the existing Docs section. |

Historical pack discovery starts at **88,288,289**, not an assumed recent block. `web/data/deployment.json` preserves the successful L3 factory deployment receipt, emitted eight-module address array, transaction hash and matching block hash. The returned block number was decoded back to decimal and checked. Public historical `eth_getCode` was unavailable; the deployment event/receipt establishes this boundary.

`reproduction.json` retains compact original-export filter/copy observations. Each full finding ID and disposition is in the root `.imd-responses.json`.

## Build and functional checks

| Command/check | Actual result |
| --- | --- |
| `node web/tools/run.mjs typecheck` | Passed. |
| `node web/tools/run.mjs build` | Passed after the final source change. Builds the production export, verifies ABI digest, all 2,000 NFT and 11 free proofs, pinned roots and live StarterClaim roots. Vite emitted existing third-party annotation warnings. |
| `node web/tools/check-proofs.mjs` | Passed baseline and deliberate snapshot-owner/free-list-order mutations: each corrupt input is rejected. `proof-guards.json`. |
| `node web/tools/v10-check.mjs logs` | Three groups passed: adaptive inclusive coverage/learned limits; receipt checkpoint/resume; activity checkpoint/dedup/reorg handling. Includes outage, failed-commit and rejected-single-block cases. |
| `node web/tools/v10-check.mjs unit` | Seven groups passed: 41 contract errors and action reasons, sanitized RPC errors, gates, yield estimate, claim windows, XP/epoch limits and v9 slippage/transport. `unit-results.json`. |
| `node web/tools/v10-check.mjs live` | All three endpoints identified chain 4663; registry/roots, Home, Farm, six leaderboard farms and 20 activity entries read successfully. Compact snapshot in `live-reads.json`. |
| `FIXTURE_ONLY=1 BLACKOUT_TEST_ENGINE=chromium node web/tools/v10-check.mjs` | 52 groups passed; no application errors. `chromium-flows.json`. |
| `FIXTURE_ONLY=1 BLACKOUT_TEST_ENGINE=webkit node web/tools/v10-check.mjs` | 52 groups passed; no application errors. Two native request cancellation/access-control diagnostics during fixture reloads are recorded separately. `webkit-flows.json`. |
| `REVISION_ONLY=1 FIXTURE_ONLY=1 BLACKOUT_TEST_ENGINE=chromium node web/tools/v10-check.mjs` | Seven groups passed. `chromium-regressions.json`. |
| Same revision command with `BLACKOUT_TEST_ENGINE=webkit` | Seven groups passed. `webkit-regressions.json`. |

The revision fixtures enforce fallback log limits of 10,000 and 100 blocks plus dRPC's three-request batch cap; they return actual-style HTTP 400/403 error bodies rather than accepting arbitrary ranges. They exercise fresh-storage paid and starter discovery, a mid-scan outage, resume from the successful cursor, all-down last-good retention and reconnecting feedback. No raw HTTP failure reaches player copy. The full fixture suites preserve ETH purchase in one transaction, 3% bounds/editable slippage, allowance-aware token purchases, pending/reveal/re-arm/concurrent-open handling, proofs/eligibility, claims, placement/drag, reduced motion, mute, onboarding, leaderboard and hidden-page polling. Six axe states per engine (Farm, Packs, signature dialog, Rewards, Leaderboard, More) reported zero violations.

Tests serve the actual export under `/preview/`. Installed dependencies and browser libraries are external under `/tmp`, with executable selection through `BLACKOUT_CHROME_PATH` and `BLACKOUT_WEBKIT_PATH`. Chromium was 141.0.7390.37; WebKit was 26.0. WebKit initially lacked runtime libraries; an external software-EGL wrapper supplied them before the successful runs. No library or browser is included in the submission.

## Live fallback boundary

A separate production-reader test forced only the primary endpoint to HTTP 503 and let both mandated fallback providers answer live. Activity recovered **20 events**. Historical receipt scanning progressed from deployment to block **88,550,682**, but the complete scan did **not** pass: after approximately 802 seconds, dRPC reported free-plan timeouts and PublicNode refused a single-block historical query with its archive-token error. A subsequent direct query for that same single block succeeded on primary and dRPC with empty logs; PublicNode still refused it. The block number/hash were checked on primary. `live-fallback.json` records these results.

This fixes unsupported fixed ranges and loss of scan progress; it cannot make unavailable public history readable. Fresh fallback scans can be slow and require retry. No block is silently skipped and fixtures verify retained progress/resume, but this report does not claim complete live historical pack recovery or a recovery-time guarantee. Providers also intermittently reported unavailable upstreams/methods. No substitute endpoint, paid token or fabricated data was introduced.

## Better Interface review

Applied the pinned Better Interface workflow and all six domain core principles to the changed surfaces. The single visual idea remains a live pixel mining city; no new design system, artwork or CSS was introduced. `DESIGN.md` records the implemented tokens, typography, components and responsive behavior.

| Domain | Coverage, findings and result |
| --- | --- |
| Accessibility | Reviewed native select semantics, restoration of focus/filtered rows, reconnecting status and reduced-motion reveal. Both engines passed the six axe states above. Existing keyboard and reduced-motion behavior remained functional. Physical screen readers and native devices were not tested. |
| Layout | Inspected the 390px Home first screen and revised Packs screenshot; product, Connect, Start mining and mobile tabs remain visible, and Packs keeps its purchase action above the tabs. The deleted eligibility paragraph leaves no fixed-height hole. Changed routes have no horizontal overflow at 320/390/1440 in both engines. |
| Writing | Fixed the reproduced player-copy finding at `views.ts:57/70/74/78`; snapshot/proof detail stays in Docs. Reconnecting language and action controls remain plain. |
| Typography | No font/scale change. Probe reported five sizes at 390 and four repeated sizes at 1440, three families and two weights. Native filter and eligibility text wrap without measured overflow. |
| Colors | Existing navy/cyan/yellow/magenta tokens retained. Probe passed measured text pairs at its 4.5:1 normal / 3:1 large thresholds. Twenty boxes over art/gradients were not measured; no blanket contrast-compliance claim. |
| UI | Original pixel rooms/city, reveal, controls and states preserved. Polling now restores both the filter label and its result. Existing motion check found no continuing animations under reduced motion. Twelve controls are below the comfortable 44px size but all measured controls meet the probe's 24px-or-spacing threshold. |

Final pinned probe command (temporary output kept outside the submission):

```sh
IMD_PLAYWRIGHT=/tmp/blackout-web-toolchain/node_modules/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/tmp/quantum-canary-review/browsers \
node .imd/reads/skills/design-critic/scripts/taste.mjs --out /tmp/blackout-taste-final
```

**15/16 automated checks passed.** `taste-checks.json` preserves the check output. The one candidate is the unchanged `src/landing.ts:12` heading “Buy tax after token launch” above the first fee value “90%”. Source and full-page screenshot show a section heading for an ordered fee schedule; the following `<strong>` is data, not another heading. This is a heuristic false positive, so no unrelated redesign was made. Render, layout, targets, measured contrast, casing, tracking, type scale/faces, glyphs, copy budget, repetition, chrome, motion and share metadata checks passed. No first-screen failure was observed.

Screenshots inspected were `/tmp/blackout-taste-final/shots/390.png`, `390-full.png` and the revision Packs screenshot in `test/scratch/interaction-shots/`. These are temporary review evidence, not runtime assets. The title, favicon, description, og:title and og:image remain present. Technical details in existing optional panels outside the reported wording were not redesigned.

## Delivery and remaining limits

`delivery.json` records the final path/asset and byte checks. Required assets, source, manifest and lockfile remain complete; no protected dependency/build path, ignore file, submodule or cache directory changed. The historical `reports/v9/taste.json` was losslessly minified to retain its entire JSON content while meeting the existing stricter raw-file byte audit. That packaging change does not alter its findings. Historical build-guard evidence was restored; this run's guard result lives here.

No real wallet signing, Coinbase account onboarding, physical phone, native screen reader, live social unfurl or external `/freepack` end-to-end test was performed. Browser fixtures intercept transactions and cannot certify mined execution. These worker-run results are not independent certification. Hosting and final publisher metadata occur after this submission.
