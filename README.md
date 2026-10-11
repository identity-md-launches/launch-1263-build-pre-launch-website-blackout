# BLACKOUT

A playable 16-bit idle mining demo: open packs, build a farm and survive the IMD swarm’s grid. This launch update preserves the existing city, dispatcher and pixel art. No wallet or real money is used.

**Keep the site label `blackout-mine-the-city-pray-the`** (`blackout-mine-the-city-pray-the.sites.imd.fun`) and public domain **playblackout.xyz**. X: [@IMDBlackout](https://x.com/IMDBlackout).

## This update

- Three illustrated “How to play in 60 seconds” steps immediately after the hero.
- Visible **Free starter pack** links in the header and hero, both pointing to **https://playblackout.xyz/freepack**. That service is separate; this export contains no `/freepack` page.
- Token-first packs, a one-click simulated ETH alternative, durability output tiers, mining-scaled repairs, and token purchases for rooms 2–4.
- Launch tax steps: 90% for 0–10 minutes, 50% for 10–20, 25% for 20–30, then normal fees. All launch tax goes to the reward pool. No max buy limit. Packs open one hour after token launch.
- Four number-free teasers: Enhancement, Grid stake, Billboards, Season pot.
- Best-district season rewards and a three-winner Epic/Legendary item lottery. New seasons do not award the old token prizes.
- Updated player guide, explicit team ETH fee accounting, risk statements and a central contract-address block.
- Responsive header/HUD offsets, visible purchase quotes, stacked feedback and enlarged-text reflow fixes.

## Install, preview and rebuild

Use Node.js 22.12+ and the existing lockfile. In a normal development checkout:

```sh
npm ci
npm run dev
```

Production and checks:

```sh
npm run typecheck
npm run build
npm run preview
npm test
npx --no-install playwright install chromium
node scripts/launch-smoke.mjs
node scripts/check-delivery.mjs
```

`npm run build` runs TypeScript checking and Vite. Vite retains `base: './'`. The complete static export is in **`dist/`**, including its JS/CSS, three local fonts, favicon, app icon, manifest and OG image. Runtime asset URLs are relative and the production checks serve it under `/preview/`. There are no remote runtime dependencies or backend credentials.

The browser validation script owns a bounded local preview and Chromium session, closes both, writes results to `reports/launch/`, and exits nonzero on failures. The older smoke scripts are historical revision checks; use `scripts/launch-smoke.mjs` for the current UI.

Regenerate the standalone player guide from the same source as the website:

```sh
npx --no-install vite-node scripts/export-docs.ts
```

Artwork is in `src/sprites.ts`; the existing raster social assets are in `public/`. A build copies them to `dist/`. The existing `scripts/render-assets.mjs` can regenerate social/app images if the art changes; run another build afterward.

## Routes and demo behavior

| Hash route | Purpose |
| --- | --- |
| `#/` | Landing, launch schedule and teasers |
| `#/farm` | Rooms, inventory, repair and room purchases |
| `#/packs` | Token/ETH/free demo packs and saved reveals |
| `#/city` | Eight districts, events, lobbying and dispatches |
| `#/season` | District standings and hardware lottery rewards |
| `#/wallet` | Claims, withdrawal previews, fee accounting and referrals |
| `#/docs` | Player guide |
| `#/docs/risks` | No guaranteed returns, player/volume dependence and smart contract risk |
| `#/docs/contract-addresses` | Addresses from the single config block |

No server rewrites are needed. The existing `blackout.demo.v3` localStorage save is retained. Old owned rooms remain owned. Legacy pending practice token prizes are credited once during migration, while future lottery prizes are items. Legacy team accounting is converted to simulated ETH; no new team token balance accrues. No chain state is read or changed.

Demo tools can advance epochs, refill practice balances and **Preview next wear tier**. The latter makes each new output tier immediately testable. A 45-second demo epoch represents the existing six-hour launch design. Demo progress never becomes launch assets.

## Launch configuration and assumptions

Edit only **`config.contracts` in `src/config.ts`** to fill the token, packs, farm, grid and params addresses after deployment. Each currently reads **“TBA at launch”**. The guide renders that block directly. Rebuild the export after filling it. Address strings are display values; entering them does not enable transactions or deploy anything. The future ChainAdapter composition point stays in `src/game/adapter.ts`.

The supplied workspace has no contract source, ABI or deployed addresses. Documentation follows the explicit launch brief and labels other economic values as illustrative. Contract-level parity, deployed permissions, live quotes and audit status remain unverified. Unsupported promises about ownerlessness/upgrades were removed.

Consequential demo choices are centralized and documented:

- Exact durability boundaries use the higher-output tier: ≥80% → 100%, ≥60% → 85%, ≥40% → 65%, ≥20% → 40%, below 20% → off. Overheated equipment contributes neither mining nor combos.
- Repair quotes scale with full-output item mining × 12 demo epochs × missing durability fraction, then apply the existing 5% spending bonus. This coefficient is a demo setting, not an asserted deployed price.
- Room nominal demo prices are 150 / 300 / 600 tokens, with the existing spending bonus; rooms are bought in sequence. No age/level gate grants new rooms automatically.
- Lottery selection uses the existing local seeded simulation and three distinct eligible farms. Epic/Legendary selection is equally weighted in the demo only. Item claims respect reserved inventory slots and are idempotent.
- Team token-denominated fee shares convert to simulated ETH at the existing demo exchange rate. Live conversion/execution is not implemented.

No exact launch timestamp was supplied, so there is no invented countdown or date. X remains the official launch-time link.

## Validation actually run

The task environment’s protected dependencies/build configuration were left unchanged. Dependencies and Chromium were installed outside the repository:

```sh
mkdir -p /tmp/blackout-launch-tools
cp package.json package-lock.json /tmp/blackout-launch-tools/
npm ci --prefix /tmp/blackout-launch-tools --cache /tmp/blackout-launch-npm-cache
PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-launch-browsers /tmp/blackout-launch-tools/node_modules/.bin/playwright install chromium
```

Final verification on 2026-10-11:

| Actual command | Result |
| --- | --- |
| `/tmp/blackout-launch-tools/node_modules/.bin/tsc --noEmit` | Passed |
| `/tmp/blackout-launch-tools/node_modules/.bin/vite build` | Passed; 13 modules; complete relative-URL export |
| `BLACKOUT_TOOLCHAIN=/tmp/blackout-launch-tools /tmp/blackout-launch-tools/node_modules/.bin/vitest run --reporter=dot` | 85 tests passed |
| `BLACKOUT_TOOLCHAIN=/tmp/blackout-launch-tools PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-launch-browsers node scripts/launch-smoke.mjs` | 12 scenarios passed; zero console errors and failed resources |
| `node scripts/check-delivery.mjs` | Passed; file sizes and final export hashes recorded in `reports/bundle-budget.json` |

The export is 426,068 bytes. A verified complete-current-file snapshot Git bundle measured 5,306,916 bytes, below 8 MiB; the publisher’s final bundle is unavailable here. See [the size check and its history limitation](reports/launch/bundle-trial.json).

The browser suite covers actual token/ETH/free purchases, reveal persistence, paid rooms, insufficient funds, all wear tiers, overheating and repair, installation, epoch claims, season item claims, full inventory, City/Wallet actions, doc anchors, keyboard interaction, pause/reduced motion and offline navigation after initial load. Seven routes were checked at 320, 390, 768, 1100 and 1440px. Landing, Farm, Packs and Docs were checked with 200% root text at 390px. The first 390×844 screen contains the product, main action and both starter-pack links.

Axe reported zero violations in the seven tested route states; incomplete checks over art/translucent surfaces and the native meter remain disclosed. Three opaque action/link contrast pairs were measured. The local unthrottled 390px landing had CLS 0 and loaded only local resources; these are worker measurements, not field performance scores.

See [the consolidated six-domain review](reports/launch-validation.md), [machine-readable browser evidence](reports/launch/interaction-results.json), [implemented design](DESIGN.md), and [player guide](docs.md). Earlier reports and screenshots are historical, not evidence for this revision.

Limitations: the supplied MCP browser could not start because its expected Chrome binary was absent; the actual export was instead tested with temporary Playwright Chromium. No physical-device, native screen-reader, browser-native zoom, Safari/Firefox, public-domain availability, live X unfurl, live freepack claim or on-chain verification was performed. The unchanged development toolchain reported four npm advisories. No dependencies, caches, npm archives, ignore-file changes or submodules were added to the submission.

## Publish

The IdentityMD job plane publishes the **committed contents of `dist/`** after submission; it does not rebuild. Retain the existing label **`blackout-mine-the-city-pray-the`** so **playblackout.xyz** keeps pointing to the same site. No direct publishing command was run and no new live CID is claimed.

For another static host, upload the entire contents of `dist/` with the asset paths intact. Preserve the separately served `/freepack` service when updating the public domain. The canonical OG image is `https://playblackout.xyz/og.png`, and the same image is included in the export. The protected legacy `npm run publish` entry names an old workflow; it is not used for this handoff. See [publication notes](reports/publication.md).

## Attribution

Existing SVG artwork and local font licenses remain. The pinned Better Interface/Impeccable notices are retained in [NOTICE.md](NOTICE.md) and `licenses/`.
