# BLACKOUT design system

The implemented direction is a quiet interface over a dark pixel city: a full-height rooftop illustration, a large pixel wordmark, one yellow primary action and cyan public telemetry. The Dispatcher and server rack remain on the right of the image. This document describes the shipped source, not a proposed design.

## Source and structure

`src/landing.ts` owns the Home content; `web/src/shell.ts` owns the header. Their first screen is also pre-rendered into `index.html` by `web/tools/v11-prerender.ts`. `web/src/critical.css` provides the initial shell styles, minified and inlined by the same pre-render tool so first paint needs no additional stylesheet request. `web/src/bootstrap.ts` preserves the hero, adds the lower landing content and initializes the game after the preloaded hero decodes and paints, with a bounded wait and immediate loading on a game action. Keep critical hero/header rules synchronized with `web/src/premium.css` when editing them.

The final cascade is the shared `src/style.css`, retained game controls in `web/src/live.css`, then `web/src/premium.css`. `web/src/views.ts` renders Packs, Farm and secondary game views; `player-views.ts` renders personal Rewards and onboarding. `public-views.ts` is shared by Home and Rewards. All navigation uses hashes for static hosting. Existing game and hardware SVG sprites are retained locally.

## Color tokens

| Role | Implemented value | Usage |
| --- | --- | --- |
| Background | `#070A14` | Page, header after scroll, dark image placeholder |
| Panel | `#0E1324` | Public tiles, terminal, rooms, dialogs |
| Raised / hover | `#131B30` / `#19253E` | Secondary controls and surfaces |
| Panel border | `#1E2A4A` | Quiet 1px dividers; not relied on to identify controls |
| Control border | `#566580` | Inputs and secondary controls; header Connect uses `#64738F` |
| Text | `#EEF2FA` | Primary readable content |
| Muted | `#A3B0C9` | Descriptions, metadata, timestamps |
| Live cyan | `#39E6FF` | Data, status dots, focus and subtle glows |
| Action yellow | `#FFE600` | Filled primary actions, black text and hard black shadow |
| Rarity magenta | `#FF3DF2` | Epic cards and rare highlights |
| Danger | `#FF869C` | Errors and destructive actions |

Rarity colors are Common `#BDC8DD`, Rare cyan, Epic magenta, Legendary yellow (the requested rarity exception to primary-action yellow), and Mythic a slowly cycling rainbow. Text labels always name the rarity. A static pale purple labels Mythic feed entries. Status also includes words; no result is conveyed by color alone. The hero adds a left-to-right dark gradient plus top/bottom shade. On small screens the shade is stronger behind the text.

## Typography and spacing

Local **Press Start 2P** (`Pixel`, weight 400) is used for the wordmark, H1 and H2. System sans-serif is used for prose and controls. Local **IBM Plex Mono** (`Mono`, weights 400 and 600) is used for numeric values, addresses, the terminal and timers. Font licenses remain in `licenses/`.

The shared type scale is 14px small/label, 16px body, 20px title, 32px display and up to 72px wordmark. The hero wordmark interpolates with viewport width, reaching about 32px on a 375px phone. A compact header wordmark uses 12px below 359px, keeping the total to six size roles. Headings use normal case except the BLACKOUT brand; there are no small tracked-capital eyebrow labels. Body line height is 1.6; pixel headings use 1.5–1.8 where multiple lines occur. The hero tagline uses 1.3. Numbers are tabular and amounts wrap when necessary.

Spacing follows a 4px base: 4, 8, 12, 16, 24, 32, 48 and 80px. Desktop content is at most 1248px with 48px side gutters, reduced to 32px at the intermediate breakpoint and **16px on phones**. Primary sections use 64–80px vertical air; phone sections use 40–48px. Panels use 24–32px padding, generally 20–24px on phones. Square edges and 1px panel borders preserve the pixel character without making every element glow.

## Components

**Hero.** A local `<picture>` uses WebP with the supplied original JPG as fallback. The image has explicit dimensions, `object-fit: cover`, `object-position: right center` and `image-rendering: pixelated`. The section uses `100svh` with a 640px desktop / 700px phone minimum to protect readable content on short screens. The first screen contains BLACKOUT, the exact tagline, a plain explanation of the mining game, Buy a pack and Claim free pack. The primary links to Packs; the ghost button keeps the existing separate free-pack service. Decorative window pixels, transformer sparks and drifting smog sit in a clipped scene. The overlay has 4% scanline opacity.

