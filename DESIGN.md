# BLACKOUT design system

## Overview

BLACKOUT is a pre-launch pixel-art idle mining game. The landing page introduces the city and directs people to play the demo, read the guide or follow the project. Farm, Open Packs and Docs are separate hash routes, sharing browser-saved demo progress. The shipped interface requires no wallet and uses no real funds.

The retained visual language is a cyberpunk night city: dark navy surfaces, crisp pixel hardware, cyan light, yellow actions and magenta accents. The landing page gives the city illustration space; Farm uses denser equipment and status panels; Docs uses a restrained reading column. Rarity, locks, selected items, district events and combo states have text as well as color.

The canonical implementation is [src/style.css](src/style.css), [src/main.ts](src/main.ts), [src/sprites.ts](src/sprites.ts) and [src/docs.ts](src/docs.ts). This document records their implemented patterns. It is not a proposed redesign or an assertion that launch contracts exist.

## Colors

`src/style.css` defines hex sRGB primitives and semantic aliases in `:root`. The site has one dark presentation with `color-scheme: dark`.

| Token | Implemented value | Role |
| --- | --- | --- |
| `--navy-950` / `--bg` | `#05060f` | Page background |
| `--navy-900` / `--surface` | `#090e1d` | Panels and demo strip |
| `--navy-850` / `--surface-raised` | `#0e1428` | Standard button surfaces and table headers |
| `--navy-800` / `--hover` | `#141d33` | Available surface alias; individual hover rules also use component colors |
| `--navy-600` / `--border` | `#354664` | Structural borders |
| `--border-control` | `#65748f` | Interactive borders and table scrollbars |
| `--gray-100` / `--text` | `#edf2ff` | Main text |
| `--gray-400` / `--muted` | `#a1aec5` | Supporting copy, empty inventory slots and labels |
| `--cyan-400` / `--accent` | `#39e6ff` | Brand, links, selected items, active combinations and positive counters |
| `--yellow-400` / `--highlight` / `--focus` | `#ffe600` | Main action fill, demo/epoch notices, warnings and focus |
| `--magenta-400` | `#ff3df2` | Epic gear and illustration accents |
| `--danger` | `#ff869c` | Destructive text and notification error border |
| `--common` | `#bdc8dd` | Common rarity |
| `--rare` | `#39e6ff` | Rare rarity |
| `--epic` | `#ff3df2` | Epic rarity |
| `--legendary` | `#ffe600` | Legendary rarity |
| `--mythic` | `#ff6475` | Mythic rarity |

Component-specific values remain in CSS: primary action text `#111323`, primary hover fill `#fff168`, form fill `#080e1e`, docs prose/table text `#c5cfe0`, dispatcher prose `#b5c7d3`, notification fill `#101f30` and Mythic flash `#ff365955`. The art registry has its own fixed pixel palette and rarity palettes; those illustration colors are not additional interface themes.

No contrast ratios are asserted here. The production interaction report records zero axe violations in its five audited states, but also records incomplete color-contrast checks. Gradients, illustrations and every possible state are not certified by that result. See [reports/validation.md](reports/validation.md) for review evidence and limits.

## Typography

Local WOFF2 fonts live in `public/assets/` and are copied to `dist/assets/`; runtime does not depend on a font CDN. Font declarations use `font-display: swap` and normal style.

| CSS family | Local files and available weights | Use |
| --- | --- | --- |
| `Pixel`, monospace fallback | `pixel-latin.woff2`, Press Start 2P 400 | Brand, main headings and section headings |
| `Mono`, `Courier New`, monospace fallback | `mono-latin.woff2`, IBM Plex Mono 400; `mono-semibold-latin.woff2`, IBM Plex Mono 600 | Body, controls, supporting headings and counters |

The root is 16px, weight 400, line-height 1.6. The six semantic sizes are the entire size scale:

| Token | Size | Typical role |
| --- | --- | --- |
| `--font-small` | `.75rem` / 12px | Captions, compact controls, item details, demo labels |
| `--font-label` | `.875rem` / 14px | Standard controls, supporting copy and table text |
| `--font-body` | `1rem` / 16px | Body, docs prose, component headings |
| `--font-title` | `1.25rem` / 20px | Section headings and compact counters |
| `--font-display` | `2rem` / 32px | Inner-page headings, larger counters and mobile wordmark |
| `--font-logo` | `4rem` / 64px | Desktop landing wordmark |

