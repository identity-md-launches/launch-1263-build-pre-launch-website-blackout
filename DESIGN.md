# BLACKOUT design system

## Overview

BLACKOUT is a wallet-connected mining game. The visual anchor is its existing night-time pixel city: a rooftop hero, hardware sprites and building cross-sections. Yellow identifies the next primary action; cyan makes mining data easy to find. Rewards prioritizes the player's claimable amount, then history and explicitly labeled estimates. Farm prioritizes Optimize farm, then Today; detailed room hints and referral history use disclosures. Marketing sections retain the city's voice; transaction reviews state amounts and consequences plainly.

The active cascade is `src/style.css`, `web/src/live.css`, `web/src/premium.css`, then `web/src/polish.css` and **`web/src/gameplay.css`**. Polish owns the earnings/pack experience; gameplay adds Today, combo hints, Invite and optimizer reviews using the same tokens. `src/landing.ts` owns Home. `web/src/rewards-view.ts`, `views.ts` and `player-views.ts` render game pages; `public-views.ts` renders public telemetry. `main.ts` binds routes, reads and interactions. `shell.ts` and `critical.css` supply the header/hero shell pre-rendered into `index.html`. Update that shell with `v11-check.mjs prerender` when its source changes.

## Colors

Canonical hexadecimal tokens are in `premium.css:2–6`, with rarity/error tokens retained in `src/style.css:7–12`.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#070a14` | Page, dark scene ground |
| `--surface` | `#0e1324` | Claim, estimate, terminal and game panels |
| `--surface-raised` / `--hover` | `#131b30` / `#19253e` | Controls and interaction surfaces |
| `--border` | `#1e2a4a` | Quiet panel separators |
| `--border-control` | `#566580` | Visible input/secondary control edges |
| `--text` | `#eef2fa` | Main text |
| `--muted` | `#a3b0c9` | Supporting copy, units and metadata |
| `--accent` / `--focus` | `#39e6ff` | Live numbers, selection and keyboard focus |
| `--highlight` | `#ffe600` | Primary action with dark text |
| `--danger` | `#ff869c` | Errors and irreversible actions |

Rarity uses Common `#b9c6db`, Rare `#39e6ff`, Epic `#ff7aef`, Legendary `#ffe600` and Mythic `#c3a3ff` labels with rainbow effects. These final `--rarity-*` tokens in `polish.css` override the earlier rarity aliases; original artwork retains its magenta accents. Rarity is always named as text. District badges use a colored square plus the district name; color never substitutes for a label. Capacity notices use `#302916` with `#ffedaa` text. The HUD uses an opaque-enough `#0c1423f7` backdrop and `#33465e` divider.

Today, Invite, hints and optimizer progress introduce no new palette: `gameplay.css` uses `--surface`, `--border`, `--accent` and `--muted`. Health is a native labeled meter with the hardware name and ID; bonus chips always include names and effects.

The projection band's cyan fill is translucent over the panel, with a solid cyan central line and dashed gray bounds. Numeric pessimistic/current/optimistic values accompany the visual. Automated contrast results and unmeasured image/gradient text are recorded in validation; this document does not infer a contrast ratio from the palette.

## Typography

Local Press Start 2P (`Pixel`, weight 400) is used for the brand and major headings. System sans-serif is used for prose, controls and reading-heavy text. Local IBM Plex Mono (`Mono`, weights 400/600) is used for amounts, clocks, hash, addresses and terminal metadata. Files are in `public/assets/`; licenses remain in `licenses/`. The build preserves their local runtime URLs.

The six size roles are compact 12px, small 14px (`--font-small`), body 16px (`--font-body`), title 20px (`--font-title`), display 32px (`--font-display`) and wordmark up to 72px (`--font-logo`). The hero scales fluidly with viewport width. Phone HUDs and reveal-card annotations use the compact 12px role. SVG chart axis labels use 14px. These density exceptions are in `polish.css`.

Gameplay uses the existing 12/14/16/20/32px roles; the optimization gain steps from display to title size below 520px. Numeric output uses the explicit `en-US` locale for dot decimals.

Body line height is 1.6, field-guide prose 1.75, and multi-line pixel headings 1.5–1.8. Content has natural letter spacing. Amounts use tabular numbers and wrap rather than clipping. Explanatory chart text is bounded to 90 characters per line; guide prose uses 70ch. Brand, token/currency symbols and the requested Mythic title retain uppercase. There are no decorative tracked-capital kickers.

