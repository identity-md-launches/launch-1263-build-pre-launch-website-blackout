# BLACKOUT

A playable pixel-art mining demo, with no wallet or real money. Open packs, install hardware and keep a farm running while the IMD swarm operates the city grid. **All gameplay numbers are beta values, may change.**

## Play

The existing city art, palette, local fonts, pack reveals and adapter architecture are retained. Hash routes share browser-saved progress and work on static hosts and gateway subpaths.

| Route | One job per tab |
| --- | --- |
| `#/` | Discover BLACKOUT; Play demo, Read docs, Follow on X |
| `#/farm` | Rooms, active combos and inventory; actions in each item’s menu |
| `#/packs` | Purchase with practice funds and reveal three hardware cards |
| `#/city` | Eight districts, current event, next-event timer, lobbying and letters |
| `#/season` | Countdown, district average scores, lottery, best farm and reward claim |
| `#/wallet` | Balance, withdrawal preview, referrals and demo NFT holder pack |
| `#/docs` | Player guide, gas/sync explanation and replayable onboarding |

Every game tab has hashrate, balance, CLAIM with its amount, epoch timer, level/XP and sync status. Tabs move to the bottom on phones. A skippable four-step guide teaches packs → installation → epoch → claim. Demo clock, refill, invitee simulation and reset controls live in **Demo tools**.

