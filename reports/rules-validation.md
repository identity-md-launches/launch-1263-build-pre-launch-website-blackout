# Game design corrections — validation

**Complete for the stated local implementation scope.** The corrected source, static production export, guides and short changelog are ready for the job publisher. Publication itself occurs after submission; a new live CID is not claimed. All gameplay/economic numbers below are **beta values, may change**. This is worker evidence, not independent certification.

## Scope and explicit demo conventions

Retained the existing TypeScript/Vite application, four hash routes, pixel artwork, palette, fonts, wallet-free demo and `GameAdapter` boundary. Changes cover the six assigned game-design mismatches and their affected controls/copy. Build configuration, dependencies, package manifest/lockfile and runtime artwork remain unchanged.

- Audit eligibility ranks all 24 local farms by current hashrate. The top decile rounds up to three farms; equal rates use ascending stable farm IDs. Rival hashrates are deterministic, spanning the existing simulated mining range (20–100 H/s), and are independent of cumulative season scores. The previous district event targeting remains; only eligible farms in that district contribute.
- Audit contributions and electricity are both percentages of this epoch’s gross mining, before durability wear. Earlier unclaimed mining and spendable balances are untouched. The reward pool receives both deductions exactly once.
- GPU + ASIC retains Compute Duo’s +10% while FPGA is absent/broken. A working FPGA upgrades that combination to Triple Core’s +20%, replacing the duo. This interprets “replaces; never stack” while preserving the two-item combination.
- Retained the pre-existing +25% wear and power cost per overclock level. With no reserve, extra power multiplies the electricity tariff. Nominal upgrade prices remain 25 × the next level, with the existing spending bonus applied. The maximum is five and hash gain is +10% per level.
- Existing v3 farms migrate without a reset. Only the retired electricity field is removed; missing rival hashrates are added and obsolete audit explanatory letters are updated. No previous charges are retroactively recomputed.

These are documented demo conventions, not deployed contract parameters or promises about final launch accounting.

## Better Interface coverage

Read the pinned workflow, all six domains’ core principles/verification guidance, and the implemented-design documentation section. Applied them during implementation and reviewed the production export at `/preview/`. Attribution remains in `NOTICE.md` and `licenses/Better-Interface.txt`.

| Domain | Coverage and evidence | Limitations / not applicable |
| --- | --- | --- |
| Accessibility — Checked | Existing native buttons, details and dialog retained. Overclock cost/effects are described before confirmation; Cancel starts focused, Tab/Shift+Tab switch actions, Escape cancels and returns focus, and background page controls cannot take focus while modal. Fifth-level confirmation moves focus to Repair when Overclock becomes disabled. Viewed yellow focus rings in 320/390/1440 screenshots. Six axe page/dialog states report zero violations. | No screen-reader or physical-device session. Native Chromium dialog traversal can pass through browser chrome between cycles; no custom Tab trap was added. Axe incomplete checks remain in reports. |
| Layout — Checked | Existing grids/breakpoints retained. Tariff is a compact room/rate description list; long preview text has paragraph breaks and wraps. All four routes have no document overflow at 320/390/768/1440; dialogs checked at those widths. Product, Play demo and beta qualification fit the 390×844 first screen. Docs text enlargement to 200% passes existing reflow check. | Browser-native zoom, RTL and additional languages unverified; the site is English-only. No claim of every viewport being tested. |
| Writing — Checked | Both guides and config state the BLACKOUT token launch through IMD. Audit copy distinguishes current output from balances. Rarity names map to each bonus. Replaced combo status is explicit. Overclock action names the target level and explains rising price, hash, wear and tariff. Removed refill instructions. Unit and production tests compare the corrected copy and behavior. | Final supply split remains intentionally unannounced; no invented launch values or contracts. |
| Typography — Checked | Existing local Pixel/Mono fonts and six-size scale retained. Tabular numbers in tariff rows; rates retain up to five decimal places. Preview body preserves line breaks, uses existing 14px Mono with inherited 1.6 line height, and wraps inside dialog. Viewed narrow and desktop screenshots, including docs launch text and combo descriptions. | No additional OS/font/browser families. Long-form docs retain their existing measure and local table scrolling. |
| Colors — Checked | No palette changes. Measured opaque overclock text and button pairs from computed browser colors (below). Existing contrast regressions and page/dialog axe scans rerun. Text status supplements Active/Missing/Replaced color. | Gradients, illustrations and every possible composited state are not exhaustively measured. Single dark theme; light-theme review not applicable. |
| UI — Checked | Existing surface/action styles reused. Overclock Cancel/confirm, disabled maximum, insufficient funds, stale quote, reload, old save, modified tariff and combo transitions exercised. Existing pack motion/reduced-motion/offline-loaded scenarios still pass. No new animation. | No 10%-speed Animations-panel replay or real touch test. No wallet/chain actions exist in scope. |

