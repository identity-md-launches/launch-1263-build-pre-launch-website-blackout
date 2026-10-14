# BLACKOUT — implemented v10 design

This records the final implementation in `src/style.css`, `src/landing.ts`, `src/sprites.ts`, and `web/src/`. It describes the shipped export, not a proposed redesign. The original 16-bit city, three skyline layers, grid tower, dispatcher, hardware sprites, district landmarks, navy/purple sky and CRT scanlines remain. The landing now leads into a live wallet app.

## Overview

At 390 CSS pixels, the first screen shows BLACKOUT, the pixel city, a plain description, Connect and a full-width yellow **Start mining** action. The five bottom tabs (Home, Packs, Farm, Rewards, More) remain available on every route. The city hero fills the available first viewport; measured header, onboarding and ticker height keeps its caption above the tab bar. The external free-pack links remain in the desktop header/hero and the Packs claim section; the mobile hero emphasizes one action.

A three-step onboarding strip follows the header until the wallet has hardware placed: Connect → Buy your first pack → Place hardware. Progress comes from the connected wallet’s chain state, so it survives devices and reloads without fictional local completion. A mining farm sees “Your farm is mining.” Configured hardware without current epoch weight sees “Your hardware is placed.”

The landing retains How to play, hardware, the dispatcher, Launch, feature phases, FAQ and the original pixel art. Farm shows mining time, XP, a hardware selector in the placement guide, four server rooms and hardware. Rewards places Claim directly after the tax/net breakdown, ahead of the aging explanation. Packs preserves the single ETH transaction, secondary token payment and Advanced slippage. More links to City, Season, Leaderboard, Billboards, Docs and Contracts. A compact ticker above the main content links the latest actual chain event on every page. More contains the recent activity history.

## Color tokens

| Token | Value | Implemented use |
| --- | --- | --- |
| `--bg` / `--navy-950` | `#05060F` | Main background and dark text on the yellow action |
| `--surface` / `--navy-900` | `#090E1D` | Panels, wallet sheet and transaction feedback |
| `--surface-raised` / `--navy-850` | `#0E1428` | Chain-strip tone and elevated controls; live text inputs use `--bg` |
| `--hover` / `--navy-800` | `#141D33` | Hovered secondary controls |
| `--border` / `--navy-600` | `#354664` | Structural separators |
| `--border-control` | `#65748F` | Visible input/button boundaries |
| `--text` / `--gray-100` | `#EDF2FF` | Main text |
| `--muted` / `--gray-400` | `#B3BFD3` | Supporting information |
| `--accent` / `--cyan-400` | `#39E6FF` | Links, connection controls, city lights and Rare items |
| `--highlight`, `--focus` | `#FFE600` | Primary action, focus ring, launch emphasis and Legendary items |
| `--magenta-400` | `#FF3DF2` | Epic item accents and retained city light |
| `--danger` | `#FF869C` | Errors and destructive-action labels |
| `--color-success` | `#93F5C6` | Verified/live states and confirmed transaction border |
| `--common` | `#BDC8DD` | Common hardware and reveal accents |
| `--mythic` | `#FF6475` | Inherited Mythic hardware outline and glow |
| Reveal Mythic | `#B7A1FF` rarity label, rainbow border | Magenta/yellow/green/cyan spectrum in the reveal border; rarity is also written out |

No state depends on hue alone: rarity has text, transaction states have words, disabled phases say Coming soon, and funding/read errors have explanations. Text is not rendered as a gradient. Cards use a background/separator without stacked border-and-shadow decoration; retained neon effects belong to the artwork.

Opaque text/background contrast and remaining art/transparency limitations are recorded in `reports/v10/validation.md` and the pinned probe report. The mobile city caption has a dark backdrop so it stays readable over changing windows. A disabled item’s illustration becomes grey; its reason stays readable in ordinary text.
## Typography

Local **Press Start 2P** (`Pixel`, weight 400) supplies the brand and headings. Local **IBM Plex Mono** (`Mono`, weights 400 and 600) supplies data, controls and compact game labels. System UI sans serif handles longer descriptions, guide paragraphs and dispatcher quotes. The export bundles the three WOFF2 font files and uses `font-display: swap`.

The scale has six sizes: **12, 14, 16, 20, 32 and 64px**. Existing tokens are `--font-small`/`--font-label` 14px, `--font-body` 16px, `--font-title` 20px, `--font-display` 32px and `--font-logo` 64px. Twelve pixels is reserved for the five-item mobile navigation and narrow slot labels. At 390px the hero is 32px; desktop uses 64px. Long body text remains 16px, with 1.6 general line height and 1.75 in the guide. Headings use 1.4–1.6. Numeric readouts use tabular figures where appropriate.

Content uses normal capitalization. The BLACKOUT wordmark remains uppercase as identity. Small tracked uppercase eyebrow labels were removed. The rendered landing probe found three font families, two weights, no more than six recurring sizes at each tested width.

