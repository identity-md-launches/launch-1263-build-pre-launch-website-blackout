# BLACKOUT design system

## Overview

BLACKOUT is a pixel-art idle mining demo for new players. The city landing page leads directly to Play demo. Six focused game tabs separate rooms, packs, city management, seasons, balances and documentation. All use the same farm status bar and saved state. The four-step first-play guide is optional and replayable.

The retained visual language is a cyberpunk night city: near-black navy surfaces, crisp pixel art, neon cyan, electric yellow and magenta accents. Keep the illustration style and square hardware panels. The game is dense enough to show equipment, but secondary settings use disclosure controls. This document describes the final implementation in `src/style.css`, `src/main.ts`, `src/sprites.ts` and `src/docs.ts`.

## Colors

The canonical hex sRGB tokens are in `src/style.css:7`. There is one dark theme with `color-scheme: dark`.

| Semantic token | Value | Role |
| --- | --- | --- |
| `--bg` / `--navy-950` | `#05060f` | Page background |
| `--surface` / `--navy-900` | `#090e1d` | Panels, top bar and bottom navigation |
| `--surface-raised` / `--navy-850` | `#0e1428` | Buttons, onboarding and selected tab surface |
| `--hover` / `--navy-800` | `#141d33` | Item-summary hover |
| `--border` / `--navy-600` | `#354664` | Structural borders |
| `--border-control` | `#65748f` | Interactive borders |
| `--text` / `--gray-100` | `#edf2ff` | Main text |
| `--muted` / `--gray-400` | `#a1aec5` | Supporting copy |
| `--accent` / `--cyan-400` | `#39e6ff` | Brand, links, active combinations, hashrate and sync affordances |
| `--highlight`, `--focus` / `--yellow-400` | `#ffe600` | Primary action, warning text, timers and keyboard focus |
| `--magenta-400` | `#ff3df2` | Epic equipment and illustration accents |
| `--danger` | `#ff869c` | Scrap/reset text and error border |
| Rarity tokens | Common `#bdc8dd`, Rare `#39e6ff`, Epic `#ff3df2`, Legendary `#ffe600`, Mythic `#ff6475` | Borders and written rarity labels |

Primary buttons use `#111323` text on yellow, hovering to `#fff168`. Warnings use `#211d13` with a yellow leading border and explicit reason/action. Combo chips use `#102632` with `#31566a` borders. Form backgrounds are `#080e1e`; notification backgrounds are `#101f30`. Pixel-art palettes remain separate from interface tokens.

Measured opaque rendered pairs: HUD supporting text 8.58:1; cyan HUD value 12.76:1; enabled primary action text 14.52:1; page text 18.04:1; warning text 13.26:1. Evidence and exact RGB values are in `reports/tabs-results.json`. These do not certify image/gradient contrast or every state; incomplete axe contrast checks are retained there.

## Typography

Local fonts use WOFF2 and `font-display: swap`; no CDN is required. `Pixel` is Press Start 2P 400, falling back to monospace. `Mono` is IBM Plex Mono 400/600, falling back to Courier New then monospace. Files are `public/assets/pixel-latin.woff2`, `mono-latin.woff2`, and `mono-semibold-latin.woff2`. Production tests checked both font families loaded.

| Token | Size | Use |
| --- | --- | --- |
| `--font-small` | `.75rem` / 12px | Captions, compact controls, item labels, mobile tabs |
| `--font-label` | `.875rem` / 14px | Standard controls, supporting descriptions |
| `--font-body` | `1rem` / 16px | Body, forms, component headings |
| `--font-title` | `1.25rem` / 20px | Section headings and counters |
| `--font-display` | `2rem` / 32px | Page headings and season timer |
| `--font-logo` | `4rem` / 64px | Desktop landing wordmark |

