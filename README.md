# BLACKOUT

A fully playable, static pre-launch demo of a pixel-art idle mining farm. Open free three-card packs, install equipment, mine DEMO tokens, pay upkeep, merge hardware, unlock a second room and respond to the IMD swarm’s 45-second grid events. No wallet, backend, tracker or real-money transaction is present. Contracts are not deployed.

The finished export is in **`dist/`**. Source, lockfile, local fonts, generated art, preview image, tests and design/validation documentation accompany it. The intended site label is **`blackout`**.

## Install, run and rebuild

Use Node.js 22.12+ (this build was checked with Node 24.21.0) and npm.

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`build` runs TypeScript and Vite and produces `dist/index.html` plus local assets. Vite’s base is `./`; navigation uses section hashes, so the export works at a gateway subpath without server rewrites. Serve the directory over HTTP; opening an ES-module page directly with `file://` is not a supported preview.

Dependencies are development-only. Do not submit `node_modules`, package-manager caches or browser downloads. This assignment prohibited writes to repository `node_modules/`, so the worker installed the lockfile’s dependencies in `/tmp/blackout-toolchain`, font downloads in `/tmp/blackout-fonts`, and browser binaries in `/tmp/blackout-playwright`. No dependency tree or vendored registry is in this submission. No ignore file was changed.

## Browser checks and social image

```sh
npx playwright install chromium
npm run test:smoke
```

The Playwright smoke script starts and closes its own foreground HTTP preview under `/preview/`. It uses a browser clock to exercise the actual 45-second scheduler without a real-time wait. Screenshots and machine-readable results are written under `artifacts/`.

After changing hero art or social copy:

```sh
npm run build
npm run og
npm run build
```

`og` renders a real 1200×630 PNG to `artifacts/og.png` and copies it to `public/og.png`; the final build copies it to `dist/og.png`. Metadata includes title, favicon, description, `og:title`, relative `og:image`, dimensions and a large-image Twitter card. Relative metadata preserves gateway portability; crawler-specific unfurling was not independently certified.

## Publish

On an authorized IdentityMD contributor machine:

```sh
imd site publish dist --name blackout
# Equivalent project script:
npm run publish
```

Publish the **contents of `dist/`**, not the source directory. The publisher serves this export and does not rebuild. `artifacts/publication.md` records the actual publishing outcome and URL. Rebuild before every new publication; check the complete submission size against 8,388,608 bytes. The export includes every runtime font and image.

The actual attempt was refused with **`503 member_sites_closed`** (“this plane names no member sites”). No live URL was returned. The export is ready to retry once that service permits member-site publishing.

For submission hygiene, `node scripts/check-delivery.mjs` checks required output files, relative entry-point assets, OG dimensions and byte accounting. Run it after removing local dependency/cache folders from the submission tree; it deliberately rejects those generated folders. Its final report is `artifacts/bundle-budget.json`.

The assignment explicitly protects `.git/`; the worker does not stage, commit, change hooks or alter Git metadata. Source and export are supplied together for the network’s submission process. No Git submodule is used. Do not interpret this as a worker-created commit.

## Adapter boundary

`src/game/types.ts` defines the single asynchronous `GameAdapter` interface:

`openPack`, `reveal`, `getFarm`, `place`, `unplace`, `claim`, `repair`, `overclock`, `merge`, `lobby`, `getGridEvents`, `getLetters`, plus `payElectricity` and `reset`.

`src/game/adapter.ts` is the composition point. The UI imports only that adapter, normalized types and shared display/math rules; it never imports `DemoAdapter` or accesses demo localStorage. A future Robinhood Chain adapter can implement the same operations and normalize contract state into the same farm/pack/event model, retaining the UI interactions and layout. Actual contract ABIs, wallet authorization, confirmations, reorg handling and production economic rules belong to that future implementation. They are not simulated as real chain functionality here.

`src/config.ts` holds the launch date, X URL, site label, chain ID **4663**, and empty `token`, `packs`, `farm`, `grid` address fields. Keep those fields empty until the real contracts exist. Set `launchDate` to an ISO timestamp with a timezone to activate the countdown; the shipped empty value displays **Date TBA**. The site continues to describe itself honestly as a pre-launch demo.

## Demo rules and intentional limits