## Spacing and responsive layout

The inherited spacing scale is **4, 8, 12, 16, 24, 32, 48 and 80px**. The outer wrapper caps at 1200px. Existing narrow-screen wrapper rules provide mobile gutters. Grid columns use `minmax(0, 1fr)` and wrapping text; addresses, hashes and receipt IDs can break anywhere. Wide data tables have their own horizontal scroll container.

- Above 1100px, the navigation sits in the header, district cards use four columns, and the game has room for multiple inventory columns.
- At 1100px and below, header navigation wraps, districts become two columns and inventory becomes two columns.
- At 760px and below, rooms and purchase/claim panels become one column; the guide navigation loses its sticky sidebar; addresses form a single-column list.
- At 600px and below, game navigation becomes five fixed bottom tabs with safe-area padding, including on Home. Forms, receipt rows and item actions stack; wallet selection becomes a bottom sheet. Controls keep their labels and amounts.
- At 360px and below, the small brand icon is hidden, district cards and guide links use one column, and selected labels use the 12px size.

When root text exceeds 20px, `reflow-mode` lets the header wrap, makes it non-sticky, places game navigation in document flow, stacks statistics and guide links, and permits grid children to shrink. The 200% text-size check uses this layout.

Controls normally have a minimum 44px height; the Packs primary action has a 56px minimum and wallet rows are 56px. The stepper has 44px minimum buttons, 12px gaps and a stable two-character numeric output. Native select/input controls have visible labels, 16px input text, appropriate numeric input modes and explicit units. Links within prose retain normal inline treatment and adequate spacing. The probe's 24px-or-spacing target rule passed; some secondary inline targets remain below its preferred 44px size; see the probe for measured counts.

## Elevation, depth and shapes

Panels use the existing flat navy surfaces with one-pixel structural borders, square corners and no extra shadows. The native confirmation dialog supplies the overlay; its inset progress region uses the page background and a 3px cyan leading border. City and pack-art glows remain decorative. Fields and buttons retain the pixel system’s square corners. Long amounts, hashes and IDs wrap instead of clipping.

## Components and states

**Header and wallet sheet.** One Connect control discovers named EIP-6963 wallets and hides the generic duplicate when named wallets exist. Official wallet marks identify mobile browser links and Coinbase Smart Wallet. The native dialog has a labeled heading, a close control, Escape support, focus trapping and focus restoration. Wrong-chain state offers Switch network; network addition is followed by an explicit switch.

**Live statistics.** Semantic definition lists show actual chain reads. Loading, unavailable, retry, unfunded and not-ready states are explicit. No demo value fills a failed read. Civic notices and flags control the phase labels; all eight flags are shown. One 15-second scheduler refreshes shared status and the visible route only. Hidden tabs do not poll; the transport also gates receipt confirmation and fallback retries. Failures retain the last successful values and show a compact Reconnecting badge; failed claim previews and eligibility reads also retain their last successful display. Fresh pages show loading rather than zeroes. Refresh data retries immediately.

**Farm.** `farmPage` in `web/src/views.ts` uses pixel rack faces, pipes, LEDs and a floor to draw four rooms with six slots each; locked rooms retain six decorative rack silhouettes. Productive installed hardware blinks. Select hardware then a slot, or drag it on desktop; the same `placementReason` rules apply to both, keyboard selection and the confirmation dialog. Common/Rare need no additional level, Epic needs 3, Legendary 5 and Mythic 10. A matching hardware type in the room, an occupied slot, locked room or pending upgrade blocks placement with a visible reason. A fresh farm read and simulation recheck before signing. Item menus preserve their open state through polling. Repair/scrap/room purchase and advanced auto-repair remain.

**Mining and rewards.** `miningPanel` in `web/src/player-views.ts` shows an HH:MM:SS counter based on the epoch and the farm’s actual entry seconds, stopping at epoch end. It is elapsed mining time, not an invented token balance. XP thresholds and farm-age caps come from the deployed mechanics. `rewardsPage` shows pending BLACKOUT and estimated USD, the simulated claim tax/net, the continuous 20%→5% aging schedule, the next epoch countdown, +100 XP and an earnings estimate from the wallet’s last settled epoch’s shares, tariff discount and audit. The estimate excludes redistributed tax, referrals and auto-repair. USD estimates use the actual Coinbase ETH/USD rate and the market hook’s BLACKOUT/ETH spot; unavailable prices are labeled, never substituted.
**Packs and reveal.** `packsPage` in `web/src/views.ts` renders the ETH amount first, its USD estimate next, and the BLACKOUT quote beneath at the small muted size. The average-farm-yield/demand explanation sits next to the buy action. `.pack-quantity` aligns the label and native button/output stepper; quantity is bounded to 1–10. `.pack-buy` is the only filled purchase action. `.pack-token-buy` is a smaller outlined alternative. `#pack-advanced` uses native details disclosure for a labeled 16px slippage input (3% default, 0.1–10% allowed), field-specific errors and exact swap/cost limits. No recipient input remains. Snapshot token IDs and free eligibility still depend on verified proofs. Receipt rows expose one action and state: Revealing... while waiting, Reveal when ready, Re-arming, wait a moment during expired-window recovery, then a 0.9-second pack shake/glow and 0.7-second staggered card flips. Each of three revealed items pops with rarity-colored particles (0.85 seconds); Mythic uses a rainbow border. Repeated data refreshes do not replay the reveal. Go to Farm follows the items. Fully opened receipts offer only the Farm link. Clock updates do not replace purchase inputs; result state survives receipt, inventory and eligibility refreshes. Stepper focus survives quote updates.

