# BLACKOUT design system

## Overview

BLACKOUT is a pre-launch pixel-art idle mining game for players who want to try the core loop before contracts exist. The implemented page combines a rooftop city illustration with a playable pack lab, mining rooms, inventory and eight-district grid. Cyan marks primary actions and powered hardware; yellow marks demo status and grid events; magenta distinguishes Epic gear and illustration accents. The dark control tower and its red eye are visible in the middle of the city.

The page uses square edges, pixel illustrations, generous separation between sections and denser equipment panels. Marketing headings stay short. Instructions sit beside the controls they explain. Rarity, selection, grid status and disabled states all have textual cues as well as color.

Source of truth: `src/style.css` for tokens and layout; `src/main.ts` for markup and interaction patterns; `src/sprites.ts` for every game illustration; `src/game/` for rules and state. This document describes the final implementation, not a proposal.

## Colors

Tokens are defined in `src/style.css:4`. Primitives are hex sRGB; semantic aliases are used by components. The art registry also contains its own fixed pixel palette.

| Semantic token | Value | Use |
| --- | --- | --- |
| `--bg` | `#05060f` | Page background, dark text on primary actions |
| `--surface` | `#090e1d` | Panels, secondary buttons |
| `--surface-raised` | `#0e1428` | Badges and raised controls |
| `--hover` | `#141d33` | Hover surface family |
| `--border` | `#354664` | Structural panel boundaries |
| `--text` | `#edf2ff` | Primary text |
| `--muted` | `#a1aec5` | Supporting copy and labels |
| `--accent` | `#39e6ff` | Primary actions, power and selected hardware |
| `--highlight`, `--focus` | `#ffe600` | Demo labels, grid notices, focus outline |
| `--common` | `#bdc8dd` | Common rarity |
| `--rare` | `#39e6ff` | Rare rarity |
| `--epic` | `#ff3df2` | Epic rarity |
| `--legendary` | `#ffe600` | Legendary rarity |

The repeated brand hues deliberately serve both the requested rarity palette and art. Labels and symbols disambiguate them. The city uses `#030c39`, `#05060f`, `#070b24`, muted purple facades, cyan and yellow windows, magenta neon and a red tower eye. Sprite colors are illustrative, not a parallel interface theme.

Measured solid pairs are recorded in `artifacts/smoke-results.json`: primary text/page 18.04:1; muted/raised surface 8.16:1; primary button text/fill 13.41:1; Common/raised 10.85:1; Epic/raised 6.27:1; Legendary/raised 14.42:1. These measurements do not certify every animated or illustrated background; see the validation limitations.

## Typography

Local WOFF2 files are bundled in `public/assets/` and copied into the export. No font CDN is used at runtime.

| Family | Files / weights | Role |
| --- | --- | --- |
| `Pixel` (Press Start 2P), monospace fallback | `pixel-latin.woff2`, normal 400 | BLACKOUT wordmark and section headings |
| `Mono` (IBM Plex Mono), Courier New / monospace fallback | `mono-latin.woff2` 400; `mono-semibold-latin.woff2` 600 | Body, controls, numbers and component headings |

Six size roles: `--font-small` 0.75rem, `--font-label` 0.875rem, `--font-body` 1rem, `--font-title` 1.25rem, `--font-display` 2rem, `--font-logo` 4rem. At 640px and below the logo role is 2rem, capped at 9vw to preserve its single-word mark on narrow or enlarged-text layouts. Other text remains scalable. Section headings step down to the body role on small screens.

Body line-height is 1.6; pixel headings use 1.7–1.8 to accommodate their heavy glyphs; logo uses 1.3. Terminal prose uses 1.85. Supporting text stays at 12px or above at the default root size. Most longer prose is constrained to roughly 65 characters; the wide fairness panel has a 100-character maximum. Heading wrapping is balanced, paragraph wrapping uses `pretty`, and headings can break long words under text enlargement. Changing numbers use tabular numerals. No letter spacing is added to small labels.

## Layout

`.wrap` is at most 1200px wide. Desktop gutters are 32px, intermediate gutters 20px, and phone gutters 16px. The spacing vocabulary is 4, 8, 12, 16, 24, 32, 48 and 80px; the main section offset is 64px on desktop and 48px on phones. Related controls usually use 8–12px gaps; panel padding is 16–28px.

The desktop pack lab splits 38/62 between pack and reveal. Farm panels split 1.4/1; grid and terminal split 1.2/1. Pack cards use an adaptive grid with a 4.9rem minimum so enlarged text can reduce the column count. The inventory scrolls within a visibly bounded panel and retains the item count and filters above it.

Breakpoints are 1100, 860 and 640 CSS pixels. At 1100px the farm claim action moves below the counters and the district map becomes two columns. At 860px navigation links give way to the brand and mode label; controls remain reachable through the page and hero action. At 640px the pack lab, farm and grid become single columns; steps and launch content stack. Two GPU slots fit side by side, expanded rooms use two columns on phones, and the eight districts stay in a two-column map. Header content can wrap under text enlargement.