## Layout

The shared `.wrap` is at most 1248px, with 48px side gutters on desktop, 32px below 1000px and 16px below 760px. Spacing follows the existing 4px base with 8/12/16/24/32/48/80px intervals. Panels use 24–32px padding, dropping to 20–24px on phones. The main page heading precedes its primary panel without an extra marketing hero.

The connected HUD is sticky below the measured top chrome. It uses six columns on wide screens and three columns/two rows below 1100px. It stays present on every route. Its measured height is exposed through `--hud-height` so anchored content can avoid the fixed chrome.

Rewards uses a two-column claim/history overview, a full-width projection and a payback row. The epoch history uses one column per available epoch, with a 44px minimum width/height for each selectable bar. Up to 20 bars scroll within the chart, with payout labels and a scroll hint; keyboard focus brings offscreen bars into view. Below 760px, these stack; the period buttons share one row and the projection legend becomes three readable rows. Packs pairs a large pack/purchase panel with drop odds at desktop width, stacking on phones. The 240×280px foil component remains prominent while the ETH action fits on the first 375px screen. The pack heading also adapts below 1100px.

Today uses four equal columns with 24px gaps, two columns below 950px and tighter 12px column gaps below 520px. The HUD version is a disclosure; when opened it is a scrollable, bounded panel and the HUD becomes non-sticky so it cannot cover the page. Its phone content is one column. The three lowest-health items appear first; a native “Show all N worn items” disclosure exposes the remaining rows without replacing the urgent items. Its summary uses the existing 12px compact role and a 44px minimum target. Main/HUD disclosure state survives polling. Optimize stays on the first 390×844 screen with the connected HUD. Invite addresses wrap and action buttons wrap independently.

Farm rooms retain six slots; phone slots use two columns. Inventory has its capacity meter and filters above the grid. Reveal cards use a three-card fan on desktop and two columns on phones, centering the last card in a single pack. Bulk uses a responsive grid inside a scrollable native dialog. The document does not acquire horizontal scrolling; the existing hardware carousel is an intentional labeled horizontal region.

At 760px the header becomes a 44px burger plus wallet control. At 359px brand sizing and action spacing tighten. The existing enlarged-text `reflow-mode` allows header/hero content to grow. Actual production reflow was checked at 320, 375, 390 and 1440px; physical phone performance remains a stated limitation.

## Elevation & Depth

Most surfaces use a tonal change and a quiet border. Yellow buttons retain a hard 4px pixel shadow and a 2px pressed offset. Hover glow belongs to actionable controls and rarity hardware; it does not surround every panel. Room beams, conduit lines, fans and sprite LEDs provide depth inside the building scene.

Native dialogs use the browser top layer and a dim backdrop. The optimizer review is at most 90dvh: its body scrolls while Cancel and Apply remain visible in a two-column footer. The initiating Optimize control has a stable ID so focus returns after asynchronous search or a page refresh. Pack opening adds perspective, backface visibility, a foil sheen, breathing light, sparks and a brief CRT settling overlay. A confirmed rip produces one fading white flash, chromatic edge separation, particles and rarity-scaled shake. Common is restrained, Rare adds a ring, Epic adds a magenta streak/longer flip, Legendary adds rays/coins/bass, and Mythic adds a rainbow glitch/title.

Effects use short CSS transforms/opacity transitions and bounded particle counts. Numeric interpolation uses requestAnimationFrame for 650ms only when readings change. The reward-pool sparkline records this browser's real recent readings and says so in its accessible label. No fabricated history is drawn.

## Shapes

Square panels, controls and cards match the pixel artwork. Thin borders mark ordinary panels; rooms use thicker structural beams. Card rarity frames are 2px. Medal shapes use a clipped pointed base; district markers are small squares. Circular geometry is reserved for the Rare pulse and status indicators. The foil's cracks are a clipped decorative shape and appear only after confirmed results.

## Components