**Transaction feedback.** A polite live region distinguishes awaiting wallet, pending, confirmed, reverted and error. Pending states include an explorer link and hash; confirmed feedback collapses to a compact label and explorer link so the next action stays close. The same label, signature/pending status and explorer link are rendered inside the active native confirmation dialog, so its backdrop does not hide progress. Failure remains visible there for review; success closes it. `data-write` marks only transaction controls, with `data-unavailable` preserving eligibility when busy state clears. Read-only Season week selection remains available without a wallet. All 41 ABI error names are decoded internally and shown as plain, action-specific recovery guidance; raw revert names and RPC failure details stay out of player copy. Busy state prevents duplicate actions. Failed reads offer Retry; a registry mismatch warns and disables writes. Optional local storage retains transaction hashes and receipt scan cursors, never keys.

**City, Season and Billboards.** The dispatcher and district art accompany chain values. Disabled modules remain Coming soon. Season scores are correctly labeled as token spend per active farm and counted BLACKOUT spend. Chain-supplied text is HTML-escaped. Billboard input mirrors the deployed character and length restrictions before requesting approval.

**Leaderboard and activity.** `web/src/community.ts` enumerates all `FarmCore.playerAt` entries in groups of 50, reads current epoch weights and district active hash, and displays the top 20 plus the best district. The feed scans a bounded recent chain window, then only new logs with a reorg overlap. Pack details use actual mint logs and cached immutable item kind/rarity; burned items omit their erased metadata. The feed holds its last results on read failure; it has no seeded players or fake events.

**Guide and contracts.** The guide has persistent section anchors and a readable prose column. Contract rows show full addresses and explorer/copy actions. The guide includes launch taxes, buying limits, claim windows, randomness, liquidity and contract risks.

## Accessibility and motion

A skip link, semantic header/nav/main/footer, logical headings, form labels, named buttons, text alternatives, semantic meters and status/error live regions support keyboard and assistive-technology use. Yellow 3px focus rings with 4px offsets are visible on interactive elements. Native dialogs trap focus. Page navigation moves focus to main without a page scroll jump; guide deep links scroll to their named section.

CRT scanlines and pixel art preserve the requested visual identity. A Pause city control stops ambient motion; the user's `prefers-reduced-motion` setting disables animations, transitions and smooth scrolling. The reduced-motion probe confirms no continuing animation. The chain’s outage/surge/fire district darkens and recovers; windows, server lights, substation sparks and subtle parallax retain the city’s pixel character. Sound starts off (including mobile), requires a user gesture and has a nearby Packs toggle plus a footer toggle. The preference is stored locally. Forced-colors rules preserve control boundaries and focus.

## Review evidence and boundaries

The pinned Better Interface guide was applied across accessibility, layout, writing, typography, colors and UI during implementation. The final pinned design probe passed **16/16** checks at 320, 390 and 1440px. The 390px first-screen screenshot was inspected manually; product and primary action are visible. Functional browser checks cover 320, 390, 768 and 1440px. See `reports/v10/validation.md` for exact commands, findings, fixes, browser/axe coverage and remaining limits.

This is not a claim of complete WCAG conformance. Native screen readers, physical phones, external wallet onboarding and text-over-art contrast were not fully evaluated. No real wallet transaction is signed by the review. Purchase, reveal and populated-game checks use controlled browser fixtures, with that boundary recorded explicitly. Earlier browser-runtime failures and their resolution are recorded separately from the final successful live and fixture checks.

## Reuse guidance

Start a new game view with `.wrap.live-page`, `heading()` and the existing semantic tokens. Use `.button.primary` for its main task, ordinary `.button` for alternatives, and native details for optional settings. Keep controls at least 44px and reuse the six-size type scale. Add `disabled(condition)` to transaction controls so the write gate and feature eligibility remain separate; leave read-only forms ungated. Preserve full amounts and addresses. Reuse the SVG city/hardware system, local fonts and reduced-motion controls; do not introduce a second visual system.

The 1200×630 social card is rendered from the current city by `web/tools/render-og.mjs`. Its cyan badge reads **BLACKOUT on Robinhood Chain**. `--check` compares a fresh deterministic render with both `public/og.png` and `dist/og.png`.