The hero is 624px minimum on desktop and 594px on phones, with a clipped decorative city illustration. Its CTA is in normal document flow; it was observed on the first screen at 390×844. The 320, 390, 768, 1024 and 1440px layouts and 200% text enlargement at 390px were checked for document overflow. Native browser zoom and physical devices were not tested.

## Elevation & Depth

Panels use visible structural borders, not rounded floating cards. The primary button has a 3px offset dark cyan shadow. Neon glow belongs to the wordmark, sprite LEDs, selected hardware and rarity art. Notifications are fixed above the page with a dark shadow and explicit dismissal. Native dialogs use the browser top layer; their backdrop darkens and blurs the page. Legendary gets a full-screen dark/gold radial treatment.

CRT scanlines apply only to the city, pack stage and room scene; their pseudo-elements do not receive pointer events. A visible toggle removes them. The dark city sky is continuous above and inside the SVG, avoiding an image boundary through the hero copy.

## Shapes

Interface corners are square. Cards, slots, panels and buttons use one-pixel borders. Slots distinguish empty (dashed), compatible (cyan tinted), and installed (rarity border) states. Decorative pixels are rectangles and stepped polygons; SVG uses `shape-rendering="crispEdges"` and all sprites use `image-rendering: pixelated`.

## Components

- **Buttons:** `.button.primary`, `.button.secondary`, `.text-button` in `src/style.css`; native `<button>` for actions and `<a>` for navigation in `src/main.ts`. Main actions are at least 48px high; phone settings and filters are at least 44px. Hover styling is pointer-gated. Focus uses a 3px yellow outline with 5px offset and a forced-colors override.
- **Pack lab:** `openPack`, `renderCards`, `reveal` in `src/main.ts`. The pack is a labeled native button. Opening is guarded against duplicate clicks; committed cards persist. Each card can be revealed independently or together. Rarity is named, symbolized, colored and illustrated. A staged flip and particles scale the moment. The full-screen Legendary dialog returns focus to the next unrevealed card, or to the pack button.
- **Farm:** `renderRooms`, `slotMarkup`, `updateCounters`. The pixel room uses real buttons for every slot. Selection plus slot activation, Install, and drag/drop all call the same adapter. Empty-slot instructions, matching-slot highlighting, durability meters and Remove labels make state explicit. Frequent numeric updates happen in place so keyboard focus survives the timer. Action redraws restore focus by slot identity.
- **Inventory:** `renderInventory`, `itemTile`. Filter buttons expose `aria-pressed`; each item has a full accessible name, rarity text and an installed/selected marker. Empty filtered lists suggest opening a pack. Three matching spare items can be merged after confirmation. Errors remain in a dismissible live status panel.
- **Grid and terminal:** `renderGrid`. Eight semantic list items show district number, name and explicit Online/Offline/event text. The current district has a farm label. Lobbying is visibly consumed by the next event. New dispatcher letters enter a polite live region; previous letters use native `<details>` with a bounded log.
- **Confirmations:** `confirm`, native `<dialog>`, Cancel first. Reset and merge name their consequences. Escape cancels and returns focus. The destructive change never occurs merely by opening a dialog.
- **Sprites:** `sprite` and `itemSprite` in `src/sprites.ts`. Registry names: `gpu`, `cooling`, `psu`, `room`, `pack`, `mascot`, `city`, `tower`, `bolt`, `coin`, `merge`, `district`. Matching SVG/PNG/WebP files in root `assets/` replace generated art on rebuild, without component edits. See `assets/README.md`.
- **Preferences:** CRT, motion and sound controls are native pressed-state buttons. Sound is synthesized locally and starts off on every load. Motion keyframes exist only within `prefers-reduced-motion: no-preference`; the user can also pause them. Lightning shares a 17-second timeline with a building’s window outage. Pack opening does not wait for animation under reduced motion.

## Do’s and Don’ts

- Reuse `.wrap`, `.section`, `.section-heading` and `.panel` for another section; use the six existing type roles and semantic colors.
- Keep action language concrete and instructions next to their controls. Keep DEMO labels visible beside simulated balances and packs.
- Add artwork through the single registry and preserve crisp scaling. Do not add runtime image/font requests or an unrelated icon style.
- Keep all game mutations behind `GameAdapter`; do not read or write demo storage in a UI component.
- Preserve tap and keyboard alternatives to drag/drop, reduced-motion behavior and labeled status text.
- Do not add financial projections, prices, APY, wallet prompts or purported deployed contract addresses to this pre-launch demo.

Design review is documented in `artifacts/validation.md`. The pinned Better Interface guide informed the implementation; attribution and license texts are retained in `NOTICE.md` and `licenses/`.
