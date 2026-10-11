# BLACKOUT design system

## Overview

BLACKOUT is a pixel-art idle mining game with a playable browser demo. This revision preserves the existing living city, hooded dispatcher, hardware atlas and 16-bit navy/purple identity. It adds a three-step introduction, explicit launch terms and token-based demo purchases. The landing introduces the game; Farm, Packs, City, Season, Wallet and Docs retain their shared local save.

The implementation is TypeScript, template-rendered HTML and CSS. Reuse `src/landing.ts`, the page shell in `src/main.ts`, the SVG functions in `src/sprites.ts`, and `src/style.css`. The final launch/reflow rules at the end of the stylesheet override older declarations. Those older declarations are not a second design system.

## Colors

The single dark theme uses the existing sRGB hex tokens in `src/style.css:7`.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` / `--navy-950` | `#05060f` | Page background |
| `--surface` / `--navy-900` | `#090e1d` | Panels |
| `--surface-raised` / `--navy-850` | `#0e1428` | Secondary controls |
| `--hover` / `--navy-800` | `#141d33` | Hover surface |
| `--border` / `--navy-600` | `#354664` | Structural boundaries |
| `--border-control` | `#65748f` | Control boundaries |
| `--text` / `--gray-100` | `#edf2ff` | Primary text |
| `--muted` / `--gray-400` | `#b3bfd3` | Supporting text |
| `--accent` / `--cyan-400` | `#39e6ff` | Links, selected state and mining output |
| `--highlight`, `--focus` | `#ffe600` | Primary action, warnings and keyboard focus |
| `--magenta-400` | `#ff3df2` | Epic items and neon art |
| `--danger` | `#ff869c` | Errors and destructive actions |
| Rarity | Common `#bdc8dd`, Rare `#39e6ff`, Epic `#ff3df2`, Legendary `#ffe600`, Mythic `#ff6475` | Written rarity labels and trim |

The primary action is dark text (`#0b1020`) on yellow. The hero starter-pack action uses `#edf2ff` on `#101932`. The header starter link uses cyan on the page background. Browser-computed opaque contrast ratios were 14.94:1, 15.53:1 and 13.41:1 respectively. These measurements do not cover every translucent surface or illustration; see the review limitations.

District colors and landmarks remain in `districtArt` in `src/sprites.ts`. Written names, event descriptions, borders and icons accompany color. An overheated item explicitly says “Overheated · off”; its condition is not communicated by glow alone.

## Typography

Local WOFF2 fonts are preloaded in `index.html`: Press Start 2P (`Pixel`, weight 400) and IBM Plex Mono (`Mono`, weights 400/600). Fallbacks are monospace and Courier New. `font-display: swap` is retained. Browser checks confirmed the fonts loaded.

| Token | Size | Use |
| --- | --- | --- |
| `--font-small`, `--font-label` | `.875rem` / 14px | Captions, controls and supporting text |
| `--font-body` | `1rem` / 16px | Body text, forms and item headings |
| `--font-title` | `1.25rem` / 20px | Page/section headings and pack price |
| `--font-display` | `2rem` / 32px | Mobile wordmark and large counters |
| `--font-logo` | `4rem` / 64px | Desktop wordmark |

Six semantic tokens resolve to five sizes. The root uses 16px/1.6. Pixel headings use regular weight and generous line height for the blocky glyphs. Body headings use Mono 600/1.5. The wordmark uses line-height 1.3 and −2px tracking on desktop, resetting tracking on phones. Ordinary labels use sentence case; BLACKOUT and acronyms retain their spelling.

Headings balance, descriptions wrap prettily, and long-form docs use a 75ch column with 70ch paragraphs. Numbers use tabular figures. Mobile input text remains 16px. Root text enlargement was checked at 200%; browser-native zoom was not tested.

## Layout

`.wrap` caps content at 1200px with 32px desktop, 20px intermediate and 16px phone gutters. Spacing tokens are 4, 8, 12, 16, 24, 32, 48 and 80px. Landing sections generally use 88px vertical padding, dropping to 56px at 680px. Panels generally use 24px padding, dropping to 16–20px on phones.

| Component | Wide layout | Narrow layout |
| --- | --- | --- |
| Header | Brand, game links, starter-pack link and sound | Navigation wraps to a second row at 601–1100px; becomes fixed bottom navigation at 600px |
| Hero | Centered wordmark and actions over the retained skyline | Cropped skyline; product, Play demo and Free starter pack visible at 390×844 |
| How to play | Three illustrated columns | Three rows with art beside the text at 680px |
| Hardware | Native horizontal carousel with arrows | Partial next card and scrollbar hint at more content |
| Launch | Introduction beside a full-width stepped tax list | One column at 680px; time and rate can wrap with enlarged text |
| Coming soon | Four noninteractive teaser cards | Two columns at 680px |
| Farm | Rooms beside inventory | Stacked below 820px; local item disclosures expand in place |
| Packs | Pack purchase beside reveal cards | Stacked; token and ETH buttons remain above the bottom navigation at 390px |
| City, Season, Wallet | Existing paired panels | Stacked below 820px |
| Docs | Contents beside text | Stacked below 820px; tables scroll in labeled regions |