**Navigation.** The desktop header has the logo, five game links and Connect. It is transparent over Home and solid after scrolling; other pages use a solid sticky header. At 760px and below, a labeled 44px burger opens a vertical menu with `aria-expanded`. Route selection or Escape closes it. The old global connection and mining-step bars and bottom tabs are removed. Secondary pages remain reachable through the footer's Explore the city link. A small footer dot, descriptive connection status and Refresh replace the large status bar.

**Buttons and forms.** Yellow primary buttons have black text, square corners, a 4px black shadow and a small pressed offset. Ghost/secondary controls have visible borders. Touch controls are at least 44px; primary actions are at least 48px. Inputs have persistent labels and nearby validation. The pack stepper remains 1–10. Advanced slippage uses a native disclosure. Disabled transaction actions preserve the existing wallet, network, registry and eligibility gates. Keyboard focus uses a cyan outline with a 4px offset.

**Public dashboard.** Three large cyan-number tiles show the reward pool, epoch/countdown and ETH pack quote. A shared status labels live versus saved data and its timestamp. Below, the scrollable terminal shows the newest twenty purchases/reveals with shortened addresses, explicit rarity and transaction links. A neighboring panel shows the top ten farms and total farms; the terminal header carries packs opened. At 760px these panels and tiles form one vertical column. The terminal remains a keyboard-focusable region and preserves its scroll position during refresh. Public history never depends on Connect.

**Farm.** The disconnected page explains the farm and presents a clearly labeled room illustration with sprites, not a fictitious account. A connected farm uses building-floor cross-sections with conduits, wall fans, floor beams and six rack slots. Items use the retained hardware sprite system. Fans turn only for a mining room. Selection/placement, desktop dragging, filters, repair, scrap and room purchases retain their existing behavior. The three-step guide appears only on Farm for a connected account with no placed hardware.

**Packs and reveal.** The idle pack tilts and glows on hover-capable devices. Reveal triggers one brief shake and white flash, then three item cards fly up and flip with 0.3-second staggered delays. Borders and glows reflect rarity; Mythic continues a slow rainbow. Refreshes do not replay the entry animation. Sound defaults off and has a labeled toggle on Packs and in the footer. Exact ETH spend, price protection, secondary token payment, starter claims and receipt state remain readable beside their controls.

**Personal panels and dialogs.** Rewards shows public data before the personal claim panel. Farm, inventory and claim actions are unlocked by a wallet. Native dialogs trap focus, close on Escape and restore trigger focus. Pending transaction hashes and explorer links remain visible in the confirmation dialog. Errors use plain recovery guidance and retain retry controls. Read-only week selection and public content remain available during network outages.

## Responsive behavior and accessibility

At 1000px the header gap and gutters tighten. At 760px navigation collapses, grids stack and the Farm welcome text precedes the illustrative building. At 359px the compact header and hero button sizing preserve the product and main action. There is no document-level horizontal overflow at tested widths 320, 375, 390, 768 and 1440px. The hardware carousel is intentionally a labeled horizontal scroller; the document itself does not scroll sideways.

At enlarged root text, `reflow-mode` releases fixed hero height, wraps the header and slots and permits larger vertical content. Decorative smog is clipped to the artwork independently, so it cannot create horizontal overflow while content grows. The layout also includes forced-colors control borders, semantic landmarks, a skip link, named controls, labeled meters, error/status live regions and visible focus. Full addresses and exact amounts remain available where decisions depend on them.

`prefers-reduced-motion` and the manual Pause city control stop ambient animation, card transforms, spinning fans and smooth scrolling. Reduced-motion reveals show their final cards immediately. The white flash is one fading event, not a repeating strobe. Decorative art and particles are hidden from assistive technology; informative sprite/slot labels remain.

## Review and maintenance

The pinned Better Interface guide informed accessibility, layout, writing, typography, colors and UI during implementation. [artifacts/validation.md](artifacts/validation.md) records each domain, concrete findings and fixes, actual browser/test results and limitations. Automated checks are not a WCAG certification; screen readers, physical devices and external wallet onboarding remain untested. Screenshots show actual rendered export states, with fixture-only personal flows identified separately.

Keep source and runtime assets complete, use relative URLs, and regenerate the hero shell when its source changes. Do not cache authorization decisions or transaction simulations. The artifact path budget is explicit in `artifacts/PATH-BUDGET.md`. The 1200×630 social image derives from the supplied rooftop and can be regenerated with `web/tools/v11-og.mjs` against a built export; optimize its PNG before rebuilding.