`h1` and `h2` use Pixel 400 with line-height 1.6; the desktop wordmark uses 1.25. `h3` and `h4` use Mono 600 with line-height 1.5. Strong text uses weight 600. Responsive rules move headings to existing size roles rather than add sizes. The mobile wordmark uses 2rem/1.5; mobile page headings use 1.25rem/1.65.

Page introductions have a 65ch maximum. Docs has a 75ch body column, 70ch paragraph maximum and 1.75 prose line-height. Dispatcher prose is limited to 58ch at 1.85 line-height. Tables use 1.65. Headings use balanced wrapping; paragraphs use `pretty`; long text can break. There is no added letter spacing. Navigation and landing action capitals are CSS presentation, not the stored copy.

Timers, balances, room hash, prices, season counters and referral values use tabular numerals in their corresponding selectors. Forms default to 1rem; some filter, room-select and read-only fields use the label role. Text remains selectable. The root applies macOS font smoothing once. The production test verified both local font families were loaded.

## Layout

`.wrap` aligns the shared header, page content and footer to a maximum 1200px width, with 32px side gutters at desktop sizes. `.inner-page` supplies 40px top and 64px bottom padding. `.page-heading`, `.section-heading`, `.subheading`, `.panel`, `.actions` and `.full` are the reusable layout patterns.

Spacing tokens are `--space-1` through `--space-8`: 4, 8, 12, 16, 24, 32, 48 and 80px. Components currently use equivalent literal pixel spacing as well as these declared tokens. Related controls usually have 8–12px gaps; major grids use 24px. Standard panels have 24px padding; room and table details use smaller insets. Pages do not use a universal card grid for every kind of content.

| Pattern | Desktop arrangement |
| --- | --- |
| Landing | Centered copy over a clipped city scene; three explanatory steps below |
| Farm | `1.5fr / 1fr` rooms and inventory; stats above |
| Room | Six slots in three equal columns and two rows |
| Inventory | Three equal columns of spare item buttons |
| City | `1.2fr / 1fr` district map and dispatcher; map starts with four columns |
| Community | Two equal columns for season and referral/NFT sections |
| Pack lab | 360px pack stage plus remaining-width reveal area |
| Reveal cards | Three equal columns with 12px gaps |
| Docs | 240px sticky contents column plus reading column; 56px gap |

Content grids use `minmax(0, …)` and panels use `min-width: 0` to permit wrapping. Docs tables scroll within labeled, keyboard-focusable regions. The letter history has a bounded 320px scroll area. Inventory itself remains in normal page flow. The page’s main navigation is available on every inner route.

## Elevation & Depth

Structural borders and tonal layers define the interface. Standard buttons have a `3px 3px 0 #0006` shadow; primary buttons use `4px 4px 0 #6a561e`. Selected inventory adds a one-pixel cyan shadow. Rooms combine a tiled background, pipe details, a five-pixel floor border and an inset floor shadow.

The wordmark has offset colored shadows. Rarity cards have a 28px inset glow, and their art has a rarity-dependent drop shadow. The city has a dark overlay behind text. Its illustration is clipped inside the hero; decorative SVG elements do not intercept controls.

Dismissible notifications sit at z-index 30 with a `0 8px 40px #0009` shadow. The decorative Mythic screen flash is pointer-transparent at z-index 50. The skip link uses z-index 100 when focused. Native confirmation dialogs use the browser top layer; their `#01030bbf` backdrop has 3px blur. Dialogs are at most 500px wide and 85vh high.

## Shapes

Panels, buttons, fields, cards and hardware use square corners. Inputs, meters and progress bars explicitly have zero border radius. Structural borders are generally one pixel. Empty room slots use dashed borders; installed slots use solid rarity borders; selected spare items use a cyan outline treatment. Empty inventory tiles are decorative dashed placeholders.

Artwork uses rectangles, stepped paths and crisp SVG edges. `.sprite` applies `image-rendering: pixelated`; generated SVG has `shape-rendering="crispEdges"`. Standard sprite dimensions come from the art registry, and the item collection uses an 80×64 viewBox. Native radio inputs keep browser-native interaction and shape.

## Components

These are functions and CSS patterns, not a separate component library.