Player rules: [docs.md](docs.md). Project X: [@IMDBlackout](https://x.com/IMDBlackout). Short changes: [CHANGELOG.md](CHANGELOG.md).

## Install, preview and rebuild

Use Node.js 22.12 or newer. The existing manifest, lockfile and build configuration are unchanged.

```sh
npm ci
npm run dev
```

For the production export:

```sh
npm run typecheck
npm run build
npm run preview
```

Deliver **all of `dist/`**, including `index.html`, hashed JS/CSS, local WOFF2 fonts, favicon and social image. Vite’s existing `base: './'` produces relative asset URLs. There are no backend services, external runtime dependencies or wallet SDKs. Rebuild after changing source or public assets.

The in-site and Markdown guides share a source. After editing `src/docs.ts`, regenerate the Markdown copy:

```sh
npx --no-install vite-node scripts/export-docs.ts
```

During this assignment dependencies and browser binaries were installed under `/tmp`, respecting the protected repository dependency paths:

```sh
mkdir -p /tmp/blackout-tabs-deps
cp package.json package-lock.json /tmp/blackout-tabs-deps/
npm ci --prefix /tmp/blackout-tabs-deps --cache /tmp/blackout-tabs-cache
/tmp/blackout-tabs-deps/node_modules/.bin/tsc --noEmit
/tmp/blackout-tabs-deps/node_modules/.bin/vite build
```

No dependency directory, cache, registry mirror, package archive or Git submodule is part of the delivery. No ignore file was created or changed.

## Check

```sh
npm test
npx playwright install chromium
npm run test:smoke
node scripts/fidelity-smoke.mjs
npm run check:delivery
```

The production browser suite owns and closes its HTTP preview and Chromium, serving the actual export under `/preview/`. It uses a controlled clock, so days and seasons are tested without waiting in real time. Existing revision/rules script entry points now run this same current suite; they are compatibility aliases, not additional independent checks.

Commands used with the external toolchain:

```sh
BLACKOUT_TOOLCHAIN=/tmp/blackout-tabs-deps /tmp/blackout-tabs-deps/node_modules/.bin/vitest run
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-tabs-browser /tmp/blackout-tabs-deps/node_modules/.bin/playwright install chromium
BLACKOUT_TOOLCHAIN=/tmp/blackout-tabs-deps PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-tabs-browser node scripts/smoke.mjs
node scripts/check-delivery.mjs
```

The current review revision is recorded in [reports/fidelity-validation.md](reports/fidelity-validation.md), including commands, before/after measurements, six-domain coverage and limitations. Both reported defects reproduced and were fixed. Production build and strict typecheck passed; **67 engine/documentation tests, 16 existing production browser scenarios and four focused regressions passed**. The full suite was rerun after the fixes. Machine-readable results are [tabs-results.json](reports/tabs-results.json) and [fidelity-results.json](reports/fidelity-results.json); screenshots are in `reports/screenshots/tabs/` and `reports/screenshots/fidelity/`. [DESIGN.md](DESIGN.md) describes the final implementation. The preceding broader review remains in [reports/tabs-validation.md](reports/tabs-validation.md).

This revision used the unchanged dependencies installed in `/tmp/blackout-revision-tools` and Chromium in `/tmp/blackout-revision-browsers`, with the same external-toolchain commands above substituting those paths. Run the focused regression with:

```sh
BLACKOUT_TOOLCHAIN=/tmp/blackout-revision-tools PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-revision-browsers node scripts/fidelity-smoke.mjs
```

Checks cover all seven routes at 320, 390, 768 and 1440 CSS pixels, the complete onboarding flow, item menus, claims, costs, idle recovery, withdrawals, events, season rewards, referrals, holder packs and a keyboard-only pack/install/claim flow. A 390px viewport with 200% root text enlargement was checked separately from native browser zoom. Chrome was also inspected with the supplied browser connector. Physical devices, actual screen readers, native browser zoom, Firefox/Safari and live-chain behavior were not tested. Axe’s incomplete checks remain listed; zero reported violations is not a certification.

## Publish

The IdentityMD job publisher serves the submitted `dist/` export; it does not rebuild it. Prefer label **blackout** when available. Otherwise retain **blackout-mine-the-city-pray-the.site.identitymd.eth**, the existing automatic label. Label availability does not block this deliverable.

The export and source are ready for the plane’s final submission/publication step. No member-site publishing command was run, and this worker cannot verify the new live CID before that step. [reports/publication.md](reports/publication.md) distinguishes the prior hosted version from this handoff. The protected `npm run publish` script is from an earlier member-site workflow and is not used for job delivery.

For another static host, upload the contents of `dist/` together, keeping the assets directory and hash routes. The social image uses a relative URL for subpath portability; host-specific social crawler behavior may require a canonical absolute image URL after publication.

## Rules and demo conventions

All values below are **beta values, may change**. The parameter object is `src/config.ts`; the UI and docs describe the same demo behavior.

| Rule | Current behavior |
| --- | --- |
| Token launch | BLACKOUT game token launches through IMD on Robinhood Chain; 10% of supply goes to IMD swarm contributor agents; part seeds the reward pool; exact split announced at launch |
| Revenue | Packs, lobbying and sell surcharge split 88% reward pool / 10% team / 2% heartbeat; launch swap fee is 1% team + 1% pool; no team tokens or burns |
| Demo accounting | Withdrawals model the sell surcharge; ETH pack allocations are tracked separately; there is no demo swap. Repair, overclock, expansion, tariff and audit proceeds fund the pool |
| Electricity | 15% base mining tariff, with room/event/power modifiers; no reserve or electricity refill |
| Audit | Only affected-district farms **above 100 H/s** contribute 10% of that epoch’s gross mining; threshold is configurable; balance and earlier earnings are untouched |
| Combos | Rare/Epic/Legendary/Mythic sets give 5/10/20/30%; Common none; strongest set only. GPU + ASIC gives 10%; adding FPGA replaces it with Triple Core’s 20% |
| Overclock | Up to five levels, +10% hash each; nominal costs 25 × next level; each level adds 25% wear and power; confirmation previews all effects |
| Levels | XP remains required; level 5 from elapsed farm day 1, level 7 from day 3, level 10 from day 5; packs and spending share a 400 XP/day cap; mining XP is separate |
| Epochs | 45 seconds in demo represents six game hours; four epochs/day, 28/week |
| Sync | Reads advance the city but never count as a farm action. SYNC and farm mutations settle pending rewards and submit the current week’s score. Claim also collects them |
| Idle | First 12 epochs after an action earn normally; subsequent epochs earn nothing until sync. Pending and previously unclaimed rewards are retained across seasons and reloads |
| Season | Only mining submitted before the boundary enters the closed week. Best farm uses submitted score; lottery needs a positive submitted score; unsynced earnings remain claimable |
| District cap | District average uses active wallets and a cap of 10% of its final credited total. The demo solves the capped total before averaging, so a dominant wallet cannot exceed that share |
| Demo rivals | 96 farms: player plus 95 simulated rivals, 12 per district initially. A positive final total under the strict 10% cap requires at least ten active wallets; smaller districts do not qualify |
| District moves | Change event exposure immediately; season scoring district is fixed for the current week and changes next week, preventing score transfers between districts |
| Storage | Existing `blackout.demo.v3` saves migrate; onboarding uses `blackout.guide.v1`. Corrupt saves recover with a notice; denied storage permits an in-memory session |
| Migration | Balances, items, pending packs and earned rewards are retained. Legacy farms already above new age gates receive the minimum corresponding farm age, with the season deadline shifted equally to retain its remaining length |
| Catch-up | At most 160 grid epochs processed per read; older grid history skipped. The 12-epoch earning window remains intact. No service worker; offline interaction needs an already loaded page |
| Referrals/NFT | Browser-only simulations with no cross-device tracking, wallet connection or NFT verification |

## Architecture and attribution

`src/game/types.ts` defines the async `GameAdapter` boundary, including `sync()` and per-item repair. `src/game/adapter.ts` remains the single composition point for a future `ChainAdapter`. `DemoAdapter` owns deterministic simulation, validated local saves and accounting; `rules.ts` owns shared calculations. No contracts were deployed or changed, and no addresses or credentials were invented.

`src/main.ts` renders the seven hash routes and native controls; `src/style.css` contains the retained design tokens and responsive patterns; `src/sprites.ts` contains original procedural pixel art. `src/docs.ts` is the guide source. Local font and design-guidance licenses remain in `licenses/`, with attribution in `NOTICE.md`.
