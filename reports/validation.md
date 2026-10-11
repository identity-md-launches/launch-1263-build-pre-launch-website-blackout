# BLACKOUT validation

The current revision is documented in [revision-validation.md](revision-validation.md): all six findings reproduced and fixed; strict typecheck/build, 47 engine tests, 14 full browser checks and 18 focused revision checks pass. [revision-results.json](revision-results.json) and [screenshots/revision/](screenshots/revision/) describe the rebuilt export. The review below is retained as earlier-round evidence; its source line numbers, screenshots and first-screen measurements may be historical.

# Earlier BLACKOUT implementation and validation

Previous-round worker review on 2026-10-11, against that round’s source and production export. The assignment uses the `none` check profile: these are recorded local observations, not independent certification. No game contract or token was deployed.

## Delivered scope

The retained TypeScript/Vite project now has Landing, Farm, Open Packs and Docs hash routes, persistent local demo state, all 12 item types across five rarities, six-slot rooms, progression, inventory actions, mining/upkeep, event protections, dispatches, weekly seasons and explicitly simulated referral/NFT features. The adapter boundary remains in place for later chain integration. All economic parameters are grouped in `src/config.ts`; the guide labels figures as beta and distinguishes intended launch rules from demo behavior.

The repository includes source, the unchanged package manifest/lockfile, the complete `dist/` export, [player guide](../docs.md), [design system](../DESIGN.md), [changelog](../CHANGELOG.md), install/build/publish instructions and this evidence. Publication status and the actual CLI refusal are in [publication.md](publication.md). Platform publication follows submission; this review does not claim the revision is already live.

## Commands and actual results

Dependencies and Chromium were installed under `/tmp/blackout-deps` and `/tmp/blackout-browser`, outside the repository. The existing protected package manifest, lockfile and build configuration were not changed. Node was 24.21.0.

| Check | Command / method | Result |
| --- | --- | --- |
| Strict typecheck | `/tmp/blackout-deps/node_modules/.bin/tsc --noEmit` | Passed after the final source changes, including the pricing and season corrections |
| Production build | `/tmp/blackout-deps/node_modules/.bin/vite build` | Passed; complete relative-URL export in `dist/` |
| Engine tests | `BLACKOUT_TOOLCHAIN=/tmp/blackout-deps /tmp/blackout-deps/node_modules/.bin/vitest run` | 47 passed, zero failed; final engine run after the pricing, season and save-migration corrections |
| Production browser interactions | `BLACKOUT_TOOLCHAIN=/tmp/blackout-deps PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browser node scripts/smoke.mjs` | 14 checks passed, zero failures; final run 07:53:12 UTC |
| Console/resources in that suite | Browser console, page exceptions, failed requests, HTTP response checks | Zero errors or failures |
| Static export and byte audit | `node scripts/check-delivery.mjs` | See [bundle-budget.json](bundle-budget.json) for actual bytes, remaining budget and export hashes |
| Manual rendered review | Browser MCP against the production export at `/preview/`; screenshots below | Desktop/mobile pages and keyboard confirmation inspected |

The browser suite starts and closes its own static server and Chromium. The server serves real files beneath `/preview/` without application-route rewrites. It tests deep links and reloads at that subpath. Its [JSON report](interaction-results.json) retains all checks, geometry, axe results, incomplete checks and limitations.

The 14 scenarios cover landing metadata and first-screen action; direct routes, reloads and shared storage; installation/removal, combos and maintenance; a controlled 45-second epoch; ETH/token packs, pricing, ordered reveals and saved unfinished packs; full-inventory recovery, level locks, expansion, merge and scrap; withdrawal validation/preview/confirmation; holder credit and referral clipboard fallback; day/room/season unlocks and prize claims; docs navigation; responsive reflow; accessibility; reduced/normal motion and Mythic flash; and runtime/resource errors. Late-season, full-inventory and animation scenarios use valid local fixtures, then exercise the actual production controls. Time advances through the browser clock or demo controls, without real days/weeks of waiting.

Engine tests cover rarity probabilities and gates, all combinations and their cap, all room unlocks, pack capacity reservation/idempotence, purchases/discounts, inventory operations, tax decay, mining and active XP, every event protection, lobbying, supply drops, seasons, referral/NFT simulation, persistence, corrupted saves and unavailable storage. The 100,000-roll rarity sample produced Common 69,950; Rare 21,998; Epic 6,761; Legendary 984; Mythic 307. A separate randomized scratch exercise ran 10,500 actions across 15 farms with 1,016 reloads and no invalid state or action-loop failure. Scratch scaffolding is intentionally not part of the deliverable.

## Better Interface coverage

Read the pinned Better Interface workflow, core principles of all six domains and the relevant supporting sections while implementing. The final design document follows its document-web-design structure and reports implemented source values. Attribution and license are retained in `NOTICE.md` and `licenses/`. The six domains were reviewed both from source and in Chromium; no domain is being marked complete solely from an automated score.