## Findings and corrections

Locations point to the final source. All listed findings are corrected and rechecked.

| Severity / owner | Source | Evidence and user impact | Fix and recheck |
| --- | --- | --- | --- |
| High / Writing | `src/config.ts:5`, `src/docs.ts:101`, `docs.md:197` | Prior guide described IMD itself as the launching token. | Launch metadata and rendered/Markdown guide now name the BLACKOUT game token, IMD launch route, contributor agents and unannounced remaining split. Documentation tests and production Docs check pass. |
| High / Writing + UI | `src/game/rules.ts:89`, `src/game/DemoAdapter.ts:233`, `src/docs.ts:73` | Prior dispatcher debited 10% of any affected player’s spendable balance. | Rank eligibility and per-room gross-mining withholding replace the balance mutation. Boundary, ties, outside-district, zero-balance, high-balance/low-hash and previous-unclaimed cases pass; actual production epochs confirm pool conservation. |
| Medium / Writing + UI | `src/config.ts:27`, `src/game/rules.ts:66` | Common incorrectly received a set bonus; other rarity tiers were shifted. | Exact 0/5/10/20/30% mapping, three working items, strongest-only selection. All rarity fixtures and a simultaneous Rare/Epic set pass; Farm and Packs guide checked. |
| Medium / UI | `src/game/rules.ts:53`, `src/main.ts:91` | Both compute bonuses contributed to the same room. | Triple disables Duo and marks it Replaced. Common GPU/ASIC has 22 H/s, adding FPGA gives 36 H/s rather than 39; removing/breaking FPGA restores Duo. Browser actions and engine tests pass. |
| High / UI + Accessibility | `src/config.ts:49`, `src/main.ts:261`, `src/style.css:157` | Overclock immediately spent tokens with +25% hash and a three-level cap, without confirmation. | +10%, five levels, shared rising cost, native confirmation with current/next wear and power/tariff, unchanged-cost guard for a stale level, and readable paragraph breaks. All levels, cancellation, max, insufficient funds and changed-save cases pass. |
| Medium / Layout + Writing | `src/main.ts:140`, `src/game/types.ts:25`, `src/game/DemoAdapter.ts:129` | Reserve/refill introduced a second electricity cost and stopped mining at zero. | Removed reserve state/action/config; replaced the meter with per-room tariffs. Old depleted saves mine after migration. Combo + cheap-event + level-five overclock settlement matches 10.96875% tariff; no balance charge. |
| Medium / Accessibility | `src/main.ts:203` | A disabled maximum-level trigger could lose the keyboard continuation point during rerender. | Focus falls back to the same room’s Repair button; tested immediately after the fifth confirmation. |

The first targeted browser run had seven **test-harness assertion failures**, not seven application defects: a selector counted active combos inside both the visible list and closed guide, a text assertion also matched “replaces Compute Duo,” native browser-chrome Tab traversal was mistaken for a page focus escape, and a test checked focus after deliberately dismissing a toast. Reproduced the native dialog focus sequence, corrected the assertions to match observable behavior, tested that background controls remain inert, and reran successfully. Initial failure images were moved to disposable `test/scratch/`.

## Commands and actual results

Dependencies were installed using copies of the unchanged manifest and lockfile under `/tmp/blackout-fix-deps`; cache and browser binaries also stayed under `/tmp`. No repository dependency/cache directory or ignore file was created.

```sh
npm ci --prefix /tmp/blackout-fix-deps --cache /tmp/blackout-fix-npm-cache --no-audit --no-fund
/tmp/blackout-fix-deps/node_modules/.bin/tsc --noEmit
/tmp/blackout-fix-deps/node_modules/.bin/vite build
BLACKOUT_TOOLCHAIN=/tmp/blackout-fix-deps /tmp/blackout-fix-deps/node_modules/.bin/vitest run
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-fix-browser /tmp/blackout-fix-deps/node_modules/.bin/playwright install chromium
BLACKOUT_TOOLCHAIN=/tmp/blackout-fix-deps PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-fix-browser node scripts/smoke.mjs
BLACKOUT_TOOLCHAIN=/tmp/blackout-fix-deps PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-fix-browser node scripts/review-regressions.mjs
BLACKOUT_TOOLCHAIN=/tmp/blackout-fix-deps PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-fix-browser node scripts/rules-smoke.mjs
node scripts/check-delivery.mjs
git diff --check
```