`updateChromeOffsets()` measures the header, HUD and bottom navigation through `ResizeObserver`. The HUD clears the actual header height; guide anchors clear both sticky areas; bottom padding accounts for the navigation. With root text above 20px or a viewport below 320px, `reflow-mode` makes the header/HUD nonsticky and places HUD fields in two columns. Bottom navigation uses auto-fit columns based on `3rem`, so enlarged labels wrap into rows.

All seven routes were checked at 320, 390, 768, 1100 and 1440 CSS pixels without document overflow. Landing, Farm, Packs and Docs were also checked at 390px with 200% root text. This is Chromium emulation, not a physical-device guarantee.

## Elevation & Depth

Square tonal panels, one-pixel borders, stepped silhouettes and hard button shadows preserve the pixel style. The skyline retains three parallax layers, lit windows, drones, rain, smoke and the dispatcher tower. CRT scanlines and decoration are pointer-transparent.

The header is z-index 40, HUD 25, coach 55 and bottom navigation 60. Status messages and level-up feedback now share `.feedback-stack` at 75 instead of occupying overlapping fixed positions. The stack has a 50dvh limit and scrolls when necessary; messages remain dismissible. Native dialogs use the browser top layer. Boot remains at 100 and is skippable.

## Shapes

Use square corners and crisp pixel art. Empty equipment slots have dashed borders; installed equipment uses written rarity and a solid border. Shared hardware symbols have a 64×64 viewBox. The city is 960×420; district scenes are 104×100; dispatcher art is 128×128. Preserve explicit viewBoxes, `shape-rendering: crispEdges` and `image-rendering: pixelated`.

## Components

- **Shared artwork:** `spriteSheet()`, `itemSprite()`, `districtSprite()` and `sprite()` in `src/sprites.ts`. The atlas, skyline and dispatcher were retained unchanged. Reuse them for new game surfaces.
- **Landing:** `landing()` supplies the hero, three steps, hardware row, dispatches, launch sequence, four teasers and FAQ disclosures. The starter-pack destination is `config.freePackUrl`; it is an external link, not a local route.
- **Purchases:** Packs shows the token quote first, a filled “Buy with tokens” button, and a separate one-click “Buy with ETH” action. Pending reveals and full inventory disable further purchases. A saved free demo pack adds its own button. The first tutorial bubble is hidden during purchase to keep the price visible.
- **Rooms:** `.room-shop` presents ownership, token quotes and the next eligible purchase. A native confirmation dialog shows the cost. Cancel/Escape returns focus to the trigger; purchase focuses the new room heading. Prices are expressly illustrative demo values.
- **Durability:** `durabilityOutput()` and `repairCost()` in `src/game/rules.ts` drive both visible output labels and actual mining. `#durability-guide` discloses the five tiers. Item menus show individual token repair prices; room repair sums item quotes. Demo tools provides “Preview next wear tier.”
- **Season:** The existing district leaderboard remains. Three lottery winners receive Epic or Legendary hardware. Pending prize items are shown by art, rarity and name; claiming requires inventory capacity and can only consume a prize once.
- **Navigation and docs:** Hash routes preserve static hosting. Links retain native behavior and current-page state. Each route has one h1. Native details/summary handles FAQs, item menus and advanced settings. Docs provides deep links, risk text and the address table sourced from `config.contracts`.
- **Controls and feedback:** Reuse `.button`, `.primary`, `.compact` and `.full`. Ordinary actions target 44px minimum; the compact sound button is 32×44px. Keyboard focus uses a 3px yellow outline and 4px offset. Status/error live regions, persistent labels and withdrawal errors remain. `feedback-stack` keeps simultaneous messages individually usable.
- **Motion and sound:** Existing loops and effects live in `src/effects.ts` and CSS. The city pause and footer toggle stop animation. Reduced motion disables looping art, parallax, flashes and sequencing delays. Sound remains opt-in. No new animation was added for launch terms or teasers.
- **Social assets:** `index.html` retains title, description, favicon, OG and Twitter metadata. `public/og.png` is the existing 1200×630 city image; app icon is 512px. Required assets are local. The canonical crawler image uses `https://playblackout.xyz/og.png`.

## Do’s and Don’ts

Reuse existing tokens, fonts, atlas, panels and native controls. Keep one filled yellow primary action per local decision. State currency, cost and simulated status before a purchase. Keep numerical rules in config/rules and derive repeated launch terms from `config.launchTax`.

Preserve the label `blackout-mine-the-city-pray-the`. Never add a local `/freepack` page. Teasers contain only Enhancement, Grid stake, Billboards and Season pot, with no numbers. Filling the address block does not turn the demo into a connected game; that requires a separately implemented ChainAdapter.

For a new page, extend the hash dispatcher, use the existing shell and one h1, then compose panels and disclosures. Test narrow layouts, keyboard focus and saved state. Do not add a font CDN, competing type scale, wallet SDK or alternate artwork system to this static demo.

Current evidence: [launch validation](reports/launch-validation.md). Earlier reports document earlier revisions. Attribution and licenses remain in `NOTICE.md` and `licenses/`.