- Each pack has three independently rolled cards: rarity 70/22/7/1; GPU/Cooling/PSU/Room type weights 60/20/12/8. A separate Common starter GPU and 150 DEMO tokens make the first session playable. Packs are free and unlimited until the 240-item inventory limit; merge spare items to make room. Pack commitments and reveals are persisted and reveals are idempotent.
- GPU base rates are 10/28/80/250 H/s. Cooling bonuses are 2/5/10/20%. Each room starts with two GPU slots, one cooling slot and one PSU slot. PSU adds 1/2/3/4 GPU slots. A consumed Room key unlocks room 02. Removing a PSU with occupied extra slots is blocked.
- Durability scales GPU hashrate. Overclock levels 1–3 add 25% per level, consume more power and increase wear. Costs: room GPU repair 12 DEMO, electricity refill 15 DEMO, overclock 25/50/75 DEMO, merge 20 DEMO, lobby 10 DEMO. These are game mechanics, not prices or earnings projections.
- The seeded xorshift generator and its state persist with the farm. Reset reproduces the initial seed; the demo is deliberately editable and is not a secure or authoritative ledger.
- One of five grid events occurs every 45 seconds. Effects last 20 seconds: surge +50% hashrate; heat halves rooms without Rare+ cooling; blackout pauses mining, power use and wear; audit removes up to 10 DEMO tokens; calm changes nothing. Events only affect their selected district. The newest 30 events and letters are retained.
- Lobbying consumes 10 DEMO and applies once to the next event. For harmful events, the farm’s district has weight 0.5 versus 1 for each other district (1/15 instead of 1/8). It can still be selected. Positive events keep equal district weights.
- A resumed session simulates at most two hours of elapsed time, with event/expiry boundaries handled in order. Additional offline time grants no mining. There is no service worker; interactions work offline after the page is loaded, but an offline reload is not promised.
- Progress is local to one browser origin. Use one tab; simultaneous-tab conflict resolution is not implemented. Invalid saves recover to a fresh demo with a visible notice; blocked/quota-limited storage remains playable with a warning. The local clock and storage are trusted because nothing has real value.
- NFT starter packs, referrals and weekly inspection rewards are clearly marked launch teasers. They do not imply deployed contracts or active offers.

## Verification actually performed

- TypeScript strict typecheck and production Vite build: passed.
- Vitest: **26 tests passed**, including 100,000 rolls, hashrate/cooling/slot math, spending, persistence, partial-pack recovery, event timing/effects, lobbying and offline limits.
- 100,000-roll result: Common 69,950; Rare 21,998; Epic 7,042; Legendary 1,010. Types: GPU 60,135; Cooling 19,977; PSU 11,936; Room 7,952. All are within the specified test tolerance of 0.5 percentage points.
- Playwright on the real `/preview/` production export: **19 grouped checks passed**. Pack/reveal, tap and drag placement, live mining, claim, upkeep, overclock, lobby/event letter, persistence, reset confirmation, keyboard focus, merge, cooling, slot expansion, room unlock, Legendary dialog, reduced motion, settings and loaded offline interaction were exercised.
- Rendered widths 320, 390, 768, 1024 and 1440px: no horizontal document overflow. The first action is visible at 390×844. Text enlargement to 200% at 390px also reflows without horizontal document overflow.
- Axe-core: zero reported WCAG A/AA violations on the tested page and Legendary modal. The page had 26 passing rule checks; contrast on illustration/gradient/scanline backgrounds remains partially inconclusive. This is not a claim of full accessibility conformance.
- No console errors, page errors, failed requests or HTTP error responses in the smoke run. The browser MCP was also used to inspect the actual export and exercise pack/lobby controls.

Worker commands used the external dependency installation, for example:

```sh
/tmp/blackout-toolchain/node_modules/.bin/tsc --noEmit
BLACKOUT_TOOLCHAIN=/tmp/blackout-toolchain /tmp/blackout-toolchain/node_modules/.bin/vitest run
/tmp/blackout-toolchain/node_modules/.bin/vite build
BLACKOUT_TOOLCHAIN=/tmp/blackout-toolchain PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-playwright node scripts/smoke.mjs
```

See `artifacts/validation.md`, `artifacts/smoke-results.json`, `artifacts/accessibility.json`, and the screenshots for exact coverage and limitations. These are worker observations, not independent certification. Native screen readers, physical devices, native browser 200% zoom, Safari/Firefox, localization and X crawler previews were not tested. X returned HTTP 403 when the reference profile was requested, so the code-drawn art follows the supplied detailed visual brief; an exact comparison to the profile art could not be made.

## Design and attribution

`DESIGN.md` records the implemented tokens, typography, components, responsive layouts and motion. `assets/README.md` explains replacing any generated sprite by filename. Font licenses and the pinned guide’s licenses are retained in `licenses/`; see `NOTICE.md` for source attribution.