This is the entire six-size scale. The root uses 16px/1.6 and weight 400. `h1/h2` use Pixel 400/1.6; `h3/h4` use Mono 600/1.5. The guide uses Mono headings to keep instructions compact. Farm’s `#rooms-title` is its single `h1`, using the existing 20px section role (16px/1.7 below 580px); individual room `h2` titles retain Mono 600/1.5 at 14px. Page headings step down to the 20px role at narrower widths. Mobile form controls use 16px, including item room selectors and referral inputs.

Headings balance lines; paragraphs use pretty wrapping; long text can break. No additional letter spacing is introduced. Navigation capitalization is CSS presentation. Timers, balances, XP and ranking values use tabular numerals. Docs uses a 75ch column, 70ch paragraphs and 1.75 line-height; dispatcher copy uses 58ch/1.85. Supporting text is smaller without creating another type scale.

## Layout

Use `.wrap` for a maximum 1200px content width and shared alignment edges. Side gutters are 32px desktop, 20px below 820px, and 16px below 580px. Existing spacing tokens `--space-1` through `--space-8` are 4, 8, 12, 16, 24, 32, 48 and 80px; component rules also use corresponding literal values. Major panels use 24px padding and grids use 24px gaps. Mobile inventory and guide panels use 16px padding.

| Component | Expanded layout | Adaptation |
| --- | --- | --- |
| `.game-topbar` | Five columns: hash, balance, claim, epoch, level | Three columns with a second row below 1120px; 12px inset and smaller role sizes at 600px |
| `.game-nav` | Six header links, current tab underlined | Fixed six-column bottom bar at 600px, text plus symbols, safe-area padding; absent on landing |
| `.farm-layout` | Rooms 1.5fr / inventory 1fr | Single column at 820px |
| `.room-slots` | Three columns / six slots | Retains three columns, smaller gaps and art on phones |
| `.inventory` | Three columns of item disclosures | Two columns at 600px; an expanded item spans two columns |
| `.city-layout` | Map 1.2fr / dispatcher 1fr | Single column at 820px; district grid adapts between four/two columns |
| `.season-layout`, `.wallet-layout` | Two equal columns | Single column at 820px; season countdown/prizes precede standings |
| Pack lab | Pack stage plus reveal area | Stacked at 820px, existing compact mobile reveal treatment retained |
| Docs | Sticky contents and reading column | Single column on phones; tables scroll inside labeled regions |

The top bar is in normal document flow, leaving reading space on small screens. Bottom navigation is fixed at z-index 40, with matching body bottom clearance. Notifications sit above it. The guide stays in flow, rather than obscuring controls with a modal overlay. Item menus expand in their grid and cannot escape the viewport. Closed menus show just art, identity, rarity, condition/hash and a disclosure cue. Generic rerenders retain open disclosures, focus and field values.

Farm starts directly with Mining rooms, its room count and “Six slots. One of each item type.” Its `.inner-page` top padding is 16px at widths up to 600px (`src/style.css`); other pages retain their existing spacing. At 390×844 with the first-play guide visible, both fresh entry paths show the room header and complete starter GPU sprite above the bottom navigation. This is a first-screen preview of the hardware, not the entire six-slot room; the rest remains scrollable.

All seven routes were rendered at 320, 390, 768 and 1440 CSS pixels with no document overflow. A separate 390px check enlarged the root text to 200%; this is not browser-native zoom. Physical device safe-area behavior was not tested.

## Elevation & Depth

Tonal panels and one-pixel borders provide structure. Standard buttons use `3px 3px 0 #0006`; yellow primary buttons use `4px 4px 0 #6a561e`, reduced to a two-pixel offset for the mobile claim. Item-menu buttons drop that shadow. Rooms retain the tiled wall, pipes, five-pixel floor border and inset floor shadow. The hero retains its pixel city and dark text overlay.

Notifications use z-index 30 and `0 8px 40px #0009`. The decorative Mythic flash is pointer-transparent at z-index 50; the skip link uses 100. Native dialogs occupy the browser top layer, with the existing dark/blurred backdrop, maximum 500px width and 85vh height. The guide’s cyan two-pixel outline highlights a control without blocking pointer input.

