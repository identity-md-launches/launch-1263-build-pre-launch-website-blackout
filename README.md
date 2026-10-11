# BLACKOUT

A playable 16-bit idle mining demo. Open hardware packs, build a farm and survive a city run by the IMD swarm. No wallet or real money is used. Game rules and economic values are unchanged by this art/landing upgrade.

Site label: **blackout-mine-the-city-pray-the**. Public domain: **playblackout.xyz**. Project X: [@IMDBlackout](https://x.com/IMDBlackout).

## What ships

- Living three-layer skyline, eight district landmarks, dispatcher tower, rain, drones, smoke, flickering windows, district blackout waves and substation lightning.
- Complete landing: four steps, all twelve hardware items, three event dispatches, the hooded swarm operator, launch details, five FAQs and footer.
- Shared 64×64 SVG hardware atlas, five rarity treatments and damage overlays. District art is shared by the skyline, map and event cards.
- Compact sticky game HUD, floating coach marks and one dismissible warning strip. Worn hardware warns below 50% durability.
- Session boot, CRT transitions, pack/reveal/claim/level effects, optional synthesized sound, pause controls and reduced-motion support.
- Epic+ X post intents and downloadable pixel cards. Local 1200×630 social preview, logo favicon, 512px app icon and manifest.

| Hash route | Purpose |
| --- | --- |
| `#/` | Discover the game and launch |
| `#/farm` | Rooms, combos, inventory and item actions |
| `#/packs` | Practice pack purchases and reveals |
| `#/city` | Districts, grid events, lobbying and dispatcher letters |
| `#/season` | Scores, countdown and practice prizes |
| `#/wallet` | Claims, withdrawal previews and referrals |
| `#/docs` | Player guide and replayable onboarding |

The existing localStorage key and adapter are retained. Dockside takes the former Night Market ID; Solar Hill takes the former Fringe ID. Other district IDs stay unchanged, preserving saves. Launch tax copy describes the requested launch; it adds no real-token, wallet or anti-sniper transaction code to this demo.

## Install and preview

Use Node.js 22.12+ and the existing lockfile. In a normal local checkout:

```sh
npm ci
npm run dev
```

Production:

```sh
npm run typecheck
npm run build
npm run preview
```

The full ready-to-serve export is in **`dist/`**. Vite retains `base: './'`; assets, fonts, favicon and manifest work at a static gateway subpath. Navigation uses hashes, so no server rewrite is needed. There are no external runtime packages, font CDNs, wallet SDKs or backend services.

For this restricted assignment, dependencies and browser binaries were kept outside the repository:

```sh
mkdir -p /tmp/blackout-tools
cp package.json package-lock.json /tmp/blackout-tools/
npm ci --prefix /tmp/blackout-tools --cache /tmp/blackout-npm-cache
/tmp/blackout-tools/node_modules/.bin/tsc --noEmit
/tmp/blackout-tools/node_modules/.bin/vite build
PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers /tmp/blackout-tools/node_modules/.bin/playwright install chromium
```

No dependency, cache, archive, registry mirror or submodule is included. Existing manifests, lockfile and build configuration were not modified. No ignore file was added or changed.

## Rebuild artwork and player guide

All game art is in `src/sprites.ts`. `spriteSheet()` defines the twelve hardware symbols; consumers use `itemSprite()`. Rarity/effect CSS is in `src/style.css`. The landing is `src/landing.ts`; presentation-only timing/audio/downloads live in `src/effects.ts`.

```sh
npm run build
node scripts/render-assets.mjs
npm run build
npx --no-install vite-node scripts/export-docs.ts
```

The asset script owns and closes its local preview/browser, renders `public/og.png`, and derives favicon/app icon from the actual header logo. Run a build after changing any public file. With external dependencies, prefix browser scripts with `BLACKOUT_TOOLCHAIN=/tmp/blackout-tools PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers` and use the corresponding binaries above.

## Validation actually run

The final source/export was checked locally on 2026-10-11:

| Command | Actual result |
| --- | --- |
| `/tmp/blackout-tools/node_modules/.bin/tsc --noEmit` | Passed |
| `/tmp/blackout-tools/node_modules/.bin/vite build` | Passed; 13 modules; complete relative-URL export |
| `BLACKOUT_TOOLCHAIN=/tmp/blackout-tools /tmp/blackout-tools/node_modules/.bin/vitest run` | 67 tests passed across two files |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers BLACKOUT_TOOLCHAIN=/tmp/blackout-tools node scripts/smoke.mjs` | 21 scenarios passed; zero console errors and failed resources |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browsers BLACKOUT_TOOLCHAIN=/tmp/blackout-tools node scripts/motion-smoke.mjs` | 12 groups passed, including timed effects, sharing assets, font/layout measurements and landing accessibility |
| `node scripts/check-delivery.mjs` | Passed; byte totals and SHA-256 export hashes in `reports/bundle-budget.json` |

The production suites serve the actual `dist/` at `/preview/`, close their servers/browsers, and use a controlled clock. They cover real pack/reveal/install/claim flows, keyboard-only navigation, confirmations/focus return, withdrawal previews, district movement, saved state, offline use after initial loading, storage failure, worn thresholds, downloads, sound opt-in and reduced motion. Seven routes were checked at 320, 390, 768 and 1440px. Root text was enlarged to 200%. The 390px landing and pack purchase actions are above the bottom edge/navigation respectively.

Axe found zero violations on the six game pages, overclock dialog and desktop/mobile landing in the tested states; incomplete contrast checks over complex surfaces are recorded. Local unthrottled landing CLS was **0** at 390px and 1440px after font preloads. This is worker evidence, not an independent certification or a field performance score.

See [the six-domain review](reports/polish-validation.md), [interaction results](reports/polish/interaction-results.json), [motion/performance results](reports/polish/motion-results.json), [design system](DESIGN.md), [changelog and screenshots](CHANGELOG.md), and [player guide](docs.md). Named handoff artifacts also live in `artifacts/`; core evidence is copied into `reports/polish/` because the worker excludes `artifacts/` from Git by default. Older reports are historical, not evidence for this revision.

Limitations: Chromium desktop/mobile emulation only; no physical-device, native screen-reader, browser-native zoom, live X unfurl, public-domain or listening test. The X intent text and PNG were verified locally; no post was sent. npm reported four advisories in the unchanged development toolchain; dependency remediation was outside the permitted paths.

## Publish

This assignment delivers the complete static export for the IdentityMD job plane to pin and publish after submission, under **blackout-mine-the-city-pray-the** and the existing public domain **playblackout.xyz**. No direct publish command was run and no new live CID is claimed. See [publication handoff](reports/publication.md).

For any other static host, upload **the contents of `dist/` together**, keeping its assets directory. No install or rebuild is needed on the host. The social crawler image points to `https://playblackout.xyz/og.png`; this canonical image is included locally in the export but its public availability depends on publication. All page runtime URLs remain relative.

The protected legacy `npm run publish` entry still names an earlier workflow and is not this handoff mechanism. No contracts were deployed or changed.

## Attribution

Art is authored as local SVG. Local font licenses and the pinned Better Interface/Impeccable notices are retained in [NOTICE.md](NOTICE.md) and `licenses/`.