| Domain | Source review and implemented coverage | Rendered checks and remaining limits |
| --- | --- | --- |
| Accessibility | Native landmarks, heading hierarchy, navigation/current page, labeled inputs, buttons, details, scoped table headers, persistent polite status region, native modal dialog, keyboard focus restoration, textual rarity/locks, reduced-motion and forced-colors rules | Keyboard skip link, docs deep links, reveal controls, timed-render focus and dialog Escape/return tested. Cancel initially receives a visible yellow focus ring. Axe reports zero violations in five states; incomplete contrast checks remain. No actual screen reader or physical assistive-device session. |
| Layout | Shared 1200px alignment, bounded reading measure, wrapping grids, local table scrolling, nearby control instructions and mobile-first action visibility | Four routes at 320/390/768/1440px: 16 checks with no document overflow. Docs at 200% text size adds a seventeenth passing reflow check. Screenshots inspected at 390×844 and 1440×1000. Browser-native zoom, other engines and physical devices untested. |
| Writing | Short product heading and plain product explanation; explicit DEMO/beta language; all 19 requested guide chapters; contextual controls/errors, taxes and irreversible-action confirmations; intended launch economics and risks explained without promised returns | Reviewed landing, game panels, reveal cards, docs and withdrawal copy in context. Corrected lobbying and audit wording to match actual calculations. English only; no localization/RTL coverage. |
| Typography | Three local font files, Pixel 400 and Mono 400/600; six-size scale; prose line height and reading width; tabular counters; normal selectable text; no tracked eyebrow headings | Font loading checked. Long item names wrap on mobile, docs tables remain usable, 200% text reflows. Pixel captions retain the requested art direction; no claim that every reader will prefer them. |
| Colors | Preserved navy/cyan/yellow/magenta palette; semantic text, warning and focus roles; textual status complements rarity color; repaired empty-inventory contrast | Solid CSS color pairs measured below. Axe has zero reported violations but gradient-backed targets remain incomplete. Full composited-image contrast, every state and color-vision simulation were not exhaustively measured. |
| UI | Working native controls, clear active/disabled/selected states, confirmation/cancel flows, empty/full/locked inventory states, maintenance feedback, distinct hardware art, staged pack opening and animation toggle | Real production flows exercised, including error recovery and cross-tab updates. Pack shake/seal/burst, ordered flips and Mythic flash checked in normal motion; reduced-motion paths tested. All 60 generated sprite variants passed uniqueness/valid SVG checks and a rendered gallery review. No live wallet/chain behavior is represented as tested. |

### Findings and repairs

References point to the final implementation, where the repair can be reviewed.

| Finding | Final reference | Repair and evidence |
| --- | --- | --- |
| Empty inventory captions were too dim | `src/style.css:178` | Changed them from `#62718c` to semantic muted `#a1aec5`; measured contrast rose from about 3.90:1 to 8.58:1 against the panel. Final axe run has no violations. |
| Epoch rerenders could lose keyboard position or leave installed-item selection stale | `src/main.ts:99`, `src/main.ts:179` | Stable control IDs, focus/form/details preservation and selection clearing before room rendering. Install moves focus to the occupied slot; timed-update and installation flows pass. |
| Skip link could be interpreted as an application route | `src/main.ts:236` | Prevent default hash routing, focus and scroll to main directly. Keyboard route/navigation scenario passes. |
| Prior revealed cards replayed their flip | `src/main.ts:148`, `src/style.css:379` | Animate only the newly revealed item; retained cards remain stable during later reveals and epochs. Normal/reduced motion checks pass. |
| Overclock label could quote the base cost for later ranks | `src/main.ts:100` | Quote the next-rank cost using the same configured multiplier and spending bonus as the adapter. Maintenance flow passes. |
| Clipboard API may be absent or denied | `src/main.ts:267` | Select the visible referral field and give copy instructions on absence/rejection. Browser fallback scenario passes. |
| Cross-tab changes could be missed by a partial state comparison | `src/main.ts:310` | Compare the complete refreshed state except the clock-only update field; re-render relevant routes when changed. Shared-storage scenario passes. |
| Identical initial referral codes prevented meaningful local invite links | `src/game/DemoAdapter.ts:89` | Generate unique local farm codes, retain injected values for deterministic tests; independent-farm referral test passes. |
| Lottery selection could loop with a constant injected random source | `src/game/DemoAdapter.ts:251` | Sample available farms without replacement in a bounded loop. Dedicated regression test passes. |
| Lobbying and tax-audit explanations overstated/misstated effects | `src/main.ts:121`, `src/docs.ts:72` | Say lobbying lowers targeting odds without immunity; audit debits 10% of affected spendable balance. Guide and engine now agree. |
| Demo time controls left a demanded price unchanged during quiet epochs | `src/game/DemoAdapter.ts:369` | Settle the remaining virtual epoch into the market quote and re-anchor at real local time. Regression tests cover partial elapsed time, day advancement, the floor and no repeated decay; the browser suite checks the visible quote and reload. |
| Best-farm rewards compared against a district average | `src/game/DemoAdapter.ts:247` | Track 23 individual rivals and compare accumulated mining tokens in the same units. Tests distinguish a farm above the average from the actual best farm, check district totals and migrate existing v3 saves. |

