# BLACKOUT design system

## Overview

BLACKOUT is a playable pixel-art idle mining demo. The landing introduces the city, hardware and launch; Farm, Packs, City, Season, Wallet and Docs share the existing saved farm and adapter. This revision keeps the navy/purple, cyan, yellow and magenta identity, with crisp 16-bit artwork and restrained CRT texture.

The landing uses generous section spacing and a living skyline. Game screens use compact sticky status controls and progressive disclosure so the working area starts near the top. This document describes the implemented source, including the final overrides at the end of `src/style.css`; earlier legacy declarations are not a second design system.

## Colors

Canonical sRGB hex tokens live in `src/style.css:7`. There is one dark theme.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` / `--navy-950` | `#05060f` | Page background |
| `--surface` / `--navy-900` | `#090e1d` | Panels |
| `--surface-raised` / `--navy-850` | `#0e1428` | Secondary controls |
| `--hover` / `--navy-800` | `#141d33` | Hover surface |
| `--border` / `--navy-600` | `#354664` | Structural borders |
| `--border-control` | `#65748f` | Control boundaries |
| `--text` / `--gray-100` | `#edf2ff` | Primary text |
| `--muted` / `--gray-400` | `#b3bfd3` | Readable supporting text |
| `--accent` / `--cyan-400` | `#39e6ff` | Brand, links, hashrate, selected districts |
| `--highlight`, `--focus` | `#ffe600` | Primary action, warning and keyboard focus |
| `--magenta-400` | `#ff3df2` | Epic items and neon artwork |
| `--danger` | `#ff869c` | Destructive actions and errors |
| Rarity | Common `#bdc8dd`, Rare `#39e6ff`, Epic `#ff3df2`, Legendary `#ffe600`, Mythic `#ff6475` | Written rarity, trim and effects |

Primary buttons use `#0b1020` on yellow. Disabled controls use `#9aa9bd` on `#202a3c` rather than opacity-reduced text. The warning strip is `#201e15`; coach marks use `#152b3d` with cyan borders. The HUD is `#090e1df5` with backdrop blur. Illustration palettes intentionally add metal, copper, window and atmosphere tones.

District accents are defined once in `src/sprites.ts` as `districtArt`: Neon Row magenta `#ff3df2`; Copper Yard orange `#ffa452`; Stack Heights cyan `#39e6ff`; Dockside teal `#4ff5ce`; Old Circuit amber `#ffc16a`; Ghost Quarter pale green `#b6f7b0`; Relay Point blue `#82aaff`; Solar Hill yellow `#ffe600`. District name, landmark and event label accompany color. “Your farm” and an outline identify the player.

Measured opaque pairs: primary button 14.94:1, page text 18.04:1, warning text 13.17:1. See `reports/polish/interaction-results.json` for exact RGB pairs. HUD reference calculations use the page background and are not measurements of its translucent composite. Contrast over art and other translucent surfaces remains partly unverified.

## Typography

All fonts are local WOFF2 files in `public/assets/`, with preload links in `index.html`. Pixel is Press Start 2P 400 with a monospace fallback. Mono is IBM Plex Mono 400/600, then Courier New/monospace. `font-display: swap` is retained. Browser checks confirmed both families loaded.

| Token | Size | Role |
| --- | --- | --- |
| `--font-small`, `--font-label` | `.875rem` / 14px | Minimum captions, labels, controls, supporting copy |
| `--font-body` | `1rem` / 16px | Body, forms, item and card headings |
| `--font-title` | `1.25rem` / 20px | Page/section headings, large counters |
| `--font-display` | `2rem` / 32px | Mobile wordmark, launch figures, season countdown |
| `--font-logo` | `4rem` / 64px | Desktop wordmark |

Six semantic tokens resolve to five sizes. The root uses 16px/1.6 at weight 400. Pixel headings use 400, with 1.6–1.9 line-height for the blocky letterforms; Mono headings use 600/1.5. The hero wordmark uses 1.3 and −2px letter spacing on desktop, resetting spacing on mobile. No small tracked uppercase eyebrow system is used.

Headings balance; paragraphs use pretty wrapping. Supporting landing copy uses 1.7–1.8 line-height; docs retain a 75ch column and 70ch paragraphs. Timers, balances and prices use tabular numbers. Mobile input/select text remains 16px. Visible text was checked at 14px minimum. The interface supports 200% root text enlargement; this is distinct from native browser zoom.

## Layout

`.wrap` has a 1200px maximum width, with 32px desktop, 20px intermediate and 16px phone gutters. Existing spacing tokens are 4, 8, 12, 16, 24, 32, 48 and 80px. Major landing sections use 88px vertical spacing, reduced to 56px at 680px; hardware uses 64/48px. Panels typically use 24px padding, reduced to 16–20px on phones.

| Pattern | Desktop | Responsive behavior |
| --- | --- | --- |
| Header/HUD | Sticky 64px header; single compact status row below | 60px header at 600px; two compact HUD rows; Sync stays available |
| Navigation | Six header links, underlined current tab | Six fixed bottom tabs at 600px, with labels, symbols and safe-area padding; hidden on landing |
| Hero | Centered 64px wordmark over a 960×420 scene | 32px wordmark; art crops deliberately; Play demo is in the first 390px viewport |
| How it works | Four columns | Two columns at 940px |
| Hardware | Scrollable, snap-aligned 218px cards | 202px cards; visible overflow cue, native scrollbar and arrow controls |
| Grid event cards | Three columns | One column at 680px, each with a narrow illustration column |
| Swarm/launch/FAQ | Two columns | One column at 680px |
| Farm | Rooms 1.5fr / inventory 1fr | One column at 820px; room slots stay three across, inventory two at 600px |
| City | Map and dispatcher side by side | One column at 820px; four districts across, two at 600px |
| Season/wallet | Two columns | One at 820px |
| Pack lab | Pack stage beside three cards | Stacked at 820px; 128px pack-art stage on phones puts purchase above tabs; cards scroll horizontally below 380px |
| Docs | Contents alongside reading column | Stacked at 820px; labeled tables scroll within their own region |