| Pattern / source | Variants and interaction |
| --- | --- |
| Shared shell — `src/main.ts` | Brand home link, `#/farm`, `#/packs`, `#/docs`, demo strip and footer. Active navigation has `aria-current`, cyan text and an underline. Page changes focus `main`; doc links focus their section. |
| Action controls — `.button`, `.text-button`, `.text-link` | Standard raised button, yellow `.primary`, transparent `.quiet`, 44px `.compact`, and `.full` width. Main buttons are at least 48px high. Disabled controls expose native disabled state and reduced opacity. |
| Page/section headers — `pageHeading()`, `.section-heading` | Short Pixel headings, supporting Mono copy and an optional adjacent action. They wrap and then stack on narrow screens. |
| Room — `roomPanel()` | Six native slot buttons, sprites, rarity names and durability meters. Select a spare item and a slot, or use Install item. Installed hardware can be removed. Stable slot, repair and overclock IDs preserve keyboard focus across updates. |
| Combos — `comboList()` | Active and missing variants show names, effects and text status. Missing item hints are inside native details. The room summary shows the hash bonus and cap. |
| Inventory — `inventoryPanel()` | Native tag filter, selected `aria-pressed` item, textual equip lock and level, labeled room select, install/merge/scrap actions, capacity and expansion. Empty states explain the next action. |
| Economy — `farm()` | Level progress, epoch timer, hash/balance/claim counters, electricity meter and a labeled withdrawal form. Withdrawal preview shows tax and net amount before confirmation. |
| Pack lab — `packs()`, `packCards()`, `openPack()`, `reveal()` | Live simulated quote, native currency radio group, guarded opening button and three saved cards. Only the next unrevealed card is enabled; Reveal all is the alternative. Opening scrolls the cards into view and focuses the first reveal. Rarity and equip gates remain textual. |
| District and dispatcher — `cityPanel()` | Eight labeled district tiles, current-farm and affected variants, lobbying, event protection text and current letter. A details control opens history. |
| Season/community — `seasonPanel()`, `referralPanel()` | Countdown, district ranking, pending prize action, referral URL with clipboard fallback, simulated referral dashboard and once-only demo NFT credit. |
| Guide — `docsSections`, `renderDocs()` in `src/docs.ts` | Nineteen sections, linked contents, beta callout, scoped table headings/captions and back-to-contents links. `#/docs/{id}` routes address `docs-{id}` targets. |
| Confirmation — `confirm()`, native `dialog` | Withdraw, merge, scrap and reset explain consequences. Cancel receives initial focus; Escape cancels; closing returns focus to the triggering control where it still exists. |
| Feedback — `notify()`, `#notice`, `#live-status` | Visual notice has dismissal and an error-border variant. A separate persistent, visually hidden polite/atomic status region receives feedback; it is not removed when the visual notice is hidden. Storage failures have a visible warning area. |

Keyboard focus uses a three-pixel yellow outline with a four-pixel offset on interactive elements and scrollable tables. Pointer hover rules are inside `@media (hover:hover)`. Forced-colors rules use system focus/border colors for controls, selected items, meters and progress. Native details summaries have stable IDs so rendering can restore focus and expanded state.

`src/sprites.ts` exports `sprite(name, className)` for scene art and `itemSprite(type, rarity, className)` for the collection. Twelve distinct item silhouettes across five rarities produce 60 local SVG variations. Higher ranks add hardware details, halos, corner marks and rank pips. Sprite SVGs are decorative; containing controls/text provide item names. Scene overrides and supported filenames are documented in [assets/README.md](assets/README.md). Item sprites are generated separately from those overrides.

## Motion

Animations are enabled only under `prefers-reduced-motion: no-preference`. The footer’s Animation button can pause them through `.motion-off`; when the operating system requests reduced motion the control is disabled in the off state. The override removes animations, transitions and smooth scrolling. No sound setting or sound playback is part of the current interface.

Normal pack opening uses a 450ms shake, a 400ms seal break delayed 350ms, then a 450ms burst delayed 400ms. The interaction waits 850ms for the opening sequence when motion is enabled, then presents the cards. `.just-revealed` flips only the newly revealed card for 380ms; previously revealed cards do not replay their flip on the next reveal or epoch render. Reveal all spaces cards by 400ms when motion is enabled. Mythic adds a 450ms red screen flash, separate from its textual rarity label.

Idle art uses a four-second pack float, four-second stepped fan turn, 2.5-second GPU LED blink and eight-second city-lightning cycle. Button transitions are 120ms and pressed buttons scale to `.96` when motion is allowed. Animations decorate state; they are not needed to complete an action.

