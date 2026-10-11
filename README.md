# BLACKOUT

A static pre-launch site and playable pixel-art mining demo. Open packs, build six-slot rooms, combine hardware and survive the IMD swarm’s city grid. **No wallet, real money or deployed game contracts.** All gameplay figures are **beta values, may change**.

## Play and read

The export uses hash routes so it works on ordinary static hosting and IPFS gateway subpaths without server rewrites:

| Page | Route | Purpose |
| --- | --- | --- |
| Landing | `#/` (or the export root) | Discover BLACKOUT, play the demo, read the docs and follow X |
| Farm | `#/farm` | Hardware, rooms, mining, maintenance, dispatches and progression |
| Open Packs | `#/packs` | Dynamic demo prices, three-card reveals, odds and combos |
| Docs | `#/docs` | Complete player guide with linkable sections |

The same guide is in [docs.md](docs.md). Official X: [@IMDBlackout](https://x.com/IMDBlackout).

## Install, preview and rebuild

Use Node.js 22.12+ (this delivery used Node 24.21.0). The existing manifest and lockfile are retained unchanged.

```sh
npm ci
npm run dev
```

Build and preview the production export:

```sh
npm run typecheck
npm run build
npm run preview
```

`dist/index.html` and every runtime asset in `dist/` are part of the delivery. Vite uses `base: './'`. Fonts, favicon, sprites and the social image are local. The publisher serves these finished files; it does not need Node or a backend. Rebuild after any source or public-asset change.

For this assignment, dependency installation stayed outside the repository to respect protected paths:

```sh
mkdir -p /tmp/blackout-deps
cp package.json package-lock.json /tmp/blackout-deps/
npm ci --prefix /tmp/blackout-deps --cache /tmp/blackout-npm-cache
/tmp/blackout-deps/node_modules/.bin/tsc --noEmit
/tmp/blackout-deps/node_modules/.bin/vite build
```

No dependency directories, registries, caches or package archives belong in the submission. No ignore file was changed.

## Validate

```sh
npm test
npx playwright install chromium
npm run test:smoke
node scripts/review-regressions.mjs
npm run check:delivery
```

`test:revision` is a compatibility alias for the current expanded smoke suite, not a second independent suite. The browser script owns a bounded foreground preview under `/preview/`, opens Chromium, validates the actual `dist/` export and closes both browser and server. It uses a controlled browser clock for epoch tests; it does not wait for days or weeks.

External-toolchain commands used here:

```sh
BLACKOUT_TOOLCHAIN=/tmp/blackout-deps /tmp/blackout-deps/node_modules/.bin/vitest run
PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browser /tmp/blackout-deps/node_modules/.bin/playwright install chromium
BLACKOUT_TOOLCHAIN=/tmp/blackout-deps PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browser node scripts/smoke.mjs
BLACKOUT_TOOLCHAIN=/tmp/blackout-deps PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browser node scripts/review-regressions.mjs
node scripts/check-delivery.mjs
```

Actual results: strict TypeScript and production build passed; **47 engine tests passed**; **14 production interaction checks passed**, and **18 focused review regression checks passed** with zero failures, console errors or resource failures. The latter covers all six reproduced reviewer findings, including 120 item/rarity/viewport reveal cases. Automated checks cover all four pages at 320, 390, 768 and 1440 CSS pixels, plus Docs at 200% text size. Play Demo is fully visible in the 390×844 first screen. Five axe page/dialog states have zero reported violations; incomplete checks remain identified in the JSON report.

See [reports/revision-validation.md](reports/revision-validation.md) for the current six-domain Better Interface review, fixes, screenshots and limitations, and [reports/validation.md](reports/validation.md) for retained earlier evidence; [reports/interaction-results.json](reports/interaction-results.json) for browser results; and [reports/bundle-budget.json](reports/bundle-budget.json) for byte accounting and export hashes. These are worker checks, not independent certification. Physical devices, actual screen readers and browser-native zoom were not tested. The unchanged development dependencies have audit findings recorded in validation.

## Publish

Publish the **contents of `dist/`** to the static host. Use the requested label **`blackout`** when available; an automatic label is acceptable when member names are closed.

For this contributor job, the IdentityMD plane publishes the submitted export after completion and updates the project’s hosted site. The machine’s member-site command does not publish job deliverables. No hosting approval or naming change is needed to submit this export. See [reports/publication.md](reports/publication.md) for the actual command result and handoff status; do not mistake the existing hosted version for a verified update.

On another static host, upload all files under `dist/` without rewriting hash routes or moving `assets/`. The existing `npm run publish` script belongs to the earlier member-site workflow and is deliberately unchanged with the protected manifest. It is not needed for this job’s platform publication.

Regenerate the 1200×630 social preview, then rebuild:

```sh
npm run og
npm run build
```

Open Graph image paths are relative for portable subpath hosting. Some social crawlers require a canonical absolute image URL; that host-specific unfurl behavior cannot be verified before the final publication URL is assigned.

## Architecture

- `src/main.ts`: four-route application, accessible controls, dialogs, epoch displays and pack sequence. No framework migration or wallet SDK.
- `src/config.ts`: the single game/economy parameter object. A future implementation can populate equivalent values from a Params contract.
- `src/game/types.ts`: `GameAdapter`, state and item contracts. `src/game/adapter.ts` is the composition point for replacing `DemoAdapter` with a future `ChainAdapter`.
- `src/game/DemoAdapter.ts`: clock-injectable, seeded local simulation; validated saves; asynchronous actions; bounded catch-up and simulated season/referral flows.
- `src/game/rules.ts`: shared calculations for hash, combinations, slots, prices, taxes and progression.
- `src/sprites.ts`: original procedural city/pack art plus 12 distinct item silhouettes × five rarity variants. `assets/README.md` describes overrides.
- `src/docs.ts` and `docs.md`: the player-facing guide.
- `src/style.css` and [DESIGN.md](DESIGN.md): implemented visual system.

There are no deployed addresses to fill in, and no placeholder address is used. Contract settings remain empty until real deployment information exists. A production chain adapter, contract-bound parameters, wallet/claim verification, keeper/fallback execution, multiplayer referrals and live season ranking remain launch work.

## Demo choices

| Rule | Implementation |
| --- | --- |
| Epoch/calendar | 45 seconds represents 6 game hours; 4 epochs/day; 28 epochs/week |
| Initial farm | Common GPU installed; Common Power Supply and Fan spare; 350 DEMO tokens and 0.1 simulated ETH |
| Inventory | 15 spare slots; installed items use room slots; pending pack cards reserve capacity |
| Rarity gate | Before level 10, Mythic rolls become Common: 70.3% Common and 0% Mythic |
| Rarity sets | Strongest set only: +5/10/20/30/30% for Common through Mythic; combined room hash capped at +40% |
| Token spending | Quoted nominal cost divided by 1.05 for the 5% purchasing bonus; no withdrawal tax |
| Mining conversion | 0.1 DEMO tokens per effective hash per epoch, before tariff; a practice parameter, never a return forecast |
| Time controls | Run an epoch or advance a game day locally; refill simulated funds without a purchase limit |
| Quiet pack price | Decays during quiet local time and when demo controls advance quiet epochs; already elapsed time is not counted twice |
| City/season | Seeded events; individual simulated rival farm scores contribute to district totals; three-farm lottery sampled without replacement |
| Referral/NFT | Unique local referral links, manual invitee simulation and a once-per-farm demo holder credit; no cross-device tracking or ownership check |
| Storage | `blackout.demo.v3`; shared across routes/tabs in the same origin; incompatible/corrupt saves recover with a notice |
| Offline catch-up | At most 160 epochs per catch-up; no service worker, so offline interaction requires an already loaded page |

Earlier `blackout.demo.v1` saves are not deleted, but their incompatible four-type model is not imported into the new game. Earlier v3 season saves retain their progress when individual rival scores are added. Local saves are editable browser data, not a security boundary or entitlement to launch rewards.

## Changes and attribution

See [CHANGELOG.md](CHANGELOG.md) for the short change list. Original pixel style, palette, fonts and adapter boundary are retained. Font and Better Interface/Impeccable licenses are in `licenses/` with attribution in `NOTICE.md`.