Coach marks are fixed overlays anchored to the real navigation/action element, not part of document flow. They flip above the target when needed, hide when its target is offscreen, and reposition on scroll/resize. The guide can be dismissed or replayed from Docs. At 390px the pack action is above the bottom tabs; farm title and starter equipment remain visible. All seven routes were checked at 320, 390, 768 and 1440 CSS pixels without document overflow.

## Elevation & Depth

Square tonal panels and one-pixel borders organize the UI. Buttons use hard 3–4px offset shadows; hover adds a restrained glow. Rooms retain pipes and tiled surfaces. The hero uses far silhouettes, mid buildings and near roofs, moved at different scroll rates. Rain, drones, smoke, lit windows and the central tower supply depth without text labels on buildings.

The header is z-index 40, HUD 25, coach 55, bottom nav 60, messages 70, level badge 72 and boot 100. Native dialogs use the browser top layer and a dark translucent backdrop. Decorative glows/scanlines are pointer-transparent. Coach shadows are `0 12px 32px #0009`; item rarity glows are modest drop shadows.

## Shapes

Square corners, stepped silhouettes, pixel rects and crisp edges are intentional. Do not round cards or blur the sprite shapes. Empty slots use dashed borders; installed items use solid rarity borders. All hardware has an explicit 64×64 viewBox. Scene viewBoxes are 960×420 (city), 104×100 (district), 128×128 (dispatcher), 76×96 (pack) and 100×128 (tower). Artwork uses `shape-rendering: crispEdges` and `image-rendering: pixelated`.

## Components

- **Shared art:** `spriteSheet()`, `itemSprite(type, rarity, className, durability)`, `districtSprite(index, event, className)`, `sprite(name, className)` in `src/sprites.ts`. Twelve hardware symbols are defined once and referenced with SVG `<use>` throughout the landing, rooms, inventory and reveals. Common is plain; Rare has cyan trim, Epic sparks, Legendary shimmer and Mythic a red electric aura. Damaged art adds cracks, with smoke for worn gear. The standalone download uses the same drawing registry.
- **Landing:** `landing()` in `src/landing.ts` contains the four-step illustrations, 12-item row, three sample dispatches, hooded dispatcher, exact launch terms and five native FAQ disclosures. Links lead to working hash routes. The hardware row scrolls natively and supports buttons/keyboard.
- **Page shell:** `pageHeading()`, `.wrap`, `.inner-page`, the hash dispatcher and `gameTopbar()` in `src/main.ts`. Each route has one h1. Header links use `aria-current`. The HUD provides hash, balance, claim, epoch and sync; detail density reduces at narrow sizes without removing the claim/sync actions.
- **Warnings:** `miningWarnings()` shows one relevant strip with an action and dismiss control. Worn installed hardware warns only below 50% durability; broken equipment has a separate higher-priority warning. Dismissal is in memory for that warning signature. Stable live regions announce status/errors.
- **Coach marks:** `onboarding()`/`highlightGuide()` point at pack opening, inventory, epoch and claim. Actual gameplay advances the optional four-step guide; no duplicate purchase action is introduced.
- **Item menus:** Native details/summary for install/remove/repair/scrap. Open menu state, field values and focus survive rerenders. Room settings disclose combo explanations and overclock. Scrap, reset, withdrawals and overclock retain native confirmation dialogs with Cancel focus, Escape and focus return.
- **Controls:** `.button` plus primary/compact/full variants. Minimum ordinary target 44px; fixed close controls are at least 32–40px. Focus is a 3px yellow outline with 4px offset, with system Highlight in forced colors. Native fields have persistent labels and withdrawal errors are associated with the field.
- **Motion/sound:** `src/effects.ts` holds presentation effects only. Boot is one second, once per session and skippable; the 800ms logo flicker begins after that screen clears. City waves recur at 9–11 second intervals and restore power after 2.2 seconds; every third wave includes a substation strike. Pack opening lasts 850ms, sequential reveals 400ms apart, claim count-up 650ms and token burst 900ms. Tab CRT feedback is 140ms. Legend/Mythic get a one-off screen flash. Sound is off until explicitly enabled and synthesized locally with Web Audio. The visible Pause city and footer toggle disable motion; reduced motion removes parallax, flashes, looping animation and sequence delays.
- **Sharing:** Epic+ revealed cards expose an X intent and `Download pixel card`. `downloadPixelCard()` exports a local 1000×1200 PNG; it does not upload anything. `index.html` supplies shared OG/Twitter metadata for all hash routes. Social image is 1200×630; favicon and 512px app icon use the header logo.

## Do’s and Don’ts

Reuse the existing hex tokens, five-size type scale, `.wrap`, native disclosures and shared atlas. Preserve the no-wallet demo and keep all gameplay numbers in the existing config/rules. New art must have an explicit viewBox and share the same item definitions rather than invent a second item style.

Use a filled yellow action for the important next step. Keep practical button labels and written rarity/event states; never rely only on glow, color or animation. Preserve reduced motion and optional sound. For a new game page, add a hash route, the shared shell and one h1, then use existing panels and field patterns. Avoid introducing a new font, wallet flow, external asset dependency or blocking onboarding panel.

Current review and evidence: `reports/polish-validation.md`. Earlier reports remain historical. Design/documentation guidance attribution and licenses are retained in `NOTICE.md` and `licenses/`.
