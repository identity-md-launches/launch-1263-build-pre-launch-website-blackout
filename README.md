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
mkdir -p /tmp/blackout-fix-deps
cp package.json package-lock.json /tmp/blackout-fix-deps/
npm ci --prefix /tmp/blackout-fix-deps --cache /tmp/blackout-fix-npm-cache
/tmp/blackout-fix-deps/node_modules/.bin/tsc --noEmit
/tmp/blackout-fix-deps/node_modules/.bin/vite build
```

No dependency directories, registries, caches or package archives belong in the submission. No ignore file was changed.

## Validate

```sh
npm test
npx playwright install chromium
npm run test:smoke
node scripts/review-regressions.mjs
node scripts/rules-smoke.mjs
npm run check:delivery
```

`test:revision` is a compatibility alias for the current expanded smoke suite, not a second independent suite. The browser script owns a bounded foreground preview under `/preview/`, opens Chromium, validates the actual `dist/` export and closes both browser and server. It uses a controlled browser clock for epoch tests; it does not wait for days or weeks.

External-toolchain commands used here:

```sh
BLACKOUT_TOOLCHAIN=/tmp/blackout-fix-deps /tmp/blackout-fix-deps/node_modules/.bin/vitest run
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-fix-browser /tmp/blackout-fix-deps/node_modules/.bin/playwright install chromium
BLACKOUT_TOOLCHAIN=/tmp/blackout-fix-deps PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-fix-browser node scripts/smoke.mjs
BLACKOUT_TOOLCHAIN=/tmp/blackout-fix-deps PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-fix-browser node scripts/review-regressions.mjs
BLACKOUT_TOOLCHAIN=/tmp/blackout-fix-deps PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-fix-browser node scripts/rules-smoke.mjs
node scripts/check-delivery.mjs
```

Actual results for this correction: strict TypeScript and production build passed; **62 engine/documentation tests passed**; **14 general production interaction checks**, **18 existing review regression checks**, and **14 targeted rule checks** passed. The targeted suite checks actual rendered combo bonuses, audit eligibility and balance preservation, saved-farm migration, all five overclock levels, rising costs, keyboard cancellation, cross-tab stale previews, and combined tariff modifiers. Browser runs recorded zero console/page errors or failed resources.

All four routes pass document-overflow checks at 320, 390, 768 and 1440 CSS pixels. Product, Play demo and the beta label fit the 390×844 first screen. Five page/dialog states plus the new overclock confirmation have zero axe violations; incomplete contrast checks are retained in the JSON reports. Current export screenshots were opened for review.

See [reports/rules-validation.md](reports/rules-validation.md) for this revision’s six-domain Better Interface review, findings, assumptions and limitations; [reports/rules-results.json](reports/rules-results.json) for targeted checks; [reports/interaction-results.json](reports/interaction-results.json) and [reports/revision-results.json](reports/revision-results.json) for the rerun existing suites; and [reports/bundle-budget.json](reports/bundle-budget.json) for byte accounting and export hashes. Earlier review narratives are historical. These are worker checks, not independent certification.

The assigned browser connector could not find Google Chrome. External Playwright supplied Chromium; on this Ubuntu 26.04 machine its pinned version needed the Ubuntu 24.04 platform override shown above. Physical devices, actual screen readers, Safari/Firefox and browser-native zoom were not tested. Prior dependency audit findings remain historical; protected dependencies were not changed or audited again in this task.

## Publish

Publish the **contents of `dist/`** to the static host. Use the requested label **`blackout`** when available; an automatic label is acceptable when member names are closed.

For this contributor job, the IdentityMD plane publishes the submitted export after completion and updates the project’s hosted site. The machine’s member-site command does not publish job deliverables. No hosting approval or naming change is needed to submit this export. See [reports/publication.md](reports/publication.md) for the current export handoff status; do not mistake the existing hosted version for a verified update.

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

All gameplay numbers below are **beta values, may change**. The top-decile rounding, tie handling, gross-mining audit basis and overclock tariff multiplier are explicit local demo conventions, not deployed contract rules.

| Rule | Implementation |
| --- | --- |
| Epoch/calendar | 45 seconds represents 6 game hours; 4 epochs/day; 28 epochs/week |
| Initial farm | Common GPU installed; Common Power Supply and Fan spare; 350 DEMO tokens and 0.1 simulated ETH |
| Inventory | 15 spare slots; installed items use room slots; pending pack cards reserve capacity |
| Rarity gate | Before level 10, Mythic rolls become Common: 70.3% Common and 0% Mythic |
| Rarity sets | Three working items of one rarity: Common none, Rare +5%, Epic +10%, Legendary +20%, Mythic +30%; strongest set only; combined room hash capped at +40% |
| Compute combos | GPU + ASIC: Compute Duo +10%; adding working FPGA replaces it with Triple Core +20%; never +30% |
| Overclock | +10% hash per level, maximum 5; nominal next-level cost 25 × level, divided by 1.05; each level adds 25% wear and power use; confirmation shows all effects |
| Electricity | 15% base tariff withheld from each epoch’s gross mining, modified by combos, events and overclock power; no reserve/refill; Farm shows each room’s current rate |
| Tax audit | Citywide top 10% by current hashrate, then existing district targeting; 10% of that epoch’s gross mining enters the pool; spendable and earlier unclaimed balances are untouched |
| Demo audit ranks | 24 farms; top decile rounds up to 3; stable farm IDs break ties; rival hashrates span 20–100 H/s independently of season scores |
| Token launch | BLACKOUT game token launches through IMD on Robinhood Chain; 10% of supply goes to IMD swarm contributor agents; part seeds the reward pool; exact split announced at launch |
| Token spending | Quoted nominal cost divided by 1.05 for the 5% purchasing bonus; no withdrawal tax |
| Mining conversion | 0.1 DEMO tokens per effective hash per epoch, before tariff; a practice parameter, never a return forecast |
| Time controls | Run an epoch or advance a game day locally; refill simulated funds without a purchase limit |
| Quiet pack price | Decays during quiet local time and when demo controls advance quiet epochs; already elapsed time is not counted twice |
| City/season | Seeded events; individual simulated rival farm scores contribute to district totals; three-farm lottery sampled without replacement |
| Referral/NFT | Unique local referral links, manual invitee simulation and a once-per-farm demo holder credit; no cross-device tracking or ownership check |
| Storage | `blackout.demo.v3`; shared across routes/tabs in the same origin; incompatible/corrupt saves recover with a notice |
| Offline catch-up | At most 160 epochs per catch-up; no service worker, so offline interaction requires an already loaded page |

Earlier `blackout.demo.v1` saves are not deleted, but their incompatible four-type model is not imported into the new game. Earlier v3 saves retain balances, hardware, packs, overclock levels and season progress. Migration removes the obsolete electricity reserve, adds stable simulated rival hashrates and updates old audit explanations; depleted reserves no longer stop mining. Local saves are editable browser data, not a security boundary or entitlement to launch rewards.

## Changes and attribution

See [CHANGELOG.md](CHANGELOG.md) for the short change list. Original pixel style, palette, fonts and adapter boundary are retained. Font and Better Interface/Impeccable licenses are in `licenses/` with attribution in `NOTICE.md`.