## Shapes

Square corners are intentional. Fields, meters and progress bars have zero radius. Empty room slots have dashed borders, installed items solid rarity borders, and open item menus cyan borders. Progress and durability use flat bars with written values. SVG sprites use crisp edges and `image-rendering: pixelated`; repeated illustrations reuse the existing registry rather than a new icon package.

## Components

- **Page shell:** `pageHeading()`, `.wrap`, `.inner-page` and route dispatch in `src/main.ts`. Each page has one `h1`; Farm uses Mining rooms directly instead of a separate intro block. Links use hash routes and `aria-current="page"` for navigation.
- **Farm status:** `gameTopbar()` exposes shared values and a large CLAIM action. A native progress bar carries an accessible XP label. Age-gated progress explicitly says which farm day is needed. The sync line shows Synced or the number of outstanding epochs, with SYNC available on every tab.
- **Guide:** `onboarding()` renders four numbered steps and an explicit skip/next control. It progresses through real pack reveals, installation, an epoch and claim. Docs can replay it. Cross-page controls are links; local actions are buttons. Highlights use `.guide-highlight`. Preference storage is optional.
- **Warnings:** `miningWarnings()` gives a reason and a recovery control for empty/idle farms, broken or worn installed hardware, affected outage/theft/audit events and insufficient repair funds. Installed hardware with durability above 0 and below 100 triggers Repair hardware even without an active event; local fire damage retains contextual wording, and the wear warning persists after the fire expires. Worn spares do not trigger it. Separate shortcuts focus worn versus broken installed items. Color is redundant with text. A stable status region announces changes; errors use a separate alert region.
- **Items/rooms:** `roomPanel()` and `inventoryPanel()` use native `details/summary`. Each item owns its menu. Installed items offer removal and repair; spares offer room selection, installation, repair and confirmed scrap. Active combos are compact chips; missing combinations and overclock are disclosed in room settings. No merging or electricity reserve UI exists.
- **Buttons/forms:** `.button`, `.primary`, `.compact`, `.full`, `.text-button` reuse the palette and 44–48px target sizes. CLAIM is the persistent primary; the pack page retains its purchase primary as required. Native radio groups, labels, selects and number inputs retain browser keyboard behavior. Invalid withdrawals have linked text and `aria-invalid`.
- **Confirmations:** Native `dialog` for scrap, reset, overclock and withdrawals, with descriptive action labels, Cancel initially focused, Escape support and return focus. Overclock shows rising cost, hash, wear, power and tariff before confirmation. A stale withdrawal tax requires a new preview.
- **Season/city/wallet:** Shared panels, lists, native disclosures and labels; the leaderboard uses aligned rank/name/score columns and text for the player’s district. Claim availability, lottery entry and NFT credit states are explicit.
- **Demo tools:** One closed `details` panel per game route. Its clock controls are clearly separated from farm actions and do not sync the farm.
- **Motion:** Existing one-off card/pack effects and decorative loops remain within reduced-motion rules. The footer can disable motion. Reduced motion disables animations/transitions; ordinary button feedback uses the existing short transition and 0.96 press scale. No new persistent animation was added.

## Do’s and Don’ts

Start another page with the shared route shell, `.wrap`, status bar and `pageHeading()`. Use existing palette/type tokens and native controls. Keep game numbers under the persistent “Beta values, may change” label and make all money-related copy explicit about demo mode.

Keep item actions next to the item and secondary controls in disclosures. Preserve visible keyboard focus: three-pixel yellow outlines with four-pixel offset, and system Highlight in forced colors. Preserve local art/fonts and relative asset URLs. Do not add a wallet connection, new font/scale, another theme, auto-playing explanation overlay or a second settings dashboard for this demo.

The current six-domain revision review, reproduced findings and unperformed checks are recorded in `reports/fidelity-validation.md`; the broader implementation review is in `reports/tabs-validation.md`. This is an implementation record, not a promise about the future on-chain game.