### Measured first-screen and contrast evidence

At 390×844 CSS pixels the landing title occupies y=154.375–202.375, the plain product description y=282.375–301.5625 and Play demo y=321.5625–369.5625. The action is 358×48px and fully inside the first viewport. Title, description, favicon, `og:title` and `og:image` are in `dist/index.html`. The local social PNG is 1200×630.

Computed colors were read from the rendered production page and converted using WCAG relative sRGB luminance. These six tested pairs had solid backgrounds and no background image in the measured ancestry. Ratios are rounded, not inferred from the palette alone.

| Rendered selector | Foreground / background | Contrast |
| --- | --- | --- |
| `.farm-stats > div > span` | `#a1aec5` / `#090e1d` | 8.58:1 |
| `#balance` | `#edf2ff` / `#090e1d` | 17.16:1 |
| `.inventory-empty small` | `#a1aec5` / `#090e1d` | 8.58:1 |
| `.page-heading .primary` | `#111323` / `#ffe600` | 14.52:1 |
| `#rooms-title` | `#edf2ff` / `#05060f` | 18.04:1 |
| `input` | `#edf2ff` / `#080e1e` | 17.17:1 |

Axe completed 21 checks on Landing, 30 on Farm, 25 on Packs, 26 on Docs and 14 on the confirmation state, with no reported violations. Its unresolved contrast targets include the gradient hero/pack presentation, decorative arrow spans and confirmation prose; they are preserved in the JSON, not silently counted as passing. The standard main buttons are at least 48px high and compact controls 44px; the dismiss control is 28px on desktop/32px on mobile, meeting the 24px minimum but not a 44px target recommendation.

### Screenshot evidence

These are actual browser captures of the export, not mockups. Farm and pack captures show progressed demo state; the mobile pack and docs images show scrolled interaction/content states rather than their page tops. Captures were made at 07:39–07:42 UTC, before the final price/season logic fixes and two guide wording refinements; the production browser suite was rerun after those edits.

| Page/state | Desktop | Mobile |
| --- | --- | --- |
| Landing | [1440×1000](screenshots/landing-desktop.png) | [390×844](screenshots/landing-mobile.png) |
| Farm | [1440×1000](screenshots/farm-desktop.png) | [390×844](screenshots/farm-mobile.png) |
| Open Packs | [1440×1000](screenshots/packs-desktop.png) | [390×844, revealed cards](screenshots/packs-mobile.png) |
| Docs | [1440×1000](screenshots/docs-desktop.png) | [390×844, combo table](screenshots/docs-mobile.png) |
| Confirmation | — | [390×844, keyboard focus](screenshots/dialog-keyboard.png) |

## Limitations and delivery checks

- All balances, prices, events, rival farms, referrals, NFT eligibility and prizes are browser simulations. No blockchain integration, ownership verification, keeper/fallback execution or actual withdrawal was exercised. The guide describes these as launch work.
- Loaded-page interactions work without network; there is no service worker or cold offline-start guarantee. Catch-up is bounded at 160 epochs. The page uses local wall time; local saves are editable, not an entitlement/security boundary.
- Testing used Chromium emulation and browser tools, not Safari/Firefox, physical phones or actual screen readers. Text enlargement is not browser-native zoom. Visual inspection and axe are not complete accessibility certification.
- A manual inspection preview reached its deliberate 20-minute lifetime, causing three favicon connection-refused messages after shutdown. Restarting the bounded preview and freshly navigating returned all seven requested HTML/JS/CSS/font/favicon resources with HTTP 200 and zero console errors. The separate final smoke run has zero resource failures.
- An audit of the unchanged development toolchain reported five findings: two moderate, one high and two critical (`@vitest/mocker`, `tinypool`, `vite`, `vite-node`, `vitest`). Protected dependency versions were not modified. Those development packages are not copied into the runtime export. This does not claim the toolchain vulnerabilities are remediated.
- Social assets and metadata are present, but final-host crawler unfurl behavior is unverified; some crawlers expect an absolute canonical image URL. The assigned post-submission URL/CID is also unverified here.
- Source, required runtime assets, docs and evidence remain complete. No ignore file, protected manifest/lockfile, build configuration, dependency directory or Git metadata was changed. The budget report counts raw deliverable bytes and export hashes; it does not claim to be a newly created Git bundle. Temporary browser output is removed before handoff.

The raw delivery is below 2 MiB, and the repository's existing Git object packs occupy about 350 KiB (`git count-objects -v`). Both together remain well below the 8 MiB submission ceiling even before compressing the new files. No Git metadata was written to create an extra verification bundle.

The publication command's job-context refusal is documented separately and does not request user input or block the export handoff. Preferred label: `blackout`; automatic label accepted.