| Pattern / source | Use and states |
| --- | --- |
| Header, `shell.ts`, `main.ts` | Brand home link, game navigation and one Connect control. Mobile menu exposes `aria-expanded`; route selection and Escape close it |
| `.button`, `premium.css` / `polish.css` | Yellow primary, bordered secondary, text control and danger action. Bright disconnected ETH purchase opens Connect. Disabled writes retain visible reasons |
| `miningHud`, `rewards-view.ts` | Semantic definition lists, six player readings, numeric animation and second-by-second epoch clock. Hidden without a connection; explicit reading state before farm data |
| `rewardsView` / `paybackView` | Claimable, exact simulated tax/net, tax-aging timeline, historical epoch buttons, calculator, band and assumptions. No rewards/history produces an honest empty state |
| `capacityNotice` / `inventoryMeter` | Used/capacity, space required, Scrap link and costed +5 expansion. Fresh chain checks repeat before relevant writes |
| `farmPage`, `views.ts` | Rooms as night-time floors, sprite inventory, per-item/per-room estimates, level gates and invalid slot reasons. Drag/drop and tap/select share `placementReason`; drag-start updates existing slot states/reasons in place and drag-end restores the prior selection |
| `todayView`, `gameplay-views.ts` | Claim/tax/net, health-sorted item meters and a counted disclosure for all remaining items, combined repair cost, packs/Open all, supply drops, district event and swarm letter. Separate reading/reconnecting states; pack history loads independently. HUD variant is a disclosure |
| `comboHints` / `insertionHint`, `gameplay-views.ts` | Active named combo chips and expandable near misses; owned/gated/full-room guidance. Inventory shows current best empty-slot gain or explains lack of a legal slot |
| `optimizeDialog`, `gameplay.ts` | Cancellable worker search with live progress, contract-verified gain and move review, sequential confirmation/progress, decoded failure with completed steps retained. Sync review when wear data is stale; unknown cable status stops the search with recovery text; cancel/error cleanup restores other confirmations |
| `inviteView` / referral offer | Labeled readonly personal link, Copy, X and Telegram; on-demand on-chain referee list and earnings. Native first-action referral dialog supports Join or Continue without; closes when eligibility fails |
| `installDialog`, `main.ts` | Labeled item/slot selectors; disabled slot options explain locks, occupancy and duplicate kinds. Fresh simulation precedes wallet signing |
| `publicDashboard`, `public-views.ts` | Pool/price/epoch tiles, reveal-block item chips (explicit unavailable detail for unreadable/deleted records), shortened linked addresses, district badges, item previews and medals. Saved/live/reconnecting status is explicit |
| `packArt`, `pack-opening.ts` | Cursor tilt, neutral waiting pack, confirmed rarity cracks, tap/hold rip, real 3D faces/backs, individual/cascade flips and summary actions |
| Transaction review, `main.ts` / `wallet.ts` | Exact amount, gas/approval consequences, signature/pending/confirmed/reverted states, explorer hash, decoded errors and recovery controls |

Dialogs are named, keyboard-accessible, close with Escape where cancellation is safe and restore focus. Each new confirmation initializes its enabled state from the transaction guard. Repair all reuses the scrollable move-list pattern to name each item, health and token cost while keeping the approval and Cancel controls reachable. Decorative sprites/effects are hidden from assistive technology; meaningful controls have names. Epoch bars are a labeled group of native buttons with payout-specific accessible names and 44px minimum targets, not interactive descendants of an image. Public/Farm next-epoch clocks use the same HH:MM:SS format as the HUD, retaining the due/settling states. Forms use persistent labels and nearby validation. Changing number cells are not individually assertive live regions.

Browser notifications are off by default and requested only by the Enable notifications control. The toggle exposes `aria-pressed`. Epoch, reward and health transitions are deduplicated while the page remains open; simultaneous low-health items share one notice.

Sound is off by default and controlled by a labeled toggle. `prefers-reduced-motion` and Pause city stop ambient motion; flips become immediate while preserving their face/back states and all actions. Haptics and audio are optional. Forced-colors styles retain borders, readable card faces and selected controls. The requested rare flashes are single fading events rather than a looping strobe.

## Do's and Don'ts

- Start a new page with `.wrap.live-page`, `heading()` and the shared button/field styles. Add it through hash routing and retain the global HUD.
- Use yellow for the next primary action and cyan for telemetry. Name rarity, district and status even when color is present.
- Use `tokens()` for display, exact units for transaction reviews, and `data-number` for readings that should interpolate. Never animate an invented balance.
- Keep fees, gates and irreversible consequences beside their action. Do not use disabled opacity to erase explanatory text.
- Use the existing sprites/fonts and spacing roles. Keep decorative clipping inside the scene, away from content and focus rings.
- Keep preview caches separate from fresh authorization/simulation. Mock results belong only in the DEV module and clearly labeled artifacts.

See [artifacts/validation.md](artifacts/validation.md) for the six-domain review, concrete fixes, measured checks and remaining limitations.