| Rarity | Sprite glow blur | Card glow mix | Card particles |
| --- | --- | --- | --- |
| Common | 7px | 8% | 2 |
| Rare | 10px | 12% | 5 |
| Epic | 14px | 18% | 8 |
| Legendary | 20px | 26% | 11 |
| Mythic | 26px | 33% | 14 |

## Responsive behavior and evidence

The implemented breakpoints are 1400px minimum, then 1080px, 820px and 580px maximum. Rules cascade in that order.

| Width | Implemented adjustment |
| --- | --- |
| At least 1400px | Hero minimum height becomes 700px; artwork can fill the width; copy bottom padding becomes 300px. Default hero minimum is 670px. |
| At most 1080px | Farm changes to `1.35fr / 1fr`; pack stage becomes 310px; counter sizes decrease; district map has two columns; withdrawal form wraps; docs uses a 210px contents column and 32px gap. |
| At most 820px | Gutters become 20px. Farm, city and community stack. Inventory uses five columns; map uses four. Pack lab stacks but its stage internally places art beside price/controls. Docs contents becomes a static two-column list above the body. |
| At most 580px | Gutters become 16px. Inner-page nav moves to its own row; landing nav is hidden. Hero actions use a full-width Play demo above two secondary actions. Room slots stay three across; inventory uses three columns; map uses two. Pack stage becomes vertical, with a 190px orbit. Docs contents becomes one column; table cells retain a 125px minimum and scroll locally. Notices inset 16px; dialog actions stack. |

The production report [reports/interaction-results.json](reports/interaction-results.json) records no horizontal document overflow on all four routes at 320, 390, 768 and 1440 CSS pixels. It also records Docs at 200% text enlargement on a 390px viewport. This is text enlargement, not browser-native zoom.

At 390×844, that report measured the landing title at y=154.375–202.375, product description at y=282.375–301.5625 and Play demo at y=321.5625–369.5625. The product and its primary action therefore fit within the first viewport in that tested state. These are automated rendered measurements from the report, not a new screenshot observation made while writing this document.

The same report verifies local font loading, navigation, keyboard focus through timed updates, confirmation cancellation, cross-tab progress, reduced motion and the normal pack sequence. It does not establish physical-device, screen-reader or every-viewport behavior. Detailed review coverage, screenshots and remaining limitations belong in [reports/validation.md](reports/validation.md).

## Do’s and Don’ts

- Start another page with `.wrap.inner-page`, `pageHeading()` and existing `.panel`/heading/action patterns. Add its hash route and active navigation state in `src/main.ts`; keep the static export independent of server rewrites.
- Reuse the six size roles, semantic colors and native control patterns. Use the yellow primary variant for the main action; use cyan for links, selection and powered states.
- Keep instructions next to controls and demo/beta wording visible. Preserve meaningful item names, lock levels and event/combination text alongside color.
- Send game mutations through `GameAdapter`. Read gameplay/economic values from `src/config.ts`; the UI should not become a second rules engine or write saved state directly.
- Retain stable IDs, focus restoration, reduced-motion behavior and the persistent status region when extending interactive panels.
- Add scene art through the existing registry and item art through the collection functions. Preserve crisp scaling and local runtime assets.
- Do not restore the earlier single-page layout, GPU-only rooms, drag/drop instructions, Legendary modal, sound controls or token-burn copy: those are not the current implementation.
- Do not present simulated balances, NFT checks, referrals or rankings as live chain behavior, or promise financial returns.

## Implementation references

- [src/style.css](src/style.css): tokens, shared patterns, component states, motion, responsive and forced-colors rules.
- [src/main.ts](src/main.ts): shell, routes, render patterns, interaction handlers and focus/status behavior.
- [src/sprites.ts](src/sprites.ts): local city/scenes and all hardware rarity variations.
- [src/docs.ts](src/docs.ts) and [docs.md](docs.md): player guide presentation and repository-readable guide.
- [src/config.ts](src/config.ts), [src/game/adapter.ts](src/game/adapter.ts) and [src/game/types.ts](src/game/types.ts): beta parameters and adapter boundary.
- [scripts/smoke.mjs](scripts/smoke.mjs): reproducible production interactions and responsive/accessibility evidence.
- [NOTICE.md](NOTICE.md) and [licenses/](licenses/): retained font and design-guide attribution. Better Interface informed the implementation and review; the documentation method follows its pinned document-web-design section.