| Check | Actual result |
| --- | --- |
| Typecheck / production build after final source edit | Both exit 0; Vite 7.1.7 built 11 modules. `dist/` contains eight local runtime files, including title/favicon/description/og:title/og:image metadata. |
| Unit/documentation suite | 62 passed: 59 engine tests and 3 guide/config checks. |
| General production suite | 14 passed; zero failures or console/resource errors. Navigation, packs/reveals, inventory, claims, withdrawals, referrals, seasons, persistence, reflow, fonts and motion covered. |
| Existing review regressions | 18 passed; zero failures or runtime/resource errors, including 120 item/rarity/viewport reveal cases. |
| New rule production suite | 14 passed; zero failures or runtime/resource errors. Exact checks and screenshot paths in `rules-results.json`. |
| First screen, 390×844 | Title y173.5625–221.5625; product explanation y301.5625–320.75; Play demo y340.75–388.75. Beta notice also visible. |
| Accessibility scans | Zero reported violations in home, Farm, Packs, Docs, withdrawal confirmation and overclock confirmation; each retains an incomplete contrast entry. |
| Packaging / whitespace | Delivery audit and `git diff --check` pass. Final file bytes and export hashes in `bundle-budget.json`. No unnecessary archives, dependencies or caches in the deliverable. |

The assigned Browser MCP could not initialize: `/opt/google/chrome/chrome` was missing. The pinned Playwright initially refused the host’s Ubuntu 26.04 identifier; installing/running its Ubuntu 24.04 fallback supplied Chromium 141.0.7390.37. All browser evidence above comes from that working external Playwright runtime, not from the failed connector. Each script owns and closes its foreground preview/browser.

The delivery-byte check measures source, export, docs and evidence (under 3 MB), not the platform’s final Git transport bundle. An attempted read-only baseline bundle export to `/tmp` failed because this partial clone needed absent promisor objects and Git tried to cache them in the read-only `.git/objects` directory. No Git metadata was changed; no retry or permission change was attempted. The publisher’s final bundle is therefore not measured locally. The file-byte budget leaves more than 5 MB below the 8 MiB limit.

## Rendered evidence and measured pairs

Opened and inspected the current production images with the image-view tool:

- `screenshots/rules/landing-390.png`: product and main action within first screen, beta visible.
- `screenshots/rules/overclock-320.png`, `overclock-390.png`, `overclock-1440.png`: full preview content, action labels and focused Cancel fit; preserved palette and dialog wrapping.
- `screenshots/rules/combos-390.png`: explicit rarity mapping and Replaced state; long rows wrap inside the panel.
- `screenshots/rules/tariff-390.png`: reserve replaced by readable current room tariff.
- `screenshots/rules/launch-docs-390.png`: corrected launch paragraph, beta qualification and readable mobile measure.

The script also records 768px modal and desktop audit screenshots. Saved files alone are not claimed as human visual inspection. Earlier screenshots outside `screenshots/rules/` are retained history or regenerated regression fixtures, not evidence that every old screenshot was re-reviewed in this task.

| Opaque rendered pair | Measured ratio | Result |
| --- | --- | --- |
| Preview text `rgb(161,174,197)` on dialog `rgb(9,14,29)` | 8.5848:1 | Passes 4.5:1 normal-text threshold |
| Confirm text `rgb(17,19,35)` on button `rgb(255,230,0)` | 14.5198:1 | Passes 4.5:1 normal-text threshold |

## Remaining limits

No new live publication CID is available before job submission; see `publication.md`. No deployed game contracts, live token, wallet, keeper, on-chain reward pool, NFT ownership or real multiplayer rankings were tested or added. Browser testing is Chromium emulation, not physical devices, screen readers, Safari/Firefox or native zoom. Automated accessibility and screenshot checks are bounded evidence, not a claim of complete accessibility compliance. Protected development dependency audit findings from the prior job were not remediated or re-audited here.
